import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { getUser } from "@/functions/get-user";

export const Route = createFileRoute("/_auth")({
	/**
	 * Resolvido no servidor, via server function, e não no cliente.
	 *
	 * Antes isto era `ssr: false` + `authClient.getSession()` no navegador: a
	 * página chegava vazia, o cliente descobria só depois se havia sessão e a área
	 * logada piscava conteúdo antes de redirecionar. Com a sessão resolvida no
	 * `beforeLoad`, o redirect para `/login` acontece **antes** de qualquer HTML
	 * sair, e a rota volta a ter SSR de verdade.
	 */
	beforeLoad: async () => {
		const session = await getUser();

		if (!session) {
			throw redirect({ to: "/login" });
		}

		return { session };
	},
	component: AuthLayout,
});

function AuthLayout() {
	return <Outlet />;
}
