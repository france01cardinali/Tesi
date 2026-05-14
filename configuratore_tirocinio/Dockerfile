# syntax=docker/dockerfile:1

# Stage 1: install dipendenze una sola volta (cache-friendly).
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund

# Stage 2: build Angular production.
FROM deps AS build
WORKDIR /app
COPY . .
RUN npm run build

# Stage 3: runtime minimale Nginx con asset statici.
FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/configuratore_tirocinio/browser /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
