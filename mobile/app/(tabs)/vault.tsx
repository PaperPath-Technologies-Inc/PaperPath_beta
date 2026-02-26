import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useMemo, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card } from "@/src/components/Card";
import { isSupabaseConfigured, supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/lib/useAuth";
import { useTheme } from "@/src/theme/useTheme";

type VaultCategory = "All" | "Immigration" | "Docs" | "School" | "General";
type FolderCategory = Exclude<VaultCategory, "All">;

type FolderItem = {
  category: FolderCategory;
  count: number;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
};

type VaultDocumentRow = {
  id: string;
  user_id: string;
  name: string;
  category: FolderCategory;
  file_type: string | null;
  mime_type: string | null;
  size: number | null;
  storage_path: string;
  created_at: string;
};

const CHIPS: VaultCategory[] = ["All", "Immigration", "Docs", "School", "General"];

const FOLDER_META: Omit<FolderItem, "count">[] = [
  { category: "Immigration", icon: "airplane-outline", title: "Immigration" },
  { category: "Docs", icon: "document-text-outline", title: "Docs" },
  { category: "School", icon: "school-outline", title: "School" },
  { category: "General", icon: "folder-open-outline", title: "General" },
];

const ACCEPTED_CATEGORIES: FolderCategory[] = ["Immigration", "Docs", "School", "General"];

function formatDateLabel(value: string | null | undefined) {
  if (!value) return "Unknown date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function normalizeCategory(value: string | null | undefined): FolderCategory {
  if (value && ACCEPTED_CATEGORIES.includes(value as FolderCategory)) {
    return value as FolderCategory;
  }
  return "General";
}

function extractExtension(name: string) {
  const parts = name.split(".");
  if (parts.length < 2) return "FILE";
  return parts[parts.length - 1].toUpperCase();
}

function isMissingVaultTableError(error: unknown) {
  const message =
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message?: string }).message ?? "").toLowerCase()
      : "";
  return message.includes("vault_documents") || message.includes("relation") || message.includes("does not exist");
}

function pickRowIcon(mimeType: string | null, fileType: string | null) {
  const mime = (mimeType ?? "").toLowerCase();
  const ext = (fileType ?? "").toLowerCase();

  if (mime.startsWith("image/") || ["jpg", "jpeg", "png", "webp"].includes(ext)) {
    return "image-outline" as const;
  }

  if (mime.includes("pdf") || ext === "pdf") {
    return "document-outline" as const;
  }

  return "document-text-outline" as const;
}

function buildStoragePath(userId: string, fileName: string) {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${userId}/${Date.now()}-${safeName}`;
}

export default function VaultScreen() {
  const { tokens } = useTheme();
  const { width } = useWindowDimensions();
  const { session } = useAuth();

  const userId = session?.user.id;

  const [selectedCategory, setSelectedCategory] = useState<VaultCategory>("All");
  const [query, setQuery] = useState("");
  const [documents, setDocuments] = useState<VaultDocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [tableAvailable, setTableAvailable] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const itemWidth = (width - 18 * 2 - 10) / 2;

  const loadDocuments = useCallback(async () => {
    if (!userId || !isSupabaseConfigured) {
      setDocuments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await supabase
        .from("vault_documents")
        .select("id, user_id, name, category, file_type, mime_type, size, storage_path, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (response.error) {
        if (isMissingVaultTableError(response.error)) {
          setTableAvailable(false);
          setDocuments([]);
          setErrorMessage("Vault table is not available yet.");
          return;
        }
        throw response.error;
      }

      setTableAvailable(true);
      const rows = (response.data ?? []) as VaultDocumentRow[];
      setDocuments(
        rows.map((row) => ({
          ...row,
          category: normalizeCategory(row.category),
        }))
      );
    } catch (error) {
      console.warn("Failed to load vault documents", error);
      setDocuments([]);
      setErrorMessage("Could not load documents.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void loadDocuments();
    }, [loadDocuments])
  );

  const folderCounts = useMemo(() => {
    return {
      Immigration: documents.filter((doc) => doc.category === "Immigration").length,
      Docs: documents.filter((doc) => doc.category === "Docs").length,
      School: documents.filter((doc) => doc.category === "School").length,
      General: documents.filter((doc) => doc.category === "General").length,
    };
  }, [documents]);

  const folders = useMemo<FolderItem[]>(() => {
    return FOLDER_META.map((item) => ({
      ...item,
      count: folderCounts[item.category],
    }));
  }, [folderCounts]);

  const filteredUploads = useMemo(() => {
    const q = query.trim().toLowerCase();
    return documents.filter((file) => {
      const categoryMatch = selectedCategory === "All" || file.category === selectedCategory;
      const queryMatch = !q || file.name.toLowerCase().includes(q);
      return categoryMatch && queryMatch;
    });
  }, [documents, query, selectedCategory]);

  const totalCount = documents.length;

  const askCategory = () => {
    return new Promise<FolderCategory | null>((resolve) => {
      Alert.alert("Select category", "Choose a category for this document.", [
        { text: "Immigration", onPress: () => resolve("Immigration") },
        { text: "Docs", onPress: () => resolve("Docs") },
        { text: "School", onPress: () => resolve("School") },
        { text: "General", onPress: () => resolve("General") },
        { text: "Cancel", style: "cancel", onPress: () => resolve(null) },
      ]);
    });
  };

  const handleUploadPress = async () => {
    if (!userId) {
      Alert.alert("Sign in required", "Please sign in to upload documents.");
      return;
    }

    if (!isSupabaseConfigured) {
      Alert.alert("Supabase not configured", "Set Supabase environment variables before uploading.");
      return;
    }

    if (!tableAvailable) {
      Alert.alert("Vault unavailable", "The vault_documents table is missing. Create it before uploading.");
      return;
    }

    try {
      const category = await askCategory();
      if (!category) return;

      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (!result || result.canceled) {
        return;
      }

      const asset = result.assets?.[0];
      if (!asset?.uri || !asset.name) {
        Alert.alert("Upload failed", "Selected file is missing required metadata.");
        return;
      }

      setUploading(true);

      const fileResponse = await fetch(asset.uri);
      if (!fileResponse.ok) {
        throw new Error("Could not read selected file.");
      }
      const arrayBuffer = await fileResponse.arrayBuffer();

      const storagePath = buildStoragePath(userId, asset.name);
      const mimeType = asset.mimeType ?? null;
      const fileType = extractExtension(asset.name);
      const size = typeof asset.size === "number" ? asset.size : arrayBuffer.byteLength;

      const uploadResult = await supabase.storage.from("vault").upload(storagePath, arrayBuffer, {
        contentType: mimeType ?? "application/octet-stream",
        upsert: false,
      });

      if (uploadResult.error) {
        throw uploadResult.error;
      }

      const insertResult = await supabase.from("vault_documents").insert({
        user_id: userId,
        name: asset.name,
        category,
        file_type: fileType,
        mime_type: mimeType,
        size,
        storage_path: storagePath,
      });

      if (insertResult.error) {
        throw insertResult.error;
      }

      Alert.alert("Uploaded", `${asset.name} uploaded successfully.`);
      await loadDocuments();
    } catch (err) {
      console.warn("Vault upload failed", err);
      const message = err instanceof Error ? err.message : String(err);
      Alert.alert("Upload failed", message || "Could not upload file.");
    } finally {
      setUploading(false);
    }
  };

  const openDocument = async (doc: VaultDocumentRow) => {
    if (!isSupabaseConfigured) {
      Alert.alert("Unavailable", "Supabase is not configured.");
      return;
    }

    try {
      const signed = await supabase.storage.from("vault").createSignedUrl(doc.storage_path, 60 * 10);
      if (signed.error || !signed.data?.signedUrl) {
        throw signed.error ?? new Error("Could not create file URL.");
      }

      const canOpen = await Linking.canOpenURL(signed.data.signedUrl);
      if (!canOpen) {
        throw new Error("No app available to preview this file.");
      }

      await Linking.openURL(signed.data.signedUrl);
    } catch (err) {
      console.warn("Open document failed", err);
      const message = err instanceof Error ? err.message : String(err);
      Alert.alert("Preview failed", message || "Could not open file preview.");
    }
  };

  if (!userId) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: tokens.bg }]}> 
        <View style={styles.screen}>
          <View style={styles.emptyStateWrap}>
            <Text style={[styles.title, { color: tokens.text }]}>Docs Vault</Text>
            <Text style={[styles.emptyCopy, { color: tokens.mutedText }]}>Please sign in to manage documents.</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tokens.bg }]}> 
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.title, { color: tokens.text }]}>Docs Vault</Text>
              <Text style={[styles.subtitle, { color: tokens.mutedText }]}>Your documents, organized</Text>
            </View>
            <Pressable
              onPress={() => {
                void handleUploadPress();
              }}
              disabled={uploading || loading}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={[styles.uploadButton, { backgroundColor: tokens.primaryBlue, opacity: uploading || loading ? 0.7 : 1 }]}
            >
              <Ionicons name="cloud-upload-outline" size={16} color="#FFFFFF" />
              <Text style={styles.uploadText}>{uploading ? "Uploading..." : "Upload"}</Text>
            </Pressable>
          </View>

          <View
            style={[
              styles.searchWrap,
              { backgroundColor: tokens.card, borderColor: tokens.border, shadowColor: tokens.shadow },
            ]}
          >
            <Ionicons name="search-outline" size={18} color={tokens.mutedText} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search documents"
              placeholderTextColor={tokens.mutedText}
              style={[styles.searchInput, { color: tokens.text }]}
            />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {CHIPS.map((chip) => {
              const accent = chip === "All" ? tokens.primaryBlue : tokens.categoryColors[chip].fg;
              const count = chip === "All" ? totalCount : folderCounts[chip];

              return (
                <Pressable
                  key={chip}
                  onPress={() => setSelectedCategory(chip)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selectedCategory === chip ? accent : tokens.card,
                      borderColor: selectedCategory === chip ? accent : tokens.border,
                    },
                  ]}
                >
                  <Text style={[styles.chipText, { color: selectedCategory === chip ? "#FFFFFF" : tokens.text }]}>
                    {chip} {count}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={[styles.sectionTitle, { color: tokens.text }]}>Folders</Text>
          <View style={styles.folderGrid}>
            {folders.map((folder, idx) => {
              const accent = tokens.categoryColors[folder.category];
              const isLeft = idx % 2 === 0;
              const active = selectedCategory === folder.category;
              return (
                <Pressable
                  key={folder.title}
                  onPress={() => setSelectedCategory((prev) => (prev === folder.category ? "All" : folder.category))}
                  style={[styles.folderItem, { width: itemWidth, marginRight: isLeft ? 10 : 0 }]}
                >
                  <Card
                    padded={false}
                    style={[
                      styles.folderCard,
                      {
                        borderColor: active ? accent.fg : tokens.border,
                        borderWidth: 1,
                        shadowColor: tokens.shadow,
                      },
                    ]}
                  >
                    <View style={[styles.folderIconTile, { backgroundColor: accent.bg }]}> 
                      <Ionicons name={folder.icon} size={18} color={accent.fg} />
                    </View>
                    <Text style={[styles.folderTitle, { color: tokens.text }]}>{folder.title}</Text>
                    <Text style={[styles.folderCount, { color: tokens.mutedText }]}>{folder.count} files</Text>
                  </Card>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.sectionTitle, { color: tokens.text }]}>Recent uploads</Text>
          {loading ? (
            <Card style={[styles.emptyCard, { borderColor: tokens.border, borderWidth: 1, shadowColor: tokens.shadow }]}> 
              <Text style={[styles.emptyTitle, { color: tokens.text }]}>Loading documents...</Text>
            </Card>
          ) : filteredUploads.length === 0 ? (
            <Card style={[styles.emptyCard, { borderColor: tokens.border, borderWidth: 1, shadowColor: tokens.shadow }]}> 
              <Ionicons name="cloud-upload-outline" size={28} color={tokens.mutedText} />
              <Text style={[styles.emptyTitle, { color: tokens.text }]}>No documents found</Text>
              <Text style={[styles.emptyCopy, { color: tokens.mutedText }]}>Upload a file to get started.</Text>
            </Card>
          ) : (
            <Card style={[styles.recentCard, { borderColor: tokens.border, borderWidth: 1, shadowColor: tokens.shadow }]}> 
              {filteredUploads.map((item, index) => {
                const accent = tokens.categoryColors[item.category];
                const rowIcon = pickRowIcon(item.mime_type, item.file_type);

                return (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      void openDocument(item);
                    }}
                    style={[
                      styles.fileRow,
                      index < filteredUploads.length - 1 && {
                        borderBottomColor: tokens.border,
                        borderBottomWidth: StyleSheet.hairlineWidth,
                      },
                    ]}
                  >
                    <View style={[styles.fileIconTile, { backgroundColor: accent.bg }]}> 
                      <Ionicons name={rowIcon} size={17} color={accent.fg} />
                    </View>
                    <View style={styles.fileTextWrap}>
                      <Text style={[styles.fileName, { color: tokens.text }]} numberOfLines={1}>
                        {item.name.replace(/_/g, " ")}
                      </Text>
                      <Text style={[styles.fileMeta, { color: tokens.mutedText }]}> 
                        {(item.file_type || extractExtension(item.name)).toUpperCase()} • {formatDateLabel(item.created_at)}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={tokens.mutedText} />
                  </Pressable>
                );
              })}
            </Card>
          )}

          {errorMessage ? <Text style={[styles.errorText, { color: tokens.danger }]}>{errorMessage}</Text> : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: 14,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "700",
  },
  chipsRow: {
    gap: 8,
    paddingVertical: 2,
  },
  container: {
    gap: 14,
    paddingBottom: 120,
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  emptyCard: {
    alignItems: "center",
    borderRadius: 20,
    gap: 6,
    paddingVertical: 22,
  },
  emptyCopy: {
    fontSize: 14,
    textAlign: "center",
  },
  emptyStateWrap: {
    alignItems: "center",
    flex: 1,
    gap: 8,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  errorText: {
    fontSize: 13,
    textAlign: "center",
  },
  fileIconTile: {
    alignItems: "center",
    borderRadius: 10,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  fileMeta: {
    fontSize: 13,
    marginTop: 2,
  },
  fileName: {
    fontSize: 15,
    fontWeight: "700",
  },
  fileRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    minHeight: 68,
    paddingHorizontal: 4,
  },
  fileTextWrap: {
    flex: 1,
  },
  folderGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  folderItem: {
    marginBottom: 12,
  },
  folderCard: {
    borderRadius: 20,
    minHeight: 120,
    padding: 16,
  },
  folderCount: {
    fontSize: 13,
    marginTop: 4,
  },
  folderIconTile: {
    alignItems: "center",
    borderRadius: 10,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  folderTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginTop: 12,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  recentCard: {
    borderRadius: 20,
    paddingVertical: 4,
  },
  safe: {
    flex: 1,
  },
  screen: {
    flex: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    minHeight: 44,
    paddingVertical: 0,
  },
  searchWrap: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 14,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
  },
  sectionTitle: {
    fontSize: 21,
    fontWeight: "800",
    marginTop: 2,
  },
  subtitle: {
    fontSize: 15,
    marginTop: -2,
  },
  title: {
    fontSize: 36,
    fontWeight: "900",
  },
  uploadButton: {
    alignItems: "center",
    borderRadius: 999,
    flexDirection: "row",
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 14,
  },
  uploadText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
