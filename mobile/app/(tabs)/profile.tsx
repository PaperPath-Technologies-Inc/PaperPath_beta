import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card } from "@/src/components/Card";
import { isSupabaseConfigured, supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/lib/useAuth";
import { useTheme } from "@/src/theme/useTheme";

type StatusValue = "student" | "pgwp";
type ProfileRow = {
  id: string;
  full_name?: string | null;
  city?: string | null;
  status?: StatusValue | null;
  expiry_date?: string | null;
  study_permit_expiry_date?: string | null;
  program_end_date?: string | null;
  plan?: string | null;
};

const STATUS_OPTIONS: StatusValue[] = ["student", "pgwp"];
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isNoRowError(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  const message = error.message?.toLowerCase() ?? "";
  return error.code === "PGRST116" || message.includes("0 rows");
}

function normalizeDate(value: string | null | undefined) {
  return value?.trim() ?? "";
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

function toTitleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

export default function ProfileScreen() {
  const { tokens } = useTheme();
  const { session, signOut } = useAuth();

  const user = session?.user;
  const userId = user?.id;
  const userEmail = user?.email ?? "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [city, setCity] = useState("");
  const [status, setStatus] = useState<StatusValue>("student");
  const [expiryDate, setExpiryDate] = useState("");
  const [studyPermitExpiryDate, setStudyPermitExpiryDate] = useState("");
  const [programEndDate, setProgramEndDate] = useState("");
  const [plan, setPlan] = useState("FREE");

  const [expiryDateError, setExpiryDateError] = useState<string | null>(null);
  const [studyPermitExpiryDateError, setStudyPermitExpiryDateError] = useState<string | null>(null);
  const [programEndDateError, setProgramEndDateError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const applyProfile = (profile: Partial<ProfileRow> | null) => {
      setFullName(profile?.full_name?.trim() ?? "");
      setCity(profile?.city?.trim() ?? "");
      setStatus(profile?.status && STATUS_OPTIONS.includes(profile.status) ? profile.status : "student");
      setExpiryDate(normalizeDate(profile?.expiry_date));
      setStudyPermitExpiryDate(normalizeDate(profile?.study_permit_expiry_date));
      setProgramEndDate(normalizeDate(profile?.program_end_date));
      setPlan((profile?.plan?.trim()?.toUpperCase() || "FREE") === "PRO" ? "PRO" : "FREE");
    };

    const loadProfile = async () => {
      if (!userId) {
        if (!cancelled) setLoading(false);
        return;
      }

      if (!isSupabaseConfigured) {
        if (!cancelled) {
          applyProfile({ status: "student" });
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setGeneralError(null);

      try {
        const fullSelect = await supabase
          .from("profiles")
          .select("id, full_name, city, status, expiry_date, study_permit_expiry_date, program_end_date, plan")
          .eq("id", userId)
          .single();

        if (!fullSelect.error) {
          if (!cancelled) {
            applyProfile(fullSelect.data as ProfileRow);
            setLoading(false);
          }
          return;
        }

        const fallbackSelect = await supabase
          .from("profiles")
          .select("id, city, status, expiry_date")
          .eq("id", userId)
          .single();

        if (!fallbackSelect.error) {
          if (!cancelled) {
            applyProfile(fallbackSelect.data as ProfileRow);
            setLoading(false);
          }
          return;
        }

        if (isNoRowError(fullSelect.error) || isNoRowError(fallbackSelect.error)) {
          if (!cancelled) {
            applyProfile({ status: "student" });
            setLoading(false);
          }
          return;
        }

        if (!cancelled) {
          setGeneralError("Could not load profile.");
        }
      } catch (error) {
        console.warn("Profile load failed", error);
        if (!cancelled) {
          setGeneralError("Could not load profile.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const initials = useMemo(() => {
    const source = fullName.trim() || userEmail.split("@")[0] || "U";
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "U";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }, [fullName, userEmail]);

  const validate = () => {
    let valid = true;

    setExpiryDateError(null);
    setStudyPermitExpiryDateError(null);
    setProgramEndDateError(null);

    if (!DATE_REGEX.test(expiryDate.trim())) {
      setExpiryDateError("Expiry date is required (YYYY-MM-DD).");
      valid = false;
    }

    if (studyPermitExpiryDate.trim() && !DATE_REGEX.test(studyPermitExpiryDate.trim())) {
      setStudyPermitExpiryDateError("Use YYYY-MM-DD or leave empty.");
      valid = false;
    }

    if (programEndDate.trim() && !DATE_REGEX.test(programEndDate.trim())) {
      setProgramEndDateError("Use YYYY-MM-DD or leave empty.");
      valid = false;
    }

    return valid;
  };

  const onSave = async () => {
    if (!userId) {
      return;
    }

    setSaveMessage(null);
    setGeneralError(null);

    if (!validate()) {
      return;
    }

    if (!isSupabaseConfigured) {
      setSaveMessage("Saved");
      return;
    }

    setSaving(true);

    const fullPayload = {
      id: userId,
      full_name: fullName.trim() || null,
      city: city.trim() || null,
      status,
      expiry_date: expiryDate.trim(),
      study_permit_expiry_date: studyPermitExpiryDate.trim() || null,
      program_end_date: programEndDate.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const corePayload = {
      id: userId,
      city: city.trim() || null,
      status,
      expiry_date: expiryDate.trim(),
      updated_at: new Date().toISOString(),
    };

    try {
      const fullTry = await supabase.from("profiles").upsert(fullPayload, { onConflict: "id" });
      let fullNameColumnMissing = false;

      if (fullTry.error) {
        fullNameColumnMissing = isMissingColumnError(fullTry.error, "full_name");
        const coreTry = await supabase.from("profiles").upsert(corePayload, { onConflict: "id" });
        if (coreTry.error) {
          throw coreTry.error;
        }
      }

      if (fullNameColumnMissing && user) {
        const trimmedName = fullName.trim();
        const { error } = await supabase.auth.updateUser({
          data: {
            full_name: trimmedName || null,
            name: trimmedName || null,
          },
        });
        if (error) {
          console.warn("Profile metadata update failed", error);
        }
      }

      setSaveMessage("Saved");
    } catch (error) {
      console.warn("Profile save failed", error);
      setGeneralError("Could not save profile.");
    } finally {
      setSaving(false);
    }
  };

  if (!userId) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: tokens.bg }]}> 
        <View style={styles.emptyWrap}>
          <Text style={[styles.emptyTitle, { color: tokens.text }]}>Profile</Text>
          <Text style={[styles.emptyCopy, { color: tokens.mutedText }]}>Please sign in</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tokens.bg }]}> 
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: tokens.text }]}>Profile</Text>

        <Card style={[styles.card, { borderColor: tokens.border, borderWidth: 1, shadowColor: tokens.shadow }]}> 
          <View style={styles.accountTop}>
            <View style={[styles.avatar, { backgroundColor: tokens.categoryColors.Immigration.bg }]}> 
              <Text style={[styles.avatarText, { color: tokens.categoryColors.Immigration.fg }]}>{initials}</Text>
            </View>
            <View style={styles.accountInfo}>
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder="Full name"
                placeholderTextColor={tokens.mutedText}
                style={[styles.nameInput, { color: tokens.text, borderColor: tokens.border, backgroundColor: tokens.card }]}
              />
              <Text style={[styles.email, { color: tokens.mutedText }]}>{userEmail}</Text>
              <View style={[styles.planBadge, { backgroundColor: tokens.categoryColors.General.bg }]}> 
                <Text style={[styles.planText, { color: tokens.categoryColors.General.fg }]}>{plan}</Text>
              </View>
            </View>
          </View>
        </Card>

        <Card style={[styles.card, { borderColor: tokens.border, borderWidth: 1, shadowColor: tokens.shadow }]}> 
          <Text style={[styles.sectionTitle, { color: tokens.text }]}>Personal</Text>
          <Text style={[styles.inputLabel, { color: tokens.mutedText }]}>City</Text>
          <TextInput
            value={city}
            onChangeText={setCity}
            placeholder="City"
            placeholderTextColor={tokens.mutedText}
            style={[styles.input, { color: tokens.text, borderColor: tokens.border, backgroundColor: tokens.card }]}
          />
        </Card>

        <Card style={[styles.card, { borderColor: tokens.border, borderWidth: 1, shadowColor: tokens.shadow }]}> 
          <Text style={[styles.sectionTitle, { color: tokens.text }]}>Immigration</Text>

          <Text style={[styles.inputLabel, { color: tokens.mutedText }]}>Status</Text>
          <View style={styles.statusWrap}>
            {STATUS_OPTIONS.map((option) => {
              const active = status === option;
              return (
                <Pressable
                  key={option}
                  onPress={() => setStatus(option)}
                  style={[
                    styles.statusChip,
                    {
                      backgroundColor: active ? tokens.primaryBlue : tokens.card,
                      borderColor: active ? tokens.primaryBlue : tokens.border,
                    },
                  ]}
                >
                  <Text style={[styles.statusChipText, { color: active ? "#FFFFFF" : tokens.text }]}>{toTitleCase(option)}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.inputLabel, { color: tokens.mutedText }]}>Status expiry date *</Text>
          <TextInput
            value={expiryDate}
            onChangeText={setExpiryDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={tokens.mutedText}
            autoCapitalize="none"
            style={[styles.input, { color: tokens.text, borderColor: tokens.border, backgroundColor: tokens.card }]}
          />
          {expiryDateError ? <Text style={[styles.error, { color: tokens.danger }]}>{expiryDateError}</Text> : null}

          <Text style={[styles.inputLabel, { color: tokens.mutedText }]}>Study permit expiry date</Text>
          <TextInput
            value={studyPermitExpiryDate}
            onChangeText={setStudyPermitExpiryDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={tokens.mutedText}
            autoCapitalize="none"
            style={[styles.input, { color: tokens.text, borderColor: tokens.border, backgroundColor: tokens.card }]}
          />
          {studyPermitExpiryDateError ? (
            <Text style={[styles.error, { color: tokens.danger }]}>{studyPermitExpiryDateError}</Text>
          ) : null}

          <Text style={[styles.inputLabel, { color: tokens.mutedText }]}>Program end date</Text>
          <TextInput
            value={programEndDate}
            onChangeText={setProgramEndDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={tokens.mutedText}
            autoCapitalize="none"
            style={[styles.input, { color: tokens.text, borderColor: tokens.border, backgroundColor: tokens.card }]}
          />
          {programEndDateError ? <Text style={[styles.error, { color: tokens.danger }]}>{programEndDateError}</Text> : null}
        </Card>

        <Card style={[styles.card, { borderColor: tokens.border, borderWidth: 1, shadowColor: tokens.shadow, padding: 0 }]}> 
          <ActionRow
            icon="pricetag-outline"
            label="Pricing"
            onPress={() => router.push("/(tabs)/pricing")}
            textColor={tokens.text}
            borderColor={tokens.border}
          />
          <ActionRow
            icon="log-out-outline"
            label="Logout"
            onPress={signOut}
            textColor={tokens.danger}
            borderColor={tokens.border}
            isLast
          />
        </Card>

        <Pressable
          onPress={() => {
            void onSave();
          }}
          disabled={saving || loading}
          style={[
            styles.saveButton,
            {
              backgroundColor: tokens.primaryBlue,
              opacity: saving || loading ? 0.7 : 1,
            },
          ]}
        >
          <Text style={styles.saveButtonText}>{saving ? "Saving..." : "Save changes"}</Text>
        </Pressable>

        {saveMessage ? <Text style={[styles.saved, { color: tokens.primaryBlue }]}>{saveMessage}</Text> : null}
        {generalError ? <Text style={[styles.error, { color: tokens.danger, textAlign: "center" }]}>{generalError}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionRow({
  borderColor,
  icon,
  isLast,
  label,
  onPress,
  textColor,
}: {
  borderColor: string;
  icon: keyof typeof Ionicons.glyphMap;
  isLast?: boolean;
  label: string;
  onPress: () => void | Promise<void>;
  textColor: string;
}) {
  const { tokens } = useTheme();

  return (
    <Pressable
      onPress={() => {
        void onPress();
      }}
      style={[styles.actionRow, !isLast && { borderBottomColor: borderColor, borderBottomWidth: StyleSheet.hairlineWidth }]}
    >
      <View style={styles.actionLeft}>
        <Ionicons name={icon} size={20} color={textColor} />
        <Text style={[styles.actionLabel, { color: textColor }]}>{label}</Text>
      </View>
      {label === "Logout" ? null : <Ionicons name="chevron-forward" size={18} color={tokens.mutedText} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  accountInfo: {
    flex: 1,
    gap: 6,
  },
  accountTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: "700",
  },
  actionLeft: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  actionRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 62,
    paddingHorizontal: 16,
  },
  avatar: {
    alignItems: "center",
    borderRadius: 30,
    height: 60,
    justifyContent: "center",
    width: 60,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: "800",
  },
  card: {
    borderRadius: 20,
    gap: 8,
  },
  container: {
    gap: 12,
    padding: 18,
    paddingBottom: 120,
  },
  email: {
    fontSize: 14,
  },
  emptyCopy: {
    fontSize: 16,
  },
  emptyTitle: {
    fontSize: 34,
    fontWeight: "800",
  },
  emptyWrap: {
    alignItems: "center",
    flex: 1,
    gap: 8,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  error: {
    fontSize: 13,
    marginTop: -2,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 15,
    minHeight: 46,
    paddingHorizontal: 12,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 6,
  },
  nameInput: {
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 18,
    fontWeight: "700",
    minHeight: 44,
    paddingHorizontal: 12,
  },
  planBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  planText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  safe: {
    flex: 1,
  },
  saveButton: {
    alignItems: "center",
    borderRadius: 14,
    justifyContent: "center",
    minHeight: 52,
    marginTop: 2,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  saved: {
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 2,
  },
  statusChip: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: 12,
  },
  statusChipText: {
    fontSize: 13,
    fontWeight: "700",
  },
  statusWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
  },
});
