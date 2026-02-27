import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Linking, Pressable, Share, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card } from "@/src/components/Card";
import { useAuth } from "@/src/lib/useAuth";
import { useTheme } from "@/src/theme/useTheme";

type IconName = keyof typeof Ionicons.glyphMap;

type ActionRow = {
  iconName: IconName;
  label: string;
  onPress: () => void | Promise<void>;
};

type SettingsRowProps = {
  iconName: IconName;
  label: string;
  variant: "switch" | "link";
  value?: boolean;
  onValueChange?: (v: boolean) => void;
  onPress?: () => void;
  showDivider?: boolean;
  textColor?: string;
};

const APP_SHARE_URL = "https://paperpath.ca";
const APP_RATE_URL = "https://apps.apple.com";

export default function MoreScreen() {
  const { tokens, mode, setMode, isDark } = useTheme();
  const { signOut } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const darkModeEnabled = useMemo(() => {
    if (mode === "system") return isDark;
    return mode === "dark";
  }, [isDark, mode]);

  const openExternalUrl = async (url: string, label: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        Alert.alert("Unavailable", `Could not open ${label.toLowerCase()} right now.`);
        return;
      }
      await Linking.openURL(url);
    } catch (error) {
      console.warn(`Failed to open ${label}`, error);
      Alert.alert("Unavailable", `Could not open ${label.toLowerCase()} right now.`);
    }
  };

  const shareApp = async () => {
    try {
      await Share.share({
        message: `Try PaperPath: ${APP_SHARE_URL}`,
        url: APP_SHARE_URL,
        title: "PaperPath",
      });
    } catch (error) {
      console.warn("Share failed", error);
      Alert.alert("Share failed", "Could not open share options.");
    }
  };

  const actionRows: ActionRow[] = [
    { iconName: "star-outline", label: "Rate App", onPress: () => void openExternalUrl(APP_RATE_URL, "Rate App") },
    { iconName: "share-social-outline", label: "Share App", onPress: () => void shareApp() },
    { iconName: "lock-closed-outline", label: "Privacy Policy", onPress: () => router.push("/privacy") },
    { iconName: "document-text-outline", label: "Terms & Conditions", onPress: () => router.push("/terms") },
    { iconName: "document-outline", label: "Cookies Policy", onPress: () => router.push("/cookies") },
    { iconName: "mail-outline", label: "Contact", onPress: () => router.push("/contact") },
    { iconName: "chatbubble-outline", label: "Feedback", onPress: () => router.push("/feedback") },
  ];

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
          {actionRows.map((row, index) => (
            <SettingsRow
              key={row.label}
              iconName={row.iconName}
              label={row.label}
              variant="link"
              onPress={() => {
                void row.onPress();
              }}
              showDivider={index < actionRows.length - 1}
            />
          ))}
        </Card>

        <Card style={[styles.card, { borderColor: tokens.border, borderWidth: 1, shadowColor: tokens.shadow }]}> 
          <SettingsRow
            iconName="log-out-outline"
            label="Logout"
            variant="link"
            onPress={() => {
              void signOut();
            }}
            textColor={tokens.danger}
          />
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
  textColor,
}: SettingsRowProps) {
  const { tokens } = useTheme();
  const Container = variant === "link" ? Pressable : View;
  const rowColor = textColor ?? tokens.text;

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
        <Ionicons name={iconName} size={20} color={rowColor} />
      </View>
      <Text style={[styles.rowLabel, { color: rowColor }]}>{label}</Text>

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
