import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card } from "@/src/components/Card";
import { useTheme } from "@/src/theme/useTheme";

export default function TasksScreen() {
  const { tokens } = useTheme();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tokens.bg }]}>
      <View style={styles.container}>
        <Text style={[styles.title, { color: tokens.text }]}>Tasks</Text>
        <Card>
          <Text style={[styles.copy, { color: tokens.mutedText }]}>Your checklist items will appear here.</Text>
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
  },
  safe: {
    flex: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
  },
});
