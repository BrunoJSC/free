import { relations } from "drizzle-orm";
import {
	index,
	pgEnum,
	pgTable,
	primaryKey,
	text,
	timestamp,
} from "drizzle-orm/pg-core";
import { amountCents, currency, fkId, primaryId, timestamps } from "./_helpers";
import { user } from "./auth";
import { category, skill } from "./taxonomy";

/**
 * "Achar freelancer": o cliente publica um `project` e recebe `proposal`s. É uma
 * entidade **separada** de `job_posting` (roadmap §0) — o ciclo de vida, o
 * pagamento e as métricas divergem cedo, então não é um enum na mesma tabela.
 */

export const budgetType = pgEnum("budget_type", ["fixed", "hourly"]);

export const projectVisibility = pgEnum("project_visibility", [
	"public",
	"private",
	"invite_only",
]);

export const projectStatus = pgEnum("project_status", [
	"draft",
	"open",
	"in_progress",
	"completed",
	"cancelled",
]);

export const project = pgTable(
	"project",
	{
		budgetMaxCents: amountCents("budget_max_cents"),
		// Faixa de orçamento em centavos; para `hourly`, é a faixa por hora.
		budgetMinCents: amountCents("budget_min_cents"),
		budgetType: budgetType("budget_type").notNull(),
		categoryId: fkId("category_id").references(() => category.id, {
			onDelete: "set null",
		}),
		clientUserId: text("client_user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		currency: currency(),
		deadline: timestamp("deadline", { withTimezone: true }),
		description: text("description").notNull(),
		id: primaryId(),
		status: projectStatus("status").default("draft").notNull(),
		title: text("title").notNull(),
		visibility: projectVisibility("visibility").default("public").notNull(),
		...timestamps(),
	},
	(table) => [
		index("project_client_idx").on(table.clientUserId),
		index("project_status_idx").on(table.status),
		index("project_category_idx").on(table.categoryId),
	]
);

/** Skills exigidas pelo projeto — junção normalizada para busca facetada. */
export const projectSkill = pgTable(
	"project_skill",
	{
		projectId: fkId("project_id")
			.notNull()
			.references(() => project.id, { onDelete: "cascade" }),
		skillId: fkId("skill_id")
			.notNull()
			.references(() => skill.id, { onDelete: "cascade" }),
	},
	(table) => [
		primaryKey({ columns: [table.projectId, table.skillId] }),
		index("project_skill_skill_idx").on(table.skillId),
	]
);

export const projectRelations = relations(project, ({ one, many }) => ({
	category: one(category, {
		fields: [project.categoryId],
		references: [category.id],
	}),
	client: one(user, {
		fields: [project.clientUserId],
		references: [user.id],
	}),
	skills: many(projectSkill),
}));

export const projectSkillRelations = relations(projectSkill, ({ one }) => ({
	project: one(project, {
		fields: [projectSkill.projectId],
		references: [project.id],
	}),
	skill: one(skill, {
		fields: [projectSkill.skillId],
		references: [skill.id],
	}),
}));

export const projectSchema = {
	project,
	projectRelations,
	projectSkill,
	projectSkillRelations,
};
