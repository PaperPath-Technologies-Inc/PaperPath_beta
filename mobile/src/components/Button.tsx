import { ReactNode } from "react";
import { Pressable, StyleSheet, Text, ViewStyle } from "react-native";

import { useTheme } from "@/src/theme/useTheme";

type Variant = "primary" | "secondary";

type ButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: ReactNode;
  style?: ViewStyle;
  disabled?: boolean;
};

export function Button({ title, onPress, variant = "primary", icon, style, disabled }: ButtonProps) {
  const { tokens } = useTheme();
  const primary = variant === "primary";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: primary ? tokens.primaryBlue : "transparent",
          borderColor: primary ? tokens.primaryBlue : tokens.border,
          opacity: pressed || disabled ? 0.8 : 1,
        },
        style,
      ]}
    >
      {icon}
      <Text style={[styles.text, { color: primary ? "#FFFFFF" : tokens.text }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 16,
  },
  text: {
    fontSize: 16,
    fontWeight: "700",
  },
});
