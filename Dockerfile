# Stage 1: Build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx tsc

# Stage 2: Run
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY --from=builder /app/dist ./dist
COPY strategies.json ./strategies.json

# Note: .env is NOT copied here because:
# 1. It's git-ignored (for security)
# 2. Railway injects environment variables directly
# The app reads from process.env which Railway populates

CMD ["node", "dist/bot.js"]
