import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

// This package is consumed by the Vite app but compiled without `vite/client`
// types, so `import.meta.env` has to be narrowed explicitly here.
type ImportMetaWithEnv = ImportMeta & {
	env: Record<string, string | undefined>;
};

export const env = createEnv({
	client: {
		VITE_SERVER_URL: z.url(),
	},
	clientPrefix: "VITE_",
	emptyStringAsUndefined: true,
	runtimeEnv: (import.meta as ImportMetaWithEnv).env,
	skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
