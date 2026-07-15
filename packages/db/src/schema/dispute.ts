import { relations } from "drizzle-orm";
import { index, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { fkId, primaryId, timestamps } from "./_helpers";
import { user } from "./auth";
import { contract, milestone } from "./contract";

/**
 * Disputa/mediação sobre um contrato ou milestone (roadmap §4). `due_at` é o
 * prazo da mediação e as evidências ficam em tabela própria — não em `text[]`.
 */

export const disputeStatus = pgEnum("dispute_status", [
	"open",
	"under_review",
	"resolved",
	"cancelled",
]);

export const disputeResolution = pgEnum("dispute_resolution", [
	"refund_client",
	"release_freelancer",
	"split",
	"none",
]);

export const dispute = pgTable(
	"dispute",
	{
		contractId: fkId("contract_id")
			.notNull()
			.references(() => contract.id, { onDelete: "cascade" }),
		dueAt: timestamp("due_at", { withTimezone: true }),
		id: primaryId(),
		milestoneId: fkId("milestone_id").references(() => milestone.id, {
			onDelete: "set null",
		}),
		openedByUserId: text("opened_by_user_id")
			.notNull()
			.references(() => user.id, { onDelete: "restrict" }),
		reason: text("reason").notNull(),
		resolution: disputeResolution("resolution"),
		resolvedAt: timestamp("resolved_at", { withTimezone: true }),
		resolvedByUserId: text("resolved_by_user_id").references(() => user.id, {
			onDelete: "set null",
		}),
		status: disputeStatus("status").default("open").notNull(),
		...timestamps(),
	},
	(table) => [
		index("dispute_contract_idx").on(table.contractId),
		index("dispute_status_idx").on(table.status),
	]
);

export const disputeEvidence = pgTable(
	"dispute_evidence",
	{
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		description: text("description"),
		disputeId: fkId("dispute_id")
			.notNull()
			.references(() => dispute.id, { onDelete: "cascade" }),
		fileUrl: text("file_url"),
		id: primaryId(),
		submittedByUserId: text("submitted_by_user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
	},
	(table) => [index("dispute_evidence_dispute_idx").on(table.disputeId)]
);

export const disputeRelations = relations(dispute, ({ one, many }) => ({
	contract: one(contract, {
		fields: [dispute.contractId],
		references: [contract.id],
	}),
	evidence: many(disputeEvidence),
	milestone: one(milestone, {
		fields: [dispute.milestoneId],
		references: [milestone.id],
	}),
	openedBy: one(user, {
		fields: [dispute.openedByUserId],
		references: [user.id],
	}),
}));

export const disputeEvidenceRelations = relations(
	disputeEvidence,
	({ one }) => ({
		dispute: one(dispute, {
			fields: [disputeEvidence.disputeId],
			references: [dispute.id],
		}),
		submittedBy: one(user, {
			fields: [disputeEvidence.submittedByUserId],
			references: [user.id],
		}),
	})
);

export const disputeSchema = {
	dispute,
	disputeEvidence,
	disputeEvidenceRelations,
	disputeRelations,
};
