import { ZodError } from "zod";

/**
 * Erros de validação num formato que o formulário consome direto.
 *
 * `fieldErrors` é indexado pelo caminho do campo em dot-notation
 * (`title`, `budget.amountCents`, `milestones.0.dueDate`) — a mesma convenção
 * que o TanStack Form usa no `name` do campo, então dá para casar erro e campo
 * sem nenhuma tradução no meio.
 *
 * Preferimos isso a `z.flattenError()`, que só olha `path[0]` e colapsa todo
 * erro aninhado na chave do objeto pai: um erro em `budget.amountCents` chegaria
 * como `budget`, e o formulário não saberia em qual input pintar a mensagem.
 */
export interface ZodFieldErrors {
	/** Erros de campo, por caminho em dot-notation. */
	fieldErrors: Record<string, string[]>;
	/** Erros sem caminho — validações no nível do objeto (ex.: `.refine()` na raiz). */
	formErrors: string[];
}

const toDotPath = (path: readonly PropertyKey[]): string =>
	path.map(String).join(".");

function formatZodError(error: ZodError): ZodFieldErrors {
	const fieldErrors: Record<string, string[]> = {};
	const formErrors: string[] = [];

	for (const issue of error.issues) {
		if (issue.path.length === 0) {
			formErrors.push(issue.message);
			continue;
		}
		const path = toDotPath(issue.path);
		const messages = fieldErrors[path] ?? [];
		messages.push(issue.message);
		fieldErrors[path] = messages;
	}

	return { fieldErrors, formErrors };
}

/**
 * Converte o `cause` de um `TRPCError` em erros de campo, ou `null` se o erro
 * não veio de uma validação Zod.
 */
export function toZodFieldErrors(cause: unknown): ZodFieldErrors | null {
	return cause instanceof ZodError ? formatZodError(cause) : null;
}
