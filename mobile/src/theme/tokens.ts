export type ThemeTokens = {
  primaryBlue: string;
  primaryBlueDark: string;
  primaryBlue2: string;
  bg: string;
  card: string;
  text: string;
  mutedText: string;
  border: string;
  success: string;
  warning: string;
  danger: string;
  shadow: string;
  gradientStart: string;
  gradientEnd: string;
  tabBar: string;
  categoryColors: {
    Immigration: { fg: string; bg: string };
    Docs: { fg: string; bg: string };
    School: { fg: string; bg: string };
    General: { fg: string; bg: string };
  };
  statusColors: {
    done: { fg: string; bg: string };
    todo: { fg: string; bg: string };
    overdue: { fg: string; bg: string };
  };
};

export const lightTokens: ThemeTokens = {
  primaryBlue: "#1E78FF",
  primaryBlueDark: "#0F5FE6",
  primaryBlue2: "#37B8FF",
  bg: "#F4F7FF",
  card: "#FFFFFF",
  text: "#0B1B3A",
  mutedText: "#6B7A99",
  border: "#D9E4FF",
  success: "#2CCB8F",
  warning: "#FFB547",
  danger: "#FF6A7A",
  shadow: "rgba(16, 52, 116, 0.12)",
  gradientStart: "#31B9FF",
  gradientEnd: "#0D63D9",
  tabBar: "#FFFFFF",
  categoryColors: {
    Immigration: { fg: "#1E78FF", bg: "#E8F1FF" },
    Docs: { fg: "#6D4BFF", bg: "#F1EDFF" },
    School: { fg: "#14B8A6", bg: "#E7FFFB" },
    General: { fg: "#334155", bg: "#EEF2F8" },
  },
  statusColors: {
    done: { fg: "#16A34A", bg: "#E9FFF1" },
    todo: { fg: "#1E78FF", bg: "#E8F1FF" },
    overdue: { fg: "#F97316", bg: "#FFF1E6" },
  },
};

export const darkTokens: ThemeTokens = {
  primaryBlue: "#1E78FF",
  primaryBlueDark: "#0F5FE6",
  primaryBlue2: "#35C5FF",
  bg: "#071433",
  card: "#101E45",
  text: "#ECF3FF",
  mutedText: "#A2B5D9",
  border: "#21335E",
  success: "#49D7A2",
  warning: "#FFC86A",
  danger: "#FF7F95",
  shadow: "rgba(0, 0, 0, 0.35)",
  gradientStart: "#2BB8E8",
  gradientEnd: "#0D4EAF",
  tabBar: "#0E1D42",
  categoryColors: {
    Immigration: { fg: "#1E78FF", bg: "#E8F1FF" },
    Docs: { fg: "#6D4BFF", bg: "#F1EDFF" },
    School: { fg: "#14B8A6", bg: "#E7FFFB" },
    General: { fg: "#334155", bg: "#EEF2F8" },
  },
  statusColors: {
    done: { fg: "#16A34A", bg: "#E9FFF1" },
    todo: { fg: "#1E78FF", bg: "#E8F1FF" },
    overdue: { fg: "#F97316", bg: "#FFF1E6" },
  },
};
