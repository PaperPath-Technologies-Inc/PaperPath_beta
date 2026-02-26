import { useCallback, useEffect, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card } from "@/src/components/Card";
import { isSupabaseConfigured, supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/lib/useAuth";
import { useTheme } from "@/src/theme/useTheme";

type CategoryName = "General" | "Docs" | "School" | "Immigration";

type TaskRow = {
  category?: string | null;
  due_date?: string | null;
  status?: string | null;
};

type TaskStats = {
  done: number;
  overdue: number;
  remaining: number;
  total: number;
};

type CategoryStats = Record<CategoryName, { done: number; total: number }>;

const GROUPS: { icon: keyof typeof Ionicons.glyphMap; label: CategoryName }[] = [
  { icon: "grid-outline", label: "General" },
  { icon: "document-text-outline", label: "Docs" },
  { icon: "school-outline", label: "School" },
  { icon: "airplane-outline", label: "Immigration" },
];

function CategoryRing({
  percent,
  size,
  strokeWidth,
  color,
  trackColor,
  textColor,
}: {
  percent: number;
  size: number;
  strokeWidth: number;
  color: string;
  trackColor: string;
  textColor: string;
}) {
  const clamped = Math.min(Math.max(percent, 0), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progressLength = circumference * (clamped / 100);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${progressLength} ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.ringLabelWrap}>
        <Text style={[styles.ringLabel, { color: textColor }]}>{Math.round(clamped)}%</Text>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const { tokens } = useTheme();
  const { session } = useAuth();
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [tasks, setTasks] = useState<TaskRow[]>([]);

  const userId = session?.user.id;
  const greetingName = displayName?.trim().split(/\s+/)[0];
  const greeting = greetingName ? `Hi, ${greetingName}` : "Hi there";

  const loadDisplayName = useCallback(async () => {
    if (!userId || !isSupabaseConfigured) {
      setDisplayName(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        setDisplayName(null);
        return;
      }

      const row = data as { full_name?: string | null } | null;
      setDisplayName(row?.full_name?.trim() || null);
    } catch {
      setDisplayName(null);
    }
  }, [userId]);

  useEffect(() => {
    void loadDisplayName();
  }, [loadDisplayName]);

  useFocusEffect(
    useCallback(() => {
      void loadDisplayName();
    }, [loadDisplayName])
  );

  useEffect(() => {
    let cancelled = false;

    const loadTasks = async () => {
      if (!userId || !isSupabaseConfigured) {
        if (!cancelled) {
          setTasks([]);
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

        if (!cancelled) {
          setTasks((data ?? []) as TaskRow[]);
        }
      } catch (error) {
        console.warn("Home stats fetch failed. Falling back to zeros.", error);
        if (!cancelled) {
          setTasks([]);
        }
      }
    };

    loadTasks();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const today = new Date().toISOString().slice(0, 10);

  const overallStats = useMemo<TaskStats>(() => {
    let done = 0;
    let overdue = 0;
    let remaining = 0;

    for (const task of tasks) {
      const status = task.status?.trim().toLowerCase() ?? "";
      const dueDate = task.due_date?.slice(0, 10);
      const isOverdue = status !== "done" && Boolean(dueDate && dueDate < today);

      if (status === "done") {
        done += 1;
      } else if (isOverdue) {
        overdue += 1;
      } else if (status === "todo") {
        remaining += 1;
      }
    }

    return {
      done,
      overdue,
      remaining,
      total: done + remaining + overdue,
    };
  }, [tasks, today]);

  const categoryStats = useMemo<CategoryStats>(() => {
    const initial: CategoryStats = {
      Docs: { done: 0, total: 0 },
      General: { done: 0, total: 0 },
      Immigration: { done: 0, total: 0 },
      School: { done: 0, total: 0 },
    };

    for (const task of tasks) {
      const category = task.category?.trim();
      if (category === "General" || category === "Docs" || category === "School" || category === "Immigration") {
        initial[category].total += 1;
        if ((task.status ?? "").toLowerCase() === "done") {
          initial[category].done += 1;
        }
      }
    }

    return initial;
  }, [tasks]);

  const completionPercent = overallStats.total > 0 ? Math.round((overallStats.done / overallStats.total) * 100) : 0;
  const docsCount = categoryStats.Docs.total;
  const upcomingCount = overallStats.remaining;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tokens.bg }]} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.hi, { color: tokens.text }]}>{greeting}</Text>
            <Text style={[styles.welcome, { color: tokens.mutedText }]}>Welcome back</Text>
          </View>
          <Pressable
            onPress={() => console.log("TODO: refresh")}
            style={[styles.refreshBtn, { backgroundColor: tokens.card, borderColor: tokens.border, shadowColor: tokens.shadow }]}
          >
            <Ionicons name="refresh" size={18} color={tokens.primaryBlue} />
          </Pressable>
        </View>

        <LinearGradient
          colors={[tokens.primaryBlue, tokens.primaryBlueDark || "#0F5FE6"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.statusCard, { shadowColor: tokens.shadow }]}
        >
          <View style={styles.statusLeft}>
            <Text style={styles.statusHeader}>Your status</Text>
            <Text style={styles.statusMain}>You&apos;re on track</Text>
            <Pressable onPress={() => router.push("/(tabs)/tasks")} style={styles.statusButton}>
              <Text style={styles.statusButtonText}>View Tasks</Text>
            </Pressable>
            <Text style={styles.statusFooter}>
              {overallStats.remaining} remaining • {overallStats.overdue} overdue
            </Text>
          </View>
          <View style={styles.statusRight}>
            <CategoryRing
              percent={completionPercent}
              size={108}
              strokeWidth={10}
              color="#FFFFFF"
              trackColor="rgba(255,255,255,0.28)"
              textColor="#FFFFFF"
            />
          </View>
        </LinearGradient>

        <Text style={[styles.sectionTitle, { color: tokens.text }]}>In Progress</Text>
        <View style={styles.progressGrid}>
          <Pressable style={styles.progressTilePress} onPress={() => router.push("/(tabs)/vault")}>
            <Card style={[styles.progressTile, { borderColor: tokens.border, borderWidth: 1, shadowColor: tokens.shadow }]}>
              <View style={[styles.tileIconWrap, { backgroundColor: tokens.categoryColors.Docs.bg }]}>
                <Ionicons name="folder-open-outline" size={18} color={tokens.categoryColors.Docs.fg} />
              </View>
              <Text style={[styles.tileTitle, { color: tokens.text }]}>Docs Vault</Text>
              <Text style={[styles.tileSub, { color: tokens.mutedText }]}>{docsCount} files</Text>
            </Card>
          </Pressable>

          <Pressable style={styles.progressTilePress} onPress={() => router.push("/(tabs)/reminders")}>
            <Card style={[styles.progressTile, { borderColor: tokens.border, borderWidth: 1, shadowColor: tokens.shadow }]}>
              <View style={[styles.tileIconWrap, { backgroundColor: tokens.categoryColors.Immigration.bg }]}>
                <Ionicons name="notifications-outline" size={18} color={tokens.categoryColors.Immigration.fg} />
              </View>
              <Text style={[styles.tileTitle, { color: tokens.text }]}>Reminders</Text>
              <Text style={[styles.tileSub, { color: tokens.mutedText }]}>{upcomingCount} upcoming</Text>
            </Card>
          </Pressable>
        </View>

        <Text style={[styles.sectionTitle, { color: tokens.text }]}>Task Groups</Text>
        <Card style={[styles.groupListCard, { borderColor: tokens.border, borderWidth: 1, shadowColor: tokens.shadow }]}>
          {GROUPS.map((group, index) => {
            const stats = categoryStats[group.label];
            const percent = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
            const accent = tokens.categoryColors[group.label];

            return (
              <Pressable
                key={group.label}
                onPress={() =>
                  router.push({
                    pathname: "/(tabs)/tasks",
                    params: { category: group.label },
                  })
                }
                style={[
                  styles.groupRow,
                  index < GROUPS.length - 1 && { borderBottomColor: tokens.border, borderBottomWidth: StyleSheet.hairlineWidth },
                ]}
              >
                <View style={styles.groupLeft}>
                  <View style={[styles.groupIconTile, { backgroundColor: accent.bg }]}>
                    <Ionicons name={group.icon} size={18} color={accent.fg} />
                  </View>
                  <View>
                    <Text style={[styles.groupLabel, { color: tokens.text }]}>{group.label}</Text>
                    <Text style={[styles.groupSub, { color: tokens.mutedText }]}>{stats.total} tasks</Text>
                  </View>
                </View>
                <CategoryRing
                  percent={percent}
                  size={40}
                  strokeWidth={5}
                  color={accent.fg}
                  trackColor={accent.bg}
                  textColor={accent.fg}
                />
              </Pressable>
            );
          })}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
    paddingBottom: 120,
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  groupIconTile: {
    alignItems: "center",
    borderRadius: 11,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  groupLabel: {
    fontSize: 16,
    fontWeight: "700",
  },
  groupLeft: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  groupListCard: {
    borderRadius: 20,
    paddingVertical: 4,
  },
  groupRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 72,
    paddingHorizontal: 6,
  },
  groupSub: {
    fontSize: 13,
    marginTop: 2,
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
  progressGrid: {
    flexDirection: "row",
    gap: 10,
  },
  progressTile: {
    borderRadius: 20,
    minHeight: 122,
  },
  progressTilePress: {
    flex: 1,
  },
  refreshBtn: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    elevation: 4,
    height: 42,
    justifyContent: "center",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    width: 42,
  },
  ringLabel: {
    fontSize: 9,
    fontWeight: "800",
  },
  ringLabelWrap: {
    alignItems: "center",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  safe: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    marginTop: 2,
  },
  statusButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 999,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    width: 104,
  },
  statusButtonText: {
    color: "#0F5FE6",
    fontSize: 12,
    fontWeight: "700",
  },
  statusCard: {
    borderRadius: 24,
    flexDirection: "row",
    minHeight: 186,
    padding: 18,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  statusFooter: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    marginTop: 14,
  },
  statusHeader: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  statusLeft: {
    flex: 1,
    paddingRight: 14,
  },
  statusMain: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "800",
    lineHeight: 38,
    marginTop: 8,
    maxWidth: 220,
  },
  statusRight: {
    justifyContent: "center",
  },
  tileIconWrap: {
    alignItems: "center",
    borderRadius: 10,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  tileSub: {
    fontSize: 14,
    marginTop: 4,
  },
  tileTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 12,
  },
  welcome: {
    fontSize: 20,
    marginTop: -2,
  },
});
