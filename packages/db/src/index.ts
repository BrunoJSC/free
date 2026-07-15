import { env } from "@free/env/server";
import { drizzle } from "drizzle-orm/node-postgres";
import { applicationSchema } from "./schema/application";
import {
	account,
	accountRelations,
	session,
	sessionRelations,
	user,
	userRelations,
	verification,
} from "./schema/auth";
import { communitySchema } from "./schema/community";
import { contractSchema } from "./schema/contract";
import { disputeSchema } from "./schema/dispute";
import { jobSchema } from "./schema/job";
import { messagingSchema } from "./schema/messaging";
import { moderationSchema } from "./schema/moderation";
import { notificationSchema } from "./schema/notification";
import { paymentSchema } from "./schema/payment";
import { profileSchema } from "./schema/profile";
import { projectSchema } from "./schema/project";
import { proposalSchema } from "./schema/proposal";
import { rateLimit } from "./schema/rate-limit";
import { reviewSchema } from "./schema/review";
import { taxonomySchema } from "./schema/taxonomy";
import { todo } from "./schema/todo";

/**
 * Schema único que alimenta o cliente Drizzle e o query builder relacional. Cada
 * domínio exporta um objeto `xSchema` com suas tabelas + relations e é espalhado
 * aqui — assim uma tabela nova entra pelo próprio arquivo de domínio, sem risco
 * de esquecer de registrá-la. Import nomeado (não `import *`) e nada de barrel
 * porque o Ultracite trata as duas coisas como erro.
 */
const schema = {
	account,
	accountRelations,
	rateLimit,
	session,
	sessionRelations,
	todo,
	user,
	userRelations,
	verification,
	...taxonomySchema,
	...profileSchema,
	...projectSchema,
	...jobSchema,
	...proposalSchema,
	...applicationSchema,
	...contractSchema,
	...paymentSchema,
	...disputeSchema,
	...messagingSchema,
	...communitySchema,
	...moderationSchema,
	...reviewSchema,
	...notificationSchema,
};

export function createDb() {
	return drizzle(env.DATABASE_URL, { schema });
}

export const db = createDb();
