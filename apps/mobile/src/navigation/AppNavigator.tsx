import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Platform, StyleSheet } from "react-native";
import { BarChart3, TrendingUp, ArrowRightLeft, Layers, User } from "lucide-react-native";

import { BasketsScreen } from "../screens/BasketsScreen";
import { BasketDetailScreen } from "../screens/BasketDetailScreen";
import { useAuth } from "../context/AuthContext";
import { LoginScreen } from "../screens/LoginScreen";
import { NewTransactionScreen } from "../screens/NewTransactionScreen";
import { OverviewScreen } from "../screens/OverviewScreen";
import { FundsScreen } from "../screens/FundsScreen";
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
      screenListeners={{
        tabPress: () => {
          blurActiveWebElement();
        },
      }}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabItem,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ color, size }) => getTabIcon(route.name, color, size),
      })}
    >
      <Tab.Screen name="Resumo" component={OverviewScreen} />
      <Tab.Screen name="Fundos" component={FundsScreen} />
      <Tab.Screen name="Transacoes" component={TransactionsScreen} />
      <Tab.Screen name="Cestas" component={BasketsScreen} />
      <Tab.Screen name="Perfil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function blurActiveWebElement() {
  if (Platform.OS !== "web") {
    return;
  }

  const activeElement = document.activeElement;

  if (activeElement && "blur" in activeElement) {
    (activeElement as HTMLElement).blur();
  }
}

function getTabIcon(routeName: keyof RootTabParamList, color: string, size: number) {
  switch (routeName) {
    case "Resumo":
      return <BarChart3 color={color} size={size} strokeWidth={1.5} />;
    case "Fundos":
      return <TrendingUp color={color} size={size} strokeWidth={1.5} />;
    case "Transacoes":
      return <ArrowRightLeft color={color} size={size} strokeWidth={1.5} />;
    case "Cestas":
      return <Layers color={color} size={size} strokeWidth={1.5} />;
    case "Perfil":
      return <User color={color} size={size} strokeWidth={1.5} />;
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    height: 68,
    paddingBottom: 6,
    paddingTop: 8,
  },
  tabItem: {
    borderRadius: 6,
    marginHorizontal: 2,
    paddingVertical: 2,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "600",
    lineHeight: 12,
  },
});
