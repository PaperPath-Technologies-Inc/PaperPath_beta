import { Link, router } from "expo-router";
import { useState } from "react";
import type { ComponentProps, ReactNode } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/src/components/Button";
import { useAuth } from "@/src/lib/useAuth";
import { useTheme } from "@/src/theme/useTheme";

export default function SignupScreen() {
  const { tokens } = useTheme();
  const { signUp, isSupabaseConfigured } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isErrorMessage, setIsErrorMessage] = useState(false);

  async function onSignup() {
    setMessage(null);
    setIsErrorMessage(false);
    const result = await signUp(email.trim(), password);
    if (result.error) {
      setMessage(result.error);
      setIsErrorMessage(true);
      return;
    }
    setMessage("Account created. Please check your email to confirm your account.");
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tokens.bg }]}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoWrap}>
          <View style={[styles.logo, { backgroundColor: tokens.primaryBlue }]}>
            <Text style={styles.logoText}>PP</Text>
          </View>
          <Text style={[styles.brand, { color: tokens.text }]}>PaperPath</Text>
        </View>

        <View
          style={[
            styles.formCard,
            {
              backgroundColor: tokens.card,
              borderColor: tokens.border,
              shadowColor: tokens.shadow,
            },
          ]}
        >
          <Text style={[styles.title, { color: tokens.text }]}>Create Account</Text>
          <Text style={[styles.subtitle, { color: tokens.mutedText }]}>Sign up to get started</Text>

          <InputLabel text="Full Name" color={tokens.text} />
          <InputRow
            icon="person-outline"
            iconColor={tokens.mutedText}
            borderColor={tokens.border}
            bgColor={tokens.card}
          >
            <TextInput
              placeholder="Enter your full name"
              placeholderTextColor={tokens.mutedText}
              style={[styles.input, { color: tokens.text }]}
              value={fullName}
              onChangeText={setFullName}
            />
          </InputRow>

          <InputLabel text="Email Address" color={tokens.text} />
          <InputRow
            icon="mail-outline"
            iconColor={tokens.mutedText}
            borderColor={tokens.border}
            bgColor={tokens.card}
          >
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="Enter your email address"
              placeholderTextColor={tokens.mutedText}
              style={[styles.input, { color: tokens.text }]}
              value={email}
              onChangeText={setEmail}
            />
          </InputRow>

          <InputLabel text="Password" color={tokens.text} />
          <InputRow
            icon="lock-closed-outline"
            iconColor={tokens.mutedText}
            borderColor={tokens.border}
            bgColor={tokens.card}
          >
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry={!showPassword}
              placeholder="Create a password"
              placeholderTextColor={tokens.mutedText}
              style={[styles.input, { color: tokens.text }]}
              value={password}
              onChangeText={setPassword}
            />
            <Pressable
              onPress={() => setShowPassword((prev) => !prev)}
              hitSlop={8}
              style={styles.passwordToggle}
            >
              <Ionicons
                name={showPassword ? "eye-outline" : "eye-off-outline"}
                size={20}
                color={tokens.mutedText}
              />
            </Pressable>
          </InputRow>

          {!isSupabaseConfigured ? (
            <Text style={[styles.message, { color: tokens.danger || tokens.warning }]}>
              Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.
            </Text>
          ) : null}

          {message ? (
            <Text
              style={[
                styles.message,
                { color: isErrorMessage ? tokens.danger || tokens.warning : tokens.success },
              ]}
            >
              {message}
            </Text>
          ) : null}

          <Button title="Sign Up" onPress={onSignup} style={styles.submit} />

          <Text style={[styles.linkText, { color: tokens.mutedText }]}>
            Already have an account?{" "}
            <Link href="/(auth)/login" style={{ color: tokens.primaryBlue, fontWeight: "700" }}>
              Log In
            </Link>
          </Text>

          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: tokens.border }]} />
            <Text style={[styles.dividerText, { color: tokens.mutedText }]}>OR</Text>
            <View style={[styles.dividerLine, { backgroundColor: tokens.border }]} />
          </View>

          <View style={styles.socialRow}>
            <Pressable
              onPress={() => Alert.alert("Not available yet", "Google sign in is not enabled yet. Use email sign up for now.")}
              style={[styles.socialButton, { borderColor: tokens.border, backgroundColor: tokens.card }]}
            >
              <Ionicons name="logo-google" size={20} color={tokens.text} />
              <Text style={[styles.socialText, { color: tokens.text }]}>Continue with Google</Text>
            </Pressable>
            <Pressable
              onPress={() => Alert.alert("Not available yet", "Apple sign in is not enabled yet. Use email sign up for now.")}
              style={[styles.socialButton, { borderColor: tokens.border, backgroundColor: tokens.card }]}
            >
              <Ionicons name="logo-apple" size={20} color={tokens.text} />
              <Text style={[styles.socialText, { color: tokens.text }]}>Continue with Apple</Text>
            </Pressable>
          </View>

          <Text style={[styles.disclaimer, { color: tokens.mutedText }]}>
            By signing up you agree to our{" "}
            <Text
              onPress={() => router.push("/terms")}
              style={[styles.disclaimerLink, { color: tokens.primaryBlue }]}
            >
              Terms and Conditions of Use.
            </Text>
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InputLabel({ text, color }: { text: string; color: string }) {
  return <Text style={[styles.label, { color }]}>{text}</Text>;
}

function InputRow({
  icon,
  iconColor,
  borderColor,
  bgColor,
  children,
}: {
  icon: ComponentProps<typeof Ionicons>["name"];
  iconColor: string;
  borderColor: string;
  bgColor: string;
  children: ReactNode;
}) {
  return (
    <View style={[styles.inputRow, { borderColor, backgroundColor: bgColor }]}>
      <Ionicons name={icon} size={20} color={iconColor} />
      <View style={styles.inputField}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  brand: {
    fontSize: 38,
    fontWeight: "800",
  },
  container: {
    padding: 22,
    paddingBottom: 28,
  },
  disclaimer: {
    fontSize: 14,
    lineHeight: 22,
    marginTop: 18,
    textAlign: "center",
  },
  disclaimerLink: {
    fontWeight: "700",
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
  },
  dividerText: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  formCard: {
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
    marginTop: 24,
    padding: 18,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: Platform.OS === "ios" ? 0.18 : 0,
    shadowRadius: 16,
    elevation: Platform.OS === "android" ? 3 : 0,
  },
  input: {
    flex: 1,
    fontSize: 18,
    paddingVertical: 0,
  },
  inputField: {
    flex: 1,
  },
  inputRow: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 52,
    paddingHorizontal: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 10,
  },
  linkText: {
    marginTop: 24,
    textAlign: "center",
  },
  logo: {
    alignItems: "center",
    borderRadius: 14,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  logoText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  logoWrap: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    marginTop: 8,
  },
  message: {
    fontSize: 13,
    marginTop: 8,
  },
  passwordToggle: {
    padding: 2,
  },
  safe: {
    flex: 1,
  },
  socialButton: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: 10,
  },
  socialRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  socialText: {
    fontSize: 14,
    fontWeight: "600",
  },
  submit: {
    borderRadius: 15,
    marginTop: 12,
    minHeight: 56,
  },
  subtitle: {
    fontSize: 18,
    marginTop: 4,
  },
  title: {
    fontSize: 46,
    fontWeight: "800",
  },
});
