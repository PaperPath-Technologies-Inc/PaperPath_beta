import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card } from "@/src/components/Card";
import { useTheme } from "@/src/theme/useTheme";

type SettingsRowProps = {
  iconName: keyof typeof Ionicons.glyphMap;
  label: string;
  variant: "switch" | "link";
  value?: boolean;
  onValueChange?: (v: boolean) => void;
  onPress?: () => void;
  showDivider?: boolean;
};

const LINK_ROWS: { iconName: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }[] = [
  { iconName: "star-outline", label: "Rate App", onPress: () => console.log("TODO: Rate App") },
  { iconName: "share-social-outline", label: "Share App", onPress: () => console.log("TODO: Share App") },
  { iconName: "lock-closed-outline", label: "Privacy Policy", onPress: () => router.push("/privacy") },
  { iconName: "document-text-outline", label: "Terms & Conditions", onPress: () => router.push("/terms") },
  { iconName: "document-outline", label: "Cookies Policy", onPress: () => router.push("/cookies") },
  { iconName: "mail-outline", label: "Contact", onPress: () => router.push("/contact") },
  { iconName: "chatbubble-outline", label: "Feedback", onPress: () => console.log("TODO: Feedback") },
];

export default function MoreScreen() {
  const { tokens, mode, setMode, isDark } = useTheme();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const darkModeEnabled = useMemo(() => {
    if (mode === "system") {
      return isDark;
    }
    return mode === "dark";
  }, [isDark, mode]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tokens.bg }]}> 
      <View style={styles.container}>
        <Text style={[styles.title, { color: tokens.text }]}>Settings</Text>

        <Card style={[styles.card, { borderColor: tokens.border, borderWidth: 1, shadowColor: tokens.shadow }]}>
          <SettingsRow
            iconName="notifications-outline"
            label="Notifications"
            variant="switch"
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            showDivider
          />
          <SettingsRow
            iconName={darkModeEnabled ? "moon-outline" : "sunny-outline"}
            label="Dark Mode"
            variant="switch"
            value={darkModeEnabled}
            onValueChange={(value) => {
              void setMode(value ? "dark" : "light");
            }}
          />
        </Card>

        <Card style={[styles.card, { borderColor: tokens.border, borderWidth: 1, shadowColor: tokens.shadow }]}>
          {LINK_ROWS.map((row, index) => (
            <SettingsRow
              key={row.label}
              iconName={row.iconName}
              label={row.label}
              variant="link"
              onPress={row.onPress}
              showDivider={index < LINK_ROWS.length - 1}
            />
          ))}
        </Card>
      </View>
    </SafeAreaView>
  );
}

function SettingsRow({
  iconName,
  label,
  variant,
  value,
  onValueChange,
  onPress,
  showDivider = false,
}: SettingsRowProps) {
  const { tokens } = useTheme();
  const Container = variant === "link" ? Pressable : View;

  return (
    <Container
      onPress={variant === "link" ? onPress : undefined}
      style={[
        styles.row,
        showDivider && {
          borderBottomColor: tokens.border,
          borderBottomWidth: StyleSheet.hairlineWidth,
        },
      ]}
    >
      <View style={[styles.iconTile, { backgroundColor: tokens.bg, borderColor: tokens.border }]}> 
        <Ionicons name={iconName} size={20} color={tokens.text} />
      </View>
      <Text style={[styles.rowLabel, { color: tokens.text }]}>{label}</Text>

      {variant === "switch" ? (
        <Switch
          value={Boolean(value)}
          onValueChange={onValueChange}
          trackColor={{ false: tokens.border, true: tokens.primaryBlue }}
          thumbColor="#FFFFFF"
          ios_backgroundColor={tokens.border}
        />
      ) : (
        <Ionicons name="chevron-forward" size={20} color={tokens.mutedText} />
      )}
    </Container>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    overflow: "hidden",
    padding: 0,
  },
  container: {
    flex: 1,
    gap: 16,
    padding: 18,
  },
  iconTile: {
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    minHeight: 64,
    paddingHorizontal: 14,
  },
  rowLabel: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
  },
  safe: {
    flex: 1,
  },
  title: {
    fontSize: 38,
    fontWeight: "800",
    marginBottom: 2,
  },
});
