import type { AnyFieldApi } from "@tanstack/react-form";
import { useCallback } from "react";
import { StyleSheet, TextInput } from "react-native";

import type { NAV_THEME } from "@/lib/constants";

type Theme = (typeof NAV_THEME)["light"];

interface FormTextInputProps {
	autoCapitalize?: "none" | "sentences";
	field: AnyFieldApi;
	keyboardType?: "default" | "email-address";
	onSubmitEditing?: () => void;
	onValueChange?: () => void;
	placeholder: string;
	secureTextEntry?: boolean;
	theme: Theme;
}

export function FormTextInput({
	field,
	theme,
	placeholder,
	secureTextEntry,
	keyboardType = "default",
	autoCapitalize = "sentences",
	onSubmitEditing,
	onValueChange,
}: FormTextInputProps) {
	const handleChangeText = useCallback(
		(value: string) => {
			field.handleChange(value);
			onValueChange?.();
		},
		[field, onValueChange]
	);

	return (
		<TextInput
			autoCapitalize={autoCapitalize}
			keyboardType={keyboardType}
			onBlur={field.handleBlur}
			onChangeText={handleChangeText}
			onSubmitEditing={onSubmitEditing}
			placeholder={placeholder}
			placeholderTextColor={theme.text}
			secureTextEntry={secureTextEntry}
			style={[
				styles.input,
				{
					backgroundColor: theme.background,
					borderColor: theme.border,
					color: theme.text,
				},
			]}
			value={field.state.value}
		/>
	);
}

const styles = StyleSheet.create({
	input: {
		borderWidth: 1,
		fontSize: 16,
		marginBottom: 12,
		padding: 12,
	},
});
