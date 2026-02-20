import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/src/components/Button";
import { Card } from "@/src/components/Card";
import { useTheme } from "@/src/theme/useTheme";

export default function LandingScreen() {
  const { tokens } = useTheme();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tokens.bg }]}>
      <View style={styles.container}>
        <View style={styles.logoWrap}>
          <View style={[styles.logo, { backgroundColor: tokens.primaryBlue }]}>
            <Text style={styles.logoText}>PP</Text>
          </View>
          <Text style={[styles.brand, { color: tokens.text }]}>PaperPath</Text>
        </View>

        <Card gradient style={styles.hero}>
          <Text style={styles.heroTag}>Paperwork, simplified</Text>
          <Text style={styles.heroTitle}>Track every immigration step in one clear dashboard.</Text>
        </Card>

        <View style={styles.actions}>
          <Button title="Log in" onPress={() => router.push("/(auth)/login")} />
          <Button title="Create account" variant="secondary" onPress={() => router.push("/(auth)/signup")} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: 12,
    marginTop: "auto",
  },
  brand: {
    fontSize: 30,
    fontWeight: "800",
  },
  container: {
    flex: 1,
    padding: 24,
  },
  hero: {
    marginTop: 28,
    minHeight: 220,
  },
  heroTag: {
    color: "#EAF7FF",
    fontSize: 15,
    fontWeight: "600",
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 35,
    fontWeight: "800",
    lineHeight: 42,
    marginTop: 12,
  },
  logo: {
    alignItems: "center",
    borderRadius: 18,
    height: 66,
    justifyContent: "center",
    width: 66,
  },
  logoText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
  },
  logoWrap: {
    alignItems: "center",
    gap: 10,
    marginTop: 24,
  },
  safe: {
    flex: 1,
  },
});
