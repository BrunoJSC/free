import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [
		tailwindcss(),
		tanstackStart(),
		nitro({
			preset: "vercel",
		}),
		viteReact(),
	],
	resolve: {
		tsconfigPaths: true,
	},
	server: {
		port: 3001,
	},
});
