import { relations } from "drizzle-orm";
import {
	index,
	integer,
	pgTable,
	text,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import { fkId, primaryId, timestamps } from "./_helpers";
import { user } from "./auth";
import { contract } from "./contract";

/**
 * Avaliação bidirecional presa a um contrato (roadmap §8) — a regra "só após
 * contrato concluído" é da aplicação; o schema garante **uma** avaliação por
 * autor por contrato (índice único), o que impede spammar nota. Notas por
 * dimensão em `1..5` (o range é validado na aplicação; enum viraria 5 tipos).
 */

export const review = pgTable(
	"review",
	{
		comment: text("comment"),
		contractId: fkId("contract_id")
			.notNull()
			.references(() => contract.id, { onDelete: "cascade" }),
		id: primaryId(),
		ratingCommunication: integer("rating_communication"),
		ratingDeadline: integer("rating_deadline"),
		ratingOverall: integer("rating_overall").notNull(),
		ratingQuality: integer("rating_quality"),
		revieweeUserId: text("reviewee_user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		reviewerUserId: text("reviewer_user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		...timestamps(),
	},
	(table) => [
		uniqueIndex("review_contract_reviewer_uq").on(
			table.contractId,
			table.reviewerUserId
		),
		index("review_reviewee_idx").on(table.revieweeUserId),
	]
);

export const reviewRelations = relations(review, ({ one }) => ({
	contract: one(contract, {
		fields: [review.contractId],
		references: [contract.id],
	}),
	reviewee: one(user, {
		fields: [review.revieweeUserId],
		references: [user.id],
		relationName: "review_reviewee",
	}),
	reviewer: one(user, {
		fields: [review.reviewerUserId],
		references: [user.id],
		relationName: "review_reviewer",
	}),
}));

export const reviewSchema = {
	review,
	reviewRelations,
};
