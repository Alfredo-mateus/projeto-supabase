# KODAI — Plataforma de Venda de Cursos

Site de venda de curso online com fluxo de compra, aprovação manual de pagamentos e área de aulas protegida.

## Run & Operate

- `pnpm --filter @workspace/kodai run dev` — run the frontend (porta via workflow)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — typecheck completo em todos os pacotes
- `pnpm run build` — typecheck + build todos os pacotes

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS
- Auth + DB + Storage: Supabase
- Build: Vite (static)

## Where things live

- `artifacts/kodai/src/` — frontend React (páginas e componentes)
- `artifacts/kodai/src/lib/supabase.ts` — cliente Supabase + tipos
- `artifacts/kodai/src/lib/auth.tsx` — contexto de autenticação
- `artifacts/kodai/src/pages/` — Landing, Login, Comprar, Aulas, Admin
- `lib/api-spec/openapi.yaml` — contrato OpenAPI (não usado pelo KODAI diretamente)

## Architecture decisions

- Supabase gerencia auth, banco de dados e storage — sem backend Express customizado para o KODAI
- RLS (Row Level Security) ativo em todas as tabelas para segurança
- Fluxo de compra: dados → upload comprovante → aguardar aprovação do admin
- Admin acede ao painel em `/admin` (requer `role = 'admin'` na tabela `profiles`)
- Storage bucket `payment-proofs` (privado) para guardar comprovantes de pagamento

## Product

- Landing page estática com logo KODAI, player de vídeo e botões de login/compra
- Fluxo de compra com recolha de dados pessoais (nome, telefone, email) + upload de comprovante
- Painel do administrador para aprovar/rejeitar inscrições e gerir aulas
- Área de aulas protegida — só acessível após aprovação

## User preferences

- Interface branca com botões verdes
- Linguagem portuguesa (Angola)
- Supabase project: "Kodai" (ref: grjmugbfhunbkjyodhzu)

## Gotchas

- Para ser admin: aceder ao Supabase → tabela `profiles` → alterar `role` para `'admin'`
- O bucket `payment-proofs` deve estar criado no Supabase Storage antes de aceitar uploads
- `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` são necessários como env vars

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
