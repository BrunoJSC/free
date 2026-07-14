import { Input } from "@free/ui/components/input";
import { Label } from "@free/ui/components/label";
import type { AnyFieldApi } from "@tanstack/react-form";
import { type ChangeEvent, useCallback } from "react";

interface TextFieldProps {
	field: AnyFieldApi;
	label: string;
	type?: "text" | "email" | "password";
}

export default function TextField({
	field,
	label,
	type = "text",
}: TextFieldProps) {
	const handleChange = useCallback(
		(event: ChangeEvent<HTMLInputElement>) => {
			field.handleChange(event.target.value);
		},
		[field]
	);

	return (
		<div className="space-y-2">
			<Label htmlFor={field.name}>{label}</Label>
			<Input
				id={field.name}
				name={field.name}
				onBlur={field.handleBlur}
				onChange={handleChange}
				type={type}
				value={field.state.value}
			/>
			{field.state.meta.errors.map(
				(error: { message?: string } | undefined) => (
					<p className="text-red-500" key={error?.message}>
						{error?.message}
					</p>
				)
			)}
		</div>
	);
}
