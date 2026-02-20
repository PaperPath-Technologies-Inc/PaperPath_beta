import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

import { useTheme } from "@/src/theme/useTheme";

export default function TabsLayout() {
  const { tokens } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tokens.primaryBlue,
        tabBarInactiveTintColor: tokens.mutedText,
        tabBarStyle: {
          backgroundColor: tokens.tabBar,
          borderTopColor: tokens.border,
          height: 86,
          paddingBottom: 14,
          paddingTop: 10,
        },
        sceneStyle: { backgroundColor: tokens.bg },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: "Tasks",
          tabBarIcon: ({ color, size }) => <Ionicons name="checkmark-circle" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="vault"
        options={{
          title: "Vault",
          tabBarIcon: ({ color, size }) => <Ionicons name="folder" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarIcon: ({ color, size }) => <Ionicons name="menu" size={size} color={color} />,
        }}
      />
      <Tabs.Screen name="reminders" options={{ href: null }} />
      <Tabs.Screen name="airisk" options={{ href: null }} />
      <Tabs.Screen name="pricing" options={{ href: null }} />
      <Tabs.Screen name="support" options={{ href: null }} />
      <Tabs.Screen
        name="settings"
        options={{
          href: null,
          headerShown: true,
          headerTitle: "Settings",
          headerStyle: { backgroundColor: tokens.bg },
          headerTintColor: tokens.text,
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: "700" },
        }}
      />
    </Tabs>
  );
}
