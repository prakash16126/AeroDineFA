# syntax=docker/dockerfile:1

FROM node:22-slim AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-slim AS final
WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY scripts/serve.js ./scripts/serve.js

EXPOSE 3000
CMD ["node", "scripts/serve.js"]
