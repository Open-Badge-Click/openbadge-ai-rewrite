FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

# Install dependencies first to take advantage of layer caching
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY . .

USER node

ENV PORT=3033
EXPOSE 3033

CMD ["node", "index.js"]
