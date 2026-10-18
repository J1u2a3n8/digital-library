# Etapa 1: build del frontend con Node 24
FROM node:24-alpine AS build
WORKDIR /web

COPY web/package.json web/package-lock.json ./
RUN npm ci

COPY web/ ./
RUN npm run build

# Etapa 2: Nginx sirve los archivos estáticos y hace proxy de /api
FROM nginx:1.28-alpine AS runtime

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /web/dist /usr/share/nginx/html

EXPOSE 80
