import { cors } from "@elysiajs/cors";
import { createContext } from "@free/api/context";
import { appRouter } from "@free/api/routers/index";
import { auth, TRUSTED_IP_HEADER } from "@free/auth";
import { env } from "@free/env/server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { Elysia } from "elysia";
import { rateLimit } from "elysia-rate-limit";
import { initLogger } from "evlog";
import {
	type BetterAuthInstance,
	createAuthMiddleware,
} from "evlog/better-auth";
import { evlog } from "evlog/elysia";

import { getClientIp } from "./client-ip";
import { toRequestInfo } from "./request-info";

const PORT = Number(process.env.PORT) || 3000;

/**
 * Rede de segurança global, por IP, em cima de TODAS as rotas. É deliberadamente
 * folgada: quem protege login e cadastro de verdade é o rate limit do Better
 * Auth (3 req/10s nessas rotas). Este aqui existe para o resto — `/trpc/*`,
 * scraping de busca, enumeração de perfis — onde não há proteção nenhuma hoje.
 */
const GLOBAL_RATE_LIMIT_WINDOW_MS = 60_000;
const GLOBAL_RATE_LIMIT_MAX = 300;

/** Quando não dá para resolver o IP, todos caem no mesmo balde (fail closed). */
const UNKNOWN_IP_KEY = "unknown-ip";

const ALLOWED_AUTH_METHODS = ["GET", "POST"];
const METHOD_NOT_ALLOWED = 405;
const TOO_MANY_REQUESTS = 429;

initLogger({
	env: { service: "free-server" },
});

const identifyUser = createAuthMiddleware(auth as BetterAuthInstance, {
	exclude: ["/api/auth/**"],
	maskEmail: true,
});

/**
 * Entrega ao Better Auth o IP que NÓS resolvemos, no único header em que ele
 * confia (`TRUSTED_IP_HEADER`).
 *
 * O `delete` antes do `set` é o que faz a proteção valer: sem ele, um cliente
 * poderia mandar o header pronto e escolher o próprio IP — que é exatamente o
 * furo que estamos fechando.
 */
function withTrustedClientIp(request: Request, ip: string | null): Request {
	const headers = new Headers(request.headers);
	headers.delete(TRUSTED_IP_HEADER);
	if (ip) {
		headers.set(TRUSTED_IP_HEADER, ip);
	}

	return new Request(request, { headers });
}

new Elysia()
	.use(evlog())
	.use(
		cors({
			allowedHeaders: ["Content-Type", "Authorization"],
			credentials: true,
			methods: ["GET", "POST", "OPTIONS"],
			origin: env.CORS_ORIGIN,
		})
	)
	.use(
		rateLimit({
			duration: GLOBAL_RATE_LIMIT_WINDOW_MS,
			errorResponse: new Response("Too many requests", {
				status: TOO_MANY_REQUESTS,
			}),
			// Mesma resolução de IP do resto do servidor. O default do plugin lê
			// headers de proxy, que sem proxy o cliente forja à vontade.
			generator: (request, server) =>
				getClientIp(request, server) ?? UNKNOWN_IP_KEY,
			max: GLOBAL_RATE_LIMIT_MAX,
		})
	)
	// Depois do rate limit: uma requisição barrada não deve custar uma consulta
	// de sessão no banco — sob ataque, é justamente esse trabalho que derruba o
	// servidor.
	.derive(async ({ request, log }) => {
		await identifyUser(log, request.headers, new URL(request.url).pathname);
		return {};
	})
	.all("/api/auth/*", (context) => {
		const { request, server, status } = context;
		if (!ALLOWED_AUTH_METHODS.includes(request.method)) {
			return status(METHOD_NOT_ALLOWED);
		}

		return auth.handler(
			withTrustedClientIp(request, getClientIp(request, server))
		);
	})
	.all("/trpc/*", async (context) => {
		const res = await fetchRequestHandler({
			createContext: () => createContext(toRequestInfo(context)),
			endpoint: "/trpc",
			req: context.request,
			router: appRouter,
		});
		return res;
	})
	.get("/", () => "OK")
	.listen(PORT, () => {
		console.log(`Server is running on http://localhost:${PORT}`);
	});
