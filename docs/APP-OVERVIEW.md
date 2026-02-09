# WorkLog アプリ 概要と目的

## 概要

**WorkLog** は、GitHub 上の開発活動（主に Pull Request）を**評価に使えるキャリア資産（AssetCard）**に自動で変換する Web アプリです。

- ユーザーは GitHub OAuth でサインインし、監視したいリポジトリを接続する。
- 接続したリポジトリで PR が作成・更新・マージされると、GitHub Webhook でイベントが届く。
- バックエンドが PR の内容と diff を取得し、LLM（Vertex AI / Gemini）で要約・構造化して **AssetCard** を生成する。
- 生成された AssetCard は**受信トレイ**に「保留」として届く。ユーザーが承認・編集・却下する。
- 承認または編集した AssetCard は**ライブラリ**に蓄積され、**README（Markdown）** や **履歴書用の箇条書き** 形式でエクスポートできる。

つまり、「PR を書く → 自動でキャリア資産のたねができる → 確認して承認 → ポートフォリオや履歴書に使う」という一連の流れを一つのアプリでまかないます。

---

## 目的

1. **開発活動の資産化**  
   日々の PR を、評価・面接・ポートフォリオでそのまま使える形に**自動で**まとめる。手書きのメモや事後振り返りに頼りすぎず、開発ログからキャリア資産を蓄積する。

2. **評価・採用で使いやすい形式**  
   AssetCard は「タイトル・説明・インパクト・技術・貢献内容・指標」など固定スキーマで統一。README や履歴書用の文言として export できるため、第三者（採用側・評価者）が理解しやすい形式で提示できる。

3. **人的負荷の削減**  
   PR ごとに手動で要約や履歴書用の一文を書く手間を減らし、**承認・軽い編集**に集中できるようにする。生成は非同期（Webhook → Cloud Tasks）のため、ユーザー操作をブロックしない。

4. **データの一貫性と重複防止**  
   同一 PR イベントからは 1 つの AssetCard のみ生成（idempotency）。ユーザーごとにデータを分離し、承認・却下・編集の意思決定をログに残す。

---

## 主な機能（ユーザー視点）

| 機能 | 説明 |
|------|------|
| **GitHub でサインイン** | NextAuth による GitHub OAuth。セッションでダッシュボードにアクセス。 |
| **リポジトリの接続・切断** | 監視対象の GitHub リポジトリを登録。接続したリポジトリの PR イベントのみ処理。 |
| **受信トレイ** | 未承認の AssetCard を一覧表示。承認・編集・却下が可能。スキーマ違反などは「要確認」として表示。 |
| **ライブラリ** | 承認・編集済みの AssetCard を一覧。ここからエクスポート対象を選ぶ。 |
| **エクスポート** | 選択した AssetCard を README（Markdown）または履歴書用（箇条書き）で出力。コピー・ダウンロードに対応。 |
| **言語切替** | 日本語 / 英語の UI 切替（localStorage で選択を保持）。 |

---

## 技術的な位置づけ

- **フロント**: Next.js（App Router）、認証は NextAuth、表示言語は Context + 辞書で i18n。
- **バックエンド**: Next.js API Routes（Webhook 受信、REST API）、Cloud Tasks による非同期ジョブ（PR Event Processor → Asset Generator）。
- **データ**: Firestore（User / Repository / PREvent / AssetCard 等）。
- **外部連携**: GitHub（OAuth・Webhook・API）、Vertex AI（Gemini）で LLM 生成。

詳細な処理フローやデータモデルは [APP-ARCHITECTURE-MERMAID.md](./APP-ARCHITECTURE-MERMAID.md) を参照してください。
