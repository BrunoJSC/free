import { relations } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	text,
} from "drizzle-orm/pg-core";
import { amountCents, currency, fkId, primaryId, timestamps } from "./_helpers";
import { user } from "./auth";
import { category } from "./taxonomy";

/**
 * "Contratar pessoas": a vaga (`job_posting`) recebe `application`s. Entidade
 * separada de `project` (roadmap §0) — vaga tem modelo de trabalho, tipo de
 * contratação e perguntas de triagem que projeto não tem. Enquanto o plugin
 * `organization` não entra, a vaga pertence a um `user`; depois ganha o FK da org.
 */

export const workModel = pgEnum("work_model", ["remote", "hybrid", "on_site"]);

export const employmentType = pgEnum("employment_type", [
	"clt",
	"pj",
	"internship",
	"temporary",
]);

export const jobStatus = pgEnum("job_status", [
	"draft",
	"open",
	"closed",
	"filled",
]);

export const screeningQuestionType = pgEnum("screening_question_type", [
	"text",
	"boolean",
	"single_choice",
	"multi_choice",
]);

export const jobPosting = pgTable(
	"job_posting",
	{
		categoryId: fkId("category_id").references(() => category.id, {
			onDelete: "set null",
		}),
		currency: currency(),
		description: text("description").notNull(),
		employmentType: employmentType("employment_type").notNull(),
		id: primaryId(),
		location: text("location"),
		postedByUserId: text("posted_by_user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		salaryMaxCents: amountCents("salary_max_cents"),
		salaryMinCents: amountCents("salary_min_cents"),
		status: jobStatus("status").default("draft").notNull(),
		title: text("title").notNull(),
		workModel: workModel("work_model").notNull(),
		...timestamps(),
	},
	(table) => [
		index("job_posting_posted_by_idx").on(table.postedByUserId),
		index("job_posting_status_idx").on(table.status),
		index("job_posting_category_idx").on(table.categoryId),
	]
);

/** Perguntas de triagem da vaga. `options` guarda as alternativas das perguntas
 *  de escolha (ignorado em `text`/`boolean`). */
export const jobScreeningQuestion = pgTable(
	"job_screening_question",
	{
		id: primaryId(),
		jobId: fkId("job_id")
			.notNull()
			.references(() => jobPosting.id, { onDelete: "cascade" }),
		options: jsonb("options").$type<string[]>(),
		position: integer("position").default(0).notNull(),
		prompt: text("prompt").notNull(),
		required: boolean("required").default(true).notNull(),
		type: screeningQuestionType("type").notNull(),
	},
	(table) => [index("job_screening_question_job_idx").on(table.jobId)]
);

export const jobPostingRelations = relations(jobPosting, ({ one, many }) => ({
	category: one(category, {
		fields: [jobPosting.categoryId],
		references: [category.id],
	}),
	postedBy: one(user, {
		fields: [jobPosting.postedByUserId],
		references: [user.id],
	}),
	screeningQuestions: many(jobScreeningQuestion),
}));

export const jobScreeningQuestionRelations = relations(
	jobScreeningQuestion,
	({ one }) => ({
		job: one(jobPosting, {
			fields: [jobScreeningQuestion.jobId],
			references: [jobPosting.id],
		}),
	})
);

export const jobSchema = {
	jobPosting,
	jobPostingRelations,
	jobScreeningQuestion,
	jobScreeningQuestionRelations,
};
