import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card } from "@/src/components/Card";
import { useTheme } from "@/src/theme/useTheme";

const FAQ = [
  {
    q: "How do I organize documents by category?",
    a: "Open Vault and assign each upload to Immigration, Docs, School, or General.",
  },
  {
    q: "Can I mark tasks done from the list?",
    a: "Yes. In Tasks, tap Mark done on any row and metrics update automatically.",
  },
  {
    q: "Why am I seeing overdue tasks?",
    a: "A task is overdue when status is To do and the due date is before today.",
  },
  {
    q: "Is billing handled with Stripe?",
    a: "No. Subscription billing is intended for Apple In-App Purchases only.",
  },
];

export default function SupportScreen() {
  const { tokens } = useTheme();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tokens.bg }]}> 
      <View style={styles.container}>
        <Text style={[styles.title, { color: tokens.text }]}>Support</Text>

        <Pressable onPress={() => router.push("/contact")}> 
          <Card style={[styles.actionCard, { borderColor: tokens.border, borderWidth: 1, shadowColor: tokens.shadow }]}>
            <View style={styles.actionRow}>
              <Ionicons name="mail-outline" size={18} color={tokens.primaryBlue} />
              <Text style={[styles.actionText, { color: tokens.text }]}>Contact us</Text>
              <Ionicons name="chevron-forward" size={18} color={tokens.mutedText} />
            </View>
          </Card>
        </Pressable>

        <Card style={[styles.faqCard, { borderColor: tokens.border, borderWidth: 1, shadowColor: tokens.shadow }]}>
          <Text style={[styles.sectionTitle, { color: tokens.text }]}>FAQ</Text>
          <View style={styles.faqWrap}>
            {FAQ.map((item) => (
              <View key={item.q} style={styles.faqItem}>
                <Text style={[styles.q, { color: tokens.text }]}>{item.q}</Text>
                <Text style={[styles.a, { color: tokens.mutedText }]}>{item.a}</Text>
              </View>
            ))}
          </View>
        </Card>

        <Pressable
          onPress={() => {
            void Linking.openURL("mailto:admin@paperpath.ca?subject=PaperPath%20Support");
          }}
        >
          <Card style={[styles.actionCard, { borderColor: tokens.border, borderWidth: 1, shadowColor: tokens.shadow }]}>
            <View style={styles.actionRow}>
              <Ionicons name="bug-outline" size={18} color={tokens.primaryBlue} />
              <Text style={[styles.actionText, { color: tokens.text }]}>Report a problem</Text>
              <Ionicons name="open-outline" size={17} color={tokens.mutedText} />
            </View>
          </Card>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  a: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 3,
  },
  actionCard: {
    borderRadius: 16,
    paddingVertical: 14,
  },
  actionRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
  },
  container: {
    flex: 1,
    gap: 12,
    padding: 18,
  },
  faqCard: {
    borderRadius: 16,
  },
  faqItem: {
    paddingVertical: 4,
  },
  faqWrap: {
    gap: 8,
    marginTop: 8,
  },
  q: {
    fontSize: 14,
    fontWeight: "700",
  },
  safe: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    marginBottom: 2,
  },
});
