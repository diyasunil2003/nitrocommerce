# --- deps + build stage ---
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

# --- runtime stage ---
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=productionvs
COPY --from=build /app ./
EXPOSE 3000
CMD ["npm", "start"]
