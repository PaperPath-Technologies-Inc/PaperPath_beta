import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card } from "@/src/components/Card";
import { isSupabaseConfigured, supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/lib/useAuth";
import { useTheme } from "@/src/theme/useTheme";

type ReminderCategory = "Immigration" | "Docs" | "School" | "General";
type FilterKey = "all" | "today" | "upcoming" | "past";

type ReminderRow = {
  id: string;
  user_id: string;
  title: string;
  notes: string | null;
  category: ReminderCategory | null;
  due_at: string | null;
  pinned: boolean;
  created_at: string | null;
  updated_at: string | null;
};

type QueryShape = {
  select: string;
  supportsPinned: boolean;
  supportsCategory: boolean;
  supportsDueAt: boolean;
  orderPinned?: boolean;
  orderDueAt?: boolean;
};

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "today", label: "Today" },
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past" },
];

function formatDueLabel(value: string | null) {
  if (!value) {
    return "No time set";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function isReminderCategory(value: string | null | undefined): value is ReminderCategory {
  return value === "Immigration" || value === "Docs" || value === "School" || value === "General";
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

function categoryIcon(category: ReminderCategory | null) {
  if (category === "Immigration") return "earth-outline" as const;
  if (category === "Docs") return "document-text-outline" as const;
  if (category === "School") return "school-outline" as const;
  return "sparkles-outline" as const;
}

function parseDueDate(value: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function inDateBucket(value: string | null, filter: FilterKey) {
  if (filter === "all") return true;

  const due = parseDueDate(value);
  if (!due) return false;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  if (filter === "today") {
    return due >= todayStart && due < tomorrowStart;
  }

  if (filter === "upcoming") {
    return due >= tomorrowStart;
  }

  return due < todayStart;
}

export default function RemindersScreen() {
  const { tokens, isDark } = useTheme();
  const { session } = useAuth();
  const userId = session?.user.id;
  const { width } = useWindowDimensions();

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reminders, setReminders] = useState<ReminderRow[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");

  const [supportsPinned, setSupportsPinned] = useState(true);
  const [supportsCategory, setSupportsCategory] = useState(true);
  const [supportsDueAt, setSupportsDueAt] = useState(true);

  const fetchReminders = useCallback(async () => {
    if (!userId || !isSupabaseConfigured) {
      setReminders([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    const candidates: QueryShape[] = [
      {
        select: "id, user_id, title, notes, category, due_at, pinned, created_at, updated_at",
        supportsPinned: true,
        supportsCategory: true,
        supportsDueAt: true,
        orderPinned: true,
        orderDueAt: true,
      },
      {
        select: "id, user_id, title, notes, category, due_at, created_at, updated_at",
        supportsPinned: false,
        supportsCategory: true,
        supportsDueAt: true,
        orderDueAt: true,
      },
      {
        select: "id, user_id, title, notes, due_at, created_at, updated_at",
        supportsPinned: false,
        supportsCategory: false,
        supportsDueAt: true,
        orderDueAt: true,
      },
      {
        select: "id, user_id, title, notes, created_at, updated_at",
        supportsPinned: false,
        supportsCategory: false,
        supportsDueAt: false,
      },
    ];

    let lastError: unknown = null;

    try {
      for (const candidate of candidates) {
        let query = supabase.from("reminders").select(candidate.select).eq("user_id", userId);

        if (candidate.orderPinned) {
          query = query.order("pinned", { ascending: false });
        }
        if (candidate.orderDueAt) {
          query = query.order("due_at", { ascending: true });
        }
        query = query.order("created_at", { ascending: false });

        const response = await query;

        if (response.error) {
          lastError = response.error;

          const missingColumn =
            isMissingColumnError(response.error, "pinned") ||
            isMissingColumnError(response.error, "category") ||
            isMissingColumnError(response.error, "due_at");

          if (missingColumn) {
            continue;
          }
          break;
        }

        const rows = (response.data ?? []) as {
          id: string;
          user_id: string;
          title: string;
          notes?: string | null;
          category?: string | null;
          due_at?: string | null;
          pinned?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        }[];

        const mapped: ReminderRow[] = rows.map((row) => ({
          id: row.id,
          user_id: row.user_id,
          title: row.title,
          notes: row.notes ?? null,
          category: candidate.supportsCategory && isReminderCategory(row.category) ? row.category : null,
          due_at: candidate.supportsDueAt ? row.due_at ?? null : null,
          pinned: candidate.supportsPinned ? Boolean(row.pinned) : false,
          created_at: row.created_at ?? null,
          updated_at: row.updated_at ?? null,
        }));

        setSupportsPinned(candidate.supportsPinned);
        setSupportsCategory(candidate.supportsCategory);
        setSupportsDueAt(candidate.supportsDueAt);
        setReminders(mapped);
        return;
      }

      throw lastError ?? new Error("Unknown reminders query error");
    } catch (error) {
      console.warn("Failed to load reminders", error);
      setSupportsPinned(false);
      setSupportsCategory(false);
      setSupportsDueAt(false);
      setReminders([]);
      setErrorMessage("Could not load reminders.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void fetchReminders();
    }, [fetchReminders])
  );

  const pinned = useMemo(
    () => (supportsPinned ? reminders.filter((row) => row.pinned) : []),
    [reminders, supportsPinned]
  );

  const unpinned = useMemo(
    () => (supportsPinned ? reminders.filter((row) => !row.pinned) : reminders),
    [reminders, supportsPinned]
  );

  const filteredUpcoming = useMemo(
    () =>
      unpinned.filter((row) => {
        if (!supportsDueAt && activeFilter !== "all") {
          return false;
        }
        return inDateBucket(row.due_at, activeFilter);
      }),
    [activeFilter, supportsDueAt, unpinned]
  );

  const headerMuted = isDark ? "rgba(236,243,255,0.72)" : tokens.mutedText;
  const chipBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(11,27,58,0.05)";
  const chipActiveBg = isDark ? "rgba(255,255,255,0.12)" : "rgba(11,27,58,0.10)";
  const iconNeutralBg = isDark ? "rgba(255,255,255,0.06)" : "#EEF2F8";

  const pinnedCardWidth = Math.max(180, Math.min(320, (width - 56) / 1.4));

  const openEditor = (id?: string) => {
    router.push({
      pathname: "/(modals)/reminder-editor",
      params: { id: id ?? "new" },
    });
  };

  const togglePinned = async (row: ReminderRow) => {
    if (!userId || !isSupabaseConfigured || !supportsPinned) {
      return;
    }

    const nextPinned = !row.pinned;
    setReminders((prev) => prev.map((item) => (item.id === row.id ? { ...item, pinned: nextPinned } : item)));

    const { error } = await supabase
      .from("reminders")
      .update({ pinned: nextPinned, updated_at: new Date().toISOString() })
      .eq("id", row.id)
      .eq("user_id", userId);

    if (error) {
      if (isMissingColumnError(error, "pinned")) {
        setSupportsPinned(false);
        setReminders((prev) => prev.map((item) => ({ ...item, pinned: false })));
        return;
      }
      console.warn("Failed to toggle pin", error);
      setReminders((prev) => prev.map((item) => (item.id === row.id ? { ...item, pinned: row.pinned } : item)));
    }
  };

  if (!userId) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: tokens.bg }]}>
        <View style={styles.signedOutWrap}>
          <Text style={[styles.title, { color: tokens.text }]}>Reminders</Text>
          <Text style={[styles.subtitle, { color: tokens.mutedText }]}>Please sign in</Text>
        </View>
      </SafeAreaView>
    );
  }

  const hasAny = reminders.length > 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tokens.bg }]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: tokens.text }]}>Reminders</Text>
          <Text style={[styles.subtitle, { color: headerMuted }]}>Stay on track with deadlines and tasks</Text>
        </View>

        {loading ? (
          <Card style={[styles.emptyCard, { borderColor: tokens.border, borderWidth: 1, shadowColor: tokens.shadow }]}>
            <Text style={[styles.emptyTitle, { color: tokens.text }]}>Loading reminders...</Text>
          </Card>
        ) : !hasAny ? (
          <Card style={[styles.emptyCard, { borderColor: tokens.border, borderWidth: 1, shadowColor: tokens.shadow }]}>
            <View style={[styles.emptyIcon, { backgroundColor: chipBg, borderColor: tokens.border }]}>
              <Ionicons name="notifications-outline" size={26} color={tokens.primaryBlue} />
            </View>
            <Text style={[styles.emptyTitle, { color: tokens.text }]}>No reminders yet</Text>
            <Text style={[styles.emptyCopy, { color: tokens.mutedText }]}>
              Tap the + button to create your first reminder.
            </Text>
          </Card>
        ) : (
          <>
            {supportsPinned ? (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: tokens.text }]}>Pinned</Text>
                </View>

                {pinned.length > 0 ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.pinnedRow}
                    decelerationRate="fast"
                    snapToAlignment="start"
                  >
                    {pinned.map((row) => {
                      const categoryColor = row.category ? tokens.categoryColors[row.category] : null;
                      const pillBg = categoryColor ? categoryColor.bg : chipBg;
                      const pillFg = categoryColor ? categoryColor.fg : tokens.mutedText;

                      return (
                        <Pressable key={row.id} onPress={() => openEditor(row.id)} style={{ width: pinnedCardWidth }}>
                          <Card
                            padded={false}
                            style={[
                              styles.pinnedCard,
                              {
                                borderColor: tokens.border,
                                borderWidth: 1,
                                shadowColor: tokens.shadow,
                                backgroundColor: tokens.card,
                              },
                            ]}
                          >
                            <View style={styles.pinnedTopRow}>
                              {supportsCategory && row.category ? (
                                <View style={[styles.categoryPill, { backgroundColor: pillBg }]}>
                                  <Text style={[styles.categoryPillText, { color: pillFg }]} numberOfLines={1}>
                                    {row.category}
                                  </Text>
                                </View>
                              ) : (
                                <View />
                              )}
                              <Pressable
                                onPress={(event) => {
                                  event.stopPropagation();
                                  void togglePinned(row);
                                }}
                                hitSlop={10}
                              >
                                <Ionicons name="pin" size={15} color={tokens.primaryBlue} />
                              </Pressable>
                            </View>

                            <Text style={[styles.pinnedTitle, { color: tokens.text }]} numberOfLines={2}>
                              {row.title}
                            </Text>

                            {row.notes ? (
                              <Text style={[styles.pinnedNotes, { color: tokens.mutedText }]} numberOfLines={2}>
                                {row.notes}
                              </Text>
                            ) : null}

                            {supportsDueAt ? (
                              <View style={[styles.dueChip, { backgroundColor: chipBg, borderColor: tokens.border }]}>
                                <Ionicons name="calendar-outline" size={13} color={tokens.mutedText} />
                                <Text style={[styles.dueChipText, { color: tokens.mutedText }]} numberOfLines={1}>
                                  {formatDueLabel(row.due_at)}
                                </Text>
                              </View>
                            ) : null}
                          </Card>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                ) : (
                  <Card style={[styles.stateCard, { borderColor: tokens.border, borderWidth: 1, shadowColor: tokens.shadow }]}>
                    <Text style={[styles.stateCopy, { color: tokens.mutedText }]}>No pinned reminders</Text>
                  </Card>
                )}
              </>
            ) : null}

            <View style={[styles.sectionHeader, supportsPinned && { marginTop: 4 }]}>
              <Text style={[styles.sectionTitle, { color: tokens.text }]}>Upcoming</Text>
            </View>

            <View style={[styles.filterWrap, { backgroundColor: chipBg, borderColor: tokens.border }]}>
              {FILTERS.map((filter) => {
                const active = activeFilter === filter.key;
                return (
                  <Pressable
                    key={filter.key}
                    onPress={() => setActiveFilter(filter.key)}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: active ? chipActiveBg : "transparent",
                        borderColor: active ? tokens.border : "transparent",
                      },
                    ]}
                  >
                    <Text
                      style={[styles.filterChipText, { color: active ? tokens.text : tokens.mutedText }]}
                      numberOfLines={1}
                      ellipsizeMode="clip"
                    >
                      {filter.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {filteredUpcoming.length > 0 ? (
              <Card style={[styles.listCard, { borderColor: tokens.border, borderWidth: 1, shadowColor: tokens.shadow }]}>
                {filteredUpcoming.map((row, idx) => {
                  const categoryColor = row.category ? tokens.categoryColors[row.category] : null;
                  const tileBg = categoryColor ? categoryColor.bg : iconNeutralBg;
                  const tileFg = categoryColor ? categoryColor.fg : tokens.mutedText;

                  return (
                    <View
                      key={row.id}
                      style={[
                        styles.listRow,
                        idx < filteredUpcoming.length - 1 && {
                          borderBottomColor: tokens.border,
                          borderBottomWidth: StyleSheet.hairlineWidth,
                        },
                      ]}
                    >
                      <View style={[styles.categoryTile, { backgroundColor: tileBg, borderColor: tokens.border }]}>
                        <Ionicons name={categoryIcon(row.category)} size={17} color={tileFg} />
                      </View>

                      <Pressable style={styles.listTextWrap} onPress={() => openEditor(row.id)}>
                        <Text style={[styles.listTitle, { color: tokens.text }]} numberOfLines={1}>
                          {row.title}
                        </Text>
                        <Text style={[styles.listSub, { color: tokens.mutedText }]} numberOfLines={1}>
                          {row.notes || "Reminder"}
                        </Text>
                        <Text style={[styles.listDue, { color: tokens.mutedText }]} numberOfLines={1}>
                          {supportsDueAt ? formatDueLabel(row.due_at) : "Due date unavailable"}
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => openEditor(row.id)}
                        style={[styles.editButton, { borderColor: tokens.border, backgroundColor: chipBg }]}
                        hitSlop={10}
                      >
                        <Ionicons name="pencil" size={14} color={tokens.mutedText} />
                      </Pressable>
                    </View>
                  );
                })}
              </Card>
            ) : (
              <Card style={[styles.stateCard, { borderColor: tokens.border, borderWidth: 1, shadowColor: tokens.shadow }]}>
                <Text style={[styles.stateCopy, { color: tokens.mutedText }]}>No reminders in this filter</Text>
              </Card>
            )}
          </>
        )}

        {errorMessage ? <Text style={[styles.errorText, { color: tokens.danger }]}>{errorMessage}</Text> : null}
      </ScrollView>

      <Pressable style={[styles.fab, { backgroundColor: tokens.primaryBlue, shadowColor: tokens.shadow }]} onPress={() => openEditor()}>
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // --- pills / tiles ---
  categoryPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    maxWidth: "80%",
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: "700",
  },
  categoryTile: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
  },

  // --- layout ---
  container: {
    gap: 12,
    paddingBottom: 130,
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  header: {
    gap: 6,
  },

  // --- header typography ---
  title: {
    fontSize: 34,
    fontWeight: "900",
  },
  subtitle: {
    fontSize: 16,
  },

  // --- empty states ---
  emptyCard: {
    alignItems: "center",
    borderRadius: 18,
    gap: 8,
    justifyContent: "center",
    minHeight: 210,
    paddingHorizontal: 18,
  },
  emptyIcon: {
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  emptyCopy: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },

  // --- sections ---
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "900",
  },

  // --- pinned cards ---
  pinnedRow: {
    gap: 10,
    paddingRight: 12,
  },
  pinnedCard: {
    borderRadius: 18,
    gap: 8,
    minHeight: 150,
    padding: 14,
  },
  pinnedTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 22,
  },
  pinnedTitle: {
    fontSize: 19,
    fontWeight: "800",
    lineHeight: 24,
  },
  pinnedNotes: {
    fontSize: 13,
    lineHeight: 18,
  },

  // --- due chip ---
  dueChip: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
    maxWidth: "100%",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  dueChipText: {
    fontSize: 12,
    fontWeight: "600",
  },

  // --- filter segmented ---
  filterWrap: {
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    padding: 4,
  },
  filterChip: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: "700",
  },

  // --- list ---
  listCard: {
    borderRadius: 18,
    paddingVertical: 2,
  },
  listRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    minHeight: 78,
    paddingHorizontal: 10,
  },
  listTextWrap: {
    flex: 1,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  listSub: {
    fontSize: 13,
    marginTop: 2,
  },
  listDue: {
    fontSize: 13,
    marginTop: 3,
  },

  editButton: {
    alignItems: "center",
    borderRadius: 9,
    borderWidth: 1,
    height: 30,
    justifyContent: "center",
    width: 30,
  },

  // --- generic states ---
  stateCard: {
    borderRadius: 18,
    justifyContent: "center",
    minHeight: 64,
    paddingVertical: 4,
  },
  stateCopy: {
    fontSize: 14,
    textAlign: "center",
  },
  errorText: {
    fontSize: 13,
    textAlign: "center",
  },

  // --- fab ---
  fab: {
    alignItems: "center",
    borderRadius: 999,
    bottom: 94,
    elevation: 8,
    height: 58,
    justifyContent: "center",
    position: "absolute",
    right: 20,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    width: 58,
  },

  // --- signed out ---
  signedOutWrap: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  safe: { flex: 1 },
});
