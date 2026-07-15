import { expo } from "@better-auth/expo";
import { db as defaultDb } from "@free/db";
import { account, session, user, verification } from "@free/db/schema/auth";
import { rateLimit } from "@free/db/schema/rate-limit";
import { env } from "@free/env/server";
import { PASSWORD_MIN_LENGTH } from "@free/validators/auth";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

/**
 * Único header em que o Better Auth confia para descobrir o IP do cliente.
 *
 * É um contrato entre o host HTTP e o auth: o servidor **sobrescreve** este
 * header em toda requisição com o IP que ele mesmo resolveu (socket, ou
 * `x-forwarded-for` quando há proxy confiável), e apaga qualquer valor que
 * tenha vindo de fora. Ver `apps/server/src/client-ip.ts`.
 */
export const TRUSTED_IP_HEADER = "x-free-client-ip";

/** Limite geral por IP nas rotas de auth, dentro de `RATE_LIMIT_WINDOW`. */
const RATE_LIMIT_MAX = 100;
/** Janela do rate limit, em segundos. */
const RATE_LIMIT_WINDOW = 60;

type Database = typeof defaultDb;

/**
 * O `db` é parâmetro (e não um `createDb()` aqui dentro) por dois motivos: abrir
 * uma conexão própria daria ao servidor **dois** pools independentes para o
 * mesmo banco — o do `@free/db` e o do auth — e receber a conexão de fora deixa
 * um teste passar uma conexão em transação e dar rollback no fim.
 *
 * A anotação explícita de `db` não é decorativa: sem ela o `declaration: true`
 * deste pacote falha (TS2883), porque o tipo inferido só seria nomeável citando
 * o `Pool` do `@types/pg`.
 */
export function createAuth(db: Database = defaultDb) {
	return betterAuth({
		advanced: {
			defaultCookieAttributes: {
				httpOnly: true,
				sameSite: "none",
				secure: true,
			},
			ipAddress: {
				// Por padrão o Better Auth lê `x-forwarded-for`. Sem um proxy na
				// frente, quem define esse header é o próprio cliente — bastaria
				// mandar um valor diferente a cada tentativa para o contador nunca
				// subir, e o rate limit não valeria nada contra credential stuffing.
				// Aqui ele só confia no header que o nosso servidor escreve.
				ipAddressHeaders: [TRUSTED_IP_HEADER],
			},
		},
		baseURL: env.BETTER_AUTH_URL,
		database: drizzleAdapter(db, {
			provider: "pg",
			schema: { account, rateLimit, session, user, verification },
		}),
		emailAndPassword: {
			enabled: true,
			// Mesma fonte que os formulários da web e do native usam para validar.
			// Sem isto o servidor cairia no default do Better Auth (8), que hoje
			// coincide com o nosso — e deixaria de coincidir no dia em que mudássemos.
			minPasswordLength: PASSWORD_MIN_LENGTH,
		},
		plugins: [expo()],
		rateLimit: {
			// O Better Auth desliga o rate limit em desenvolvimento por padrão, o
			// que significa que a proteção só é exercitada pela primeira vez em
			// produção. Ligamos sempre para que ela seja testável.
			enabled: true,
			max: RATE_LIMIT_MAX,
			// `memory` (default) zera a cada restart e não é compartilhado entre
			// instâncias: com N réplicas, o atacante ganharia N vezes o limite.
			// Requer a tabela `rate_limit` (ver `@free/db/schema/rate-limit`).
			storage: "database",
			window: RATE_LIMIT_WINDOW,
			// Sem `customRules` de propósito: o Better Auth já embute regras mais
			// estritas nas rotas sensíveis (`/sign-in*` e `/sign-up*` a 3 req/10s;
			// reset de senha a 3 req/60s) e `customRules` teria precedência sobre
			// elas — declarar as nossas aqui correria o risco de AFROUXAR o default
			// achando que estava endurecendo.
		},
		secret: env.BETTER_AUTH_SECRET,
		trustedOrigins: [
			env.CORS_ORIGIN,
			"free://",
			"exp://",
			"http://localhost:8081",
		],
	});
}

export const auth = createAuth();
