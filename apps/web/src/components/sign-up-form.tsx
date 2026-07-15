import { Button } from "@free/ui/components/button";
import { signUpSchema } from "@free/validators/auth";
import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { type SubmitEvent, useCallback } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";

import Loader from "./loader";
import TextField from "./text-field";

const submitSelector = (state: {
	canSubmit: boolean;
	isSubmitting: boolean;
}) => ({
	canSubmit: state.canSubmit,
	isSubmitting: state.isSubmitting,
});

export default function SignUpForm({
	onSwitchToSignIn,
}: {
	onSwitchToSignIn: () => void;
}) {
	const navigate = useNavigate({
		from: "/",
	});
	const { isPending } = authClient.useSession();

	const form = useForm({
		defaultValues: {
			email: "",
			name: "",
			password: "",
		},
		onSubmit: async ({ value }) => {
			// O TanStack Form valida com o schema mas não escreve a saída dele de
			// volta no estado do formulário: `value` continua sendo o que o usuário
			// digitou, sem o `.trim()`. Por isso o `parse` aqui — é o que normaliza,
			// e sai da mesma fonte que validou. Não lança: o `onSubmit` só roda depois
			// que o `validators.onSubmit` passou.
			const credentials = signUpSchema.parse(value);

			await authClient.signUp.email(credentials, {
				onError: (error) => {
					toast.error(error.error.message || error.error.statusText);
				},
				onSuccess: () => {
					navigate({
						to: "/dashboard",
					});
					toast.success("Sign up successful");
				},
			});
		},
		validators: {
			onSubmit: signUpSchema,
		},
	});

	const handleSubmit = useCallback(
		(event: SubmitEvent<HTMLFormElement>) => {
			event.preventDefault();
			event.stopPropagation();
			form.handleSubmit();
		},
		[form]
	);

	if (isPending) {
		return <Loader />;
	}

	return (
		<div className="mx-auto mt-10 w-full max-w-md p-6">
			<h1 className="mb-6 text-center font-bold text-3xl">Create Account</h1>

			<form className="space-y-4" onSubmit={handleSubmit}>
				<div>
					<form.Field name="name">
						{(field) => <TextField field={field} label="Name" />}
					</form.Field>
				</div>

				<div>
					<form.Field name="email">
						{(field) => <TextField field={field} label="Email" type="email" />}
					</form.Field>
				</div>

				<div>
					<form.Field name="password">
						{(field) => (
							<TextField field={field} label="Password" type="password" />
						)}
					</form.Field>
				</div>

				<form.Subscribe selector={submitSelector}>
					{({ canSubmit, isSubmitting }) => (
						<Button
							className="w-full"
							disabled={!canSubmit || isSubmitting}
							type="submit"
						>
							{isSubmitting ? "Submitting..." : "Sign Up"}
						</Button>
					)}
				</form.Subscribe>
			</form>

			<div className="mt-4 text-center">
				<Button
					className="text-indigo-600 hover:text-indigo-800"
					onClick={onSwitchToSignIn}
					variant="link"
				>
					Already have an account? Sign In
				</Button>
			</div>
		</div>
	);
}
