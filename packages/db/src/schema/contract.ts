import { relations } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	pgEnum,
	pgTable,
	text,
	timestamp,
} from "drizzle-orm/pg-core";
import { amountCents, currency, fkId, primaryId, timestamps } from "./_helpers";
import { user } from "./auth";
import { project } from "./project";
import { proposal } from "./proposal";

/**
 * O contrato é o núcleo do marketplace e já nasce pensando em **escrow** (roadmap
 * §0/§4): o valor total, a taxa da plataforma e os `milestone`s ficam aqui para
 * que o depósito retido e a liberação por entrega tenham onde se apoiar quando o
 * PSP entrar. As transições de estado (`status`) são máquina de estados — a UI
 * não é a fonte da verdade.
 */

export const contractStatus = pgEnum("contract_status", [
	"pending_funding",
	"active",
	"completed",
	"cancelled",
	"disputed",
]);

export const milestoneStatus = pgEnum("milestone_status", [
	"pending",
	"funded",
	"submitted",
	"approved",
	"released",
	"disputed",
]);

export const contract = pgTable(
	"contract",
	{
		clientUserId: text("client_user_id")
			.notNull()
			.references(() => user.id, { onDelete: "restrict" }),
		completedAt: timestamp("completed_at", { withTimezone: true }),
		currency: currency(),
		freelancerUserId: text("freelancer_user_id")
			.notNull()
			.references(() => user.id, { onDelete: "restrict" }),
		id: primaryId(),
		platformFeeCents: amountCents("platform_fee_cents").default(0).notNull(),
		// Projeto/proposta de origem — `set null` preserva o contrato se a origem
		// for apagada; o contrato é o registro financeiro e não some junto.
		projectId: fkId("project_id").references(() => project.id, {
			onDelete: "set null",
		}),
		proposalId: fkId("proposal_id").references(() => proposal.id, {
			onDelete: "set null",
		}),
		startedAt: timestamp("started_at", { withTimezone: true }),
		status: contractStatus("status").default("pending_funding").notNull(),
		title: text("title").notNull(),
		totalAmountCents: amountCents("total_amount_cents").notNull(),
		...timestamps(),
	},
	(table) => [
		index("contract_client_idx").on(table.clientUserId),
		index("contract_freelancer_idx").on(table.freelancerUserId),
		index("contract_status_idx").on(table.status),
	]
);

export const milestone = pgTable(
	"milestone",
	{
		amountCents: amountCents("amount_cents").notNull(),
		approvedAt: timestamp("approved_at", { withTimezone: true }),
		// Aceite automático por prazo: passou daqui sem contestação, libera.
		autoReleaseAt: timestamp("auto_release_at", { withTimezone: true }),
		contractId: fkId("contract_id")
			.notNull()
			.references(() => contract.id, { onDelete: "cascade" }),
		description: text("description"),
		dueAt: timestamp("due_at", { withTimezone: true }),
		id: primaryId(),
		position: integer("position").default(0).notNull(),
		status: milestoneStatus("status").default("pending").notNull(),
		submittedAt: timestamp("submitted_at", { withTimezone: true }),
		title: text("title").notNull(),
		...timestamps(),
	},
	(table) => [index("milestone_contract_idx").on(table.contractId)]
);

/** Apontamento de horas para contrato por hora — vira timesheet aprovável. */
export const timeEntry = pgTable(
	"time_entry",
	{
		approved: boolean("approved").default(false).notNull(),
		contractId: fkId("contract_id")
			.notNull()
			.references(() => contract.id, { onDelete: "cascade" }),
		description: text("description"),
		endedAt: timestamp("ended_at", { withTimezone: true }),
		freelancerUserId: text("freelancer_user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		id: primaryId(),
		minutes: integer("minutes").notNull(),
		startedAt: timestamp("started_at", { withTimezone: true }),
		...timestamps(),
	},
	(table) => [index("time_entry_contract_idx").on(table.contractId)]
);

export const contractRelations = relations(contract, ({ one, many }) => ({
	client: one(user, {
		fields: [contract.clientUserId],
		references: [user.id],
		relationName: "contract_client",
	}),
	freelancer: one(user, {
		fields: [contract.freelancerUserId],
		references: [user.id],
		relationName: "contract_freelancer",
	}),
	milestones: many(milestone),
	project: one(project, {
		fields: [contract.projectId],
		references: [project.id],
	}),
	proposal: one(proposal, {
		fields: [contract.proposalId],
		references: [proposal.id],
	}),
	timeEntries: many(timeEntry),
}));

export const milestoneRelations = relations(milestone, ({ one }) => ({
	contract: one(contract, {
		fields: [milestone.contractId],
		references: [contract.id],
	}),
}));

export const timeEntryRelations = relations(timeEntry, ({ one }) => ({
	contract: one(contract, {
		fields: [timeEntry.contractId],
		references: [contract.id],
	}),
	freelancer: one(user, {
		fields: [timeEntry.freelancerUserId],
		references: [user.id],
	}),
}));

export const contractSchema = {
	contract,
	contractRelations,
	milestone,
	milestoneRelations,
	timeEntry,
	timeEntryRelations,
};
