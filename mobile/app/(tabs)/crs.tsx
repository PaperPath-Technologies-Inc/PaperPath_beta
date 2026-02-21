import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card } from "@/src/components/Card";
import { useTheme } from "@/src/theme/useTheme";

export default function CRSScreen() {
  const { tokens } = useTheme();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tokens.bg }]}>
      <View style={styles.container}>
        <Text style={[styles.title, { color: tokens.text }]}>CRS</Text>
        <Card style={{ borderColor: tokens.border, borderWidth: 1 }}>
          <Text style={[styles.tag, { color: tokens.primaryBlue }]}>Coming soon</Text>
          <Text style={[styles.copy, { color: tokens.mutedText }]}>
            CRS scoring tools and saved profiles will appear here.
          </Text>
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 14,
    padding: 18,
  },
  copy: {
    fontSize: 16,
    marginTop: 4,
  },
  safe: {
    flex: 1,
  },
  tag: {
    fontSize: 14,
    fontWeight: "700",
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
  },
});
