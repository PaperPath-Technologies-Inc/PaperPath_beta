import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card } from "@/src/components/Card";
import { isSupabaseConfigured, supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/lib/useAuth";
import { useTheme } from "@/src/theme/useTheme";

type ReminderCategory = "Immigration" | "Docs" | "School" | "General";

type ReminderRow = {
  id: string;
  user_id: string;
  title: string;
  notes: string | null;
  category?: ReminderCategory | null;
  due_at?: string | null;
  pinned?: boolean | null;
};

type SelectShape = {
  select: string;
  supportsCategory: boolean;
  supportsDueAt: boolean;
  supportsPinned: boolean;
};

const CATEGORIES: ReminderCategory[] = ["Immigration", "Docs", "School", "General"];

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

function isCategory(value: string | null | undefined): value is ReminderCategory {
  return value === "Immigration" || value === "Docs" || value === "School" || value === "General";
}

export default function ReminderEditorScreen() {
  const { tokens } = useTheme();
  const { session } = useAuth();
  const userId = session?.user.id;

  const params = useLocalSearchParams<{ id?: string | string[]; focus?: string | string[] }>();
  const idParam = Array.isArray(params.id) ? params.id[0] : params.id;
  const focusParam = Array.isArray(params.focus) ? params.focus[0] : params.focus;

  const isEditing = Boolean(idParam && idParam !== "new");

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [category, setCategory] = useState<ReminderCategory>("General");
  const [pinned, setPinned] = useState(false);

  const [titleError, setTitleError] = useState<string | null>(null);
  const [dueAtError, setDueAtError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const [supportsCategory, setSupportsCategory] = useState(true);
  const [supportsDueAt, setSupportsDueAt] = useState(true);
  const [supportsPinned, setSupportsPinned] = useState(true);

  const highlightDueAt = focusParam === "due_at";

  useEffect(() => {
    let cancelled = false;

    const loadReminder = async () => {
      if (!userId || !isEditing || !idParam || !isSupabaseConfigured) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setGeneralError(null);

      const candidates: SelectShape[] = [
        {
          select: "id, user_id, title, notes, category, due_at, pinned",
          supportsCategory: true,
          supportsDueAt: true,
          supportsPinned: true,
        },
        {
          select: "id, user_id, title, notes, category, due_at",
          supportsCategory: true,
          supportsDueAt: true,
          supportsPinned: false,
        },
        {
          select: "id, user_id, title, notes, category",
          supportsCategory: true,
          supportsDueAt: false,
          supportsPinned: false,
        },
        {
          select: "id, user_id, title, notes",
          supportsCategory: false,
          supportsDueAt: false,
          supportsPinned: false,
        },
      ];

      try {
        for (const candidate of candidates) {
          const response = await supabase
            .from("reminders")
            .select(candidate.select)
            .eq("id", idParam)
            .eq("user_id", userId)
            .single();

          if (response.error) {
            const hasMissingColumn =
              isMissingColumnError(response.error, "category") ||
              isMissingColumnError(response.error, "due_at") ||
              isMissingColumnError(response.error, "pinned");

            if (hasMissingColumn) {
              continue;
            }

            throw response.error;
          }

          if (cancelled) return;

          const row = response.data as ReminderRow;

          setTitle(row.title ?? "");
          setNotes(row.notes ?? "");
          setDueAt(candidate.supportsDueAt ? row.due_at ?? "" : "");
          setCategory(candidate.supportsCategory && isCategory(row.category) ? row.category : "General");
          setPinned(candidate.supportsPinned ? Boolean(row.pinned) : false);

          setSupportsCategory(candidate.supportsCategory);
          setSupportsDueAt(candidate.supportsDueAt);
          setSupportsPinned(candidate.supportsPinned);
          setLoading(false);
          return;
        }

        throw new Error("Could not load reminder.");
      } catch (error) {
        console.warn("Failed to load reminder", error);
        if (!cancelled) {
          setGeneralError("Could not load reminder.");
          setLoading(false);
        }
      }
    };

    void loadReminder();

    return () => {
      cancelled = true;
    };
  }, [idParam, isEditing, userId]);

  const validDueAt = useMemo(() => {
    if (!dueAt.trim()) return true;
    return !Number.isNaN(new Date(dueAt.trim()).getTime());
  }, [dueAt]);

  const validate = () => {
    setTitleError(null);
    setDueAtError(null);

    let ok = true;
    if (!title.trim()) {
      setTitleError("Title is required.");
      ok = false;
    }

    if (supportsDueAt && dueAt.trim() && !validDueAt) {
      setDueAtError("Due date/time must be a valid ISO date/time.");
      ok = false;
    }

    return ok;
  };

  const saveUpdate = async (id: string, uid: string) => {
    const updateAttempts = [
      {
        payload: {
          title: title.trim(),
          notes: notes.trim() || null,
          category,
          due_at: dueAt.trim() || null,
          pinned,
          updated_at: new Date().toISOString(),
        },
        supportsCategory: true,
        supportsDueAt: true,
        supportsPinned: true,
      },
      {
        payload: {
          title: title.trim(),
          notes: notes.trim() || null,
          category,
          due_at: dueAt.trim() || null,
          updated_at: new Date().toISOString(),
        },
        supportsCategory: true,
        supportsDueAt: true,
        supportsPinned: false,
      },
      {
        payload: {
          title: title.trim(),
          notes: notes.trim() || null,
          category,
          updated_at: new Date().toISOString(),
        },
        supportsCategory: true,
        supportsDueAt: false,
        supportsPinned: false,
      },
      {
        payload: {
          title: title.trim(),
          notes: notes.trim() || null,
          updated_at: new Date().toISOString(),
        },
        supportsCategory: false,
        supportsDueAt: false,
        supportsPinned: false,
      },
    ];

    let lastError: unknown = null;

    for (const attempt of updateAttempts) {
      const response = await supabase.from("reminders").update(attempt.payload).eq("id", id).eq("user_id", uid);

      if (!response.error) {
        setSupportsCategory(attempt.supportsCategory);
        setSupportsDueAt(attempt.supportsDueAt);
        setSupportsPinned(attempt.supportsPinned);
        return;
      }

      lastError = response.error;

      const hasMissingColumn =
        isMissingColumnError(response.error, "category") ||
        isMissingColumnError(response.error, "due_at") ||
        isMissingColumnError(response.error, "pinned");

      if (!hasMissingColumn) {
        throw response.error;
      }
    }

    throw lastError ?? new Error("Could not update reminder.");
  };

  const saveInsert = async (uid: string) => {
    const insertAttempts = [
      {
        payload: {
          user_id: uid,
          title: title.trim(),
          notes: notes.trim() || null,
          category,
          due_at: dueAt.trim() || null,
          pinned,
        },
        supportsCategory: true,
        supportsDueAt: true,
        supportsPinned: true,
      },
      {
        payload: {
          user_id: uid,
          title: title.trim(),
          notes: notes.trim() || null,
          category,
          due_at: dueAt.trim() || null,
        },
        supportsCategory: true,
        supportsDueAt: true,
        supportsPinned: false,
      },
      {
        payload: {
          user_id: uid,
          title: title.trim(),
          notes: notes.trim() || null,
          category,
        },
        supportsCategory: true,
        supportsDueAt: false,
        supportsPinned: false,
      },
      {
        payload: {
          user_id: uid,
          title: title.trim(),
          notes: notes.trim() || null,
        },
        supportsCategory: false,
        supportsDueAt: false,
        supportsPinned: false,
      },
    ];

    let lastError: unknown = null;

    for (const attempt of insertAttempts) {
      const response = await supabase.from("reminders").insert(attempt.payload);

      if (!response.error) {
        setSupportsCategory(attempt.supportsCategory);
        setSupportsDueAt(attempt.supportsDueAt);
        setSupportsPinned(attempt.supportsPinned);
        return;
      }

      lastError = response.error;

      const hasMissingColumn =
        isMissingColumnError(response.error, "category") ||
        isMissingColumnError(response.error, "due_at") ||
        isMissingColumnError(response.error, "pinned");

      if (!hasMissingColumn) {
        throw response.error;
      }
    }

    throw lastError ?? new Error("Could not create reminder.");
  };

  const onSave = async () => {
    if (!userId || !isSupabaseConfigured || saving) {
      return;
    }

    if (!validate()) {
      return;
    }

    setSaving(true);
    setGeneralError(null);

    try {
      if (isEditing && idParam) {
        await saveUpdate(idParam, userId);
      } else {
        await saveInsert(userId);
      }

      router.back();
    } catch (error) {
      console.warn("Failed to save reminder", error);
      setGeneralError("Could not save reminder.");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!isEditing || !idParam || !userId || !isSupabaseConfigured || deleting) {
      return;
    }

    setDeleting(true);
    setGeneralError(null);

    try {
      const { error } = await supabase.from("reminders").delete().eq("id", idParam).eq("user_id", userId);

      if (error) {
        throw error;
      }

      router.back();
    } catch (error) {
      console.warn("Failed to delete reminder", error);
      setGeneralError("Could not delete reminder.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tokens.bg }]}> 
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: tokens.text }]}>{isEditing ? "Edit reminder" : "New reminder"}</Text>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="close" size={24} color={tokens.text} />
          </Pressable>
        </View>

        <Card style={[styles.card, { borderColor: tokens.border, borderWidth: 1, shadowColor: tokens.shadow }]}> 
          <Text style={[styles.label, { color: tokens.mutedText }]}>Title *</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Reminder title"
            placeholderTextColor={tokens.mutedText}
            style={[styles.input, { color: tokens.text, borderColor: tokens.border, backgroundColor: tokens.card }]}
          />
          {titleError ? <Text style={[styles.error, { color: tokens.danger }]}>{titleError}</Text> : null}

          <Text style={[styles.label, { color: tokens.mutedText }]}>Notes</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Optional notes"
            placeholderTextColor={tokens.mutedText}
            multiline
            style={[styles.textArea, { color: tokens.text, borderColor: tokens.border, backgroundColor: tokens.card }]}
          />

          {supportsDueAt ? (
            <>
              <Text style={[styles.label, { color: tokens.mutedText }]}>Due at (ISO datetime)</Text>
              <TextInput
                value={dueAt}
                onChangeText={setDueAt}
                placeholder="2026-02-24T18:30:00Z"
                placeholderTextColor={tokens.mutedText}
                autoCapitalize="none"
                style={[
                  styles.input,
                  {
                    color: tokens.text,
                    borderColor: highlightDueAt ? tokens.primaryBlue : tokens.border,
                    backgroundColor: tokens.card,
                  },
                ]}
              />
              {dueAtError ? <Text style={[styles.error, { color: tokens.danger }]}>{dueAtError}</Text> : null}
            </>
          ) : (
            <Text style={[styles.helper, { color: tokens.mutedText }]}>Due date is not available in your schema.</Text>
          )}

          {supportsCategory ? (
            <>
              <Text style={[styles.label, { color: tokens.mutedText }]}>Category *</Text>
              <View style={styles.categoryRow}>
                {CATEGORIES.map((cat) => {
                  const active = cat === category;
                  return (
                    <Pressable
                      key={cat}
                      onPress={() => setCategory(cat)}
                      style={[
                        styles.categoryChip,
                        {
                          backgroundColor: active ? tokens.primaryBlue : tokens.card,
                          borderColor: active ? tokens.primaryBlue : tokens.border,
                        },
                      ]}
                    >
                      <Text style={[styles.categoryText, { color: active ? "#FFFFFF" : tokens.text }]}>{cat}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : null}

          {supportsPinned ? (
            <Pressable
              onPress={() => setPinned((v) => !v)}
              style={[styles.pinnedRow, { borderColor: tokens.border, backgroundColor: tokens.card }]}
            >
              <Ionicons name={pinned ? "pin" : "pin-outline"} size={18} color={tokens.primaryBlue} />
              <Text style={[styles.pinnedLabel, { color: tokens.text }]}>{pinned ? "Pinned" : "Pin reminder"}</Text>
            </Pressable>
          ) : null}
        </Card>

        {generalError ? <Text style={[styles.error, { color: tokens.danger }]}>{generalError}</Text> : null}

        <View style={styles.actions}>
          <Pressable onPress={() => router.back()} style={[styles.actionBtn, { borderColor: tokens.border, backgroundColor: tokens.card }]}> 
            <Text style={[styles.actionText, { color: tokens.text }]}>Cancel</Text>
          </Pressable>

          {isEditing ? (
            <Pressable onPress={() => void onDelete()} style={[styles.actionBtn, { borderColor: tokens.danger, backgroundColor: tokens.card }]}> 
              <Text style={[styles.actionText, { color: tokens.danger }]}>{deleting ? "Deleting..." : "Delete"}</Text>
            </Pressable>
          ) : null}

          <Pressable
            onPress={() => void onSave()}
            style={[styles.actionBtn, { borderColor: tokens.primaryBlue, backgroundColor: tokens.primaryBlue }]}
          >
            <Text style={[styles.actionText, { color: "#FFFFFF" }]}>{saving ? "Saving..." : "Save"}</Text>
          </Pressable>
        </View>

        {loading ? <Text style={[styles.loading, { color: tokens.mutedText }]}>Loading...</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actionBtn: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: 10,
  },
  actionText: {
    fontSize: 15,
    fontWeight: "700",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  card: {
    borderRadius: 18,
    gap: 8,
  },
  categoryChip: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: 12,
  },
  categoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 6,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: "700",
  },
  container: {
    gap: 12,
    padding: 18,
    paddingBottom: 30,
  },
  error: {
    fontSize: 13,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  helper: {
    fontSize: 12,
    marginTop: 4,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 15,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 4,
  },
  loading: {
    fontSize: 13,
    textAlign: "center",
  },
  pinnedLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  pinnedRow: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 42,
    paddingHorizontal: 12,
  },
  safe: {
    flex: 1,
  },
  textArea: {
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 15,
    minHeight: 88,
    paddingHorizontal: 12,
    paddingTop: 10,
    textAlignVertical: "top",
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
  },
});
