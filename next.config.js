/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // Cloud Run 用に単一 Node プロセスで起動する出力にする
  // Next.js 16 では eslint オプションは next.config.js では非サポート。lint は `next lint` で実行。
}

module.exports = nextConfig
