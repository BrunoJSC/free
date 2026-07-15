# Roadmap — Marketplace de Freelancers + Comunidade

Documento de trabalho. Estado do repositório na análise: scaffold do Better-T-Stack
(Turborepo + Bun) com **apenas o exemplo `todo`**. Nenhuma regra de negócio do produto
existe ainda.

**Stack instalada:** Elysia 1.4 (host HTTP) · tRPC 11 (API) · Drizzle + Postgres ·
Better Auth 1.6 · TanStack Start (web) · Expo/React Native (native) · shadcn/ui compartilhado
(`packages/ui`) · Zod 4 · evlog · Biome/Ultracite.

---

## 0. Decisões de arquitetura a fechar antes de codar

Essas decisões travam tudo o que vem depois. Vale decidir agora, não no meio da fase 3.

- [x] **Papel do Elysia vs tRPC.** ✅ **Decidido:** o tRPC é a **única** superfície de API de
      produto; o Elysia é só o host — HTTP + WebSocket + webhooks de pagamento + upload. Nenhuma
      rota de produto é declarada nas duas camadas.
      - **Como o host embute o tRPC sem redeclarar rota:** o Elysia delega tudo sob `/trpc/*`
        ao `fetchRequestHandler` do tRPC e tudo sob `/api/auth/*` ao `auth.handler` do Better
        Auth ([apps/server/src/index.ts](apps/server/src/index.ts)). São dois `catch-all`: o
        Elysia declara **um** wildcard por sub-árvore e quem roteia lá dentro é o próprio
        tRPC/Better Auth. O idioma canônico do Elysia para isso é o `.mount(handler)`, que
        hospeda qualquer handler `Request → Response` (padrão Web) sob um prefixo sem recriar as
        rotas — é o que a própria doc do Better Auth mostra (`.mount(auth.handler)`). O
        `.all("/trpc/*")` / `.all("/api/auth/*")` que já usamos é equivalente para esse fim e
        ainda deixa o pré-processamento (IP confiável + rate limit) rodar antes de entregar; não
        vale trocar por `.mount` só pela estética.
      - **A armadilha que esta decisão evita** é o `@elysiajs/trpc`: ele monta o roteador tRPC
        **como plugin do Elysia**, ou seja, a superfície tRPC passaria a existir na tabela de
        rotas do próprio Elysia — a duplicação exata que não queremos. Confirmado morto: v1.1.0,
        último publish em 2024-07-16, peer `elysia >= 1.1.0` (estamos na 1.4), e a página de
        integração tRPC do Elysia saiu do ar (404). Segue instalado só pela decisão separada de
        deps mortas (item em §1), mas **não deve ser ligado**.
      - **Regra prática:** funcionalidade de produto entra por `procedure` no
        [packages/api](packages/api/src/index.ts). O Elysia só ganha rota própria para o que o
        tRPC não faz bem — upgrade de WebSocket (`.ws()`), webhook de PSP (corpo cru + verificação
        de assinatura) e upload/URL pré-assinada. Nada de espelhar um `procedure` como rota
        Elysia nem vice-versa.
- [ ] **Dois modos de contratação.** O produto tem "achar freelancer" (projeto/proposta) e
      "contratar pessoas" (vaga/candidatura). São **entidades diferentes** (`project` vs
      `job_posting`), não um enum na mesma tabela — o ciclo de vida, o pagamento e as métricas
      divergem cedo demais.
- [ ] **Dinheiro sempre em inteiro (centavos)** — `bigint`/`numeric`, nunca `float`. Definir
      moeda por transação (`BRL` default).
- [ ] **Provedor de pagamento.** Para o Brasil, escrow + split + Pix são requisitos:
      Stripe Connect, Mercado Pago ou Pagar.me. Isso muda o modelo de dados de `contract`.
- [ ] **Storage de arquivos** (portfólio, avatar, anexo de proposta, currículo): S3/R2 com
      upload via URL pré-assinada. Nunca subir arquivo pelo tRPC.
- [ ] **Busca.** Começar com Postgres FTS + `pg_trgm` (`tsvector` + índice GIN). Migrar para
      Meilisearch/Typesense só quando a busca facetada doer.

---

## 1. Correções de base (fazer antes de qualquer feature)

Problemas concretos já presentes no código. Cada um cobra juros se ficar para depois.

- [x] **Adicionar `superjson` como transformer no tRPC.** ✅ Configurado no servidor
      ([packages/api/src/index.ts](packages/api/src/index.ts)) e nos dois terminating links
      ([apps/web/src/router.tsx](apps/web/src/router.tsx),
      [apps/native/utils/trpc.ts](apps/native/utils/trpc.ts)). `Date`, `Set`, `Map` e `BigInt`
      agora atravessam a rede com o tipo preservado. Efeito colateral bom: o tipo do link
      passou a **exigir** `transformer`, então um cliente fora de sincronia com o servidor
      vira erro de compilação em vez de bug em runtime.
- [x] **Adicionar `errorFormatter` com `ZodError`.** ✅ Composto em
      [packages/api/src/index.ts](packages/api/src/index.ts), com a lógica isolada em
      [packages/api/src/error-formatter.ts](packages/api/src/error-formatter.ts).
      Os erros saem indexados por **dot-path** (`budget.amountCents`, `milestones.0.title`),
      que é o mesmo `name` que o TanStack Form usa no campo. Não usamos `z.flattenError()`:
      ele só olha `path[0]` e colapsa erro aninhado na chave do pai — num formulário de
      projeto (orçamento aninhado, array de milestones) o input certo ficaria sem mensagem.
      Só erros de **entrada** (`BAD_REQUEST`) são expostos; `ZodError` de saída é bug nosso
      e descreve schema interno, então não vai para o cliente.

- [ ] **Consumir `zodError` nos formulários** (web e native): hoje o servidor já manda os
      erros por campo, mas nenhum formulário lê. Ligar `error.data.zodError.fieldErrors[name]`
      no `TextField`/`FormTextInput`.
      - Vale só para formulários que passem por **tRPC** — login e cadastro não passam (ver
        `packages/validators` acima), então este item só ganha corpo com o primeiro router real.
      - ⚠️ No native é mais trabalho do que ligar o dado: o
        [FormTextInput](apps/native/components/form-text-input.tsx) **não tem slot de erro
        nenhum**. Os dois formulários mostram *uma* string no topo do card. Erro por campo lá
        exige antes criar a exibição por campo.
- [x] **Enriquecer o contexto tRPC.** ✅ [packages/api/src/context.ts](packages/api/src/context.ts)
      agora expõe `db`, `headers`, `ip`, `requestId` e `session` (o campo morto `auth: null`
      saiu). Split inner/outer do tRPC: `createInnerContext()` monta um contexto sem HTTP
      nenhum, então teste e `createCallerFactory` não precisam forjar `Request`/`Response`.
      O `packages/api` **não depende mais do Elysia** — recebe um `RequestInfo` de tipos web
      padrão, e quem traduz o contexto do Elysia é o host, em
      [apps/server/src/request-info.ts](apps/server/src/request-info.ts). O Elysia segue
      normalmente como host em `apps/server`.
      - `requestId` é lido do evlog, então o id que a API usa é **o mesmo** que sai no log.
      - `ip` só confia em `x-forwarded-for` quando `TRUST_PROXY=true`; sem proxy o header é
        forjável e furaria rate limit (ver `TRUST_PROXY` em
        [packages/env/src/server.ts](packages/env/src/server.ts)).
      - As procedures usam `ctx.db` em vez de importar o singleton do banco.
- [ ] **Corrigir os cookies do Better Auth** ([packages/auth/src/index.ts](packages/auth/src/index.ts)):
      `sameSite: "none"` + `secure: true` estão fixos. Em `http://localhost` o navegador
      **descarta** esse cookie. Tornar condicional por `NODE_ENV`.
- [x] **Ligar o rate limit do Better Auth** e um rate limit global no Elysia. ✅
      O buraco real não era falta de regra — o Better Auth **já embute** 3 req/10s em
      `/sign-in*` e `/sign-up*`, e 3 req/60s no reset de senha. O problema é que essas regras
      eram todas contornáveis:
      - **IP forjável (o furo principal):** o Better Auth lê `x-forwarded-for` por padrão, que
        sem proxy é definido pelo próprio cliente — bastava trocar o valor a cada tentativa
        para o contador nunca subir. Agora ele só confia no `TRUSTED_IP_HEADER`, que o servidor
        sobrescreve com o IP que ele mesmo resolveu, apagando o que veio de fora
        ([apps/server/src/index.ts](apps/server/src/index.ts)).
      - **Desligado em dev:** o default do Better Auth é `enabled: false` fora de produção, ou
        seja a proteção só rodaria pela primeira vez em produção. Ligado explicitamente.
      - **Storage em memória:** zerava a cada restart e não é compartilhado entre instâncias
        (com N réplicas, o atacante ganha N× o limite). Trocado para `database` — exige a nova
        tabela [rate_limit](packages/db/src/schema/rate-limit.ts).
      - **Rate limit global** por IP em todas as rotas (300/60s) via `elysia-rate-limit`, com
        `generator` usando a mesma resolução de IP do resto do servidor
        ([apps/server/src/client-ip.ts](apps/server/src/client-ip.ts), agora fonte única).
      - Sem `customRules`: elas teriam **precedência** sobre as regras embutidas, então
        declarar as nossas correria o risco de afrouxar o default achando que endurecia.

- [ ] ⚠️ **Pendências do rate limit** (não dava para fechar sem o banco de pé):
      - Rodar `bun run db:push` (ou gerar migration) para criar a tabela `rate_limit` —
        **sem ela, as rotas `/api/auth/*` vão falhar**, porque o storage é `database`.
      - Verificar de ponta a ponta o limite do Better Auth (esperado: 4ª tentativa de
        `/sign-in/email` em 10s → HTTP 429).
      - Definir `TRUST_PROXY=true` no ambiente de produção (atrás de Fly/Vercel/Cloudflare).
        Se ficar `false` em produção com proxy, todo mundo compartilha o IP do proxy e cai no
        mesmo balde.
      - O rate limit global usa store em memória: com múltiplas réplicas, considerar Redis
        (o Better Auth também aceita `secondary-storage`).
- [ ] **Remover o exemplo `todo`** por completo: [packages/api/src/routers/todo.ts](packages/api/src/routers/todo.ts),
      [packages/db/src/schema/todo.ts](packages/db/src/schema/todo.ts), rotas web/native.
      Nota: hoje ele usa `publicProcedure` em `delete`/`toggle` sem checar dono — qualquer
      um apaga qualquer coisa. Não copiar esse padrão para as entidades reais.
- [ ] **Remover dependências mortas** de [apps/server/package.json](apps/server/package.json):
      `@elysiajs/trpc` e `@hono/trpc-server` estão instalados mas o servidor usa
      `fetchRequestHandler` direto. Além de peso, elas mentem sobre a arquitetura: quem lê o
      `package.json` conclui que o tRPC está montado como plugin do Elysia, que é justamente a
      duplicação que a decisão nº 1 quer evitar. **Decidido manter por ora** — sem pressa.
      - ⚠️ `@sinclair/typebox` **não** é dependência morta, apesar de não ter `import` nenhum
        no nosso código: é `peerDependency` obrigatória do Elysia (`>= 0.34.0 < 1`, e não está
        entre os `optionalPeers` no lockfile). Remover quebraria os tipos do Elysia. Não caia
        nessa.
- [ ] **Trocar `db:push` por migrations versionadas** (`drizzle-kit generate` + `migrate`,
      SQL commitado). `push` em produção destrói dados.
- [x] **Auth no SSR da web.** ✅ [apps/web/src/routes/_auth/route.tsx](apps/web/src/routes/_auth/route.tsx)
      resolve a sessão no `beforeLoad` pela server function [get-user.ts](apps/web/src/functions/get-user.ts)
      e o `ssr: false` saiu — o redirect para `/login` agora acontece antes de qualquer HTML
      sair, sem flash. Curiosidade: a server function e o [middleware/auth.ts](apps/web/src/middleware/auth.ts)
      **já existiam** no repo e não eram importados por ninguém; faltava só ligá-los. O tipo
      da sessão no contexto mudou de `{ data, error }` para `{ user, session }`.
      - ⚠️ **Falta a volta**: o `search: { redirect: location.href }` não foi feito, porque
        `/login` não declara `validateSearch` e os formulários mandam todo mundo para
        `/dashboard` no sucesso. Quem for barrado numa rota profunda ainda cai no dashboard,
        não de volta na página que pediu.
- [x] **Criar `packages/validators`** ✅ com os schemas Zod compartilhados —
      [packages/validators/src/auth.ts](packages/validators/src/auth.ts), consumido pelos dois
      formulários da web, pelos dois do native e pelo `@free/auth`.
      - O pacote depende **só do `zod`** (nada de `@free/db`/`@free/auth`/`@free/env`) de
        propósito: é o que deixa um formulário importá-lo sem arrastar o grafo do servidor —
        e com ele `DATABASE_URL` e `BETTER_AUTH_SECRET` — para dentro do bundle do cliente.
      - **Cadastro e login não passam pelo tRPC** (falam com `/api/auth/*` via `authClient`),
        então o `errorFormatter` não cobre esses dois. Quem valida no servidor é o Better Auth.
        Por isso `PASSWORD_MIN_LENGTH` sai do pacote e alimenta o `minPasswordLength` do
        [packages/auth](packages/auth/src/index.ts): é o que mantém as três pontas iguais.
        Antes, o `8` estava escrito à mão em 4 formulários e o servidor usava o default do
        Better Auth — que por coincidência também era 8.
      - A divergência que este item previa **já existia**: a web não aparava o e-mail e o
        native aparava; as mensagens do mesmo `min(8)` eram diferentes em cada app.
      - Mudança de comportamento deliberada: o **login** agora só exige senha não-vazia. Exigir
        o mínimo do cadastro ali (o que os dois apps faziam) trancaria, no dia em que o mínimo
        subisse, todo usuário com senha antiga válida — barrado pelo próprio formulário, sem
        conseguir nem tentar.
      - Os schemas do `todo` ficaram de fora **de propósito**: esse router está marcado para
        deleção logo abaixo, e não vale criar infra para código que vai embora. O primeiro
        router de verdade é que exercita a perna tRPC (onde o schema *é* o contrato e o
        `zodError` volta indexado por dot-path).
- [x] **Uma conexão de banco só.** ✅ O `createAuth()` chamava `createDb()` por dentro enquanto
      o [packages/db](packages/db/src/index.ts) já exportava o singleton `db` — eram **dois pools**
      independentes para o mesmo Postgres no mesmo processo. Agora o `db` entra por parâmetro
      (`createAuth(db = defaultDb)`), o que também deixa um teste passar conexão em transação.
- [ ] **Infra de qualidade:** nenhum teste existe. Subir Vitest (unit + integração de router
      com `createCaller`) e um workflow de CI rodando `check`, `check-types`, `test`.
      ⚠️ Achado ao implementar o contexto: `app.handle()` do Elysia (o idioma de teste da doc
      dele) **derruba o Bun com segfault** quando o plugin `evlog()` está no app — no Bun
      1.3.14 / Windows, e sem o teste sequer tocar no `log`. Para testar router, prefira
      `createCallerFactory` com `createInnerContext()` (que agora não exige HTTP); para testar
      o host de verdade, suba com `.listen()` e bata por HTTP.

---

## 2. Identidade, perfis e empresas

- [ ] Plugin **`organization`** do Better Auth para empresas (org, membros, papéis, convites).
      É o caminho pronto para "empresa contrata" com múltiplos recrutadores.
- [ ] Plugin **`admin`** para papéis/permissões (`user` / `moderator` / `admin`) e back-office.
- [ ] Verificação de e-mail + reset de senha (exige provedor de e-mail: Resend/SES).
- [ ] OAuth (Google, GitHub, LinkedIn) — LinkedIn puxa histórico profissional e reduz atrito.
- [ ] 2FA opcional (obrigatório para contas com saldo/saque).
- [ ] `freelancer_profile`: headline, bio, skills, senioridade, taxa/hora, disponibilidade,
      idiomas, localização, links, status de verificação.
- [ ] `company_profile`: razão social, CNPJ, porte, setor, site, selo de verificado.
- [ ] `portfolio_item`: título, descrição, mídia, links, cliente, tags.
- [ ] Taxonomia: `category`, `skill` normalizados + tabelas de junção (nada de `text[]` solto).
- [ ] KYC / verificação de identidade (pré-requisito para saque).
- [ ] Onboarding separado por tipo de conta (freelancer × contratante).

## 3. Projetos, vagas, propostas e contratos

- [ ] `project` (freela): escopo, orçamento (fixo/hora), faixa, prazo, categoria, skills,
      anexos, visibilidade, status.
- [ ] `job_posting` (vaga CLT/PJ): cargo, modelo (remoto/híbrido/presencial), faixa salarial,
      requisitos, perguntas de triagem.
- [ ] `proposal` (lance no projeto): carta, valor, prazo, anexos, status, valor líquido após taxa.
- [ ] `application` (candidatura à vaga): currículo, respostas de triagem, pipeline
      (`triagem → entrevista → oferta → contratado/rejeitado`).
- [ ] `contract`: partes, escopo aceito, valor, taxa da plataforma, status.
- [ ] `milestone` / entregas: aprovação, revisões, aceite automático por prazo.
- [ ] Time tracking (para contrato por hora) + timesheet aprovável.
- [ ] Regras de estado explícitas (máquina de estados) para proposta e contrato — impedir
      transições inválidas no banco, não só na UI.

## 4. Pagamentos e escrow

- [ ] Integração com o PSP escolhido (Connect/split).
- [ ] **Escrow**: cliente deposita → valor retido → liberado por milestone.
- [ ] Pix, cartão e boleto (Brasil).
- [ ] Taxa da plataforma (comissão) por transação, configurável.
- [ ] Carteira do freelancer: saldo, saque, extrato.
- [ ] Notas/recibos e relatório fiscal.
- [ ] Reembolso e **disputa** (mediação com prazo e evidências).
- [ ] Webhooks do PSP no Elysia — **com verificação de assinatura** e idempotência.

## 5. Mensageria e realtime

- [ ] `conversation` + `message` (thread por proposta/contrato).
- [ ] WebSocket no Elysia (`.ws()` + pub/sub) autenticado no upgrade pela sessão.
- [ ] Presença, "digitando...", recibo de leitura.
- [ ] Anexos em mensagem.
- [ ] Antifraude: detectar tentativa de levar o pagamento para fora da plataforma.

## 6. Comunidade

- [ ] `post` / `thread`, `comment` (aninhado), `vote`, `tag`, `topic`.
- [ ] Feed (seguindo, em alta, recentes) com paginação por cursor.
- [ ] Reputação, badges e nível — conecta a comunidade ao ranking do marketplace.
- [ ] Follows (usuário e tópico).
- [ ] Moderação: report, fila de moderação, shadowban, antispam.
- [ ] Menções (`@`) e notificação.
- [ ] Markdown com sanitização (nada de HTML cru — ver `dangerouslySetInnerHTML` no guia do projeto).

## 7. Busca e descoberta

- [ ] Busca de freelancers (skill, faixa de preço, nota, disponibilidade, localização).
- [ ] Busca de projetos/vagas com filtros facetados.
- [ ] Postgres FTS (`tsvector` + GIN) e `pg_trgm` para fuzzy.
- [ ] Ranking (relevância + reputação + atividade recente).
- [ ] Buscas salvas + alerta por e-mail/push.
- [ ] Recomendações ("projetos para você").

## 8. Avaliações e confiança

- [ ] `review` bidirecional, liberada **só após contrato concluído**.
- [ ] Notas por dimensão (qualidade, prazo, comunicação).
- [ ] Média agregada com proteção contra manipulação (peso por volume/recência).
- [ ] Bloquear/denunciar usuário.

## 9. Notificações

- [ ] Central in-app (`notification` + lidas/não lidas).
- [ ] E-mail transacional (templates: proposta recebida, contrato, pagamento, mensagem).
- [ ] Push no Expo (`expo-notifications`).
- [ ] Preferências por canal e por tipo — e digest, para não virar spam.

## 10. Web (TanStack Start)

- [ ] Landing pública com SEO real (`head` por rota, sitemap, OG image). Hoje o título é
      literalmente `"My App"` em [apps/web/src/routes/\_\_root.tsx](apps/web/src/routes/__root.tsx).
- [ ] Perfil público do freelancer (SSR, indexável — é o principal canal de aquisição).
- [ ] Listagem/detalhe de projeto e vaga (SSR + prefetch no loader).
- [ ] Dashboards: freelancer, cliente, empresa.
- [ ] Fluxos de proposta, contrato, milestone, chat, comunidade.
- [ ] Tema claro/escuro (`next-themes` já instalado; a raiz está com `className="dark"` fixo).
- [ ] Acessibilidade e estados de loading/erro/vazio em cada tela.

## 11. Mobile (Expo)

- [ ] Navegação real substituindo o drawer/tabs de exemplo.
- [ ] Auth, perfil, busca, propostas, chat, comunidade.
- [ ] Push notifications + deep links.
- [ ] Upload de arquivo/câmera para portfólio e anexos.

## 12. Produção

- [ ] Deploy do servidor, da web e do banco (o `bts.jsonc` está com deploy `none`).
- [ ] Migrations no pipeline de deploy.
- [ ] evlog com drain real (Axiom/Sentry) + alertas.
- [ ] Backups, PITR e plano de restore **testado**.
- [ ] LGPD: consentimento, exportação e exclusão de dados, política de retenção.
- [ ] Painel admin: moderação, usuários, financeiro, disputas.

---

## Ordem de execução sugerida

| Fase | Escopo | Objetivo |
|---|---|---|
| 0 | Seção 1 inteira | Base sem dívida: transformer, erros, contexto, cookies, migrations, testes, CI |
| 1 | Seções 2 + 7 (mínimo) | Perfis + busca — vira um diretório de freelancers já útil |
| 2 | Seção 3 | Projetos, propostas, contratos — o marketplace funciona (sem dinheiro) |
| 3 | Seções 5 + 8 | Chat e avaliações — fecha o loop de confiança |
| 4 | Seção 4 | Pagamentos e escrow — a monetização |
| 5 | Seção 6 | Comunidade — retenção e aquisição orgânica |
| 6 | Seções 9–12 | Mobile, notificações, produção |

**O ponto perigoso é a fase 4.** Escrow, split e disputa reescrevem o modelo de dados se
forem enxertados tarde. Mesmo adiando a implementação, modele `contract`/`payment` na fase 2
já pensando em escrow.
