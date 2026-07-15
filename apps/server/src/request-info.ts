import type { RequestInfo } from "@free/api/context";

import { getClientIp, type SocketAddressResolver } from "./client-ip";

/**
 * O mínimo que precisamos do contexto do Elysia. Tipar só isso (em vez de
 * receber o `Context` inteiro) mantém a função trivial de testar: um objeto
 * literal já satisfaz o contrato.
 */
export interface RequestSource {
	log: { getContext: () => Record<string, unknown> };
	request: Request;
	server: SocketAddressResolver | null;
}

/**
 * Reaproveita o `requestId` que o evlog já resolveu para esta requisição (o
 * `x-request-id` do proxy, ou um UUID gerado por ele). Gerar um id próprio aqui
 * criaria um segundo identificador para a mesma requisição, e aí o id que a API
 * devolve não bateria com o id que aparece no log — justamente a correlação que
 * queremos ter no dia da investigação.
 */
function getRequestId(log: RequestSource["log"]): string {
	const { requestId } = log.getContext();
	return typeof requestId === "string" ? requestId : crypto.randomUUID();
}

export function toRequestInfo({
	log,
	request,
	server,
}: RequestSource): RequestInfo {
	return {
		headers: request.headers,
		ip: getClientIp(request, server),
		requestId: getRequestId(log),
	};
}
