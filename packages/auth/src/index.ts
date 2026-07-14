import { expo } from "@better-auth/expo";
import { createDb } from "@free/db";
import { account, session, user, verification } from "@free/db/schema/auth";
import { env } from "@free/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

export function createAuth() {
	const db = createDb();

	return betterAuth({
		advanced: {
			defaultCookieAttributes: {
				httpOnly: true,
				sameSite: "none",
				secure: true,
			},
		},
		baseURL: env.BETTER_AUTH_URL,
		database: drizzleAdapter(db, {
			provider: "pg",
			schema: { account, session, user, verification },
		}),
		emailAndPassword: {
			enabled: true,
		},
		plugins: [expo()],
		secret: env.BETTER_AUTH_SECRET,
		trustedOrigins: [
			env.CORS_ORIGIN,
			"free://",
			"exp://",
			"http://localhost:8081",
		],
	});
}

export const auth = createAuth();
