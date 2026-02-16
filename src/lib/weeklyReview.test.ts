import { strict as assert } from "node:assert";
import { buildWeeklyItems, getWeekStartDate, pickWeeklyBestAction } from "@/lib/weeklyReview";

const fixedToday = new Date("2026-02-12T10:00:00.000Z");

function runDateFilteringTests() {
  const data = buildWeeklyItems({
    today: fixedToday,
    tasks: [
      { id: "t1", title: "Soon task", due_date: "2026-02-14", status: "todo" },
      { id: "t2", title: "Later task", due_date: "2026-02-28", status: "todo" },
      { id: "t3", title: "Done task", due_date: "2026-02-13", status: "done" },
    ],
    deadlines: [
      { id: "d1", title: "Soon deadline", due_at: "2026-02-16T12:00:00.000Z", is_done: false },
      { id: "d2", title: "Done deadline", due_at: "2026-02-15T12:00:00.000Z", is_done: true },
    ],
  });

  assert.equal(data.upcomingTasks.length, 1);
  assert.equal(data.upcomingDeadlines.length, 1);
}

function runOverdueDetectionTests() {
  const data = buildWeeklyItems({
    today: fixedToday,
    tasks: [{ id: "t1", title: "Past task", due_date: "2026-02-01", status: "todo" }],
    deadlines: [{ id: "d1", title: "Past deadline", due_at: "2026-02-02T12:00:00.000Z", is_done: false }],
  });

  assert.equal(data.overdueTasks.length, 1);
  assert.equal(data.overdueDeadlines.length, 1);
}

function runBestActionSelectionTests() {
  const fromRisk = pickWeeklyBestAction({
    riskAction: { title: "Complete next PGWP task", cta_route: "/tasks?category=pgwp&sort=soonest" },
    overdue: [],
    upcoming: [],
  });
  assert.equal(fromRisk.route, "/tasks?category=pgwp&sort=soonest");

  const fromOverdue = pickWeeklyBestAction({
    overdue: [
      {
        id: "x",
        type: "task",
        title: "Overdue task",
        dueAt: "2026-02-01T12:00:00.000Z",
        daysDelta: -10,
        editRoute: "/tasks?category=pgwp",
      },
    ],
    upcoming: [],
  });
  assert.equal(fromOverdue.route, "/tasks?category=pgwp");

  const fallback = pickWeeklyBestAction({
    overdue: [],
    upcoming: [],
  });
  assert.equal(fallback.route, "/tasks/new?category=pgwp");
}

function runWeekStartTests() {
  assert.equal(getWeekStartDate(new Date("2026-02-12T10:00:00.000Z")), "2026-02-09");
}

runDateFilteringTests();
runOverdueDetectionTests();
runBestActionSelectionTests();
runWeekStartTests();

