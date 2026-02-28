import { Ionicons } from "@expo/vector-icons";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card } from "@/src/components/Card";
import { useTheme } from "@/src/theme/useTheme";

export default function ContactScreen() {
  const { tokens } = useTheme();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tokens.bg }]}> 
      <View style={styles.container}>
        <Text style={[styles.title, { color: tokens.text }]}>Contact</Text>

        <Pressable onPress={() => void Linking.openURL("mailto:admin@paperpath.ca")}> 
          <Card style={[styles.rowCard, { borderColor: tokens.border, borderWidth: 1, shadowColor: tokens.shadow }]}>
            <View style={styles.row}>
              <Ionicons name="mail-outline" size={18} color={tokens.primaryBlue} />
              <Text style={[styles.rowText, { color: tokens.text }]}>admin@path.ca</Text>
              <Ionicons name="open-outline" size={16} color={tokens.mutedText} />
            </View>
          </Card>
        </Pressable>

        <Pressable onPress={() => void Linking.openURL("https://paperpath.ca")}> 
          <Card style={[styles.rowCard, { borderColor: tokens.border, borderWidth: 1, shadowColor: tokens.shadow }]}>
            <View style={styles.row}>
              <Ionicons name="globe-outline" size={18} color={tokens.primaryBlue} />
              <Text style={[styles.rowText, { color: tokens.text }]}>paperpath.ca</Text>
              <Ionicons name="open-outline" size={16} color={tokens.mutedText} />
            </View>
          </Card>
        </Pressable>

        <Card style={[styles.noteCard, { borderColor: tokens.border, borderWidth: 1, shadowColor: tokens.shadow }]}>
          <Text style={[styles.note, { color: tokens.mutedText }]}>Typical response time: within 1-2 business days.</Text>
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 12,
    padding: 18,
  },
  note: {
    fontSize: 14,
    lineHeight: 20,
  },
  noteCard: {
    borderRadius: 16,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  rowCard: {
    borderRadius: 16,
    paddingVertical: 14,
  },
  rowText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
  },
  safe: {
    flex: 1,
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    marginBottom: 2,
  },
});
