# Backend NestJS — Parking IA API
# ---- Build stage ----
FROM node:20-alpine AS build
WORKDIR /app
# Instala TODAS las dependencias (incluye dev) para poder compilar
COPY package.json package-lock.json ./
RUN npm ci
# Compila y luego elimina las dependencias de desarrollo del mismo node_modules
COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

# ---- Runtime stage ----
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
# Reutiliza el node_modules ya podado (evita un segundo npm install)
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
# Ejecuta como usuario sin privilegios (el usuario 'node' ya existe en la imagen)
USER node
EXPOSE 3000
# Healthcheck sin dependencias externas (Alpine no trae curl)
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://localhost:'+(process.env.PORT||3000)+'/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"
CMD ["node", "dist/main"]
