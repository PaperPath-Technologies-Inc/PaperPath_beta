import { Ionicons } from "@expo/vector-icons";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card } from "@/src/components/Card";
import { useTheme } from "@/src/theme/useTheme";

export default function FeedbackScreen() {
  const { tokens } = useTheme();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tokens.bg }]}> 
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: tokens.text }]}>Feedback</Text>
        <Text style={[styles.subtitle, { color: tokens.mutedText }]}>Share ideas, bugs, or requests with the PaperPath team.</Text>

        <Pressable onPress={() => void Linking.openURL("mailto:feedback@paperpath.ca?subject=PaperPath%20Feedback")}> 
          <Card style={[styles.rowCard, { borderColor: tokens.border, borderWidth: 1, shadowColor: tokens.shadow }]}> 
            <View style={styles.row}>
              <Ionicons name="mail-outline" size={18} color={tokens.primaryBlue} />
              <Text style={[styles.rowText, { color: tokens.text }]}>admin@paperpath.ca</Text>
              <Ionicons name="open-outline" size={16} color={tokens.mutedText} />
            </View>
          </Card>
        </Pressable>

        <Card style={[styles.noteCard, { borderColor: tokens.border, borderWidth: 1, shadowColor: tokens.shadow }]}> 
          <Text style={[styles.note, { color: tokens.mutedText }]}>Include your app version and device model if you are reporting an issue.</Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
    padding: 18,
    paddingBottom: 40,
  },
  note: {
    fontSize: 14,
    lineHeight: 20,
  },
  noteCard: {
    borderRadius: 16,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  rowCard: {
    borderRadius: 16,
    paddingVertical: 14,
  },
  rowText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
  },
  safe: {
    flex: 1,
  },
  subtitle: {
    fontSize: 15,
    marginTop: -4,
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
  },
});
