import { Button } from "@/src/components/Button";
import { Card } from "@/src/components/Card";
import { useTheme } from "@/src/theme/useTheme";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SettingsScreen() {
  const { tokens, mode, setMode } = useTheme();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tokens.bg }]}>
      <View style={styles.container}>
        <Card style={{ gap: 12 }}>
          <Text style={[styles.title, { color: tokens.text }]}>Theme</Text>

          <Button
            title={`System (${mode === "system" ? "selected" : "tap"})`}
            variant={mode === "system" ? "primary" : "secondary"}
            onPress={() => setMode("system")}
          />
          <Button
            title={`Light (${mode === "light" ? "selected" : "tap"})`}
            variant={mode === "light" ? "primary" : "secondary"}
            onPress={() => setMode("light")}
          />
          <Button
            title={`Dark (${mode === "dark" ? "selected" : "tap"})`}
            variant={mode === "dark" ? "primary" : "secondary"}
            onPress={() => setMode("dark")}
          />
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, padding: 18 },
  title: { fontSize: 18, fontWeight: "800" },
});