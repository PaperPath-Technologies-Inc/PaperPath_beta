import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card } from "@/src/components/Card";
import { Donut } from "@/src/components/Donut";
import { Pill } from "@/src/components/Pill";
import { supabase, isSupabaseConfigured } from "@/src/lib/supabase";
import { useAuth } from "@/src/lib/useAuth";
import { useTheme } from "@/src/theme/useTheme";

type TaskStats = {
  done: number;
  overdue: number;
  remaining: number;
  total: number;
};

type CategoryPill = {
  active?: boolean;
  count: number;
  label: string;
};

type TaskRow = {
  category?: string | null;
  due_date?: string | null;
  status?: string | null;
};

const ZERO_TASK_STATS: TaskStats = {
  done: 0,
  overdue: 0,
  remaining: 0,
  total: 0,
};

const FALLBACK_CATEGORIES: CategoryPill[] = [
  { label: "General", count: 0, active: true },
  { label: "Docs", count: 0 },
  { label: "School", count: 0 },
  { label: "Immigration", count: 0 },
];

const CATEGORY_PRIORITY = ["General", "Docs", "School", "Immigration"];

const quickCards = [
  { title: "Docs Vault", subtitle: "3 files", icon: "folder-open", route: "Vault" },
  { title: "Reminders", subtitle: "2 upcoming", icon: "notifications", route: "More" },
  { title: "AI Risk", subtitle: "Not scored yet", icon: "analytics", route: "More" },
  { title: "CRS", subtitle: "Not saved", icon: "bar-chart", route: "More" },
] as const;

export default function HomeScreen() {
  const { tokens, isDark } = useTheme();
  const { session } = useAuth();
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [taskStats, setTaskStats] = useState<TaskStats>(ZERO_TASK_STATS);
  const [taskCategories, setTaskCategories] = useState<CategoryPill[]>(FALLBACK_CATEGORIES);

  const userId = session?.user.id;
  const emailPrefix = session?.user.email?.split("@")[0]?.trim() || null;
  const greeting = displayName ? `Hi ${displayName}` : "Hi";

  useEffect(() => {
    let cancelled = false;

    const loadDisplayName = async () => {
      if (!userId) {
        setDisplayName(null);
        return;
      }

      if (!isSupabaseConfigured) {
        setDisplayName(emailPrefix);
        return;
      }

      try {
        const firstTry = await supabase.from("profiles").select("full_name, name").eq("id", userId).maybeSingle();

        if (!cancelled && !firstTry.error) {
          const row = firstTry.data as { full_name?: string | null; name?: string | null } | null;
          const profileName = row?.full_name?.trim() || row?.name?.trim() || null;
          setDisplayName(profileName || emailPrefix);
          return;
        }

        const fallbackTry = await supabase.from("profiles").select("name").eq("id", userId).maybeSingle();
        if (!cancelled && !fallbackTry.error) {
          const row = fallbackTry.data as { name?: string | null } | null;
          setDisplayName(row?.name?.trim() || emailPrefix);
          return;
        }

        if (!cancelled) {
          setDisplayName(emailPrefix);
        }
      } catch {
        if (!cancelled) {
          setDisplayName(emailPrefix);
        }
      }
    };

    loadDisplayName();

    return () => {
      cancelled = true;
    };
  }, [emailPrefix, userId]);

  useEffect(() => {
    let cancelled = false;

    const loadTaskStats = async () => {
      if (!userId || !isSupabaseConfigured) {
        if (!cancelled) {
          setTaskStats(ZERO_TASK_STATS);
          setTaskCategories(FALLBACK_CATEGORIES);
        }
        return;
      }

      try {
        const { data, error } = await supabase
          .from("tasks")
          .select("status, due_date, category")
          .eq("user_id", userId);

        if (error) {
          throw error;
        }

        const rows = (data ?? []) as TaskRow[];
        const today = new Date().toISOString().slice(0, 10);
        const counts = new Map<string, number>();
        let done = 0;
        let overdue = 0;

        for (const row of rows) {
          const status = row.status?.trim().toLowerCase() ?? "";
          const isDone = status === "done";

          if (isDone) {
            done += 1;
          }

          const dueDate = row.due_date?.slice(0, 10);
          if (dueDate && dueDate < today && !isDone) {
            overdue += 1;
          }

          const rawCategory = row.category?.trim();
          const category = rawCategory && rawCategory.length > 0 ? rawCategory : "Uncategorized";
          counts.set(category, (counts.get(category) ?? 0) + 1);
        }

        const total = rows.length;
        const remaining = Math.max(total - done, 0);

        const sortedCategoryLabels = [...counts.keys()].sort((a, b) => {
          const aPriority = CATEGORY_PRIORITY.indexOf(a);
          const bPriority = CATEGORY_PRIORITY.indexOf(b);
          if (aPriority !== -1 || bPriority !== -1) {
            return (aPriority === -1 ? Number.MAX_SAFE_INTEGER : aPriority)
              - (bPriority === -1 ? Number.MAX_SAFE_INTEGER : bPriority);
          }
          return a.localeCompare(b);
        });

        const nextCategories = sortedCategoryLabels.length
          ? sortedCategoryLabels.map((label, index) => ({
              active: index === 0,
              count: counts.get(label) ?? 0,
              label,
            }))
          : FALLBACK_CATEGORIES;

        if (!cancelled) {
          setTaskStats({ done, overdue, remaining, total });
          setTaskCategories(nextCategories);
        }
      } catch (error) {
        console.warn("Home stats fetch failed. Falling back to zeros. Missing schema info may be the cause.", error);
        if (!cancelled) {
          setTaskStats(ZERO_TASK_STATS);
          setTaskCategories(FALLBACK_CATEGORIES);
        }
      }
    };

    loadTaskStats();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tokens.bg }]} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.hi, { color: tokens.text }]}>{greeting}</Text>
            <Text style={[styles.welcome, { color: tokens.mutedText }]}>Welcome back</Text>
          </View>
          <View style={[styles.refreshBtn, { backgroundColor: tokens.card, borderColor: tokens.border }]}>
            <Ionicons name="sync" size={20} color={tokens.primaryBlue} />
          </View>
        </View>

        <View style={styles.topCardsRow}>
          <Card gradient style={styles.statusCard}>
            <Text style={styles.statusTitle}>Status countdown</Text>
            <Text style={styles.statusValue}>Permit: 109 days</Text>
            <Text style={styles.statusValue}>Program: 129 days</Text>
            <View style={styles.trackPill}>
              <Text style={styles.trackText}>On track</Text>
            </View>
          </Card>

          <Card style={styles.progressSmallCard}>
            <Text style={[styles.progressTitle, { color: tokens.text }]}>Profile{"\n"}completeness</Text>
            <Text style={[styles.progressBig, { color: tokens.primaryBlue }]}>100%</Text>
            <Text style={[styles.progressHint, { color: tokens.mutedText }]}>All essentials completed</Text>
          </Card>
        </View>

        <Card style={styles.progressCard}>
          <Text style={[styles.progressTitle, { color: tokens.text }]}>Task Progress</Text>
          <View style={styles.progressContent}>
            <Donut done={taskStats.done} total={taskStats.total} overdue={taskStats.overdue} size={120} strokeWidth={12} />
            <View style={styles.statList}>
              <Stat label="Done" value={taskStats.done} color={tokens.success} />
              <Stat label="Remaining" value={taskStats.remaining} color={tokens.primaryBlue} />
              <Stat label="Overdue" value={taskStats.overdue} color={tokens.warning} />
              <Stat label="Total" value={taskStats.total} color={tokens.text} />
            </View>
          </View>
        </Card>

        <View style={styles.pillsRow}>
          {taskCategories.map((item) => (
            <Pill key={item.label} label={item.label} count={item.count} active={item.active} />
          ))}
        </View>

        <View style={styles.grid}>
          {quickCards.map((item) => (
            <Card key={item.title} style={styles.quickCard}>
              <View style={styles.quickHead}>
                <Text style={[styles.quickTitle, { color: tokens.text }]}>{item.title}</Text>
                <Ionicons name={item.icon} size={20} color={isDark ? tokens.primaryBlue2 : tokens.primaryBlue} />
              </View>
              <Text style={[styles.quickSubtitle, { color: tokens.mutedText }]}>{item.subtitle}</Text>
              <Text style={[styles.quickRoute, { color: tokens.primaryBlue }]}>{item.route}</Text>
            </Card>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  const { tokens } = useTheme();

  return (
    <View style={styles.statRow}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.statLabel, { color: tokens.mutedText }]}>{label}</Text>
      <Text style={[styles.statValue, { color: tokens.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
    paddingBottom: 110,
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  dot: {
    borderRadius: 99,
    height: 8,
    width: 8,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  hi: {
    fontSize: 42,
    fontWeight: "800",
  },
  pillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  progressBig: {
    fontSize: 34,
    fontWeight: "800",
    marginTop: 12,
  },
  progressCard: {
    gap: 12,
  },
  progressContent: {
    alignItems: "center",
    flexDirection: "row",
    gap: 16,
  },
  progressHint: {
    fontSize: 13,
    marginTop: 4,
  },
  progressSmallCard: {
    flex: 1,
    minHeight: 160,
  },
  progressTitle: {
    fontSize: 22,
    fontWeight: "800",
  },
  quickCard: {
    flexGrow: 1,
    minHeight: 118,
    width: "48%",
  },
  quickHead: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  quickRoute: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 12,
  },
  quickSubtitle: {
    fontSize: 16,
    marginTop: 8,
  },
  quickTitle: {
    fontSize: 23,
    fontWeight: "800",
  },
  refreshBtn: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  safe: {
    flex: 1,
  },
  statLabel: {
    flex: 1,
    fontSize: 14,
  },
  statList: {
    flex: 1,
    gap: 9,
  },
  statRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  statValue: {
    fontSize: 15,
    fontWeight: "800",
  },
  statusCard: {
    flex: 1,
    minHeight: 160,
  },
  statusTitle: {
    color: "#EAF8FF",
    fontSize: 18,
    fontWeight: "700",
  },
  statusValue: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
    marginTop: 8,
  },
  topCardsRow: {
    flexDirection: "row",
    gap: 10,
  },
  trackPill: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.24)",
    borderRadius: 999,
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  trackText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  welcome: {
    fontSize: 20,
    marginTop: -2,
  },
});
