import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card } from "@/src/components/Card";
import { useTheme } from "@/src/theme/useTheme";

type VaultCategory = "All" | "Immigration" | "Docs" | "School" | "General";
type FolderCategory = Exclude<VaultCategory, "All">;

type FolderItem = {
  category: FolderCategory;
  count: number;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
};

type UploadItem = {
  category: FolderCategory;
  date: string;
  fileType: "PDF" | "JPG" | "DOC";
  icon: keyof typeof Ionicons.glyphMap;
  name: string;
};

const CHIPS: VaultCategory[] = ["All", "Immigration", "Docs", "School", "General"];

const FOLDERS: FolderItem[] = [
  { category: "Immigration", count: 8, icon: "airplane-outline", title: "Immigration" },
  { category: "Docs", count: 6, icon: "document-text-outline", title: "Docs" },
  { category: "School", count: 4, icon: "school-outline", title: "School" },
  { category: "General", count: 5, icon: "folder-open-outline", title: "General" },
];

const RECENT_UPLOADS: UploadItem[] = [
  { category: "Immigration", date: "May 30", fileType: "PDF", icon: "document-outline", name: "Work Permit Checklist.pdf" },
  { category: "School", date: "May 28", fileType: "JPG", icon: "image-outline", name: "Transcript_Sem2.jpg" },
  { category: "Docs", date: "May 24", fileType: "DOC", icon: "document-text-outline", name: "Reference Letter.docx" },
];

export default function VaultScreen() {
  const { tokens } = useTheme();
  const { width } = useWindowDimensions();
  const [selectedCategory, setSelectedCategory] = useState<VaultCategory>("All");
  const [query, setQuery] = useState("");
  const itemWidth = (width - 18 * 2 - 10) / 2;

  const filteredFolders = useMemo(() => {
    return selectedCategory === "All"
      ? FOLDERS
      : FOLDERS.filter((folder) => folder.category === selectedCategory);
  }, [selectedCategory]);

  const filteredUploads = useMemo(() => {
    const q = query.trim().toLowerCase();
    return RECENT_UPLOADS.filter((file) => {
      const categoryMatch = selectedCategory === "All" || file.category === selectedCategory;
      const queryMatch = !q || file.name.toLowerCase().includes(q);
      return categoryMatch && queryMatch;
    });
  }, [query, selectedCategory]);

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
              onPress={() => console.log("TODO: upload")}
              style={[styles.uploadButton, { backgroundColor: tokens.primaryBlue }]}
            >
              <Ionicons name="cloud-upload-outline" size={16} color="#FFFFFF" />
              <Text style={styles.uploadText}>Upload</Text>
            </Pressable>
          </View>

          <View style={[styles.searchWrap, { backgroundColor: tokens.card, borderColor: tokens.border, shadowColor: tokens.shadow }]}>
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
              const count = chip === "All"
                ? FOLDERS.reduce((sum, folder) => sum + folder.count, 0)
                : FOLDERS.find((folder) => folder.category === chip)?.count ?? 0;

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
          {filteredFolders.length === 0 ? (
            <Card style={[styles.emptyCard, { borderColor: tokens.border, borderWidth: 1, shadowColor: tokens.shadow }]}>
              <Ionicons name="folder-open-outline" size={28} color={tokens.mutedText} />
              <Text style={[styles.emptyTitle, { color: tokens.text }]}>No folders yet</Text>
              <Text style={[styles.emptyCopy, { color: tokens.mutedText }]}>Upload your first document</Text>
            </Card>
          ) : (
            <View style={styles.folderGrid}>
              {filteredFolders.map((folder, idx) => {
                const accent = tokens.categoryColors[folder.category];
                const isLeft = idx % 2 === 0;
                return (
                  <View
                    key={folder.title}
                    style={[styles.folderItem, { width: itemWidth, marginRight: isLeft ? 10 : 0 }]}
                  >
                    <Card
                      padded={false}
                      style={[styles.folderCard, { borderColor: tokens.border, borderWidth: 1, shadowColor: tokens.shadow }]}
                    >
                      <View style={[styles.folderIconTile, { backgroundColor: accent.bg }]}>
                        <Ionicons name={folder.icon} size={18} color={accent.fg} />
                      </View>
                      <Text style={[styles.folderTitle, { color: tokens.text }]}>{folder.title}</Text>
                      <Text style={[styles.folderCount, { color: tokens.mutedText }]}>{folder.count} files</Text>
                    </Card>
                  </View>
                );
              })}
            </View>
          )}

          <Text style={[styles.sectionTitle, { color: tokens.text }]}>Recent uploads</Text>
          {filteredUploads.length === 0 ? (
            <Card style={[styles.emptyCard, { borderColor: tokens.border, borderWidth: 1, shadowColor: tokens.shadow }]}>
              <Ionicons name="cloud-upload-outline" size={28} color={tokens.mutedText} />
              <Text style={[styles.emptyTitle, { color: tokens.text }]}>No recent uploads</Text>
              <Text style={[styles.emptyCopy, { color: tokens.mutedText }]}>Upload your first document</Text>
            </Card>
          ) : (
            <Card style={[styles.recentCard, { borderColor: tokens.border, borderWidth: 1, shadowColor: tokens.shadow }]}>
              {filteredUploads.map((item, index) => {
                const accent = tokens.categoryColors[item.category];
                return (
                  <Pressable
                    key={item.name}
                    onPress={() => console.log(`TODO: open ${item.name}`)}
                    style={[
                      styles.fileRow,
                      index < filteredUploads.length - 1 && {
                        borderBottomColor: tokens.border,
                        borderBottomWidth: StyleSheet.hairlineWidth,
                      },
                    ]}
                  >
                    <View style={[styles.fileIconTile, { backgroundColor: accent.bg }]}>
                      <Ionicons name={item.icon} size={17} color={accent.fg} />
                    </View>
                    <View style={styles.fileTextWrap}>
                      <Text style={[styles.fileName, { color: tokens.text }]} numberOfLines={1}>
                        {item.name.replace(/_/g, " ")}
                      </Text>
                      <Text style={[styles.fileMeta, { color: tokens.mutedText }]}>
                        {item.fileType} • {item.date}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={tokens.mutedText} />
                  </Pressable>
                );
              })}
            </Card>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 40,
    paddingHorizontal: 14,
    justifyContent: "center",
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
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
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
