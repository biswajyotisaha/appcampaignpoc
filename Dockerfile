# Stage 1: Build backend
FROM node:20-alpine AS backend-builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Stage 2: Build frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/web
COPY web/package.json web/package-lock.json* ./
RUN npm install
COPY web/ ./
RUN npm run build

# Stage 3: Production
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
RUN npm install --omit=dev && npm cache clean --force
COPY --from=backend-builder /app/dist ./dist
COPY --from=frontend-builder /app/web/dist ./web-dist
EXPOSE 3000
USER node
CMD ["node", "dist/index.js"]
