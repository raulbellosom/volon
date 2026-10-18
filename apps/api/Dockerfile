FROM node:22.23.3-bookworm-slim AS backend
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
RUN npm install --global pnpm@10.15.1
WORKDIR /workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/pricing/package.json packages/pricing/package.json
COPY packages/branding/package.json packages/branding/package.json
RUN pnpm install --frozen-lockfile
COPY prisma.config.ts ./
COPY prisma ./prisma
RUN pnpm exec prisma generate
COPY tsconfig*.json ./
COPY apps/api/src ./apps/api/src
COPY packages ./packages
RUN pnpm typecheck
USER node
EXPOSE 3100
CMD ["node", "--experimental-strip-types", "apps/api/src/main.ts"]
