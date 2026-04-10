import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StyleSheet, Text, View } from "react-native";

import { BasketsScreen } from "../screens/BasketsScreen";
import { BasketDetailScreen } from "../screens/BasketDetailScreen";
import { useAuth } from "../context/AuthContext";
import { LoginScreen } from "../screens/LoginScreen";
import { NewTransactionScreen } from "../screens/NewTransactionScreen";
import { OverviewScreen } from "../screens/OverviewScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { RebalanceScreen } from "../screens/RebalanceScreen";
import { TransactionsScreen } from "../screens/TransactionsScreen";
import { colors } from "../theme/colors";
import type { RootStackParamList, RootTabParamList } from "./types";

const Tab = createBottomTabNavigator<RootTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    border: colors.border,
    card: colors.surface,
    primary: colors.primary,
    text: colors.text,
  },
};

export function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <NavigationContainer theme={navigationTheme}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <>
            <Stack.Screen name="Tabs" component={TabsNavigator} />
            <Stack.Screen name="NovaTransacao" component={NewTransactionScreen} />
            <Stack.Screen name="Rebalanceamento" component={RebalanceScreen} />
            <Stack.Screen name="DetalheCesta" component={BasketDetailScreen} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function TabsNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Resumo"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused }) => (
          <View style={[styles.icon, focused ? styles.iconFocused : undefined]}>
            <Text style={[styles.iconText, focused ? styles.iconTextFocused : undefined]}>
              {getTabIcon(route.name)}
            </Text>
          </View>
        ),
      })}
    >
      <Tab.Screen name="Resumo" component={OverviewScreen} />
      <Tab.Screen name="Transacoes" component={TransactionsScreen} />
      <Tab.Screen name="Cestas" component={BasketsScreen} />
      <Tab.Screen name="Perfil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function getTabIcon(routeName: keyof RootTabParamList) {
  switch (routeName) {
    case "Resumo":
      return "RS";
    case "Transacoes":
      return "TR";
    case "Cestas":
      return "CS";
    case "Perfil":
      return "PF";
    default:
      return "--";
  }
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    height: 86,
    paddingBottom: 10,
    paddingTop: 10,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  icon: {
    alignItems: "center",
    borderRadius: 4,
    height: 28,
    justifyContent: "center",
    width: 40,
  },
  iconFocused: {
    backgroundColor: colors.primary,
  },
  iconText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
  },
  iconTextFocused: {
    color: "#0F1115",
  },
});
