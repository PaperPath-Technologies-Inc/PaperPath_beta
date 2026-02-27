import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card } from "@/src/components/Card";
import { useTheme } from "@/src/theme/useTheme";

type Billing = "monthly" | "annual";
type PlanId = "starter" | "pro";

type Feature = { label: string; included: boolean };

type Plan = {
  id: PlanId;
  name: string;
  subtitle: string;
  monthlyPrice: string; // display only
  annualPrice: string; // display only
  badge?: string;
  features: Feature[];
};

const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    subtitle: "Essential tools to stay organized.",
    monthlyPrice: "$0",
    annualPrice: "$0",
    features: [
      { label: "Task tracking", included: true },
      { label: "Docs Vault access", included: true },
      { label: "Core reminders", included: true },
      { label: "AI Risk checks", included: false },
      { label: "Unlimited storage", included: false },
      { label: "Advanced reminder controls", included: false },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    subtitle: "For students who don’t want to miss deadlines.",
    monthlyPrice: "$6.99 CAD / month + tax",
    annualPrice: "$59.99 CAD / year + tax",
    badge: "Best value",
    features: [
      { label: "Everything in Starter", included: true },
      { label: "AI Risk checks", included: true },
      { label: "Unlimited reminders", included: true },
      { label: "Expanded storage", included: true },
      { label: "Priority updates", included: true },
      { label: "Advanced reminder controls", included: true },
    ],
  },
];

// Placeholder while IAP is not wired
async function purchasePlan(planId: PlanId, billing: Billing) {
  alert(`IAP not wired yet: ${planId} (${billing})`);
}

export default function PricingScreen() {
  const { tokens, isDark } = useTheme();
  const [billing, setBilling] = useState<Billing>("monthly");

  // Current selected plan source can be replaced with profile/IAP state when connected.
  const currentPlan: PlanId = "starter";

  const proBorder = useMemo(() => {
    // Subtle premium border that still fits PaperPath palette
    return isDark ? "rgba(255, 200, 106, 0.55)" : "rgba(255, 181, 71, 0.75)";
  }, [isDark]);

  const toggleBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(11,27,58,0.04)";

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tokens.bg }]} edges={["top", "bottom"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.container, { paddingBottom: 34 }]}
        keyboardShouldPersistTaps="handled"
        bounces
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: tokens.text }]}>Pricing</Text>
            <Text style={[styles.subtitle, { color: tokens.mutedText }]}>
              Choose what fits your needs
            </Text>
          </View>

          {/* Billing toggle */}
          <View style={[styles.toggleWrap, { backgroundColor: toggleBg, borderColor: tokens.border }]}>
            <Pressable
              onPress={() => setBilling("monthly")}
              style={[
                styles.togglePill,
                billing === "monthly" && { backgroundColor: tokens.card, borderColor: tokens.border },
              ]}
              hitSlop={8}
            >
              <Text style={[styles.toggleText, { color: billing === "monthly" ? tokens.text : tokens.mutedText }]}>
                Monthly
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setBilling("annual")}
              style={[
                styles.togglePill,
                billing === "annual" && { backgroundColor: tokens.card, borderColor: tokens.border },
              ]}
              hitSlop={8}
            >
              <Text style={[styles.toggleText, { color: billing === "annual" ? tokens.text : tokens.mutedText }]}>
                Annual
              </Text>
              <View style={[styles.saveBadge, { backgroundColor: tokens.warning }]}>
                <Text style={[styles.saveBadgeText, { color: tokens.text }]}>Save 25%</Text>
              </View>
            </Pressable>
          </View>
        </View>

        {/* Plan cards */}
        {PLANS.map((plan) => {
          const isPro = plan.id === "pro";
          const isCurrent = plan.id === currentPlan;
          const displayPrice = billing === "monthly" ? plan.monthlyPrice : plan.annualPrice;

          return (
            <Card
              key={plan.id}
              style={[
                styles.planCard,
                {
                  borderColor: isPro ? proBorder : tokens.border,
                  borderWidth: 1,
                  shadowColor: tokens.shadow,
                  backgroundColor: tokens.card,
                },
                isPro && styles.proCard,
              ]}
            >
              {/* Card header */}
              <View style={styles.planTopRow}>
                <View style={styles.planTitleWrap}>
                  <Text style={[styles.planName, { color: tokens.text }]}>{plan.name}</Text>

                  {isCurrent ? (
                    <View
                      style={[
                        styles.currentPill,
                        {
                          backgroundColor: isDark ? "rgba(30,120,255,0.18)" : "rgba(30,120,255,0.12)",
                          borderColor: tokens.primaryBlue,
                        },
                      ]}
                    >
                      <Text style={[styles.currentPillText, { color: tokens.primaryBlue }]}>Current</Text>
                    </View>
                  ) : plan.badge ? (
                    <View
                      style={[
                        styles.badgePill,
                        {
                          backgroundColor: isDark ? "rgba(255,200,106,0.18)" : "rgba(255,181,71,0.18)",
                          borderColor: proBorder,
                        },
                      ]}
                    >
                      <Text style={[styles.badgeText, { color: tokens.warning }]}>{plan.badge}</Text>
                    </View>
                  ) : null}
                </View>

                <Text style={[styles.planPrice, { color: isPro ? tokens.primaryBlue : tokens.text }]}>
                  {displayPrice}
                </Text>
              </View>

              <Text style={[styles.planSubtitle, { color: tokens.mutedText }]}>{plan.subtitle}</Text>

              {/* Features */}
              <View style={styles.features}>
                {plan.features.map((f) => (
                  <View key={f.label} style={styles.featureRow}>
                    <Ionicons
                      name={f.included ? "checkmark-circle" : "close-circle"}
                      size={18}
                      color={
                        f.included
                          ? tokens.success
                          : isDark
                            ? "rgba(236,243,255,0.28)"
                            : "rgba(11,27,58,0.22)"
                      }
                    />
                    <Text style={[styles.featureText, { color: f.included ? tokens.text : tokens.mutedText }]}>
                      {f.label}
                    </Text>
                  </View>
                ))}
              </View>

              {/* CTA */}
              <Pressable
                disabled={isCurrent}
                onPress={() => {
                  void purchasePlan(plan.id, billing);
                }}
                style={[
                  styles.cta,
                  {
                    backgroundColor: isCurrent
                      ? isDark
                        ? "rgba(255,255,255,0.08)"
                        : "rgba(11,27,58,0.06)"
                      : isPro
                        ? tokens.primaryBlue
                        : tokens.card,
                    borderColor: isCurrent
                      ? tokens.border
                      : isPro
                        ? tokens.primaryBlue
                        : tokens.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.ctaText,
                    { color: isCurrent ? tokens.mutedText : isPro ? "#FFFFFF" : tokens.text },
                  ]}
                >
                  {isCurrent ? "Current plan" : isPro ? "Upgrade to Pro" : "Choose Starter"}
                </Text>
              </Pressable>

              {/* Small note inside Pro card */}
              {isPro ? (
                <Text style={[styles.smallNote, { color: tokens.mutedText }]}>
                  Subscriptions are handled via Apple In-App Purchases.
                </Text>
              ) : null}
            </Card>
          );
        })}

        {/* Footer note */}
        <Card style={[styles.noteCard, { borderColor: tokens.border, borderWidth: 1, shadowColor: tokens.shadow }]}>
          <Text style={[styles.note, { color: tokens.mutedText }]}>
            Manage or cancel anytime in your Apple ID subscription settings.
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  // IMPORTANT: this is a ScrollView contentContainerStyle (no flex:1)
  container: {
    gap: 14,
    padding: 18,
    paddingTop: 14,
  },

  header: { gap: 12 },
  title: { fontSize: 34, fontWeight: "800" },
  subtitle: { fontSize: 16, marginTop: -6 },

  toggleWrap: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 6,
    flexDirection: "row",
    gap: 6,
    alignSelf: "flex-start",
  },
  togglePill: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  toggleText: { fontSize: 14, fontWeight: "700" },
  saveBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  saveBadgeText: { fontSize: 12, fontWeight: "800" },

  planCard: {
    borderRadius: 22,
    gap: 10,
  },
  proCard: {
    // Slight lift effect
    transform: [{ translateY: -2 }],
  },
  planTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  planTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexShrink: 1,
  },
  planName: { fontSize: 22, fontWeight: "900" },
  planPrice: { fontSize: 14, fontWeight: "800", textAlign: "right", maxWidth: 170 },

  badgePill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  badgeText: { fontSize: 12, fontWeight: "900" },

  currentPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  currentPillText: { fontSize: 12, fontWeight: "900" },

  planSubtitle: { fontSize: 14 },

  features: { gap: 10, marginTop: 4 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  featureText: { fontSize: 14, fontWeight: "600" },

  cta: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
    minHeight: 50,
    justifyContent: "center",
  },
  ctaText: { fontSize: 15, fontWeight: "900" },

  smallNote: { fontSize: 12, marginTop: 6 },

  noteCard: { borderRadius: 16 },
  note: { fontSize: 13, lineHeight: 18 },
});
