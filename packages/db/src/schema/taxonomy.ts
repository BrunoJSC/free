import { relations } from "drizzle-orm";
import { type AnyPgColumn, index, pgTable, text } from "drizzle-orm/pg-core";
import { fkId, primaryId, timestamps } from "./_helpers";

/**
 * Taxonomia normalizada de categorias e skills. Roadmap (§2): "nada de `text[]`
 * solto" — categoria e skill são entidades com id próprio, e o vínculo com
 * perfil/projeto/vaga é feito por tabela de junção. Isso é o que permite busca
 * facetada e renomear uma skill em um lugar só.
 */

export const category = pgTable(
	"category",
	{
		id: primaryId(),
		name: text("name").notNull(),
		// Hierarquia opcional: subcategoria aponta para a categoria pai.
		parentId: fkId("parent_id").references((): AnyPgColumn => category.id, {
			onDelete: "set null",
		}),
		slug: text("slug").notNull().unique(),
		...timestamps(),
	},
	(table) => [index("category_parent_idx").on(table.parentId)]
);

export const skill = pgTable(
	"skill",
	{
		categoryId: fkId("category_id").references(() => category.id, {
			onDelete: "set null",
		}),
		id: primaryId(),
		name: text("name").notNull(),
		slug: text("slug").notNull().unique(),
		...timestamps(),
	},
	(table) => [index("skill_category_idx").on(table.categoryId)]
);

export const categoryRelations = relations(category, ({ one, many }) => ({
	children: many(category, { relationName: "category_hierarchy" }),
	parent: one(category, {
		fields: [category.parentId],
		references: [category.id],
		relationName: "category_hierarchy",
	}),
	skills: many(skill),
}));

export const skillRelations = relations(skill, ({ one }) => ({
	category: one(category, {
		fields: [skill.categoryId],
		references: [category.id],
	}),
}));

export const taxonomySchema = {
	category,
	categoryRelations,
	skill,
	skillRelations,
};
