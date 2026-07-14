import { Column, Text as ExpoUIText, Host } from "@expo/ui";
import { ScrollView, StyleSheet, View } from "react-native";

import { Container } from "@/components/container";
import { NAV_THEME } from "@/lib/constants";
import { useColorScheme } from "@/lib/use-color-scheme";

export default function TabOne() {
	const { colorScheme } = useColorScheme();
	const theme = colorScheme === "dark" ? NAV_THEME.dark : NAV_THEME.light;

	return (
		<Container>
			<ScrollView style={styles.scrollView}>
				<View style={styles.content}>
					<Host matchContents={{ vertical: true }}>
						<Column spacing={8}>
							<ExpoUIText
								textStyle={{
									color: theme.text,
									fontSize: 24,
									fontWeight: "bold",
								}}
							>
								Tab One
							</ExpoUIText>
							<ExpoUIText
								style={{ opacity: 0.7 }}
								textStyle={{ color: theme.text, fontSize: 16 }}
							>
								Explore the first section of your app
							</ExpoUIText>
						</Column>
					</Host>
				</View>
			</ScrollView>
		</Container>
	);
}

const styles = StyleSheet.create({
	content: {
		paddingVertical: 16,
	},
	scrollView: {
		flex: 1,
		padding: 16,
	},
});
