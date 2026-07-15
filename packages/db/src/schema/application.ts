import { relations } from "drizzle-orm";
import {
	index,
	jsonb,
	pgEnum,
	pgTable,
	text,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import { fkId, primaryId, timestamps } from "./_helpers";
import { user } from "./auth";
import { jobPosting, jobScreeningQuestion } from "./job";

/**
 * Candidatura de uma pessoa a uma `job_posting`, com o pipeline em `stage`
 * (roadmap §3: triagem → entrevista → oferta → contratado/rejeitado). Uma
 * candidatura por pessoa por vaga (índice único).
 */

export const applicationStage = pgEnum("application_stage", [
	"screening",
	"interview",
	"offer",
	"hired",
	"rejected",
	"withdrawn",
]);

export const application = pgTable(
	"application",
	{
		applicantUserId: text("applicant_user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		id: primaryId(),
		jobId: fkId("job_id")
			.notNull()
			.references(() => jobPosting.id, { onDelete: "cascade" }),
		resumeUrl: text("resume_url"),
		stage: applicationStage("stage").default("screening").notNull(),
		...timestamps(),
	},
	(table) => [
		uniqueIndex("application_job_applicant_uq").on(
			table.jobId,
			table.applicantUserId
		),
		index("application_applicant_idx").on(table.applicantUserId),
		index("application_stage_idx").on(table.stage),
	]
);

/** Resposta da candidatura a uma pergunta de triagem. `answer` é `jsonb` para
 *  caber texto, boolean ou array de escolhas conforme o tipo da pergunta. */
export const applicationAnswer = pgTable(
	"application_answer",
	{
		answer: jsonb("answer").$type<string | boolean | string[]>(),
		applicationId: fkId("application_id")
			.notNull()
			.references(() => application.id, { onDelete: "cascade" }),
		id: primaryId(),
		questionId: fkId("question_id")
			.notNull()
			.references(() => jobScreeningQuestion.id, { onDelete: "cascade" }),
	},
	(table) => [
		uniqueIndex("application_answer_uq").on(
			table.applicationId,
			table.questionId
		),
	]
);

export const applicationRelations = relations(application, ({ one, many }) => ({
	answers: many(applicationAnswer),
	applicant: one(user, {
		fields: [application.applicantUserId],
		references: [user.id],
	}),
	job: one(jobPosting, {
		fields: [application.jobId],
		references: [jobPosting.id],
	}),
}));

export const applicationAnswerRelations = relations(
	applicationAnswer,
	({ one }) => ({
		application: one(application, {
			fields: [applicationAnswer.applicationId],
			references: [application.id],
		}),
		question: one(jobScreeningQuestion, {
			fields: [applicationAnswer.questionId],
			references: [jobScreeningQuestion.id],
		}),
	})
);

export const applicationSchema = {
	application,
	applicationAnswer,
	applicationAnswerRelations,
	applicationRelations,
};
