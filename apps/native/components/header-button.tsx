import FontAwesome from "@expo/vector-icons/FontAwesome";
import { type Ref, useCallback } from "react";
import {
	Pressable,
	type PressableStateCallbackType,
	StyleSheet,
	type View,
} from "react-native";

import { NAV_THEME } from "@/lib/constants";
import { useColorScheme } from "@/lib/use-color-scheme";

interface HeaderButtonProps {
	onPress?: () => void;
	ref?: Ref<View>;
}

export function HeaderButton({ onPress, ref }: Readonly<HeaderButtonProps>) {
	const { colorScheme } = useColorScheme();
	const theme = colorScheme === "dark" ? NAV_THEME.dark : NAV_THEME.light;

	const buttonStyle = useCallback(
		({ pressed }: PressableStateCallbackType) => [
			styles.button,
			{
				backgroundColor: pressed ? theme.background : theme.card,
			},
		],
		[theme]
	);

	return (
		<Pressable onPress={onPress} ref={ref} style={buttonStyle}>
			{({ pressed }) => (
				<FontAwesome
					color={theme.text}
					name="info-circle"
					size={20}
					style={{
						opacity: pressed ? 0.7 : 1,
					}}
				/>
			)}
		</Pressable>
	);
}

const styles = StyleSheet.create({
	button: {
		marginRight: 8,
		padding: 8,
	},
});
