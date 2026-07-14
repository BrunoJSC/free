import { Button, Column, Text as ExpoUIText, Host } from "@expo/ui";
import { StyleSheet, View } from "react-native";

import { Container } from "@/components/container";
import { NAV_THEME } from "@/lib/constants";
import { useColorScheme } from "@/lib/use-color-scheme";

// Placeholder control: the demo button has no behaviour attached yet.
function noop() {
	return null;
}

export default function Modal() {
	const { colorScheme } = useColorScheme();
	const theme = colorScheme === "dark" ? NAV_THEME.dark : NAV_THEME.light;

	return (
		<Container>
			<View style={styles.container}>
				<Host style={styles.expoUiHost}>
					<Column alignment="center" spacing={12}>
						<ExpoUIText
							textStyle={{
								color: theme.text,
								fontSize: 20,
								fontWeight: "bold",
							}}
						>
							Modal
						</ExpoUIText>
						<ExpoUIText
							style={{ opacity: 0.7 }}
							textStyle={{
								color: theme.text,
								fontSize: 14,
								textAlign: "center",
							}}
						>
							Built with Expo UI universal components
						</ExpoUIText>
						<Button label="Native control" onPress={noop} />
					</Column>
				</Host>
			</View>
		</Container>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 16,
	},
	expoUiHost: {
		alignSelf: "stretch",
		padding: 16,
	},
});
