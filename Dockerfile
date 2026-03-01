FROM node:22-alpine

WORKDIR /app

# Dependências
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

COPY . .

# Build args do Easypanel → disponíveis no build
ARG SUPABASE_URL
ARG SUPABASE_SERVICE_ROLE_KEY
ARG NEXT_PUBLIC_LOGTO_ENDPOINT
ARG NEXT_PUBLIC_LOGTO_APP_ID
ARG LOGTO_APP_SECRET
ARG LOGTO_COOKIE_SECRET
ARG NEXTAUTH_URL
ARG NODE_ENV=production
ARG NEXT_TELEMETRY_DISABLED=1

# Converter ARG → ENV para que fiquem disponíveis em runtime
ENV SUPABASE_URL=$SUPABASE_URL
ENV SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY
ENV NEXT_PUBLIC_LOGTO_ENDPOINT=$NEXT_PUBLIC_LOGTO_ENDPOINT
ENV NEXT_PUBLIC_LOGTO_APP_ID=$NEXT_PUBLIC_LOGTO_APP_ID
ENV LOGTO_APP_SECRET=$LOGTO_APP_SECRET
ENV LOGTO_COOKIE_SECRET=$LOGTO_COOKIE_SECRET
ENV NEXTAUTH_URL=$NEXTAUTH_URL
ENV NODE_ENV=$NODE_ENV
ENV NEXT_TELEMETRY_DISABLED=$NEXT_TELEMETRY_DISABLED

RUN npm run build

# Standalone precisa dos assets estáticos copiados manualmente
RUN cp -r .next/static .next/standalone/.next/static
RUN if [ -d public ]; then cp -r public .next/standalone/public; fi

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

EXPOSE 3000

# Standalone mode: usar o servidor Node.js direto
WORKDIR /app/.next/standalone
CMD ["node", "server.js"]
