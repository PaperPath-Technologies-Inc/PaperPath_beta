import { strict as assert } from "node:assert";
import { buildPgwpStarterTasks, evaluatePgwpRisk, toUtcDay, upsertPgwpRiskHistorySnapshot } from "@/lib/pgwpRisk";

function iso(daysFromNow: number) {
  return new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function runPgwpRiskTests() {
  const missingPermit = evaluatePgwpRisk({
    role: "student",
    knows_expiry: false,
    study_permit_expiry_date: null,
    program_end_date: null,
    tasks: [],
  });
  assert.equal(missingPermit.risk_level, "UNKNOWN");
  assert.equal(missingPermit.risk_score, 60);
  assert.equal(missingPermit.version, "pgwp-v0.2");

  const permit20MissingProgramNoTasks = evaluatePgwpRisk({
    role: "student",
    knows_expiry: true,
    study_permit_expiry_date: iso(20),
    program_end_date: null,
    tasks: [],
  });
  assert.equal(permit20MissingProgramNoTasks.risk_level, "HIGH");
  assert.equal(permit20MissingProgramNoTasks.risk_score, 96);

  const programEndsIn10 = evaluatePgwpRisk({
    role: "student",
    knows_expiry: true,
    study_permit_expiry_date: iso(150),
    program_end_date: iso(10),
    tasks: [{ due_date: null, status: "done" }],
  });
  const programEnded15 = evaluatePgwpRisk({
    role: "student",
    knows_expiry: true,
    study_permit_expiry_date: iso(150),
    program_end_date: iso(-15),
    tasks: [{ due_date: null, status: "done" }],
  });
  assert.ok(programEndsIn10.risk_score >= 23);
  assert.ok(programEnded15.risk_score >= 25);

  const overdueIncreases = evaluatePgwpRisk({
    role: "student",
    knows_expiry: true,
    study_permit_expiry_date: iso(140),
    program_end_date: iso(80),
    tasks: [
      { due_date: iso(-10), status: "todo" },
      { due_date: iso(-5), status: "todo" },
    ],
  });
  assert.ok(overdueIncreases.risk_score >= 43);

  const actionsCapped = evaluatePgwpRisk({
    role: "student",
    knows_expiry: false,
    study_permit_expiry_date: null,
    program_end_date: null,
    tasks: [{ due_date: iso(-1), status: "todo" }],
  });
  assert.ok(actionsCapped.next_actions.length <= 3);

  const clampRange = evaluatePgwpRisk({
    role: "student",
    knows_expiry: true,
    study_permit_expiry_date: iso(-120),
    program_end_date: iso(-200),
    tasks: Array.from({ length: 10 }).map(() => ({ due_date: iso(-30), status: "todo" as const })),
  });
  assert.ok(clampRange.risk_score <= 100);
  assert.ok(clampRange.risk_score >= 0);
}

function runStarterSeedTests() {
  const futureTasks = buildPgwpStarterTasks({ status: "student", program_end_date: iso(40) });
  assert.equal(futureTasks.length, 9);
  assert.equal(futureTasks[0]?.title, "Add your key dates (permit + program end)");
  assert.ok(futureTasks.every((task) => task.sort_order >= 1));

  const noProgramTasks = buildPgwpStarterTasks({ status: "student", program_end_date: null });
  assert.equal(noProgramTasks.length, 9);
  assert.ok(noProgramTasks.every((task) => Boolean(task.due_date)));
}

async function runPgwpRiskHistoryTests() {
  type HistoryRow = {
    user_id: string;
    day: string;
    risk_score: number;
    risk_level: string;
    permit_days_left: number | null;
    program_days_to_end: number | null;
    program_days_since_end: number | null;
    created_at: string;
  };

  class FakeSupabase {
    private readonly riskByUser = new Map<string, Record<string, unknown>>();
    private readonly historyByKey = new Map<string, HistoryRow>();

    constructor() {
      this.riskByUser.set("user-a", {
        risk_score: 80,
        risk_level: "HIGH",
        days_to_permit_expiry: 20,
        days_to_program_end: 15,
        days_since_program_end: null,
      });
    }

    setRisk(userId: string, data: Record<string, unknown>) {
      this.riskByUser.set(userId, data);
    }

    historyCount(userId: string, day: string) {
      return this.historyByKey.has(`${userId}:${day}`) ? 1 : 0;
    }

    historyRow(userId: string, day: string) {
      return this.historyByKey.get(`${userId}:${day}`) ?? null;
    }

    from(table: string) {
      if (table === "pgwp_risk") {
        return {
          select: () => ({
            eq: (_: string, userId: string) => ({
              maybeSingle: async () => ({
                data: this.riskByUser.get(userId) ?? null,
                error: null,
              }),
            }),
          }),
          upsert: async () => ({ error: null }),
        };
      }

      if (table === "pgwp_risk_history") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
          upsert: async (values: Record<string, unknown>) => {
            const row = values as HistoryRow;
            this.historyByKey.set(`${row.user_id}:${row.day}`, row);
            return { error: null };
          },
        };
      }

      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        }),
        upsert: async () => ({ error: null }),
      };
    }
  }

  const fake = new FakeSupabase();
  const day = toUtcDay(new Date("2026-02-12T10:00:00.000Z"));

  await upsertPgwpRiskHistorySnapshot("user-a", {
    now: new Date("2026-02-12T10:00:00.000Z"),
    supabaseClient: fake,
  });
  await upsertPgwpRiskHistorySnapshot("user-a", {
    now: new Date("2026-02-12T20:00:00.000Z"),
    supabaseClient: fake,
  });
  assert.equal(fake.historyCount("user-a", day), 1);

  fake.setRisk("user-a", {
    risk_score: 52,
    risk_level: "MEDIUM",
    days_to_permit_expiry: 51,
    days_to_program_end: 12,
    days_since_program_end: null,
  });

  await upsertPgwpRiskHistorySnapshot("user-a", {
    now: new Date("2026-02-12T22:00:00.000Z"),
    supabaseClient: fake,
  });

  const row = fake.historyRow("user-a", day);
  assert.ok(row);
  assert.equal(row?.risk_score, 52);
  assert.equal(row?.risk_level, "MEDIUM");
}

runPgwpRiskTests();
runStarterSeedTests();
await runPgwpRiskHistoryTests();
