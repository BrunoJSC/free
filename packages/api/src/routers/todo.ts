import { todo } from "@free/db/schema/todo";
import { eq } from "drizzle-orm";
import z from "zod";

import { publicProcedure, router } from "../index";

export const todoRouter = router({
	create: publicProcedure
		.input(z.object({ text: z.string().min(1) }))
		.mutation(
			async ({ ctx, input }) =>
				await ctx.db.insert(todo).values({ text: input.text })
		),

	delete: publicProcedure
		.input(z.object({ id: z.number() }))
		.mutation(
			async ({ ctx, input }) =>
				await ctx.db.delete(todo).where(eq(todo.id, input.id))
		),

	getAll: publicProcedure.query(
		async ({ ctx }) => await ctx.db.select().from(todo)
	),

	toggle: publicProcedure
		.input(z.object({ completed: z.boolean(), id: z.number() }))
		.mutation(
			async ({ ctx, input }) =>
				await ctx.db
					.update(todo)
					.set({ completed: input.completed })
					.where(eq(todo.id, input.id))
		),
});
