import { Link } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/src/components/Button";
import { Card } from "@/src/components/Card";
import { useAuth } from "@/src/lib/useAuth";
import { useTheme } from "@/src/theme/useTheme";

export default function SignupScreen() {
  const { tokens } = useTheme();
  const { signUp, isSupabaseConfigured } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function onSignup() {
    setMessage(null);
    const result = await signUp(email.trim(), password);
    if (result.error) {
      setMessage(result.error);
      return;
    }
    setMessage("Account created. Please check your email to confirm your account.");
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tokens.bg }]}>
      <View style={styles.container}>
        <Text style={[styles.title, { color: tokens.text }]}>Create account</Text>
        <Text style={[styles.subtitle, { color: tokens.mutedText }]}>We will send a confirmation email.</Text>

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
            placeholder="At least 8 characters"
            placeholderTextColor={tokens.mutedText}
            style={[styles.input, { color: tokens.text, borderColor: tokens.border }]}
            value={password}
            onChangeText={setPassword}
          />

          {!isSupabaseConfigured ? (
            <Text style={[styles.message, { color: tokens.warning }]}>Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.</Text>
          ) : null}

          {message ? <Text style={[styles.message, { color: tokens.success }]}>{message}</Text> : null}

          <Button title="Create account" onPress={onSignup} style={styles.submit} />
        </Card>

        <Text style={[styles.linkText, { color: tokens.mutedText }]}>
          Already have an account? <Link href="/(auth)/login" style={{ color: tokens.primaryBlue }}>Log in</Link>
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
