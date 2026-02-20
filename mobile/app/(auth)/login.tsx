import { Link, router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/src/components/Button";
import { Card } from "@/src/components/Card";
import { useAuth } from "@/src/lib/useAuth";
import { useTheme } from "@/src/theme/useTheme";

export default function LoginScreen() {
  const { tokens } = useTheme();
  const { signIn, isSupabaseConfigured } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
        <Text style={[styles.title, { color: tokens.text }]}>Log in</Text>
        <Text style={[styles.subtitle, { color: tokens.mutedText }]}>Continue where you left off.</Text>

        <Card style={styles.form}>
          <Text style={[styles.label, { color: tokens.text }]}>Email</Text>
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@example.com"
            placeholderTextColor={tokens.mutedText}
            style={[styles.input, { color: tokens.text, borderColor: tokens.border }]}
            value={email}
            onChangeText={setEmail}
          />

          <Text style={[styles.label, { color: tokens.text }]}>Password</Text>
          <TextInput
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor={tokens.mutedText}
            style={[styles.input, { color: tokens.text, borderColor: tokens.border }]}
            value={password}
            onChangeText={setPassword}
          />

          <Pressable>
            <Text style={[styles.forgot, { color: tokens.primaryBlue }]}>Forgot password</Text>
          </Pressable>

          {!isSupabaseConfigured ? (
            <Text style={[styles.message, { color: tokens.warning }]}>Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.</Text>
          ) : null}
          {message ? <Text style={[styles.message, { color: tokens.warning }]}>{message}</Text> : null}

          <Button title="Log in" onPress={onLogin} style={styles.submit} />
        </Card>

        <Text style={[styles.linkText, { color: tokens.mutedText }]}>
          New to PaperPath? <Link href="/(auth)/signup" style={{ color: tokens.primaryBlue }}>Create account</Link>
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  forgot: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 2,
  },
  form: {
    gap: 10,
    marginTop: 24,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4,
  },
  linkText: {
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
  submit: {
    marginTop: 6,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 5,
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    marginTop: 12,
  },
});
