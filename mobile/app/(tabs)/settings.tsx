import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import type { ComponentProps } from "react";
import { useTheme } from "@/src/theme/useTheme";
import { useAuth } from "@/src/lib/useAuth";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SettingsScreen() {
  const { tokens, mode, setMode, isDark } = useTheme();
  const { signOut } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const isDarkModeEnabled = mode === "dark" || (mode === "system" && isDark);

  const supportRows: { icon: IconName; label: string }[] = [
    { icon: "star-outline", label: "Rate App" },
    { icon: "share-social-outline", label: "Share App" },
    { icon: "lock-closed-outline", label: "Privacy Policy" },
    { icon: "document-text-outline", label: "Terms and Conditions" },
    { icon: "document-attach-outline", label: "Cookies Policy" },
    { icon: "mail-outline", label: "Contact" },
    { icon: "chatbubble-ellipses-outline", label: "Feedback" },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tokens.bg }]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: tokens.card, borderColor: tokens.border }]}>
          <SettingSwitchRow
            icon={notificationsEnabled ? "notifications" : "notifications-outline"}
            label="Notification"
            value={notificationsEnabled}
            textColor={tokens.text}
            borderColor={tokens.border}
            thumbColor={tokens.card}
            trackColor={tokens.primaryBlue}
            onValueChange={setNotificationsEnabled}
          />
          <SettingSwitchRow
            icon={isDarkModeEnabled ? "moon" : "sunny-outline"}
            label="Dark Mode"
            value={isDarkModeEnabled}
            textColor={tokens.text}
            borderColor={tokens.border}
            thumbColor={tokens.card}
            trackColor={tokens.primaryBlue}
            onValueChange={(value) => {
              setMode(value ? "dark" : "light");
            }}
            isLast
          />
        </View>

        <View style={[styles.card, { backgroundColor: tokens.card, borderColor: tokens.border }]}>
          {supportRows.map((row, index) => (
            <SettingActionRow
              key={row.label}
              icon={row.icon}
              label={row.label}
              textColor={tokens.text}
              borderColor={tokens.border}
              onPress={() => {
                console.log(`TODO: open ${row.label}`);
              }}
              isLast={index === supportRows.length - 1}
            />
          ))}
        </View>

        <View style={[styles.card, { backgroundColor: tokens.card, borderColor: tokens.border }]}>
          <SettingActionRow
            icon="log-out-outline"
            label="Logout"
            textColor={tokens.danger}
            borderColor={tokens.border}
            onPress={signOut}
            hideChevron
            isLast
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

type IconName = ComponentProps<typeof Ionicons>["name"];

type SettingSwitchRowProps = {
  borderColor: string;
  icon: IconName;
  isLast?: boolean;
  label: string;
  onValueChange: (value: boolean) => void;
  textColor: string;
  thumbColor: string;
  trackColor: string;
  value: boolean;
};

function SettingSwitchRow({
  borderColor,
  icon,
  isLast,
  label,
  onValueChange,
  textColor,
  thumbColor,
  trackColor,
  value,
}: SettingSwitchRowProps) {
  return (
    <View style={[styles.row, !isLast && { borderBottomColor: borderColor, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      <View style={styles.rowLeft}>
        <Ionicons name={icon} size={24} color={textColor} />
        <Text style={[styles.rowLabel, { color: textColor }]}>{label}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "rgba(120,120,128,0.24)", true: trackColor }}
        thumbColor={thumbColor}
      />
    </View>
  );
}

type SettingActionRowProps = {
  borderColor: string;
  hideChevron?: boolean;
  icon: IconName;
  isLast?: boolean;
  label: string;
  onPress: () => void;
  textColor: string;
};

function SettingActionRow({
  borderColor,
  hideChevron,
  icon,
  isLast,
  label,
  onPress,
  textColor,
}: SettingActionRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.row, !isLast && { borderBottomColor: borderColor, borderBottomWidth: StyleSheet.hairlineWidth }]}
    >
      <View style={styles.rowLeft}>
        <Ionicons name={icon} size={24} color={textColor} />
        <Text style={[styles.rowLabel, { color: textColor }]}>{label}</Text>
      </View>
      {!hideChevron ? <Ionicons name="chevron-forward" size={18} color={textColor} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    gap: 12,
    padding: 18,
    paddingBottom: 26,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 62,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowLeft: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 1,
    gap: 12,
    paddingRight: 12,
  },
  rowLabel: {
    fontSize: 17,
    fontWeight: "600",
  },
});
