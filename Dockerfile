# --- build: install exact dependencies and produce dist/ ---
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# --- serve: Caddy with only the static output ---
FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
RUN caddy fmt --overwrite /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv/dist
# Railway injects PORT; the Caddyfile falls back to 3000 locally.
EXPOSE 3000
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
