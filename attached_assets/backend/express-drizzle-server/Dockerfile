FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN npm i --legacy-peer-deps || true
COPY . .
RUN npm run build || true
EXPOSE 3001
CMD ["npm", "run", "dev"]
