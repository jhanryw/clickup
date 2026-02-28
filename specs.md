# Technical Specifications (Specs)

## 1. Arquitetura de Banco de Dados (Supabase)
- **RLS (Row Level Security):** Todas as tabelas devem ter políticas de segurança habilitadas. O acesso deve ser validado pelo `user_id` e pelo `role` vindo do LogTo.
- **Tabelas Principais:** `profiles`, `spaces`, `folders`, `lists`, `tasks`, `webhooks_config`, `forms`.

## 2. Autenticação e Segurança (LogTo)
- Utilizar o LogTo para gerenciar **Custom Data** onde armazenaremos o `role` do usuário.
- Implementar Middlewares para validar o JWT em cada rota.
- **Segurança:** Nenhuma credencial (API Keys) deve ser exposta no frontend. Todas as chamadas sensíveis devem passar por Server Actions ou API Routes.

## 3. Integrações
- **Webhooks:** Implementar uma fila de processamento (Edge Functions ou Background Jobs) para garantir a entrega dos webhooks de saída.
- **Listmonk:** Utilizar a API do Listmonk para inscrever novos clientes em listas de automação assim que um projeto (Folder) for criado.

## 4. Padronização de Código
- Tipagem rigorosa com TypeScript.
- Uso de Zod para validação de esquemas de formulários e payloads de webhook.