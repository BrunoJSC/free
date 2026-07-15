import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";

import type { Context } from "./context";
import { toZodFieldErrors } from "./error-formatter";

// O transformer define o formato de serialização na rede: sem ele, `Date`, `Map`,
// `Set` e `BigInt` chegam ao cliente como string/objeto simples. Ele precisa ser o
// mesmo aqui e em cada terminating link dos clientes (`apps/web`, `apps/native`) —
// qualquer divergência faz o tRPC falhar com "Unable to transform response".
export const t = initTRPC.context<Context>().create({
	errorFormatter: ({ error, shape }) => ({
		...shape,
		data: {
			...shape.data,
			// Só expomos erro de validação de ENTRADA. Um `ZodError` também pode vir
			// de validação de saída, mas aí é bug nosso (INTERNAL_SERVER_ERROR) e o
			// detalhe descreve o schema interno — não é coisa para mandar ao cliente.
			zodError:
				error.code === "BAD_REQUEST" ? toZodFieldErrors(error.cause) : null,
		},
	}),
	transformer: superjson,
});

export const { router } = t;

export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
	if (!ctx.session) {
		throw new TRPCError({
			cause: "No session",
			code: "UNAUTHORIZED",
			message: "Authentication required",
		});
	}
	return next({
		ctx: {
			...ctx,
			session: ctx.session,
		},
	});
});
