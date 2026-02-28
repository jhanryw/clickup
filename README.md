# Sistema Interno de Gestão de Tarefas

Sistema inspirado no ClickUp para gestão de entregas de clientes com organização hierárquica (Workspace → Space → Folder → List → Task) e controle de acesso granular.

## Stack Técnica

- **Frontend**: Next.js 14+ (App Router)
- **Database**: Supabase (PostgreSQL com RLS)
- **Autenticação**: LogTo
- **Email/Marketing**: Listmonk
- **UI**: Tailwind CSS + Shadcn/UI
- **Validação**: Zod
- **Tipagem**: TypeScript

## Início Rápido

### 1. Instalação de Dependências

```bash
npm install
```

### 2. Configurar Variáveis de Ambiente

```bash
cp .env.example .env.local
```

Preencha as variáveis conforme necessário:
- Supabase: URL e chaves
- LogTo: Credenciais e redirects URI
- Listmonk: URL e credenciais

### 3. Configurar o LogTo

**IMPORTANTE**: Leia [`LOGTO_SETUP.md`](./LOGTO_SETUP.md) para configurar as Redirect URIs no Console LogTo.

As credenciais principais já estão em `src/app/logto.ts`, mas você precisa:
1. Adicionar `http://localhost:3000/app/callback` em Redirect URIs
2. Adicionar `http://localhost:3000/login` em Post Sign-out Redirect URIs

### 4. Migrações do Supabase (Desenvolvimento Local)

Se estiver usando Supabase localmente:

```bash
supabase start
supabase db push
```

Para produção (Easypanel), aplique as migrações via Dashboard Supabase.

### 5. Rodar o Projeto

```bash
npm run dev
```

Acesse `http://localhost:3000/login`

## Estrutura do Projeto

```
src/
├── app/
│   ├── (auth)/          # Rotas de autenticação
│   │   ├── login/       # Página de login
│   │   └── callback/    # Callback do LogTo
│   ├── (dashboard)/     # Rotas protegidas do dashboard
│   ├── api/
│   │   ├── logto/       # Handlers do SDK LogTo
│   │   ├── webhooks/    # Webhooks de entrada
│   │   └── forms/       # Submissão de formulários públicos
│   ├── globals.css
│   ├── layout.tsx
│   └── logto.ts         # Configuração do LogTo
├── components/
│   └── auth/            # Componentes de autenticação
├── lib/
│   ├── supabase/        # Clientes Supabase (server/client)
│   ├── logto/           # Helpers LogTo (server-only)
│   ├── permissions.ts   # Guards de permissão
│   └── validators/      # Schemas Zod
├── types/
│   └── database.ts      # Tipos TypeScript do schema
└── middleware.ts        # Proteção de rotas

supabase/
├── migrations/
│   ├── 001_schema.sql       # Schema completo (368 linhas)
│   ├── 002_rls.sql          # Políticas de RLS (419 linhas)
│   └── 003_functions.sql    # RPCs e triggers (157 linhas)
└── config.toml              # Config local CLI
```

## Segurança

### URLs Públicas vs Internas

| Tipo | Desenvolvimento | Produção (Easypanel) |
|------|---|---|
| Supabase (server) | `http://localhost:54321` | `http://supabase-kong:8000` |
| Supabase (cliente) | `http://localhost:54321` | `https://supabase.dominio.com` |
| LogTo (server) | `http://localhost:3001` | `https://clickup-logto.vodct5.easypanel.host` |
| LogTo (cliente) | `http://localhost:3001` | `https://clickup-logto.vodct5.easypanel.host` |

### Row Level Security (RLS)

- Todas as tabelas têm RLS habilitado
- Políticas usam `current_app_user()` para identificar usuário
- Server Actions usam `service_role_key` (bypassa RLS)
- Permissões verificadas em `src/lib/permissions.ts`

### Credenciais de API

**NUNCA são expostas ao cliente**:
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- `LOGTO_APP_SECRET` (server-only)
- `LISTMONK_PASSWORD` (server-only)

## Próximos Passos

1. **Criar User Roles no LogTo**: Configure roles adicionais conforme necessário para RBAC
2. **Implementar Server Actions**: Para CRUD de tasks, spaces, folders, etc.
3. **Componentes UI**: Integre Shadcn/UI para forms, dialogs, etc.
4. **Listmonk Integration**: Notificações de task completion e newsletters
5. **Webhook Outgoing**: Disparar eventos quando tarefas são criadas/concluídas

## Desenvolvimento

### Comandos Disponíveis

```bash
npm run dev          # Inicia dev server (Turbopack)
npm run build        # Build para produção
npm start            # Inicia servidor de produção
npm run lint         # Lint com ESLint
npm run typecheck    # TypeScript type check
npm run db:migrate   # Aplica migrações Supabase
npm run db:reset     # Reset local Supabase
npm run db:types     # Regenera tipos do schema
```

### Padrões de Código

- **Server Components**: Padrão; use para lógica de negócio
- **Client Components**: Apenas para interatividade (botões, forms)
- **Server Actions**: Para mutações de dados (sempre com validação Zod)
- **Middleware**: Proteção de rotas e contexto de usuário
- **RLS Policies**: Defesa em profundidade (não é principal)

## Documentação

- [`LOGTO_SETUP.md`](./LOGTO_SETUP.md) — Configuração detalhada do LogTo
- `supabase/migrations/*.sql` — Schema e políticas de segurança
- `src/types/database.ts` — Definição de tipos

## Troubleshooting

### Problema: "NEXT_PUBLIC_SUPABASE_URL não está definida"
- Copie `.env.example` para `.env.local`
- Preencha as variáveis `NEXT_PUBLIC_*`

### Problema: Erro "Redirect URI não permitido" no LogTo
- Veja [LOGTO_SETUP.md](./LOGTO_SETUP.md)

### Problema: Erro de permissão ao acessar dados
- Verifique se o usuário está em `organization_members`
- Confirme RLS policies em `supabase/migrations/002_rls.sql`

## Suporte

Para dúvidas sobre:
- **LogTo**: Veja [LOGTO_SETUP.md](./LOGTO_SETUP.md)
- **Supabase**: Consulte `supabase/migrations/`
- **Next.js App Router**: Veja documentação oficial
