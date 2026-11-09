# syntax=docker/dockerfile:1
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json vite.config.ts index.html ./
COPY src ./src
COPY tests ./tests
RUN npm test && npm run build
ARG RELEASE=local
RUN RELEASE="$RELEASE" node -e "require('fs').writeFileSync('dist/release.json', JSON.stringify({release:process.env.RELEASE}))"

FROM nginx:stable-alpine AS runtime
COPY deploy/app.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=5s --timeout=3s --start-period=5s --retries=6 CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1
