import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "@/src/theme/useTheme";

const LAST_UPDATED = "2026-02-21";

export default function CookiesScreen() {
  const { tokens } = useTheme();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tokens.bg }]}> 
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: tokens.text }]}>Cookies Policy</Text>
        <Text style={[styles.updated, { color: tokens.mutedText }]}>Last updated: {LAST_UPDATED}</Text>

        <Section title="What We Store" points={["Session tokens needed to keep you signed in.", "Preference settings such as theme and display options.", "Analytics identifiers for app performance insights."]} />
        <Section title="Why We Use It" points={["Ensure secure authentication.", "Remember your app preferences.", "Understand product usage patterns."]} />
        <Section title="Your Choices" points={["You can sign out to clear active sessions.", "You may request account deletion through support.", "Device-level privacy settings can limit tracking."]} />
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
