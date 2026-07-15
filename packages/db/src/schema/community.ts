import { relations } from "drizzle-orm";
import {
	type AnyPgColumn,
	index,
	integer,
	pgTable,
	primaryKey,
	text,
	timestamp,
} from "drizzle-orm/pg-core";
import { fkId, primaryId, timestamps } from "./_helpers";
import { user } from "./auth";

/**
 * Comunidade (roadmap §6): tópicos, posts, comentários aninhados, votos, tags,
 * follows e badges. O corpo é Markdown — a sanitização é da aplicação (nada de
 * HTML cru). `score`/`comment_count` são contadores desnormalizados para ordenar
 * feed sem agregação a cada leitura.
 */

export const topic = pgTable("topic", {
	description: text("description"),
	id: primaryId(),
	name: text("name").notNull(),
	slug: text("slug").notNull().unique(),
	...timestamps(),
});

export const post = pgTable(
	"post",
	{
		authorUserId: text("author_user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		body: text("body").notNull(),
		commentCount: integer("comment_count").default(0).notNull(),
		id: primaryId(),
		score: integer("score").default(0).notNull(),
		title: text("title").notNull(),
		topicId: fkId("topic_id").references(() => topic.id, {
			onDelete: "set null",
		}),
		...timestamps(),
	},
	(table) => [
		index("post_author_idx").on(table.authorUserId),
		index("post_topic_idx").on(table.topicId),
		// Feed "em alta"/"recentes".
		index("post_score_idx").on(table.score),
		index("post_created_idx").on(table.createdAt),
	]
);

export const comment = pgTable(
	"comment",
	{
		authorUserId: text("author_user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		body: text("body").notNull(),
		id: primaryId(),
		// Aninhamento: resposta aponta para o comentário pai.
		parentId: fkId("parent_id").references((): AnyPgColumn => comment.id, {
			onDelete: "cascade",
		}),
		postId: fkId("post_id")
			.notNull()
			.references(() => post.id, { onDelete: "cascade" }),
		score: integer("score").default(0).notNull(),
		...timestamps(),
	},
	(table) => [
		index("comment_post_idx").on(table.postId),
		index("comment_parent_idx").on(table.parentId),
	]
);

export const tag = pgTable("tag", {
	createdAt: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
	id: primaryId(),
	name: text("name").notNull(),
	slug: text("slug").notNull().unique(),
});

export const postTag = pgTable(
	"post_tag",
	{
		postId: fkId("post_id")
			.notNull()
			.references(() => post.id, { onDelete: "cascade" }),
		tagId: fkId("tag_id")
			.notNull()
			.references(() => tag.id, { onDelete: "cascade" }),
	},
	(table) => [
		primaryKey({ columns: [table.postId, table.tagId] }),
		index("post_tag_tag_idx").on(table.tagId),
	]
);

/**
 * Votos em post e comentário são **tabelas separadas** (em vez de um voto
 * polimórfico com dois FKs anuláveis): a PK composta `(user, alvo)` já garante um
 * voto por pessoa por alvo, sem índice parcial. `value` é `+1`/`-1`.
 */
export const postVote = pgTable(
	"post_vote",
	{
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		postId: fkId("post_id")
			.notNull()
			.references(() => post.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		value: integer("value").notNull(),
	},
	(table) => [
		primaryKey({ columns: [table.userId, table.postId] }),
		index("post_vote_post_idx").on(table.postId),
	]
);

export const commentVote = pgTable(
	"comment_vote",
	{
		commentId: fkId("comment_id")
			.notNull()
			.references(() => comment.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		value: integer("value").notNull(),
	},
	(table) => [
		primaryKey({ columns: [table.userId, table.commentId] }),
		index("comment_vote_comment_idx").on(table.commentId),
	]
);

/** Seguir pessoa e seguir tópico são relações distintas — duas tabelas em vez de
 *  um follow polimórfico. */
export const userFollow = pgTable(
	"user_follow",
	{
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		followerUserId: text("follower_user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		followingUserId: text("following_user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
	},
	(table) => [
		primaryKey({ columns: [table.followerUserId, table.followingUserId] }),
		index("user_follow_following_idx").on(table.followingUserId),
	]
);

export const topicFollow = pgTable(
	"topic_follow",
	{
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		topicId: fkId("topic_id")
			.notNull()
			.references(() => topic.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
	},
	(table) => [
		primaryKey({ columns: [table.userId, table.topicId] }),
		index("topic_follow_topic_idx").on(table.topicId),
	]
);

export const badge = pgTable("badge", {
	createdAt: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
	description: text("description"),
	icon: text("icon"),
	id: primaryId(),
	name: text("name").notNull(),
	slug: text("slug").notNull().unique(),
});

export const userBadge = pgTable(
	"user_badge",
	{
		awardedAt: timestamp("awarded_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		badgeId: fkId("badge_id")
			.notNull()
			.references(() => badge.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
	},
	(table) => [primaryKey({ columns: [table.userId, table.badgeId] })]
);

export const topicRelations = relations(topic, ({ many }) => ({
	followers: many(topicFollow),
	posts: many(post),
}));

export const postRelations = relations(post, ({ one, many }) => ({
	author: one(user, {
		fields: [post.authorUserId],
		references: [user.id],
	}),
	comments: many(comment),
	tags: many(postTag),
	topic: one(topic, {
		fields: [post.topicId],
		references: [topic.id],
	}),
	votes: many(postVote),
}));

export const commentRelations = relations(comment, ({ one, many }) => ({
	author: one(user, {
		fields: [comment.authorUserId],
		references: [user.id],
	}),
	parent: one(comment, {
		fields: [comment.parentId],
		references: [comment.id],
		relationName: "comment_thread",
	}),
	post: one(post, {
		fields: [comment.postId],
		references: [post.id],
	}),
	replies: many(comment, { relationName: "comment_thread" }),
	votes: many(commentVote),
}));

export const tagRelations = relations(tag, ({ many }) => ({
	posts: many(postTag),
}));

export const postTagRelations = relations(postTag, ({ one }) => ({
	post: one(post, {
		fields: [postTag.postId],
		references: [post.id],
	}),
	tag: one(tag, {
		fields: [postTag.tagId],
		references: [tag.id],
	}),
}));

export const postVoteRelations = relations(postVote, ({ one }) => ({
	post: one(post, {
		fields: [postVote.postId],
		references: [post.id],
	}),
	user: one(user, {
		fields: [postVote.userId],
		references: [user.id],
	}),
}));

export const commentVoteRelations = relations(commentVote, ({ one }) => ({
	comment: one(comment, {
		fields: [commentVote.commentId],
		references: [comment.id],
	}),
	user: one(user, {
		fields: [commentVote.userId],
		references: [user.id],
	}),
}));

export const userBadgeRelations = relations(userBadge, ({ one }) => ({
	badge: one(badge, {
		fields: [userBadge.badgeId],
		references: [badge.id],
	}),
	user: one(user, {
		fields: [userBadge.userId],
		references: [user.id],
	}),
}));

export const communitySchema = {
	badge,
	comment,
	commentRelations,
	commentVote,
	commentVoteRelations,
	post,
	postRelations,
	postTag,
	postTagRelations,
	postVote,
	postVoteRelations,
	tag,
	tagRelations,
	topic,
	topicFollow,
	topicRelations,
	userBadge,
	userBadgeRelations,
	userFollow,
};
