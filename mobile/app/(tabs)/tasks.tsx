import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/src/components/Button";
import { Card } from "@/src/components/Card";
import { isSupabaseConfigured, supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/lib/useAuth";
import { useTheme } from "@/src/theme/useTheme";

type CategoryFilter = "All" | "General" | "Docs" | "School" | "Immigration";
type TaskStatus = "todo" | "done";

type TaskRow = {
  category: string | null;
  due_date: string | null;
  id: string;
  status: string | null;
  title: string | null;
};

const CATEGORY_FILTERS: CategoryFilter[] = ["All", "Immigration", "Docs", "School", "General"];
const TASK_CATEGORIES: Exclude<CategoryFilter, "All">[] = ["General", "Docs", "School", "Immigration"];

function resolveCategory(category: string | null): Exclude<CategoryFilter, "All"> {
  if (category === "Immigration" || category === "Docs" || category === "School" || category === "General") {
    return category;
  }
  return "General";
}

function parseDateOnly(value?: string | null) {
  if (!value) {
    return null;
  }
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }
  return new Date(year, month - 1, day);
}

function getDayDiff(from: Date, to: Date) {
  const diff = from.getTime() - to.getTime();
  return Math.floor(diff / 86400000);
}

export default function TasksScreen() {
  const { tokens } = useTheme();
  const categoryColors = tokens.categoryColors;
  const statusColors = tokens.statusColors;
  const { session } = useAuth();
  const params = useLocalSearchParams<{ category?: string | string[] }>();
  const userId = session?.user.id;

  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("All");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [titleInput, setTitleInput] = useState("");
  const [dueDateInput, setDueDateInput] = useState("");
  const [categoryInput, setCategoryInput] = useState<Exclude<CategoryFilter, "All">>("General");

  const rawCategoryParam = Array.isArray(params.category) ? params.category[0] : params.category;
  const hasAppliedInitialCategory = useRef(false);
  useEffect(() => {
    if (hasAppliedInitialCategory.current) {
      return;
    }
    hasAppliedInitialCategory.current = true;
    if (rawCategoryParam && CATEGORY_FILTERS.includes(rawCategoryParam as CategoryFilter)) {
      setSelectedCategory(rawCategoryParam as CategoryFilter);
    }
  }, [rawCategoryParam]);

  useEffect(() => {
    let cancelled = false;

    const loadTasks = async () => {
      if (!userId || !isSupabaseConfigured) {
        if (!cancelled) {
          setTasks([]);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setMessage(null);

      try {
        const { data, error } = await supabase
          .from("tasks")
          .select("id, title, status, due_date, category")
          .eq("user_id", userId);

        if (error) {
          throw error;
        }

        if (!cancelled) {
          setTasks((data ?? []) as TaskRow[]);
        }
      } catch (error) {
        console.warn("Failed to load tasks:", error);
        if (!cancelled) {
          setTasks([]);
          setMessage("Could not load tasks right now.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadTasks();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const filteredByCategory = useMemo(() => {
    if (selectedCategory === "All") {
      return tasks;
    }
    return tasks.filter((task) => task.category === selectedCategory);
  }, [selectedCategory, tasks]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<Exclude<CategoryFilter, "All">, number>();
    TASK_CATEGORIES.forEach((cat) => counts.set(cat, 0));

    for (const task of tasks) {
      if (task.category && counts.has(task.category as Exclude<CategoryFilter, "All">)) {
        const category = task.category as Exclude<CategoryFilter, "All">;
        counts.set(category, (counts.get(category) ?? 0) + 1);
      }
    }

    return counts;
  }, [tasks]);

  const openCreate = () => {
    setEditingTaskId(null);
    setTitleInput("");
    setDueDateInput("");
    setCategoryInput(selectedCategory === "All" ? "General" : selectedCategory);
    setEditorOpen(true);
    setMessage(null);
  };

  const openEdit = (task: TaskRow) => {
    setEditingTaskId(task.id);
    setTitleInput(task.title ?? "");
    setDueDateInput(task.due_date ?? "");
    setCategoryInput(
      task.category === "General" || task.category === "Docs" || task.category === "School" || task.category === "Immigration"
        ? task.category
        : "General"
    );
    setEditorOpen(true);
    setMessage(null);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingTaskId(null);
    setTitleInput("");
    setDueDateInput("");
    setCategoryInput(selectedCategory === "All" ? "General" : selectedCategory);
  };

  const isDateValid = (value: string) => {
    if (!value) {
      return true;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return false;
    }
    const date = new Date(`${value}T00:00:00`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  };

  const upsertTask = async () => {
    if (!userId || !isSupabaseConfigured || saving) {
      return;
    }

    const title = titleInput.trim();
    const dueDate = dueDateInput.trim();
    if (!title) {
      setMessage("Task title is required.");
      return;
    }
    if (!isDateValid(dueDate)) {
      setMessage("Due date must use YYYY-MM-DD format.");
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      if (editingTaskId) {
        const { data, error } = await supabase
          .from("tasks")
          .update({
            title,
            due_date: dueDate || null,
            category: categoryInput,
          })
          .eq("id", editingTaskId)
          .eq("user_id", userId)
          .select("id, title, status, due_date, category")
          .single();

        if (error) {
          throw error;
        }

        const updated = data as TaskRow;
        setTasks((prev) => prev.map((task) => (task.id === updated.id ? updated : task)));
      } else {
        const { data, error } = await supabase
          .from("tasks")
          .insert({
            user_id: userId,
            title,
            due_date: dueDate || null,
            category: categoryInput,
            status: "todo",
          })
          .select("id, title, status, due_date, category")
          .single();

        if (error) {
          throw error;
        }

        setTasks((prev) => [data as TaskRow, ...prev]);
      }

      closeEditor();
    } catch (error) {
      console.warn("Task save failed:", error);
      setMessage("Could not save task.");
    } finally {
      setSaving(false);
    }
  };

  const toggleDone = async (task: TaskRow) => {
    if (!userId || !isSupabaseConfigured || saving) {
      return;
    }

    const currentStatus = (task.status ?? "").toLowerCase();
    const nextStatus: TaskStatus = currentStatus === "done" ? "todo" : "done";

    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from("tasks")
        .update({ status: nextStatus })
        .eq("id", task.id)
        .eq("user_id", userId);

      if (error) {
        throw error;
      }

      setTasks((prev) =>
        prev.map((item) => (item.id === task.id ? { ...item, status: nextStatus } : item))
      );
    } catch (error) {
      console.warn("Task status update failed:", error);
      setMessage("Could not update task status.");
    } finally {
      setSaving(false);
    }
  };

  const progress = useMemo(() => {
    const done = filteredByCategory.filter((task) => (task.status ?? "").toLowerCase() === "done").length;
    const total = filteredByCategory.length;
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;
    return { done, percent, total };
  }, [filteredByCategory]);

  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const nextDue = useMemo(() => {
    const pendingWithDue = filteredByCategory
      .filter((task) => (task.status ?? "").toLowerCase() !== "done")
      .map((task) => parseDateOnly(task.due_date))
      .filter((date): date is Date => Boolean(date))
      .sort((a, b) => a.getTime() - b.getTime());
    return pendingWithDue[0] ?? null;
  }, [filteredByCategory]);

  const pathDueLabel = nextDue
    ? `Due in ${nextDue.toLocaleString("en-US", { month: "long" })}`
    : "No due date yet";

  const progressAccent = selectedCategory === "All" ? tokens.primaryBlue : categoryColors[selectedCategory].fg;

  const grouped = useMemo(() => {
    const urgent: TaskRow[] = [];
    const thisWeek: TaskRow[] = [];
    const total: TaskRow[] = [];

    for (const task of filteredByCategory) {
      const status = (task.status ?? "").toLowerCase();
      const due = parseDateOnly(task.due_date);
      if (status !== "done" && due) {
        const diff = getDayDiff(due, today);
        if (diff <= 3) {
          urgent.push(task);
          continue;
        }
        if (diff <= 7) {
          thisWeek.push(task);
          continue;
        }
      }
      total.push(task);
    }

    return { thisWeek, total, urgent };
  }, [filteredByCategory, today]);

  const formatDue = (task: TaskRow) => {
    const due = parseDateOnly(task.due_date);
    if (!due) {
      return "No due date";
    }
    const diff = getDayDiff(due, today);
    if ((task.status ?? "").toLowerCase() !== "done") {
      if (diff < 0) {
        return `${Math.abs(diff)}d overdue`;
      }
      if (diff === 0) {
        return "Due today";
      }
      if (diff <= 7) {
        return `${diff}d left`;
      }
    }
    return due.toLocaleDateString("en-US", { day: "numeric", month: "short" });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tokens.bg }]}>
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: tokens.text }]}>Tasks</Text>
            <View style={styles.headerActions}>
              <Pressable
                style={[styles.iconButton, { backgroundColor: tokens.card, borderColor: tokens.border }]}
                onPress={() => Alert.alert("Search", "Task search will be available in an upcoming update.")}
              >
                <Ionicons name="search-outline" size={18} color={tokens.text} />
              </Pressable>
              <Pressable
                style={[styles.iconButton, { backgroundColor: tokens.card, borderColor: tokens.border }]}
                onPress={() => Alert.alert("Notifications", "Task notifications are managed from Settings and Reminders.")}
              >
                <Ionicons name="notifications-outline" size={18} color={tokens.text} />
              </Pressable>
            </View>
          </View>
          <Text style={[styles.subtitle, { color: tokens.mutedText }]}>Your next steps to stay on track</Text>

          <View style={styles.progressWrap}>
            <View style={[styles.progressCard, { backgroundColor: tokens.primaryBlue || "#1F76FF" }]}>
              <View style={styles.progressOverlay} />
              <View style={styles.progressLeft}>
                <Text style={styles.progressEyebrow}>Path Progress</Text>
                <Text style={styles.progressDue}>{pathDueLabel}</Text>
                <Text style={styles.progressPercent}>{progress.percent}%</Text>
                <Text style={styles.progressTrack}>You're on track</Text>
              </View>
              <View style={styles.progressRing}>
                <View style={styles.ringContainer}>
                  <View style={styles.ringTrack} />
                  <View style={[styles.ringArc, { borderColor: progressAccent }]} />
                  <Text style={[styles.ringLabel, { color: progressAccent }]}>{progress.percent}%</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.createRow}>
            <Button title="+ Create task" onPress={openCreate} style={styles.createButton} />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
            {CATEGORY_FILTERS.map((category) => (
              <FilterChip
                key={category}
                label={category}
                count={category === "All" ? tasks.length : categoryCounts.get(category) ?? 0}
                active={selectedCategory === category}
                selectedColor={category === "All" ? tokens.primaryBlue : categoryColors[category].fg}
                onPress={() => setSelectedCategory(category)}
              />
            ))}
          </ScrollView>

          {editorOpen ? (
            <Card style={[styles.editorCard, { borderColor: tokens.border, borderWidth: 1 }]}>
              <Text style={[styles.editorTitle, { color: tokens.text }]}>
                {editingTaskId ? "Edit task" : "Create task"}
              </Text>

              <TextInput
                value={titleInput}
                onChangeText={setTitleInput}
                placeholder="Task title"
                placeholderTextColor={tokens.mutedText}
                style={[styles.input, { color: tokens.text, borderColor: tokens.border, backgroundColor: tokens.card }]}
              />
              <TextInput
                value={dueDateInput}
                onChangeText={setDueDateInput}
                placeholder="Due date (YYYY-MM-DD)"
                placeholderTextColor={tokens.mutedText}
                style={[styles.input, { color: tokens.text, borderColor: tokens.border, backgroundColor: tokens.card }]}
              />

              <View style={styles.categorySelectRow}>
                {TASK_CATEGORIES.map((category) => (
                  <FilterChip
                    key={category}
                    label={category}
                    active={categoryInput === category}
                    onPress={() => setCategoryInput(category)}
                  />
                ))}
              </View>

              <View style={styles.editorActions}>
                <Button title="Cancel" variant="secondary" onPress={closeEditor} style={styles.editorButton} />
                <Button title={editingTaskId ? "Save" : "Create"} onPress={upsertTask} style={styles.editorButton} />
              </View>
            </Card>
          ) : null}

          {message ? (
            <Text style={[styles.message, { color: tokens.warning || "#F59E0B" }]}>{message}</Text>
          ) : null}

          {loading ? (
            <Card style={[styles.stateCard, { borderColor: tokens.border, borderWidth: 1 }]}>
              <Text style={[styles.copy, { color: tokens.mutedText }]}>Loading tasks...</Text>
            </Card>
          ) : (
            <View style={styles.sectionsWrap}>
              <TaskSectionBlock
                label="URGENT"
                tasks={grouped.urgent}
                onEdit={openEdit}
                onToggleDone={toggleDone}
                formatDue={formatDue}
                categoryColors={categoryColors}
                statusColors={statusColors}
              />
              <TaskSectionBlock
                label="THIS WEEK"
                tasks={grouped.thisWeek}
                onEdit={openEdit}
                onToggleDone={toggleDone}
                formatDue={formatDue}
                categoryColors={categoryColors}
                statusColors={statusColors}
              />
              <TaskSectionBlock
                label="TOTAL"
                tasks={grouped.total}
                onEdit={openEdit}
                onToggleDone={toggleDone}
                formatDue={formatDue}
                categoryColors={categoryColors}
                statusColors={statusColors}
              />
            </View>
          )}
        </ScrollView>

        <Pressable style={[styles.fab, { backgroundColor: tokens.primaryBlue }]} onPress={openCreate}>
          <Ionicons name="add" size={30} color="#FFFFFF" />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function FilterChip({
  active,
  label,
  count,
  onPress,
  selectedColor,
}: {
  active: boolean;
  label: string;
  count?: number;
  onPress: () => void;
  selectedColor?: string;
}) {
  const { tokens } = useTheme();
  const activeColor = selectedColor ?? tokens.primaryBlue;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.filterChip,
        {
          backgroundColor: active ? activeColor : tokens.card,
          borderColor: active ? activeColor : tokens.border,
        },
      ]}
    >
      <Text style={[styles.filterChipText, { color: active ? "#FFFFFF" : tokens.text }]}>{label}</Text>
      {typeof count === "number" ? (
        <Text style={[styles.filterChipCount, { color: active ? "#FFFFFF" : tokens.mutedText }]}>{count}</Text>
      ) : null}
    </Pressable>
  );
}

function TaskSectionBlock({
  label,
  tasks,
  onEdit,
  onToggleDone,
  formatDue,
  categoryColors,
  statusColors,
}: {
  label: string;
  tasks: TaskRow[];
  onEdit: (task: TaskRow) => void;
  onToggleDone: (task: TaskRow) => void;
  formatDue: (task: TaskRow) => string;
  categoryColors: {
    Immigration: { fg: string; bg: string };
    Docs: { fg: string; bg: string };
    School: { fg: string; bg: string };
    General: { fg: string; bg: string };
  };
  statusColors: {
    done: { fg: string; bg: string };
    todo: { fg: string; bg: string };
    overdue: { fg: string; bg: string };
  };
}) {
  const { tokens } = useTheme();
  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  return (
    <View style={styles.sectionBlock}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionLabel, { color: tokens.text }]}>{label}</Text>
      </View>

      {tasks.length === 0 ? (
        <Card style={[styles.stateCard, { borderColor: tokens.border, borderWidth: 1 }]}>
          <Text style={[styles.copy, { color: tokens.mutedText }]}>No tasks</Text>
        </Card>
      ) : (
        <View style={styles.sectionList}>
          {tasks.map((task) => {
            const category = resolveCategory(task.category);
            const categoryAccent = categoryColors[category];
            const due = parseDateOnly(task.due_date);
            const rawStatus = (task.status ?? "").toLowerCase();
            const effectiveStatus: "done" | "todo" | "overdue" =
              due && getDayDiff(due, today) < 0 && rawStatus !== "done"
                ? "overdue"
                : rawStatus === "done"
                  ? "done"
                  : "todo";
            const statusAccent = statusColors[effectiveStatus];

            return (
            <Card key={task.id} style={[styles.taskCard, { borderColor: tokens.border, borderWidth: 1 }]}>
              <View style={styles.taskTop}>
                <View style={[styles.iconTile, { backgroundColor: categoryAccent.bg }]}>
                  <Ionicons
                    name={categoryIcon(task.category)}
                    size={16}
                    color={categoryAccent.fg}
                  />
                </View>

                <View style={styles.taskCenter}>
                  <Text style={[styles.taskTitle, { color: tokens.text }]}>{task.title || "Untitled task"}</Text>
                  <Text style={[styles.taskSub, { color: tokens.mutedText }]}>
                    {category} • {(task.status ?? "todo").toLowerCase() === "done" ? "Done" : "To do"}
                  </Text>
                </View>

                <View style={styles.taskRight}>
                  <View style={[styles.categoryBadge, { backgroundColor: categoryAccent.bg, borderColor: categoryAccent.bg }]}>
                    <Text style={[styles.categoryBadgeText, { color: categoryAccent.fg }]}>{category}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor: statusAccent.bg,
                        borderColor: statusAccent.bg,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: statusAccent.fg },
                      ]}
                    >
                      {effectiveStatus === "done" ? "Done" : effectiveStatus === "overdue" ? "Overdue" : "To do"}
                    </Text>
                  </View>
                  <Text style={[styles.dueText, { color: tokens.mutedText }]}>{formatDue(task)}</Text>
                </View>
              </View>

              <View style={styles.actionsRow}>
                <Button
                  title={(task.status ?? "").toLowerCase() === "done" ? "Undo" : "Mark done"}
                  onPress={() => onToggleDone(task)}
                  variant="secondary"
                  style={styles.actionButton}
                />
                <Button title="Edit task" onPress={() => onEdit(task)} style={styles.actionButton} />
              </View>
            </Card>
            );
          })}
        </View>
      )}
    </View>
  );
}

function categoryIcon(category: string | null) {
  if (category === "Immigration") {
    return "airplane-outline";
  }
  if (category === "Docs") {
    return "document-text-outline";
  }
  if (category === "School") {
    return "school-outline";
  }
  return "grid-outline";
}

const styles = StyleSheet.create({
  actionButton: {
    flex: 1,
    minHeight: 42,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  categorySelectRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  container: {
    gap: 14,
    paddingBottom: 128,
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  copy: {
    fontSize: 15,
  },
  createButton: {
    borderRadius: 999,
    minHeight: 42,
    paddingHorizontal: 16,
  },
  createRow: {
    alignItems: "flex-end",
  },
  dueText: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 6,
  },
  editorActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  editorButton: {
    flex: 1,
    minHeight: 46,
  },
  editorCard: {
    borderRadius: 20,
    gap: 10,
  },
  editorTitle: {
    fontSize: 20,
    fontWeight: "800",
  },
  fab: {
    alignItems: "center",
    borderRadius: 999,
    bottom: -30,
    elevation: 8,
    height: 60,
    justifyContent: "center",
    left: "50%",
    marginLeft: -30,
    position: "absolute",
    shadowColor: "#1F76FF",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    width: 60,
  },
  filterChip: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: 14,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: "700",
  },
  filterChipCount: {
    fontSize: 13,
    fontWeight: "600",
  },
  headerActions: {
    flexDirection: "row",
    gap: 10,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  iconButton: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  iconTile: {
    alignItems: "center",
    borderRadius: 10,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  input: {
    borderRadius: 16,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  message: {
    fontSize: 13,
  },
  pillsRow: {
    gap: 8,
    paddingVertical: 2,
  },
  progressCard: {
    borderRadius: 22,
    minHeight: 170,
    overflow: "hidden",
    padding: 18,
  },
  progressDue: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    marginTop: 2,
  },
  progressEyebrow: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  progressLeft: {
    flex: 1,
  },
  progressOverlay: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 999,
    height: 140,
    position: "absolute",
    right: -24,
    top: -18,
    width: 140,
  },
  progressPercent: {
    color: "#FFFFFF",
    fontSize: 38,
    fontWeight: "900",
    marginTop: 14,
  },
  progressRing: {
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    right: 18,
    top: 20,
  },
  progressTrack: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    fontWeight: "600",
    marginTop: -2,
  },
  progressWrap: {
    marginTop: 2,
  },
  ringArc: {
    borderRadius: 44,
    borderWidth: 8,
    height: 88,
    left: 0,
    position: "absolute",
    top: 0,
    width: 88,
  },
  ringContainer: {
    alignItems: "center",
    height: 88,
    justifyContent: "center",
    width: 88,
  },
  ringLabel: {
    fontSize: 18,
    fontWeight: "800",
    position: "absolute",
  },
  ringTrack: {
    backgroundColor: "rgba(255,255,255,0.26)",
    borderRadius: 44,
    height: 88,
    width: 88,
  },
  safe: {
    flex: 1,
  },
  screen: {
    flex: 1,
  },
  sectionBlock: {
    gap: 8,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 2,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  sectionList: {
    gap: 10,
  },
  sectionsWrap: {
    gap: 12,
  },
  stateCard: {
    borderRadius: 18,
  },
  statusPill: {
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  categoryBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 15,
    marginTop: -2,
  },
  taskCard: {
    borderRadius: 20,
  },
  taskCenter: {
    flex: 1,
    paddingHorizontal: 10,
  },
  taskRight: {
    alignItems: "flex-end",
    minWidth: 82,
  },
  taskSub: {
    fontSize: 13,
    marginTop: 3,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  taskTop: {
    alignItems: "center",
    flexDirection: "row",
  },
  title: {
    fontSize: 36,
    fontWeight: "900",
  },
});
