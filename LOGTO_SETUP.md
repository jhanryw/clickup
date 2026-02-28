# Configuração do LogTo

## 1. Credenciais Fornecidas

O LogTo está hospedado em: `https://clickup-logto.vodct5.easypanel.host/`

### Valores de Configuração (já preenchidos em `src/app/logto.ts`):
- **Endpoint**: `https://clickup-logto.vodct5.easypanel.host/`
- **App ID**: `vh99mdgamkufoptzjrccj`
- **App Secret**: `91VIel4wR718XwE4bZwDaCnxCBhFktws`
- **Base URL** (desenvolvimento): `http://localhost:3000`
- **Cookie Secret**: `7qnnCvzP47AskCTfnLs7cWoC6LuL5axl`

## 2. Configuração das Redirect URIs no Console LogTo

**IMPORTANTE**: Sem as redirect URIs configuradas, o login **não funcionará**.

### Passo a passo:

1. Acesse o Console LogTo:
   ```
   https://clickup-logto.vodct5.easypanel.host/console
   ```

2. Navegue para: **Applications** > seu app > **Redirect URIs**

3. Adicione as URIs conforme seu ambiente:

   **Desenvolvimento local:**
   ```
   http://localhost:3000/app/callback
   ```

   **Produção (Easypanel):**
   ```
   https://seu-dominio.com/app/callback
   ```

4. Clique em **"Save changes"**

## 3. Configuração das Post Sign-out Redirect URIs

1. No mesmo console, vá para: **Post Sign-out Redirect URIs**

2. Adicione:

   **Desenvolvimento local:**
   ```
   http://localhost:3000/login
   ```

   **Produção (Easypanel):**
   ```
   https://seu-dominio.com/login
   ```

3. Clique em **"Save changes"**

## 4. Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env.local`:

```bash
cp .env.example .env.local
```

As credenciais do LogTo já estão preenchidas. Você só precisa preencher:
- `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXTAUTH_URL` (se mudar da porta padrão)

## 5. Fluxo de Autenticação

```
1. Usuário acessa http://localhost:3000/
2. Middleware redireciona para /login (não autenticado)
3. Usuário clica no botão "Entrar com conta corporativa"
4. SignInButton chama Server Action que redireciona para LogTo
5. LogTo realiza autenticação (username/password ou SSO)
6. LogTo redireciona para http://localhost:3000/app/callback
7. Callback route sincroniza perfil no Supabase
8. Redireciona para /app/page (dashboard)
```

## 6. Teste Rápido

1. `npm install`
2. `npm run dev`
3. Acesse `http://localhost:3000/login`
4. Clique em "Entrar com conta corporativa"
5. Complete o login no LogTo
6. Você deve ser redirecionado para o dashboard

## Troubleshooting

### Erro: "Redirect URI não permitido"
- Verifique se a URI está configurada corretamente no Console LogTo
- Certifique-se que clicou em "Save changes"
- Limpe cookies do navegador

### Erro: "Invalid client"
- Verifique se o App ID e App Secret estão corretos
- Confirme que estão em `src/app/logto.ts`

### O usuário está preso em loop de login
- Verifique se o middleware não está interceptando `/app/callback`
- Confirme que `/app/callback` está na lista de rotas públicas em `src/middleware.ts`

## Recursos Adicionais

- [Documentação do LogTo](https://logto.io/docs)
- [LogTo SDK para Next.js](https://logto.io/docs/sdk/next)
