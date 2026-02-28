# LogTo Local Development — Guia Prático

## Problema
- **LogTo está em**: `https://clickup-logto.vodct5.easypanel.host/` (VPS)
- **Seu app está em**: `http://localhost:3000` (seu PC)
- **LogTo não pode acessar**: `http://localhost:3000/app/callback` (localhost não é acessível de fora)

## Solução: Usar Ngrok para Tunnel Local

Ngrok cria um URL público que aponta para seu `localhost:3000`, permitindo que o LogTo acesse seu callback.

### Setup Rápido (Recomendado)

#### 1. Instalar Ngrok

**macOS (usando Homebrew):**
```bash
brew install ngrok
```

**Outros SOs:**
Baixe em: https://ngrok.com/download

#### 2. Autenticar Ngrok (uma única vez)

```bash
ngrok config add-authtoken seu-token-aqui
```

(Pega seu token em: https://dashboard.ngrok.com/auth/your-authtoken)

#### 3. Iniciar Ngrok em outro terminal

```bash
ngrok http 3000
```

**Output esperado:**
```
Session Status                online
Account                       seu-email@email.com
Version                       3.x.x
Region                        us (United States)
Latency                       xxx ms
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123xyz.ngrok.io -> http://localhost:3000

Connections                   ttl    opn   rt1   rt5   p50
                              0      0     0.00  0.00  0.00
```

**URL pública**: `https://abc123xyz.ngrok.io` ✅

#### 4. Atualizar .env.local

```env
# Copie a URL do ngrok aqui (muda a cada execução)
NEXTAUTH_URL=https://abc123xyz.ngrok.io
```

#### 5. Configurar no Console LogTo

1. Acesse: `https://clickup-logto.vodct5.easypanel.host/console`
2. **Applications** → seu app → **Redirect URIs**
   - Adicione: `https://abc123xyz.ngrok.io/app/callback`
3. **Post Sign-out Redirect URIs**
   - Adicione: `https://abc123xyz.ngrok.io/login`
4. Clique **"Save changes"**

#### 6. Testar Login

```bash
# Terminal 1: Ngrok rodando
ngrok http 3000

# Terminal 2: Next.js dev server rodando
npm run dev

# Terminal 3: Acessar a URL do ngrok
open https://abc123xyz.ngrok.io/login
```

**Fluxo esperado:**
1. Acessa a URL do ngrok
2. Clica em "Entrar"
3. Redireciona para LogTo (HTTPS)
4. Faz login
5. LogTo redireciona para `https://abc123xyz.ngrok.io/app/callback`
6. Seu app sincroniza perfil no Supabase
7. Redireciona para dashboard ✅

---

## Alternativa: Arquivo de Hosts Local

Se o LogTo também estivesse rodando no seu PC, poderia usar `/etc/hosts`:

```
127.0.0.1 logto.local
127.0.0.1 clickup.local
```

E configurar:
```
NEXTAUTH_URL=http://clickup.local:3000
```

**Mas como LogTo está na VPS, isso não funciona.**

---

## Troubleshooting

### Erro: "Redirect URI não permitido"
- ✅ Salve as mudanças no Console LogTo
- ✅ A URL do ngrok está correta em `.env.local`
- ✅ Limpe cookies do navegador

### Erro: "Conexão recusada"
- ✅ Confirme que ngrok está rodando
- ✅ Confirme que Next.js está rodando na porta 3000
- ✅ A URL do ngrok está acessível (teste no navegador)

### Ngrok URL muda cada execução
- **Esperado**: URL gratuita muda sempre
- **Solução**: Obtenha um domínio permanente (upgrade ngrok)
- **Ou**: Atualize `.env.local` a cada execução

---

## Para Produção (Easypanel)

Uma vez que fizer deploy no Easypanel, **não precisa mais de ngrok**:

```env
NEXTAUTH_URL=https://seu-dominio.com
```

E no LogTo:
- **Redirect URI**: `https://seu-dominio.com/app/callback`
- **Post Sign-out**: `https://seu-dominio.com/login`

Tudo funciona normalmente (VPS → VPS).

---

## Scripts Práticos

**Salve em `scripts/start-dev.sh`:**

```bash
#!/bin/bash

# Pega a URL do ngrok
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[0].public_url')

echo "🚀 Ngrok URL: $NGROK_URL"
echo "📝 Atualize NEXTAUTH_URL em .env.local:"
echo "   NEXTAUTH_URL=$NGROK_URL"

# Inicia Next.js
npm run dev
```

**Use:**
```bash
chmod +x scripts/start-dev.sh
./scripts/start-dev.sh
```
