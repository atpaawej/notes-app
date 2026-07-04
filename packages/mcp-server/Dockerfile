FROM node:22-slim AS base
WORKDIR /app

ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@11.6.0 --activate

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/db ./packages/db
COPY packages/mcp-server ./packages/mcp-server

RUN pnpm install --frozen-lockfile

RUN pnpm --filter @notes/mcp-server build

ENV MCP_PORT=3001
EXPOSE 3001

CMD ["node", "packages/mcp-server/dist/index.js"]