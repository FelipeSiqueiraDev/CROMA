# O CRONA inteiro numa imagem: o servidor, a interface compilada e toda a arte.
# Quem sobe é o docker-compose.yml (`npm run crona`), junto com o banco.

# ---------- montagem: instala tudo e compila a interface (a arte vai junto, em client/dist/arte)
FROM node:24-alpine AS montagem
WORKDIR /app
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci --no-audit --no-fund
COPY tsconfig.base.json ./
COPY shared shared
COPY server server
COPY client client
RUN npm run build
# a arte mais leve para quem joga pelo link: uma cópia em WebP de cada PNG (o servidor escolhe)
COPY scripts/webp.mjs scripts/
RUN npm i --no-save --no-audit --no-fund sharp && node scripts/webp.mjs client/dist/arte

# ---------- o que roda: o servidor (tsx) servindo a interface e a arte
FROM node:24-alpine
RUN apk add --no-cache tzdata
ENV TZ=America/Sao_Paulo NODE_ENV=production
WORKDIR /app
COPY --from=montagem /app/package.json ./
COPY --from=montagem /app/node_modules node_modules
COPY --from=montagem /app/shared shared
COPY --from=montagem /app/server server
COPY --from=montagem /app/client/package.json client/
COPY --from=montagem /app/client/dist client/dist
# os arquivos enviados pelo jogo (folhas, retratos) e as cópias do banco ficam no volume
VOLUME /app/server/data
EXPOSE 3001 3002
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=5 CMD wget -qO- http://127.0.0.1:3001/api/health || exit 1
CMD ["node_modules/.bin/tsx", "server/src/index.ts", "--prod"]
