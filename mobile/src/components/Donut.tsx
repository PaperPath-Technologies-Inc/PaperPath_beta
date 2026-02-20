import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { useTheme } from "@/src/theme/useTheme";

type DonutProps = {
  done: number;
  total: number;
  overdue?: number;
  size?: number;
  strokeWidth?: number;
};

export function Donut({ done, total, overdue = 0, size = 128, strokeWidth = 14 }: DonutProps) {
  const { tokens } = useTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? Math.min(Math.max(done / total, 0), 1) : 0;
  const overdueRatio = total > 0 ? Math.min(Math.max(overdue / total, 0), 1 - progress) : 0;
  const progressLength = circumference * progress;
  const overdueLength = circumference * overdueRatio;
  const completeLabel = `${Math.round(progress * 100)}%`;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={tokens.border}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={tokens.primaryBlue}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${progressLength} ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        {overdue > 0 ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={tokens.warning}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${overdueLength} ${circumference}`}
            strokeDashoffset={-progressLength}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ) : null}
      </Svg>
      <View style={styles.center}>
        <Text style={[styles.percent, { color: tokens.text }]}>{completeLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  percent: {
    fontSize: 28,
    fontWeight: "800",
  },
});
