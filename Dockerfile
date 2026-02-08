# Cloud Run 向け Next.js イメージ（standalone 出力）
# https://nextjs.org/docs/advanced-features/output-file-tracing

FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
# ピア依存競合を避ける（next build では ESLint をスキップ）
RUN npm ci --legacy-peer-deps

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p public
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# standalone で含まれない場合があるため、Google Cloud 系パッケージを明示コピー
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@google-cloud/tasks ./node_modules/@google-cloud/tasks
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@google-cloud/vertexai ./node_modules/@google-cloud/vertexai

USER nextjs
EXPOSE 8080
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
