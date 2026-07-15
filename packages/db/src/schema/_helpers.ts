import { bigint, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

/**
 * Builders de coluna reaproveitados pelas tabelas de produto. Cada helper é uma
 * função (não um objeto compartilhado) para devolver uma instância **nova** do
 * builder a cada tabela — reusar a mesma instância entre `pgTable`s é fonte de
 * bug sutil no Drizzle.
 */

/**
 * PK padrão das entidades de produto: UUID gerado pelo Postgres
 * (`gen_random_uuid()`). Não-enumerável e estável — ao contrário de `serial`,
 * não vaza a contagem de registros nem deixa varrer a tabela por id sequencial,
 * o que importa em id que aparece em URL pública (perfil, projeto).
 *
 * As tabelas do Better Auth (`auth.ts`) seguem com id `text` porque é o adapter
 * dele que as gera; FKs para `user` continuam `text`.
 */
export const primaryId = () => uuid("id").primaryKey().defaultRandom();

/**
 * FK para a PK de uma entidade de produto — o par simétrico de `primaryId()`.
 * Precisa ser `uuid` para casar com o tipo da PK referenciada: declarar como
 * `text` faz o Postgres **rejeitar** a foreign key ("key columns are of
 * incompatible types: text and uuid") e derruba a migration inteira. O chamador
 * encadeia `.notNull()`/`.references()`/`.unique()` conforme o caso.
 *
 * FKs para as tabelas do Better Auth (`user`, `session`, `account`) seguem
 * `text` — a PK delas é `text`, gerada pelo adapter dele.
 */
export const fkId = (name: string) => uuid(name);

/**
 * `created_at`/`updated_at` em `timestamptz` — o Postgres normaliza para UTC, o
 * que evita a ambiguidade de `timestamp` sem fuso. `updated_at` se atualiza
 * sozinho no lado do ORM via `$onUpdate`.
 */
export const timestamps = () => ({
	createdAt: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.defaultNow()
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull(),
});

/**
 * Dinheiro é **sempre** inteiro em centavos (§0 do roadmap) — nunca `float`, que
 * acumula erro. `bigint` em centavos com `mode: "number"` é exato até ~9e13 em
 * reais, muito além de qualquer transação real. O chamador decide `.notNull()` e
 * o default.
 */
export const amountCents = (name: string) => bigint(name, { mode: "number" });

/**
 * ISO 4217 (3 letras). A moeda vive **por transação**, não global — `BRL` é só o
 * default.
 */
export const currency = () =>
	varchar("currency", { length: 3 }).default("BRL").notNull();
