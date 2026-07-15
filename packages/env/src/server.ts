import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	emptyStringAsUndefined: true,
	runtimeEnv: process.env,
	server: {
		BETTER_AUTH_SECRET: z.string().min(32),
		BETTER_AUTH_URL: z.url(),
		CORS_ORIGIN: z.url(),
		DATABASE_URL: z.string().min(1),
		NODE_ENV: z
			.enum(["development", "production", "test"])
			.default("development"),
		// Ligue apenas quando houver um proxy confiável na frente (Fly, Vercel,
		// Cloudflare, nginx). Só então `x-forwarded-for` vale como IP do cliente —
		// sem proxy, o header é definido pelo próprio cliente e qualquer um forjaria
		// o IP para furar rate limit e auditoria.
		// `z.stringbool()` porque env é sempre string: `z.coerce.boolean()` faria
		// a string "false" virar `true`.
		TRUST_PROXY: z.stringbool().default(false),
	},
	skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
