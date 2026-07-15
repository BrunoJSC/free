import { env } from "@free/env/server";

/** Só o que usamos do `server` do Bun: resolver o IP do socket. */
export interface SocketAddressResolver {
	requestIP: (request: Request) => { address: string } | null;
}

const FORWARDED_FOR_HEADER = "x-forwarded-for";

/**
 * IP de origem do cliente. **Fonte única** de IP no servidor: o contexto do
 * tRPC, o rate limit global e o rate limit do Better Auth usam todos esta
 * função, para que o mesmo cliente seja contado como o mesmo cliente em toda
 * parte. Duas maneiras diferentes de descobrir o IP viram duas maneiras
 * diferentes de furar o limite.
 *
 * `x-forwarded-for` só é confiável quando existe um proxy conhecido na frente:
 * sem proxy, quem define o header é o próprio cliente, e aceitá-lo permitiria
 * mandar um IP novo a cada requisição — o contador nunca subiria. Por isso o
 * header só é lido quando `TRUST_PROXY` declara que há um proxy confiável; caso
 * contrário vale o IP do socket, que não dá para falsificar.
 */
export function getClientIp(
	request: Request,
	server: SocketAddressResolver | null
): string | null {
	if (env.TRUST_PROXY) {
		// A lista é "cliente, proxy1, proxy2": o primeiro item é a origem real.
		const forwardedFor = request.headers.get(FORWARDED_FOR_HEADER);
		const clientIp = forwardedFor?.split(",")[0]?.trim();
		if (clientIp) {
			return clientIp;
		}
	}

	const socketAddress = server?.requestIP(request);
	if (!socketAddress) {
		return null;
	}

	return socketAddress.address;
}
