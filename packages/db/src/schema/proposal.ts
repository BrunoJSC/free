import { relations } from "drizzle-orm";
import {
	index,
	integer,
	pgEnum,
	pgTable,
	text,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import { amountCents, currency, fkId, primaryId, timestamps } from "./_helpers";
import { user } from "./auth";
import { project } from "./project";

/**
 * Lance de um freelancer em um `project`. `net_amount_cents` guarda o líquido
 * após a taxa da plataforma — calculado no aceite, não exibido como verdade
 * antes. Um freelancer só propõe uma vez por projeto (índice único).
 */

export const proposalStatus = pgEnum("proposal_status", [
	"pending",
	"shortlisted",
	"accepted",
	"rejected",
	"withdrawn",
]);

export const proposal = pgTable(
	"proposal",
	{
		bidAmountCents: amountCents("bid_amount_cents").notNull(),
		coverLetter: text("cover_letter").notNull(),
		currency: currency(),
		estimatedDays: integer("estimated_days"),
		freelancerUserId: text("freelancer_user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		id: primaryId(),
		netAmountCents: amountCents("net_amount_cents"),
		projectId: fkId("project_id")
			.notNull()
			.references(() => project.id, { onDelete: "cascade" }),
		status: proposalStatus("status").default("pending").notNull(),
		...timestamps(),
	},
	(table) => [
		uniqueIndex("proposal_project_freelancer_uq").on(
			table.projectId,
			table.freelancerUserId
		),
		index("proposal_freelancer_idx").on(table.freelancerUserId),
		index("proposal_status_idx").on(table.status),
	]
);

export const proposalRelations = relations(proposal, ({ one }) => ({
	freelancer: one(user, {
		fields: [proposal.freelancerUserId],
		references: [user.id],
	}),
	project: one(project, {
		fields: [proposal.projectId],
		references: [project.id],
	}),
}));

export const proposalSchema = {
	proposal,
	proposalRelations,
};
