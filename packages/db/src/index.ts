import { env } from "@free/env/server";
import { drizzle } from "drizzle-orm/node-postgres";

import {
	account,
	accountRelations,
	session,
	sessionRelations,
	user,
	userRelations,
	verification,
} from "./schema/auth";
import { todo } from "./schema/todo";

const schema = {
	account,
	accountRelations,
	session,
	sessionRelations,
	todo,
	user,
	userRelations,
	verification,
};

export function createDb() {
	return drizzle(env.DATABASE_URL, { schema });
}

export const db = createDb();
