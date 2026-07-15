import { bigint, integer, pgTable, text } from "drizzle-orm/pg-core";

/**
 * Contadores de rate limit do Better Auth (`rateLimit.storage: "database"`).
 *
 * Os nomes das propriedades (`key`, `count`, `lastRequest`) são o contrato do
 * Better Auth e não podem ser renomeados — é por eles que o adapter do Drizzle
 * encontra as colunas. Os nomes das colunas no banco, sim, são nossos.
 *
 * Guardar no banco (em vez do default `memory`) é o que faz o limite valer de
 * verdade: em memória, o contador zera a cada restart e cada instância do
 * servidor teria o seu próprio — com N instâncias, o atacante ganha N vezes o
 * limite.
 */
export const rateLimit = pgTable("rate_limit", {
	count: integer("count").notNull(),
	id: text("id").primaryKey(),
	key: text("key").notNull().unique(),
	// `Date.now()` em milissegundos.
	lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});
