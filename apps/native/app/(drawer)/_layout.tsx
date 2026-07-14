import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { Drawer } from "expo-router/drawer";

import { HeaderButton } from "@/components/header-button";
import { NAV_THEME } from "@/lib/constants";
import { useColorScheme } from "@/lib/use-color-scheme";

const DrawerLayout = () => {
	const { colorScheme } = useColorScheme();
	const theme = colorScheme === "dark" ? NAV_THEME.dark : NAV_THEME.light;

	return (
		<Drawer
			screenOptions={{
				drawerInactiveTintColor: theme.text,
				drawerLabelStyle: {
					color: theme.text,
				},
				drawerStyle: {
					backgroundColor: theme.background,
				},
				headerStyle: {
					backgroundColor: theme.background,
				},
				headerTintColor: theme.text,
				headerTitleStyle: {
					color: theme.text,
				},
			}}
		>
			<Drawer.Screen
				name="index"
				options={{
					drawerIcon: ({ size, color }) => (
						<Ionicons color={color} name="home-outline" size={size} />
					),
					drawerLabel: "Home",
					headerTitle: "Home",
				}}
			/>
			<Drawer.Screen
				name="(tabs)"
				options={{
					drawerIcon: ({ size, color }) => (
						<MaterialIcons color={color} name="border-bottom" size={size} />
					),
					drawerLabel: "Tabs",
					headerRight: () => (
						<Link asChild href="/modal">
							<HeaderButton />
						</Link>
					),
					headerTitle: "Tabs",
				}}
			/>
			<Drawer.Screen
				name="todos"
				options={{
					drawerIcon: ({ size, color }) => (
						<Ionicons color={color} name="checkbox-outline" size={size} />
					),
					drawerLabel: "Todos",
					headerTitle: "Todos",
				}}
			/>
		</Drawer>
	);
};

export default DrawerLayout;
