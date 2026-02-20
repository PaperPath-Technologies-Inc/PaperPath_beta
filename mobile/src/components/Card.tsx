import { PropsWithChildren } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { useTheme } from "@/src/theme/useTheme";

type CardProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  gradient?: boolean;
}>;

export function Card({ children, style, padded = true, gradient = false }: CardProps) {
  const { tokens } = useTheme();

  if (gradient) {
    return (
      <LinearGradient
        colors={[tokens.gradientStart, tokens.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.base, padded && styles.padded, style]}
      >
        {children}
      </LinearGradient>
    );
  }

  return <View style={[styles.base, padded && styles.padded, { backgroundColor: tokens.card, shadowColor: tokens.shadow }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 5,
  },
  padded: {
    padding: 18,
  },
});
