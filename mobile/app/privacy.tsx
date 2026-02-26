import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "@/src/theme/useTheme";

const LAST_UPDATED = "2026-02-21";

export default function PrivacyScreen() {
  const { tokens } = useTheme();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tokens.bg }]}> 
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: tokens.text }]}>Privacy Policy</Text>
        <Text style={[styles.updated, { color: tokens.mutedText }]}>Last updated: {LAST_UPDATED}</Text>

        <Section title="Information We Collect" points={["Account details like email and profile name.", "Task metadata such as title, due date, and category.", "App diagnostics used to improve reliability."]} />
        <Section title="How We Use Information" points={["Provide task management and reminders.", "Maintain account security and session integrity.", "Improve user experience and support quality."]} />
        <Section title="Data Sharing" points={["We do not sell your personal information.", "Data may be processed by trusted service providers.", "Legal disclosure may occur when required by law."]} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, points }: { title: string; points: string[] }) {
  const { tokens } = useTheme();

  return (
    <View style={[styles.section, { backgroundColor: tokens.card, borderColor: tokens.border }]}> 
      <Text style={[styles.sectionTitle, { color: tokens.text }]}>{title}</Text>
      {points.map((point) => (
        <Text key={point} style={[styles.point, { color: tokens.text }]}>• {point}</Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
    padding: 18,
    paddingBottom: 42,
  },
  point: {
    fontSize: 14,
    lineHeight: 21,
  },
  safe: {
    flex: 1,
  },
  section: {
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 2,
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
  },
  updated: {
    fontSize: 14,
    marginTop: -4,
  },
});
