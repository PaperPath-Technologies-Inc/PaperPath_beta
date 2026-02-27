import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";

import { Card } from "@/src/components/Card";
import { isSupabaseConfigured, supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/lib/useAuth";
import { useTheme } from "@/src/theme/useTheme";

type CategoryName = "General" | "Docs" | "School" | "Immigration";

type ProfileRow = {
  full_name?: string | null;
  city?: string | null;
  status?: string | null;
  expiry_date?: string | null;
  study_permit_expiry_date?: string | null;
  program_end_date?: string | null;
};

type TaskRow = {
  category?: string | null;
  due_date?: string | null;
  status?: string | null;
};

type ReminderRow = {
  id: string;
  due_at?: string | null;
  pinned?: boolean | null;
};

type VaultRow = {
  id: string;
  created_at?: string | null;
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
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
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

function isMissingColumnError(error: unknown, column: string) {
  const message =
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message?: string }).message ?? "").toLowerCase()
      : "";

  return (
    message.includes(`'${column.toLowerCase()}'`) ||
    message.includes(`\"${column.toLowerCase()}\"`) ||
    message.includes(`column ${column.toLowerCase()}`)
  );
}

function isMissingRelationError(error: unknown, relation: string) {
  const message =
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message?: string }).message ?? "").toLowerCase()
      : "";
  return message.includes(relation.toLowerCase()) && (message.includes("does not exist") || message.includes("relation"));
}

function isCategoryName(value: string | null | undefined): value is CategoryName {
  return value === "General" || value === "Docs" || value === "School" || value === "Immigration";
}

function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export default function HomeScreen() {
  const { tokens } = useTheme();
  const { session } = useAuth();

  const userId = session?.user.id;
  const emailFallback = session?.user.email?.split("@")[0] ?? "";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [reminders, setReminders] = useState<ReminderRow[]>([]);
  const [vaultDocs, setVaultDocs] = useState<VaultRow[]>([]);

  const [supportsReminderPinned, setSupportsReminderPinned] = useState(true);
  const [supportsReminderDueAt, setSupportsReminderDueAt] = useState(true);

  const [vaultAvailable, setVaultAvailable] = useState(true);
  const [tasksCategoryAvailable, setTasksCategoryAvailable] = useState(true);

  const fetchProfile = useCallback(async (uid: string) => {
    const candidates = [
      "full_name, city, status, expiry_date, study_permit_expiry_date, program_end_date",
      "full_name, city, status, expiry_date",
      "full_name",
    ];

    for (const select of candidates) {
      const response = await supabase.from("profiles").select(select).eq("id", uid).maybeSingle();
      if (response.error) {
        const missingColumn =
          isMissingColumnError(response.error, "full_name") ||
          isMissingColumnError(response.error, "city") ||
          isMissingColumnError(response.error, "status") ||
          isMissingColumnError(response.error, "expiry_date") ||
          isMissingColumnError(response.error, "study_permit_expiry_date") ||
          isMissingColumnError(response.error, "program_end_date");

        if (missingColumn) {
          continue;
        }
        throw response.error;
      }

      return (response.data as ProfileRow | null) ?? null;
    }

    return null;
  }, []);

  const fetchTasks = useCallback(async (uid: string) => {
    const candidates: { select: string; supportsCategory: boolean }[] = [
      { select: "status, due_date, category", supportsCategory: true },
      { select: "status, due_date", supportsCategory: false },
      { select: "status", supportsCategory: false },
    ];

    for (const candidate of candidates) {
      const response = await supabase.from("tasks").select(candidate.select).eq("user_id", uid);
      if (response.error) {
        const missingColumn =
          isMissingColumnError(response.error, "due_date") ||
          isMissingColumnError(response.error, "category") ||
          isMissingColumnError(response.error, "status");

        if (missingColumn) {
          continue;
        }
        throw response.error;
      }

      setTasksCategoryAvailable(candidate.supportsCategory);
      return (response.data ?? []) as TaskRow[];
    }

    setTasksCategoryAvailable(false);
    return [] as TaskRow[];
  }, []);

  const fetchReminders = useCallback(async (uid: string) => {
    const candidates: { select: string; supportsPinned: boolean; supportsDueAt: boolean }[] = [
      { select: "id, due_at, pinned", supportsPinned: true, supportsDueAt: true },
      { select: "id, due_at", supportsPinned: false, supportsDueAt: true },
      { select: "id", supportsPinned: false, supportsDueAt: false },
    ];

    for (const candidate of candidates) {
      const response = await supabase.from("reminders").select(candidate.select).eq("user_id", uid);
      if (response.error) {
        const missingColumn =
          isMissingColumnError(response.error, "due_at") || isMissingColumnError(response.error, "pinned");

        if (missingColumn) {
          continue;
        }
        throw response.error;
      }

      setSupportsReminderPinned(candidate.supportsPinned);
      setSupportsReminderDueAt(candidate.supportsDueAt);

      return (response.data ?? []) as ReminderRow[];
    }

    setSupportsReminderPinned(false);
    setSupportsReminderDueAt(false);
    return [] as ReminderRow[];
  }, []);

  const fetchVaultDocs = useCallback(async (uid: string) => {
    const response = await supabase
      .from("vault_documents")
      .select("id, created_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });

    if (response.error) {
      if (isMissingRelationError(response.error, "vault_documents")) {
        setVaultAvailable(false);
        return [] as VaultRow[];
      }
      throw response.error;
    }

    setVaultAvailable(true);
    return (response.data ?? []) as VaultRow[];
  }, []);

  const loadDashboard = useCallback(async () => {
    if (!userId || !isSupabaseConfigured) {
      setProfile(null);
      setTasks([]);
      setReminders([]);
      setVaultDocs([]);
      setLoading(false);
      return;
    }

    setErrorText(null);

    try {
      const [profileData, tasksData, remindersData, vaultData] = await Promise.all([
        fetchProfile(userId),
        fetchTasks(userId),
        fetchReminders(userId),
        fetchVaultDocs(userId),
      ]);

      setProfile(profileData);
      setTasks(tasksData);
      setReminders(remindersData);
      setVaultDocs(vaultData);
    } catch (error) {
      console.warn("Failed to load home dashboard", error);
      setErrorText("Some dashboard data could not be loaded.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchProfile, fetchReminders, fetchTasks, fetchVaultDocs, userId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void loadDashboard();
    }, [loadDashboard])
  );

  const greetingName = profile?.full_name?.trim().split(/\s+/)[0] || emailFallback;
  const greeting = greetingName ? `Hi, ${greetingName}` : "Hi there";

  const profileCompletion = useMemo(() => {
    const values = [
      profile?.full_name,
      profile?.city,
      profile?.status,
      profile?.expiry_date,
      profile?.study_permit_expiry_date,
      profile?.program_end_date,
    ];
    const filled = values.filter((value) => Boolean(value && String(value).trim())).length;
    return Math.round((filled / values.length) * 100);
  }, [profile]);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const overallStats = useMemo<TaskStats>(() => {
    let done = 0;
    let overdue = 0;
    let remaining = 0;

    for (const task of tasks) {
      const status = task.status?.trim().toLowerCase() ?? "";
      const dueDate = task.due_date?.slice(0, 10);
      const isDone = status === "done";
      const isOverdue = !isDone && Boolean(dueDate && dueDate < today);

      if (isDone) {
        done += 1;
      } else if (isOverdue) {
        overdue += 1;
      } else {
        remaining += 1;
      }
    }

    return {
      done,
      overdue,
      remaining,
      total: done + overdue + remaining,
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
      if (!isCategoryName(task.category)) {
        continue;
      }

      initial[task.category].total += 1;
      if ((task.status ?? "").toLowerCase() === "done") {
        initial[task.category].done += 1;
      }
    }

    return initial;
  }, [tasks]);

  const completionPercent = overallStats.total > 0 ? Math.round((overallStats.done / overallStats.total) * 100) : 0;

  const reminderTotal = reminders.length;
  const reminderUpcoming = useMemo(() => {
    if (!supportsReminderDueAt) return 0;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    return reminders.filter((item) => {
      const due = parseDate(item.due_at);
      return due ? due >= todayStart : false;
    }).length;
  }, [reminders, supportsReminderDueAt]);

  const reminderPinned = useMemo(() => {
    if (!supportsReminderPinned) return null;
    return reminders.filter((item) => Boolean(item.pinned)).length;
  }, [reminders, supportsReminderPinned]);

  const recentVaultCount = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);

    return vaultDocs.filter((doc) => {
      const created = parseDate(doc.created_at);
      return created ? created >= cutoff : false;
    }).length;
  }, [vaultDocs]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tokens.bg }]} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.hi, { color: tokens.text }]}>{greeting}</Text>
            <Text style={[styles.welcome, { color: tokens.mutedText }]}>Welcome back</Text>
          </View>
          <Pressable
            onPress={() => {
              setRefreshing(true);
              void loadDashboard();
            }}
            style={[
              styles.refreshBtn,
              {
                backgroundColor: tokens.card,
                borderColor: tokens.border,
                shadowColor: tokens.shadow,
                opacity: refreshing ? 0.7 : 1,
              },
            ]}
            disabled={refreshing}
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
            <Text style={styles.statusHeader}>Dashboard status</Text>
            <Text style={styles.statusMain}>{loading ? "Syncing data" : "You&apos;re on track"}</Text>
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
              <Text style={[styles.tileSub, { color: tokens.mutedText }]}> 
                {vaultAvailable ? `${vaultDocs.length} files • ${recentVaultCount} recent` : "Vault not configured"}
              </Text>
            </Card>
          </Pressable>

          <Pressable style={styles.progressTilePress} onPress={() => router.push("/(tabs)/reminders")}>
            <Card style={[styles.progressTile, { borderColor: tokens.border, borderWidth: 1, shadowColor: tokens.shadow }]}> 
              <View style={[styles.tileIconWrap, { backgroundColor: tokens.categoryColors.Immigration.bg }]}> 
                <Ionicons name="notifications-outline" size={18} color={tokens.categoryColors.Immigration.fg} />
              </View>
              <Text style={[styles.tileTitle, { color: tokens.text }]}>Reminders</Text>
              <Text style={[styles.tileSub, { color: tokens.mutedText }]}> 
                {supportsReminderDueAt
                  ? `${reminderUpcoming} upcoming • ${reminderTotal} total`
                  : `${reminderTotal} total reminders`}
              </Text>
            </Card>
          </Pressable>
        </View>

        <Card style={[styles.aiRiskCard, { borderColor: tokens.border, borderWidth: 1, shadowColor: tokens.shadow }]}> 
          <View style={[styles.aiIconWrap, { backgroundColor: tokens.categoryColors.General.bg }]}> 
            <Ionicons name="sparkles-outline" size={18} color={tokens.categoryColors.General.fg} />
          </View>
          <View style={styles.aiTextWrap}>
            <Text style={[styles.aiTitle, { color: tokens.text }]}>AI Risk</Text>
            <Text style={[styles.aiSub, { color: tokens.mutedText }]}>Model insights are being connected. Live score will appear here soon.</Text>
          </View>
        </Card>

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
                  index < GROUPS.length - 1 && {
                    borderBottomColor: tokens.border,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                  },
                ]}
              >
                <View style={styles.groupLeft}>
                  <View style={[styles.groupIconTile, { backgroundColor: accent.bg }]}> 
                    <Ionicons name={group.icon} size={18} color={accent.fg} />
                  </View>
                  <View>
                    <Text style={[styles.groupLabel, { color: tokens.text }]}>{group.label}</Text>
                    <Text style={[styles.groupSub, { color: tokens.mutedText }]}> 
                      {tasksCategoryAvailable ? `${stats.total} tasks` : "Category data unavailable"}
                    </Text>
                  </View>
                </View>
                <CategoryRing percent={percent} size={40} strokeWidth={5} color={accent.fg} trackColor={accent.bg} textColor={accent.fg} />
              </Pressable>
            );
          })}
        </Card>

        <Card style={[styles.summaryCard, { borderColor: tokens.border, borderWidth: 1, shadowColor: tokens.shadow }]}> 
          <Text style={[styles.summaryTitle, { color: tokens.text }]}>Profile Completion</Text>
          <Text style={[styles.summaryValue, { color: tokens.primaryBlue }]}>{profileCompletion}%</Text>
          <Text style={[styles.summarySub, { color: tokens.mutedText }]}> 
            {supportsReminderPinned && reminderPinned !== null
              ? `${overallStats.total} tasks • ${reminderPinned} pinned reminders`
              : `${overallStats.total} tasks • ${reminderTotal} reminders`}
          </Text>
        </Card>

        {errorText ? <Text style={[styles.errorText, { color: tokens.danger }]}>{errorText}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  aiIconWrap: {
    alignItems: "center",
    borderRadius: 10,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  aiRiskCard: {
    alignItems: "center",
    borderRadius: 20,
    flexDirection: "row",
    gap: 12,
    minHeight: 84,
  },
  aiSub: {
    fontSize: 13,
    marginTop: 2,
  },
  aiTextWrap: {
    flex: 1,
  },
  aiTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  container: {
    gap: 14,
    paddingBottom: 120,
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  errorText: {
    fontSize: 13,
    textAlign: "center",
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
  summaryCard: {
    alignItems: "center",
    borderRadius: 20,
    gap: 2,
    minHeight: 98,
    justifyContent: "center",
  },
  summarySub: {
    fontSize: 13,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  summaryValue: {
    fontSize: 30,
    fontWeight: "900",
    lineHeight: 34,
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
