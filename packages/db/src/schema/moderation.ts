import { relations } from "drizzle-orm";
import { index, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { primaryId, timestamps } from "./_helpers";
import { user } from "./auth";

/**
 * Fila de denúncias (roadmap §6). O alvo é **polimórfico** — pode ser post,
 * comentário, mensagem, usuário ou proposta — então `target_id` é `text` sem FK:
 * não dá para um FK apontar para tabelas diferentes. A integridade do alvo é
 * responsabilidade da aplicação ao ler.
 */

export const reportStatus = pgEnum("report_status", [
	"open",
	"reviewing",
	"actioned",
	"dismissed",
]);

export const reportTargetType = pgEnum("report_target_type", [
	"post",
	"comment",
	"message",
	"user",
	"proposal",
]);

export const report = pgTable(
	"report",
	{
		handledByUserId: text("handled_by_user_id").references(() => user.id, {
			onDelete: "set null",
		}),
		id: primaryId(),
		reason: text("reason").notNull(),
		reporterUserId: text("reporter_user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		resolvedAt: timestamp("resolved_at", { withTimezone: true }),
		status: reportStatus("status").default("open").notNull(),
		targetId: text("target_id").notNull(),
		targetType: reportTargetType("target_type").notNull(),
		...timestamps(),
	},
	(table) => [
		index("report_status_idx").on(table.status),
		index("report_target_idx").on(table.targetType, table.targetId),
	]
);

export const reportRelations = relations(report, ({ one }) => ({
	handledBy: one(user, {
		fields: [report.handledByUserId],
		references: [user.id],
		relationName: "report_handler",
	}),
	reporter: one(user, {
		fields: [report.reporterUserId],
		references: [user.id],
		relationName: "report_reporter",
	}),
}));

export const moderationSchema = {
	report,
	reportRelations,
};
