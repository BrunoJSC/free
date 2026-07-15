import { relations } from "drizzle-orm";
import {
	boolean,
	index,
	jsonb,
	pgEnum,
	pgTable,
	primaryKey,
	text,
	timestamp,
} from "drizzle-orm/pg-core";
import { primaryId } from "./_helpers";
import { user } from "./auth";

/**
 * Notificações (roadmap §9). `notification` é a central in-app (lida/não lida por
 * `read_at`); `notification_preference` é a matriz por (tipo × canal) que decide
 * se aquele evento vira e-mail/push/in-app — é o que evita virar spam.
 */

export const notificationType = pgEnum("notification_type", [
	"proposal_received",
	"contract_update",
	"payment",
	"message",
	"review",
	"mention",
	"system",
]);

export const notificationChannel = pgEnum("notification_channel", [
	"in_app",
	"email",
	"push",
]);

export const notification = pgTable(
	"notification",
	{
		body: text("body"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		// Payload para deep-link/render (ex.: { contractId }).
		data: jsonb("data").$type<Record<string, unknown>>(),
		id: primaryId(),
		readAt: timestamp("read_at", { withTimezone: true }),
		title: text("title").notNull(),
		type: notificationType("type").notNull(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
	},
	(table) => [
		index("notification_user_created_idx").on(table.userId, table.createdAt),
	]
);

/** Preferência por (usuário × tipo × canal). PK composta = uma linha por combo. */
export const notificationPreference = pgTable(
	"notification_preference",
	{
		channel: notificationChannel("channel").notNull(),
		enabled: boolean("enabled").default(true).notNull(),
		type: notificationType("type").notNull(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
	},
	(table) => [
		primaryKey({ columns: [table.userId, table.type, table.channel] }),
	]
);

export const notificationRelations = relations(notification, ({ one }) => ({
	user: one(user, {
		fields: [notification.userId],
		references: [user.id],
	}),
}));

export const notificationPreferenceRelations = relations(
	notificationPreference,
	({ one }) => ({
		user: one(user, {
			fields: [notificationPreference.userId],
			references: [user.id],
		}),
	})
);

export const notificationSchema = {
	notification,
	notificationPreference,
	notificationPreferenceRelations,
	notificationRelations,
};
