import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/src/components/Button";
import { Card } from "@/src/components/Card";
import { useAuth } from "@/src/lib/useAuth";
import { useTheme } from "@/src/theme/useTheme";

export default function ProfileScreen() {
  const { tokens } = useTheme();
  const { session, signOut } = useAuth();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tokens.bg }]}>
      <View style={styles.container}>
        <Text style={[styles.title, { color: tokens.text }]}>Profile</Text>
        <Card>
          <Text style={[styles.label, { color: tokens.mutedText }]}>Signed in as</Text>
          <Text style={[styles.value, { color: tokens.text }]}>{session?.user.email ?? "Guest"}</Text>
          <Button title="Sign out" variant="secondary" onPress={signOut} style={styles.signOut} />
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
  label: {
    fontSize: 14,
    fontWeight: "600",
  },
  safe: {
    flex: 1,
  },
  signOut: {
    marginTop: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
  },
  value: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 4,
  },
});
