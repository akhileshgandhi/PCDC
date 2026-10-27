# PCDC frontend image: build the Vite app, then serve it with nginx.
# nginx also proxies the API paths to the backend container, so the browser
# talks to a single origin (same layout as the Vercel deployment).

FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# Leave empty to call the API on the same origin (/api/v1) through nginx.
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
