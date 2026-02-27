import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Image,
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

export default function LoginScreen() {
  const { tokens } = useTheme();
  const { signIn, isSupabaseConfigured } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  async function onLogin() {
    setMessage(null);
    const result = await signIn(email.trim(), password);
    if (result.error) {
      setMessage(result.error);
      return;
    }
    router.replace("/(tabs)/home");
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tokens.bg }]}>
      <View style={styles.container}>
        <Image
          source={require("../../assets/images/splash-light.png")}
          style={styles.watermark}
          resizeMode="contain"
          blurRadius={18}
          pointerEvents="none"
        />

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={[styles.title, { color: tokens.text }]}>Sign In</Text>
          <Text style={[styles.subtitle, { color: tokens.mutedText }]}>Welcome back</Text>

          <View style={styles.form}>
            <View style={[styles.inputWrap, { backgroundColor: tokens.card, borderColor: tokens.border }]}>
              <Ionicons name="mail-outline" size={20} color={tokens.mutedText} />
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                placeholder="Email Address"
                placeholderTextColor={tokens.mutedText}
                style={[styles.input, { color: tokens.text }]}
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View style={[styles.inputWrap, { backgroundColor: tokens.card, borderColor: tokens.border }]}>
              <Ionicons name="lock-closed-outline" size={20} color={tokens.mutedText} />
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry={!showPassword}
                placeholder="Password"
                placeholderTextColor={tokens.mutedText}
                style={[styles.input, { color: tokens.text }]}
                value={password}
                onChangeText={setPassword}
              />
              <Pressable onPress={() => setShowPassword((prev) => !prev)} hitSlop={8}>
                <Ionicons
                  name={showPassword ? "eye-outline" : "eye-off-outline"}
                  size={20}
                  color={tokens.mutedText}
                />
              </Pressable>
            </View>

            <View style={styles.metaRow}>
              <Pressable style={styles.rememberRow} onPress={() => setRememberMe((prev) => !prev)}>
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor: rememberMe ? tokens.primaryBlue : tokens.border,
                      backgroundColor: rememberMe ? tokens.primaryBlue : "transparent",
                    },
                  ]}
                >
                  {rememberMe ? <Ionicons name="checkmark" size={12} color="#FFFFFF" /> : null}
                </View>
                <Text style={[styles.metaText, { color: tokens.text }]}>Remember Me</Text>
              </Pressable>

              <Pressable onPress={() => Alert.alert("Password reset", "Please contact support@paperpath.ca to reset your password.")}>
                <Text style={[styles.forgot, { color: tokens.primaryBlue }]}>Forgot Password?</Text>
              </Pressable>
            </View>

            {!isSupabaseConfigured ? (
              <Text style={[styles.message, { color: tokens.warning }]}>Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.</Text>
            ) : null}
            {message ? <Text style={[styles.message, { color: tokens.warning }]}>{message}</Text> : null}

            <Button title="Sign In" onPress={onLogin} style={styles.submit} />
          </View>

          <Text style={[styles.linkText, { color: tokens.mutedText }]}>
            Don&apos;t have an account?{" "}
            <Link href="/(auth)/signup" style={{ color: tokens.primaryBlue, fontWeight: "700" }}>
              Sign Up
            </Link>
          </Text>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  checkbox: {
    alignItems: "center",
    borderRadius: 5,
    borderWidth: 1,
    height: 18,
    justifyContent: "center",
    width: 18,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 148,
    paddingBottom: 28,
  },
  form: {
    gap: 12,
    marginTop: 28,
  },
  forgot: {
    fontSize: 15,
    fontWeight: "600",
  },
  input: {
    flex: 1,
    fontSize: 18,
    minHeight: 52,
    paddingHorizontal: 2,
  },
  inputWrap: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 56,
    paddingHorizontal: 16,
  },
  linkText: {
    fontSize: 16,
    marginTop: 24,
    textAlign: "center",
  },
  message: {
    fontSize: 13,
    marginBottom: 4,
  },
  safe: {
    flex: 1,
  },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 2,
  },
  metaText: {
    fontSize: 16,
  },
  rememberRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 9,
  },
  submit: {
    borderRadius: 16,
    marginTop: 8,
    minHeight: 56,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 2,
  },
  title: {
    fontSize: 46,
    fontWeight: "800",
  },
  watermark: {
    alignSelf: "center",
    height: 360,
    opacity: 0.6,
    position: "absolute",
    top: -6,
    transform: [{ scale: 1.38 }],
    width: 290,
  },
});
