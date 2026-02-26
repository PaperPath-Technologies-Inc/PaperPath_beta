import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card } from "@/src/components/Card";
import { useTheme } from "@/src/theme/useTheme";

export default function AIRiskScreen() {
  const { tokens } = useTheme();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tokens.bg }]}> 
      <View style={styles.container}>
        <Text style={[styles.title, { color: tokens.text }]}>AI Risk</Text>

        <Card style={[styles.card, { borderColor: tokens.border, borderWidth: 1, shadowColor: tokens.shadow }]}>
          <Text style={[styles.cardTitle, { color: tokens.text }]}>Overall Risk</Text>
          <Text style={[styles.score, { color: tokens.primaryBlue }]}>38 / 100</Text>
          <Text style={[styles.copy, { color: tokens.mutedText }]}>Current profile risk is low-to-moderate.</Text>
        </Card>

        <Card style={[styles.card, { borderColor: tokens.border, borderWidth: 1, shadowColor: tokens.shadow }]}>
          <Text style={[styles.cardTitle, { color: tokens.text }]}>Top Risks</Text>
          <Text style={[styles.listItem, { color: tokens.text }]}>• Missing proof of funds for latest period</Text>
          <Text style={[styles.listItem, { color: tokens.text }]}>• Expiring supporting letter in 29 days</Text>
          <Text style={[styles.listItem, { color: tokens.text }]}>• One document category still incomplete</Text>
        </Card>

        <Card style={[styles.card, { borderColor: tokens.border, borderWidth: 1, shadowColor: tokens.shadow }]}>
          <Text style={[styles.cardTitle, { color: tokens.text }]}>Recommended Next Steps</Text>
          <Text style={[styles.listItem, { color: tokens.text }]}>1. Upload updated bank statement</Text>
          <Text style={[styles.listItem, { color: tokens.text }]}>2. Renew the reference letter</Text>
          <Text style={[styles.listItem, { color: tokens.text }]}>3. Complete remaining School tasks</Text>
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    gap: 6,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  container: {
    flex: 1,
    gap: 12,
    padding: 18,
  },
  copy: {
    fontSize: 14,
  },
  listItem: {
    fontSize: 14,
    lineHeight: 22,
  },
  safe: {
    flex: 1,
  },
  score: {
    fontSize: 32,
    fontWeight: "800",
    marginTop: 2,
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    marginBottom: 2,
  },
});
