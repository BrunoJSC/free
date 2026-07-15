import { relations } from "drizzle-orm";
import {
	bigint,
	index,
	pgEnum,
	pgTable,
	primaryKey,
	text,
	timestamp,
} from "drizzle-orm/pg-core";
import { fkId, primaryId, timestamps } from "./_helpers";
import { user } from "./auth";
import { contract } from "./contract";
import { project } from "./project";

/**
 * Mensageria (roadmap §5). Uma `conversation` agrupa participantes e mensagens;
 * a thread costuma nascer de uma proposta ou contrato. Recibo de leitura mora em
 * `conversation_participant.last_read_at` (por participante), sem tabela extra.
 */

export const conversationType = pgEnum("conversation_type", [
	"direct",
	"proposal",
	"contract",
]);

export const conversation = pgTable("conversation", {
	contractId: fkId("contract_id").references(() => contract.id, {
		onDelete: "set null",
	}),
	id: primaryId(),
	// Desnormalizado para ordenar a caixa de entrada sem varrer mensagens.
	lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
	projectId: fkId("project_id").references(() => project.id, {
		onDelete: "set null",
	}),
	type: conversationType("type").default("direct").notNull(),
	...timestamps(),
});

export const conversationParticipant = pgTable(
	"conversation_participant",
	{
		conversationId: fkId("conversation_id")
			.notNull()
			.references(() => conversation.id, { onDelete: "cascade" }),
		joinedAt: timestamp("joined_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		lastReadAt: timestamp("last_read_at", { withTimezone: true }),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
	},
	(table) => [
		primaryKey({ columns: [table.conversationId, table.userId] }),
		index("conversation_participant_user_idx").on(table.userId),
	]
);

export const message = pgTable(
	"message",
	{
		body: text("body").notNull(),
		conversationId: fkId("conversation_id")
			.notNull()
			.references(() => conversation.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		editedAt: timestamp("edited_at", { withTimezone: true }),
		id: primaryId(),
		senderUserId: text("sender_user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
	},
	(table) => [
		// Paginação por thread em ordem cronológica.
		index("message_conversation_created_idx").on(
			table.conversationId,
			table.createdAt
		),
	]
);

export const messageAttachment = pgTable(
	"message_attachment",
	{
		contentType: text("content_type"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		fileName: text("file_name"),
		fileUrl: text("file_url").notNull(),
		id: primaryId(),
		messageId: fkId("message_id")
			.notNull()
			.references(() => message.id, { onDelete: "cascade" }),
		sizeBytes: bigint("size_bytes", { mode: "number" }),
	},
	(table) => [index("message_attachment_message_idx").on(table.messageId)]
);

export const conversationRelations = relations(conversation, ({ many }) => ({
	messages: many(message),
	participants: many(conversationParticipant),
}));

export const conversationParticipantRelations = relations(
	conversationParticipant,
	({ one }) => ({
		conversation: one(conversation, {
			fields: [conversationParticipant.conversationId],
			references: [conversation.id],
		}),
		user: one(user, {
			fields: [conversationParticipant.userId],
			references: [user.id],
		}),
	})
);

export const messageRelations = relations(message, ({ one, many }) => ({
	attachments: many(messageAttachment),
	conversation: one(conversation, {
		fields: [message.conversationId],
		references: [conversation.id],
	}),
	sender: one(user, {
		fields: [message.senderUserId],
		references: [user.id],
	}),
}));

export const messageAttachmentRelations = relations(
	messageAttachment,
	({ one }) => ({
		message: one(message, {
			fields: [messageAttachment.messageId],
			references: [message.id],
		}),
	})
);

export const messagingSchema = {
	conversation,
	conversationParticipant,
	conversationParticipantRelations,
	conversationRelations,
	message,
	messageAttachment,
	messageAttachmentRelations,
	messageRelations,
};
