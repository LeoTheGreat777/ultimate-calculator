# 1. The site is built from public/ by tools/build.mjs (the scripts joined and minified), as for GitHub Pages.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY tools/build.mjs tools/
COPY public/ public/
RUN node tools/build.mjs

# 2. nginx serves only the built site, so nothing else in the repo is ever served.
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build/ /usr/share/nginx/html/

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1/api/health || exit 1
