import { relations } from "drizzle-orm";
import {
	index,
	integer,
	pgEnum,
	pgTable,
	primaryKey,
	text,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";
import { amountCents, currency, fkId, primaryId, timestamps } from "./_helpers";
import { user } from "./auth";
import { skill } from "./taxonomy";

/**
 * Perfil de freelancer e suas taxonomias. Empresas ficam de fora **de
 * propósito**: vão pelo plugin `organization` do Better Auth (roadmap §2), então
 * não há `company_profile` à mão aqui para não colidir com as tabelas que o
 * plugin gera.
 */

export const seniority = pgEnum("seniority", [
	"junior",
	"mid",
	"senior",
	"specialist",
]);

export const availabilityStatus = pgEnum("availability_status", [
	"available",
	"open",
	"unavailable",
]);

/** Selo de verificação do perfil (distinto do KYC, que é identidade legal). */
export const verificationStatus = pgEnum("verification_status", [
	"unverified",
	"pending",
	"verified",
	"rejected",
]);

export const languageProficiency = pgEnum("language_proficiency", [
	"basic",
	"conversational",
	"fluent",
	"native",
]);

export const kycStatus = pgEnum("kyc_status", [
	"pending",
	"approved",
	"rejected",
	"expired",
]);

export const freelancerProfile = pgTable(
	"freelancer_profile",
	{
		availability: availabilityStatus("availability")
			.default("available")
			.notNull(),
		bio: text("bio"),
		currency: currency(),
		headline: text("headline"),
		hourlyRateCents: amountCents("hourly_rate_cents"),
		id: primaryId(),
		location: text("location"),
		seniority: seniority("seniority"),
		// 1:1 com o usuário — `unique` trava um perfil por conta.
		userId: text("user_id")
			.notNull()
			.unique()
			.references(() => user.id, { onDelete: "cascade" }),
		verificationStatus: verificationStatus("verification_status")
			.default("unverified")
			.notNull(),
		websiteUrl: text("website_url"),
		...timestamps(),
	},
	(table) => [
		index("freelancer_profile_availability_idx").on(table.availability),
	]
);

/** Junção perfil↔skill. PK composta impede a mesma skill duas vezes no perfil. */
export const freelancerSkill = pgTable(
	"freelancer_skill",
	{
		profileId: fkId("profile_id")
			.notNull()
			.references(() => freelancerProfile.id, { onDelete: "cascade" }),
		skillId: fkId("skill_id")
			.notNull()
			.references(() => skill.id, { onDelete: "cascade" }),
		yearsExperience: integer("years_experience"),
	},
	(table) => [
		primaryKey({ columns: [table.profileId, table.skillId] }),
		index("freelancer_skill_skill_idx").on(table.skillId),
	]
);

/** Idiomas do freelancer — código ISO 639 + nível. Junção, não `text[]`. */
export const freelancerLanguage = pgTable(
	"freelancer_language",
	{
		code: varchar("code", { length: 5 }).notNull(),
		proficiency: languageProficiency("proficiency").notNull(),
		profileId: fkId("profile_id")
			.notNull()
			.references(() => freelancerProfile.id, { onDelete: "cascade" }),
	},
	(table) => [primaryKey({ columns: [table.profileId, table.code] })]
);

export const portfolioItem = pgTable(
	"portfolio_item",
	{
		clientName: text("client_name"),
		description: text("description"),
		id: primaryId(),
		mediaUrl: text("media_url"),
		position: integer("position").default(0).notNull(),
		profileId: fkId("profile_id")
			.notNull()
			.references(() => freelancerProfile.id, { onDelete: "cascade" }),
		projectUrl: text("project_url"),
		title: text("title").notNull(),
		...timestamps(),
	},
	(table) => [index("portfolio_item_profile_idx").on(table.profileId)]
);

/**
 * KYC / verificação de identidade — pré-requisito de saque (roadmap §2). Fica no
 * `user`, não no perfil, porque vale para qualquer conta que movimente dinheiro,
 * inclusive contratante.
 */
export const kycVerification = pgTable(
	"kyc_verification",
	{
		documentType: text("document_type"),
		id: primaryId(),
		// Id no provedor de KYC (quando houver integração externa).
		providerRef: text("provider_ref"),
		reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
		status: kycStatus("status").default("pending").notNull(),
		submittedAt: timestamp("submitted_at", { withTimezone: true }),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		...timestamps(),
	},
	(table) => [index("kyc_verification_user_idx").on(table.userId)]
);

export const freelancerProfileRelations = relations(
	freelancerProfile,
	({ one, many }) => ({
		languages: many(freelancerLanguage),
		portfolio: many(portfolioItem),
		skills: many(freelancerSkill),
		user: one(user, {
			fields: [freelancerProfile.userId],
			references: [user.id],
		}),
	})
);

export const freelancerSkillRelations = relations(
	freelancerSkill,
	({ one }) => ({
		profile: one(freelancerProfile, {
			fields: [freelancerSkill.profileId],
			references: [freelancerProfile.id],
		}),
		skill: one(skill, {
			fields: [freelancerSkill.skillId],
			references: [skill.id],
		}),
	})
);

export const freelancerLanguageRelations = relations(
	freelancerLanguage,
	({ one }) => ({
		profile: one(freelancerProfile, {
			fields: [freelancerLanguage.profileId],
			references: [freelancerProfile.id],
		}),
	})
);

export const portfolioItemRelations = relations(portfolioItem, ({ one }) => ({
	profile: one(freelancerProfile, {
		fields: [portfolioItem.profileId],
		references: [freelancerProfile.id],
	}),
}));

export const profileSchema = {
	freelancerLanguage,
	freelancerLanguageRelations,
	freelancerProfile,
	freelancerProfileRelations,
	freelancerSkill,
	freelancerSkillRelations,
	kycVerification,
	portfolioItem,
	portfolioItemRelations,
};
