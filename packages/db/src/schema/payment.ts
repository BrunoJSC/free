import { relations } from "drizzle-orm";
import {
	index,
	jsonb,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import { amountCents, currency, fkId, primaryId, timestamps } from "./_helpers";
import { user } from "./auth";
import { contract, milestone } from "./contract";

/**
 * Camada financeira **agnóstica de PSP** — o provedor (Stripe/Mercado
 * Pago/Pagar.me) ainda está em aberto (roadmap §0/§4), então nada aqui amarra a
 * um deles: `provider` + `provider_ref` guardam a referência externa como texto,
 * e o modelo fica o mesmo qualquer que seja a escolha. `wallet_transaction` é um
 * **ledger append-only** (só `created_at`), a fonte da verdade do saldo.
 */

export const paymentStatus = pgEnum("payment_status", [
	"pending",
	"processing",
	"succeeded",
	"failed",
	"refunded",
]);

export const paymentMethod = pgEnum("payment_method", [
	"pix",
	"credit_card",
	"boleto",
]);

export const walletTxType = pgEnum("wallet_tx_type", [
	"credit",
	"debit",
	"hold",
	"release",
	"fee",
	"payout",
	"refund",
]);

export const payoutStatus = pgEnum("payout_status", [
	"requested",
	"processing",
	"paid",
	"failed",
]);

/** Cobrança do cliente (depósito no escrow). Amarra a contrato/milestone quando
 *  o pagamento é de uma entrega específica. */
export const payment = pgTable(
	"payment",
	{
		amountCents: amountCents("amount_cents").notNull(),
		contractId: fkId("contract_id").references(() => contract.id, {
			onDelete: "set null",
		}),
		currency: currency(),
		feeCents: amountCents("fee_cents").default(0).notNull(),
		id: primaryId(),
		method: paymentMethod("method"),
		milestoneId: fkId("milestone_id").references(() => milestone.id, {
			onDelete: "set null",
		}),
		payerUserId: text("payer_user_id")
			.notNull()
			.references(() => user.id, { onDelete: "restrict" }),
		provider: text("provider"),
		providerRef: text("provider_ref").unique(),
		status: paymentStatus("status").default("pending").notNull(),
		...timestamps(),
	},
	(table) => [
		index("payment_contract_idx").on(table.contractId),
		index("payment_payer_idx").on(table.payerUserId),
		index("payment_status_idx").on(table.status),
	]
);

/** Carteira do usuário (1:1). `pending_cents` é o retido em escrow, ainda não
 *  sacável; `balance_cents` é o liberado. */
export const wallet = pgTable("wallet", {
	balanceCents: amountCents("balance_cents").default(0).notNull(),
	currency: currency(),
	id: primaryId(),
	pendingCents: amountCents("pending_cents").default(0).notNull(),
	userId: text("user_id")
		.notNull()
		.unique()
		.references(() => user.id, { onDelete: "cascade" }),
	...timestamps(),
});

/**
 * Extrato/ledger append-only: cada linha registra o delta e o saldo resultante.
 * Não tem `updated_at` de propósito — linha de ledger não se edita; corrige-se
 * com uma linha de estorno. `reference_type`/`reference_id` apontam de volta para
 * o que originou o lançamento (payment, payout, milestone…).
 */
export const walletTransaction = pgTable(
	"wallet_transaction",
	{
		amountCents: amountCents("amount_cents").notNull(),
		balanceAfterCents: amountCents("balance_after_cents").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		description: text("description"),
		id: primaryId(),
		referenceId: text("reference_id"),
		referenceType: text("reference_type"),
		type: walletTxType("type").notNull(),
		walletId: fkId("wallet_id")
			.notNull()
			.references(() => wallet.id, { onDelete: "cascade" }),
	},
	(table) => [index("wallet_transaction_wallet_idx").on(table.walletId)]
);

/** Saque para fora da plataforma. */
export const payout = pgTable(
	"payout",
	{
		amountCents: amountCents("amount_cents").notNull(),
		currency: currency(),
		id: primaryId(),
		paidAt: timestamp("paid_at", { withTimezone: true }),
		provider: text("provider"),
		providerRef: text("provider_ref"),
		requestedAt: timestamp("requested_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		status: payoutStatus("status").default("requested").notNull(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "restrict" }),
		walletId: fkId("wallet_id")
			.notNull()
			.references(() => wallet.id, { onDelete: "cascade" }),
		...timestamps(),
	},
	(table) => [
		index("payout_wallet_idx").on(table.walletId),
		index("payout_status_idx").on(table.status),
	]
);

export const refund = pgTable(
	"refund",
	{
		amountCents: amountCents("amount_cents").notNull(),
		id: primaryId(),
		paymentId: fkId("payment_id")
			.notNull()
			.references(() => payment.id, { onDelete: "cascade" }),
		providerRef: text("provider_ref"),
		reason: text("reason"),
		status: paymentStatus("status").default("pending").notNull(),
		...timestamps(),
	},
	(table) => [index("refund_payment_idx").on(table.paymentId)]
);

/**
 * Log cru de webhook do PSP. O par (`provider`, `event_id`) é único: é o que dá
 * **idempotência** — o mesmo evento reentregue não é processado duas vezes
 * (roadmap §4). `processed_at` nulo = ainda na fila.
 */
export const paymentEvent = pgTable(
	"payment_event",
	{
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		eventId: text("event_id").notNull(),
		id: primaryId(),
		payload: jsonb("payload").$type<Record<string, unknown>>(),
		processedAt: timestamp("processed_at", { withTimezone: true }),
		provider: text("provider").notNull(),
		type: text("type").notNull(),
	},
	(table) => [
		uniqueIndex("payment_event_provider_event_uq").on(
			table.provider,
			table.eventId
		),
	]
);

export const paymentRelations = relations(payment, ({ one, many }) => ({
	contract: one(contract, {
		fields: [payment.contractId],
		references: [contract.id],
	}),
	milestone: one(milestone, {
		fields: [payment.milestoneId],
		references: [milestone.id],
	}),
	payer: one(user, {
		fields: [payment.payerUserId],
		references: [user.id],
	}),
	refunds: many(refund),
}));

export const walletRelations = relations(wallet, ({ one, many }) => ({
	payouts: many(payout),
	transactions: many(walletTransaction),
	user: one(user, {
		fields: [wallet.userId],
		references: [user.id],
	}),
}));

export const walletTransactionRelations = relations(
	walletTransaction,
	({ one }) => ({
		wallet: one(wallet, {
			fields: [walletTransaction.walletId],
			references: [wallet.id],
		}),
	})
);

export const payoutRelations = relations(payout, ({ one }) => ({
	user: one(user, {
		fields: [payout.userId],
		references: [user.id],
	}),
	wallet: one(wallet, {
		fields: [payout.walletId],
		references: [wallet.id],
	}),
}));

export const refundRelations = relations(refund, ({ one }) => ({
	payment: one(payment, {
		fields: [refund.paymentId],
		references: [payment.id],
	}),
}));

export const paymentSchema = {
	payment,
	paymentEvent,
	paymentRelations,
	payout,
	payoutRelations,
	refund,
	refundRelations,
	wallet,
	walletRelations,
	walletTransaction,
	walletTransactionRelations,
};
