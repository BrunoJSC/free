import { auth } from "@free/auth";
import { db as defaultDb } from "@free/db";

type Database = typeof defaultDb;
type Session = Awaited<ReturnType<typeof auth.api.getSession>>;

/**
 * O que o host HTTP precisa extrair da requisição.
 *
 * Repare que não há nada de Elysia aqui, só tipos padrão da web. O host é um
 * detalhe de infraestrutura e é ele que se adapta à API, não o contrário —
 * trocar o Elysia, montar a mesma API num handler de WebSocket ou chamá-la de
 * um teste não encosta neste pacote.
 */
export interface RequestInfo {
	headers: Headers;
	/** `null` quando a origem não pôde ser determinada. */
	ip: string | null;
	requestId: string;
}

export interface CreateInnerContextOptions {
	db?: Database;
	headers?: Headers;
	ip?: string | null;
	requestId?: string;
	session?: Session;
}

/**
 * Contexto interno: tudo que as procedures enxergam, sem depender de uma
 * requisição HTTP real.
 *
 * Todo campo tem default justamente para que testes e chamadas server-side
 * (`createCallerFactory`) montem um contexto sem forjar `Request`/`Response`.
 * É o split inner/outer que o tRPC recomenda.
 *
 * @see https://trpc.io/docs/server/context#inner-and-outer-context
 */
export function createInnerContext(options: CreateInnerContextOptions = {}) {
	return {
		// Injetável para que um teste possa passar uma conexão em transação e dar
		// rollback no fim. As procedures usam `ctx.db`, nunca o singleton importado.
		db: options.db ?? defaultDb,
		headers: options.headers ?? new Headers(),
		ip: options.ip ?? null,
		requestId: options.requestId ?? crypto.randomUUID(),
		session: options.session ?? null,
	};
}

export type Context = ReturnType<typeof createInnerContext>;

/**
 * Contexto externo: resolve a sessão a partir dos headers da requisição real e
 * delega o resto ao contexto interno.
 */
export async function createContext(request: RequestInfo): Promise<Context> {
	const session = await auth.api.getSession({ headers: request.headers });

	return createInnerContext({
		headers: request.headers,
		ip: request.ip,
		requestId: request.requestId,
		session,
	});
}
