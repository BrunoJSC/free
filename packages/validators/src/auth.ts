import { z } from "zod";

/**
 * Schemas de entrada de autenticação, compartilhados pelo formulário da web, o
 * do native e a configuração do Better Auth.
 *
 * Este pacote depende **só do `zod`** — nada de `@free/db`, `@free/auth` ou
 * `@free/env`. É o que permite um formulário importá-lo sem arrastar o grafo do
 * servidor (e, com ele, `DATABASE_URL` e `BETTER_AUTH_SECRET`) para dentro do
 * bundle do cliente.
 *
 * Note que cadastro e login **não passam pelo tRPC**: os formulários falam com
 * `/api/auth/*` via `authClient`. Então o servidor não valida com estes schemas,
 * e sim com as regras do próprio Better Auth. Por isso `PASSWORD_MIN_LENGTH` é
 * exportado daqui e o `@free/auth` é configurado com ele: é o que mantém as três
 * pontas dizendo a mesma coisa.
 */

/**
 * Tamanho mínimo da senha no cadastro.
 *
 * Antes deste pacote o `8` estava escrito à mão em quatro formulários e o
 * servidor usava o default do Better Auth — que por coincidência também era 8.
 * Nada garantia que continuassem iguais. Mudar o número aqui move os cinco.
 */
export const PASSWORD_MIN_LENGTH = 8;

const NAME_MIN_LENGTH = 2;

/**
 * `.trim()` antes de validar: o formulário do native já aparava o e-mail e o da
 * web não, então `" a@b.com "` era recusado num cliente e enviado com espaço no
 * outro.
 */
export const emailSchema = z
	.string()
	.trim()
	.min(1, "Email is required")
	.pipe(z.email("Enter a valid email address"));

/**
 * O `.pipe()` aqui não é enfeite: dois `.min()` no mesmo `ZodString` acumulam
 * **as duas** mensagens num campo vazio ("Name is required" *e* "Name must be at
 * least 2 characters"), e o `TextField` da web renderiza todos os erros do campo
 * — dois avisos vermelhos empilhados para um input só. O `pipe` corta: se o
 * primeiro estágio falha, o segundo nem roda.
 */
export const nameSchema = z
	.string()
	.trim()
	.min(1, "Name is required")
	.pipe(
		z
			.string()
			.min(
				NAME_MIN_LENGTH,
				`Name must be at least ${NAME_MIN_LENGTH} characters`
			)
	);

/**
 * Senha nova, no cadastro. Sem `.trim()`: espaço é caractere válido em senha, e
 * aparar silenciosamente muda a senha que o usuário digitou.
 */
export const newPasswordSchema = z
	.string()
	.min(1, "Password is required")
	.pipe(
		// A mensagem sai do próprio constante para não poder divergir dele.
		z
			.string()
			.min(
				PASSWORD_MIN_LENGTH,
				`Use at least ${PASSWORD_MIN_LENGTH} characters`
			)
	);

/**
 * Senha existente, no login. **Só exige que não esteja vazia.**
 *
 * Aplicar o mínimo do cadastro aqui (o que os dois formulários faziam) tem um
 * efeito perverso: no dia em que `PASSWORD_MIN_LENGTH` subir para 12, todo
 * usuário com senha de 8 — uma senha válida, que o servidor aceita — passaria a
 * ser barrado pelo próprio formulário de login, sem conseguir nem tentar.
 */
export const currentPasswordSchema = z.string().min(1, "Password is required");

export const signInSchema = z.object({
	email: emailSchema,
	password: currentPasswordSchema,
});

export const signUpSchema = z.object({
	email: emailSchema,
	name: nameSchema,
	password: newPasswordSchema,
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
