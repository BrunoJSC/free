import { useForm } from "@tanstack/react-form";
import { useCallback, useState } from "react";
import {
	ActivityIndicator,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import z from "zod";

import { FormTextInput } from "@/components/form-text-input";
import { authClient } from "@/lib/auth-client";
import { NAV_THEME } from "@/lib/constants";
import { useColorScheme } from "@/lib/use-color-scheme";
import { queryClient } from "@/utils/trpc";

const signUpSchema = z.object({
	email: z
		.string()
		.trim()
		.min(1, "Email is required")
		.email("Enter a valid email address"),
	name: z
		.string()
		.trim()
		.min(1, "Name is required")
		.min(2, "Name must be at least 2 characters"),
	password: z
		.string()
		.min(1, "Password is required")
		.min(8, "Use at least 8 characters"),
});

function getErrorMessage(error: unknown): string | null {
	if (!error) {
		return null;
	}

	if (typeof error === "string") {
		return error;
	}

	if (Array.isArray(error)) {
		for (const issue of error) {
			const message = getErrorMessage(issue);
			if (message) {
				return message;
			}
		}
		return null;
	}

	if (typeof error === "object" && error !== null) {
		const maybeError = error as { message?: unknown };
		if (typeof maybeError.message === "string") {
			return maybeError.message;
		}
	}

	return null;
}

const submitSelector = (state: {
	isSubmitting: boolean;
	errorMap: { onSubmit?: unknown };
}) => ({
	isSubmitting: state.isSubmitting,
	validationError: getErrorMessage(state.errorMap.onSubmit),
});

function SignUp() {
	const { colorScheme } = useColorScheme();
	const theme = colorScheme === "dark" ? NAV_THEME.dark : NAV_THEME.light;
	const [error, setError] = useState<string | null>(null);

	const form = useForm({
		defaultValues: {
			email: "",
			name: "",
			password: "",
		},
		onSubmit: async ({ value, formApi }) => {
			await authClient.signUp.email(
				{
					email: value.email.trim(),
					name: value.name.trim(),
					password: value.password,
				},
				{
					onError(signUpError) {
						setError(signUpError.error?.message || "Failed to sign up");
					},
					onSuccess() {
						setError(null);
						formApi.reset();
						queryClient.refetchQueries();
					},
				}
			);
		},
		validators: {
			onSubmit: signUpSchema,
		},
	});

	const clearError = useCallback(() => {
		setError(null);
	}, []);

	return (
		<View
			style={[
				styles.card,
				{ backgroundColor: theme.card, borderColor: theme.border },
			]}
		>
			<Text style={[styles.title, { color: theme.text }]}>Create Account</Text>

			<form.Subscribe selector={submitSelector}>
				{({ isSubmitting, validationError }) => {
					const formError = error ?? validationError;

					return (
						<>
							{formError ? (
								<View
									style={[
										styles.errorContainer,
										{ backgroundColor: `${theme.notification}20` },
									]}
								>
									<Text
										style={[styles.errorText, { color: theme.notification }]}
									>
										{formError}
									</Text>
								</View>
							) : null}

							<form.Field name="name">
								{(field) => (
									<FormTextInput
										field={field}
										onValueChange={clearError}
										placeholder="Name"
										theme={theme}
									/>
								)}
							</form.Field>

							<form.Field name="email">
								{(field) => (
									<FormTextInput
										autoCapitalize="none"
										field={field}
										keyboardType="email-address"
										onValueChange={clearError}
										placeholder="Email"
										theme={theme}
									/>
								)}
							</form.Field>

							<form.Field name="password">
								{(field) => (
									<FormTextInput
										field={field}
										onSubmitEditing={form.handleSubmit}
										onValueChange={clearError}
										placeholder="Password"
										secureTextEntry
										theme={theme}
									/>
								)}
							</form.Field>

							<TouchableOpacity
								disabled={isSubmitting}
								onPress={form.handleSubmit}
								style={[
									styles.button,
									{
										backgroundColor: theme.primary,
										opacity: isSubmitting ? 0.5 : 1,
									},
								]}
							>
								{isSubmitting ? (
									<ActivityIndicator color="#ffffff" size="small" />
								) : (
									<Text style={styles.buttonText}>Sign Up</Text>
								)}
							</TouchableOpacity>
						</>
					);
				}}
			</form.Subscribe>
		</View>
	);
}

const styles = StyleSheet.create({
	button: {
		alignItems: "center",
		justifyContent: "center",
		padding: 12,
	},
	buttonText: {
		color: "#ffffff",
		fontSize: 16,
	},
	card: {
		borderWidth: 1,
		marginTop: 16,
		padding: 16,
	},
	errorContainer: {
		marginBottom: 12,
		padding: 8,
	},
	errorText: {
		fontSize: 14,
	},
	title: {
		fontSize: 18,
		fontWeight: "bold",
		marginBottom: 12,
	},
});

export { SignUp };
