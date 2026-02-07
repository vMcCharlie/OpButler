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
COPY .env .env

# Create empty strategies.json if valid JSON doesn't exist (handled by code logic usually, but good to have)
# We copy existing one.

CMD ["node", "dist/bot.js"]
