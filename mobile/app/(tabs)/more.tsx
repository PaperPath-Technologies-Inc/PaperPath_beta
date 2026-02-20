import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card } from "@/src/components/Card";
import { useTheme } from "@/src/theme/useTheme";

const items = [
  { label: "Reminders", route: "/(tabs)/reminders", icon: "notifications-outline" },
  { label: "AI Risk", route: "/(tabs)/airisk", icon: "analytics-outline" },
  { label: "Pricing", route: "/(tabs)/pricing", icon: "pricetag-outline" },
  { label: "Support", route: "/(tabs)/support", icon: "help-circle-outline" },
  { label: "Settings", route: "/(tabs)/settings", icon: "settings-outline" },
] as const;

export default function MoreScreen() {
  const { tokens } = useTheme();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tokens.bg }]}>
      <View style={styles.container}>
        <Text style={[styles.title, { color: tokens.text }]}>More</Text>
        <View style={styles.list}>
          {items.map((item) => (
            <Pressable key={item.label} onPress={() => router.push(item.route)}>
              <Card style={styles.item}>
                <View style={styles.itemRow}>
                  <View style={[styles.iconWrap, { backgroundColor: tokens.bg }]}>
                    <Ionicons name={item.icon} size={18} color={tokens.primaryBlue} />
                  </View>
                  <Text style={[styles.itemLabel, { color: tokens.text }]}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={18} color={tokens.mutedText} />
                </View>
              </Card>
            </Pressable>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 18,
  },
  iconWrap: {
    alignItems: "center",
    borderRadius: 9,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  item: {
    borderRadius: 16,
    paddingVertical: 14,
  },
  itemLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
  },
  itemRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  list: {
    gap: 10,
    marginTop: 12,
  },
  safe: {
    flex: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
  },
});
