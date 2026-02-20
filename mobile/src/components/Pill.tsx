import { Pressable, StyleSheet, Text } from "react-native";

import { useTheme } from "@/src/theme/useTheme";

type PillProps = {
  label: string;
  count?: number;
  active?: boolean;
  onPress?: () => void;
};

export function Pill({ label, count, active = false, onPress }: PillProps) {
  const { tokens } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.pill,
        {
          backgroundColor: active ? tokens.primaryBlue : tokens.card,
          borderColor: active ? tokens.primaryBlue : tokens.border,
        },
      ]}
    >
      <Text style={[styles.label, { color: active ? "#FFFFFF" : tokens.text }]}>{label}</Text>
      {typeof count === "number" ? (
        <Text style={[styles.count, { color: active ? "#FFFFFF" : tokens.mutedText }]}>{count}</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  count: {
    fontSize: 13,
    fontWeight: "600",
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
  },
  pill: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
});
