import { Button, Column, Text as ExpoUIText, Host } from "@expo/ui";
import { router, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { Container } from "@/components/container";
import { NAV_THEME } from "@/lib/constants";
import { useColorScheme } from "@/lib/use-color-scheme";

function goHome() {
	router.replace("/");
}

export default function NotFoundScreen() {
	const { colorScheme } = useColorScheme();
	const theme = colorScheme === "dark" ? NAV_THEME.dark : NAV_THEME.light;

	return (
		<>
			<Stack.Screen options={{ title: "Oops!" }} />
			<Container>
				<View style={styles.container}>
					<View style={styles.content}>
						<Text style={styles.emoji}>🤔</Text>
						<Host matchContents={{ vertical: true }}>
							<Column alignment="center" spacing={12}>
								<ExpoUIText
									textStyle={{
										color: theme.text,
										fontSize: 20,
										fontWeight: "bold",
										textAlign: "center",
									}}
								>
									Page Not Found
								</ExpoUIText>
								<ExpoUIText
									style={{ opacity: 0.7 }}
									textStyle={{
										color: theme.text,
										fontSize: 14,
										textAlign: "center",
									}}
								>
									Sorry, the page you're looking for doesn't exist.
								</ExpoUIText>
								<Button
									label="Go to Home"
									onPress={goHome}
									variant="outlined"
								/>
							</Column>
						</Host>
					</View>
				</View>
			</Container>
		</>
	);
}

const styles = StyleSheet.create({
	container: {
		alignItems: "center",
		flex: 1,
		justifyContent: "center",
		padding: 16,
	},
	content: {
		alignItems: "center",
	},
	emoji: {
		fontSize: 48,
		marginBottom: 16,
	},
});
