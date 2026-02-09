# WorkLog アプリ アーキテクチャ（Mermaid）

## 1. 全体の流れ（PR → AssetCard → ユーザー）

```mermaid
flowchart LR
  subgraph External["外部"]
    GitHub[GitHub PR]
  end

  subgraph Frontend["フロントエンド (Next.js)"]
    Login[ログイン]
    Inbox[受信トレイ]
    Library[ライブラリ]
    Export[エクスポート]
    Repos[リポジトリ管理]
  end

  subgraph Backend["バックエンド"]
    Webhook["/api/webhooks/github"]
    PREventProc["PR Event Processor\n(Cloud Tasks)"]
    AssetGen["Asset Generator\n(Cloud Tasks)"]
  end

  subgraph Data["データ"]
    Firestore[(Firestore)]
  end

  GitHub -->|PR イベント| Webhook
  Webhook -->|ingest PREvent| Firestore
  Webhook -->|enqueue| PREventProc
  PREventProc -->|PR + diff 取得・処理| PREventProc
  PREventProc -->|enqueue| AssetGen
  AssetGen -->|Vertex AI LLM| AssetGen
  AssetGen -->|AssetCard 作成| Firestore

  Login -->|認証| Frontend
  Inbox -->|GET /api/assets/inbox| Firestore
  Inbox -->|承認/編集/却下| Firestore
  Library -->|GET /api/assets/library| Firestore
  Export -->|GET library + POST export| Firestore
  Repos -->|接続/切断| Firestore
  Firestore -.->|読み書き| Backend
  Firestore -.->|読み書き| Frontend
```

## 2. Webhook → AssetCard 生成のシーケンス

```mermaid
sequenceDiagram
  participant GitHub as GitHub
  participant Webhook as POST /api/webhooks/github
  participant Firestore as Firestore
  participant CloudTasks as Cloud Tasks
  participant PREventProc as PR Event Processor
  participant AssetGen as Asset Generator
  participant Vertex as Vertex AI (Gemini)

  GitHub->>Webhook: pull_request イベント (opened/synchronize/merged 等)
  Webhook->>Webhook: 署名検証・リポジトリ接続確認
  Webhook->>Firestore: ingest PREvent（idempotent）
  Webhook->>CloudTasks: enqueue pr-event-processor
  Webhook-->>GitHub: 200 OK（即返却）

  CloudTasks->>PREventProc: POST { prEventId, userId, repositoryId }
  PREventProc->>Firestore: PREvent 取得
  PREventProc->>PREventProc: GitHub API で PR + diff 取得・処理
  PREventProc->>Firestore: PREvent 更新（diff 等）
  PREventProc->>CloudTasks: enqueue asset-generator

  CloudTasks->>AssetGen: POST { prEventId, userId, repositoryId }
  AssetGen->>Firestore: PREvent 取得
  AssetGen->>Vertex: LLM で要約・構造化（Gemini）
  AssetGen->>Firestore: AssetCard 作成（status: pending / flagged）
  AssetGen-->>CloudTasks: 200
```

## 3. ユーザー操作フロー

```mermaid
flowchart TB
  subgraph Auth["認証"]
    A1[ログイン画面] -->|GitHub OAuth| A2[NextAuth]
    A2 -->|セッション| A3[ダッシュボード]
  end

  subgraph Dashboard["ダッシュボード"]
    B1[受信トレイ] -->|承認| B2[AssetCard → ライブラリ]
    B1 -->|編集して保存| B2
    B1 -->|却下| B3[AssetCard 削除]
    B4[ライブラリ] --> B5[エクスポート]
    B5 -->|README or 履歴書形式| B6[コピー / ダウンロード]
    B7[リポジトリ] -->|接続| B8[Firestore に Repository 登録]
    B7 -->|切断| B9[接続解除]
  end

  A3 --> B1
  A3 --> B4
  A3 --> B7
  A3 --> B5
```

## 4. 画面と API の対応

```mermaid
flowchart LR
  subgraph Pages["ページ"]
    P1["/login"]
    P2["/inbox"]
    P3["/library"]
    P4["/repositories"]
    P5["/export"]
  end

  subgraph APIs["API"]
    W["POST /api/webhooks/github"]
    I["GET /api/assets/inbox"]
    L["GET /api/assets/library"]
    App["POST /api/assets/.../approve"]
    Edit["PUT /api/assets/.../edit"]
    Exp["POST /api/export"]
    Repo["GET/POST /api/repositories"]
  end

  P1 -->|NextAuth| W
  P2 --> I
  P2 --> App
  P2 --> Edit
  P3 --> L
  P4 --> Repo
  P5 --> L
  P5 --> Exp
  GitHub[GitHub Webhook] --> W
```

## 5. データモデル（概念）

```mermaid
erDiagram
  User ||--o{ Repository : "owns"
  User ||--o{ PREvent : "triggers"
  User ||--o{ AssetCard : "owns"
  Repository ||--o{ PREvent : "receives"
  PREvent ||--o| AssetCard : "generates"

  User {
    string id
  }

  Repository {
    string repositoryId
    string fullName
    string connectionStatus
    string userId
  }

  PREvent {
    string prEventId
    string repositoryId
    string userId
    string processingStatus
    string githubEventId
  }

  AssetCard {
    string assetCardId
    string userId
    string status "pending|approved|rejected|flagged"
    string title
    string description
  }
```

---

- **Webhook**: PR イベントを受信後、即 200 を返し、処理は Cloud Tasks に委譲。
- **PR Event Processor**: PR と diff を取得し、Asset Generator 用タスクを enqueue。
- **Asset Generator**: Vertex AI（Gemini）で PR から AssetCard を生成し Firestore に保存。
- **フロント**: 受信トレイで承認/編集/却下、ライブラリで一覧・エクスポート、リポジトリで接続管理。
