import { Tabs } from "expo-router";

import { TabBarIcon } from "@/components/tabbar-icon";
import { NAV_THEME } from "@/lib/constants";
import { useColorScheme } from "@/lib/use-color-scheme";

export default function TabLayout() {
	const { isDarkColorScheme } = useColorScheme();
	const theme = isDarkColorScheme ? NAV_THEME.dark : NAV_THEME.light;

	return (
		<Tabs
			screenOptions={{
				headerShown: false,
				tabBarActiveTintColor: theme.primary,
				tabBarInactiveTintColor: theme.text,
				tabBarStyle: {
					backgroundColor: theme.background,
					borderTopColor: theme.border,
				},
			}}
		>
			<Tabs.Screen
				name="index"
				options={{
					tabBarIcon: ({ color }) => <TabBarIcon color={color} name="home" />,
					title: "Home",
				}}
			/>
			<Tabs.Screen
				name="two"
				options={{
					tabBarIcon: ({ color }) => (
						<TabBarIcon color={color} name="compass" />
					),
					title: "Explore",
				}}
			/>
		</Tabs>
	);
}
