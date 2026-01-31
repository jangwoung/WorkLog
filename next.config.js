/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // Cloud Run 用に単一 Node プロセスで起動する出力にする
  // Next.js 14 + eslint-config-next で "Converting circular structure to JSON" が出るためビルド時は ESLint をスキップ。lint は `next lint` で実行可能。
  eslint: { ignoreDuringBuilds: true },
}

module.exports = nextConfig
