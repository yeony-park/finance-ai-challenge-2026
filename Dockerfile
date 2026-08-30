FROM node:22-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Development uses only the files needed to run the Next application.  Do not
# broaden this list to COPY the repository: the repository contains private
# archives and legacy datasets that must never enter an image.
FROM base AS development
COPY package.json package-lock.json ./
RUN npm ci
COPY app ./app
COPY components ./components
COPY lib ./lib
COPY public ./public
COPY styles ./styles
COPY data/synthetic ./data/synthetic
COPY data/art/dart-filing-manifest.json ./data/art/dart-filing-manifest.json
COPY next.config.ts next-env.d.ts tsconfig.json ./
COPY eslint.config.mjs ./
EXPOSE 3000
CMD ["npm", "run", "dev"]

# The builder has the same explicit source boundary as development.  In
# particular, no whole-context COPY is allowed here.
FROM base AS builder
COPY package.json package-lock.json ./
RUN npm ci
COPY app ./app
COPY components ./components
COPY lib ./lib
COPY public ./public
COPY styles ./styles
COPY data/synthetic ./data/synthetic
COPY data/art/dart-filing-manifest.json ./data/art/dart-filing-manifest.json
COPY next.config.ts next-env.d.ts tsconfig.json ./
COPY eslint.config.mjs ./
COPY scripts/sanitize-standalone-env.mjs ./scripts/sanitize-standalone-env.mjs
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
COPY --from=builder /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
# Keep the two explicitly approved data paths available to server-only code.
COPY --from=builder --chown=node:node /app/data/synthetic ./data/synthetic
COPY --from=builder --chown=node:node /app/data/art/dart-filing-manifest.json ./data/art/dart-filing-manifest.json
USER node
EXPOSE 3000
CMD ["node", "server.js"]
