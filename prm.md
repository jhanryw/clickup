# PRD - Sistema de Gerenciamento de Tarefas (Clone ClickUp)

## 1. Objetivo
Criar uma plataforma interna para gestão de entregas de clientes, permitindo organização hierárquica, controle de acesso granular (RBAC) e automações via webhooks.

## 2. Hierarquia de Dados
O sistema deve seguir obrigatoriamente esta estrutura:
- **Organização (Tenant):** Nível máximo.
- **Espaços (Spaces):** Grandes áreas (ex: Marketing, Dev).
- **Pastas (Folders):** Agrupadores de listas.
- **Listas (Lists):** Conjunto de tarefas.
- **Tarefas (Tasks):** Unidade mínima de trabalho.

## 3. Funcionalidades Principais
- **Gestão de Tarefas:** CRUD completo, status customizáveis, responsáveis e datas.
- **Controle de Acesso (RBAC):** Integração com LogTo para definir quem pode ver quais Pastas ou Listas.
- **Webhooks:** - **Saída:** Disparar payload JSON quando uma tarefa for concluída ou criada.
    - **Entrada:** Endpoint para criar tarefas via requisições externas.
- **Formulários Nativos:** Gerador de formulários públicos que criam tarefas automaticamente em listas específicas.

## 4. Stack Técnica
- **Frontend:** Next.js 14+ (App Router), Tailwind CSS, Shadcn/UI.
- **Backend/Banco:** Supabase (PostgreSQL, Realtime para updates de tarefas).
- **Autenticação:** LogTo (para gestão de permissões e usuários).
- **E-mail/Marketing:** Listmonk (integração para notificações e newsletters internas).

## 5. Visualizações de Tarefas
O sistema deve permitir alternar entre:
- **List View:** Visão clássica detalhada.
- **Kanban Board:** Arrastar tarefas entre colunas de status.
- **Calendar View:** Visualização de prazos e entregas em um calendário mensal/semanal.

## 6. Automação (Webhooks)
- **Saída:** Trigger ao alterar status (ex: enviar para o Slack do cliente).
- **Entrada:** Formulário público para clientes criarem tickets sem login.