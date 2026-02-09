# 001 vs 002 仕様比較 — ネックになりうる点

**目的**: 002（AI Review MVP）を同一リポジトリで実装する際、001（GitHub Career Asset Generator）仕様との比較でネックになる部分を整理する。

---

## 1. 認証・識別子（中程度のネック）

| 項目 | 001 | 002 | ネック |
|------|-----|-----|--------|
| ユーザー識別 | `userId`（NextAuth session.user.id → Firestore users ドキュメント ID） | `actorId` / `creatorId` / `approverId` | 002 は「userId」という名前を使っていない |
| データ分離 | 全コレクションで `userId` でスコープ | intents: creatorId、approvals: approverId、agent_runs: actorId | 001 と同じ「本人だけ」にするには、002 でもセッションの userId を creatorId/actorId に渡す必要がある |
| 実装方針 | 既存: `requireAuth()` → `userId` を API に渡す | 002 API でも `getServerSession` から取得した id を creatorId/actorId/approverId にそのまま渡す | **対応可能**: 002 実装時に「session.user.id = userId = actorId」と決めておけばよい |

**将来のネック**: 002 で「Approver は他人の Intent を承認できる」「Auditor はチーム全体の Run を見る」など**ロール／スコープ**を入れると、001 にはない RBAC やテナント概念が必要になる。MVP では「本人の Run だけ」なら 001 と同じパターンでよい。

---

## 2. Firestore ルール・コレクション（中程度のネック）

| 項目 | 001 | 002 | ネック |
|------|-----|-----|--------|
| 既存ルール | users, repositories, pr-events, asset-cards, decision-logs のみ | なし（002 用コレクションに未対応） | **必須対応**: 002 用に intents, approvals, agent_runs, review_outputs, evidences, exception_events のルールを追加する必要がある |
| スコープ条件 | `resource.data.userId == request.auth.uid` | 002 data-model には userId フィールドが明示されていない | 002 ドキュメントに `userId`（または ownerId）を追加するか、creatorId/actorId を request.auth.uid と照合するルールを書く必要がある |

**推奨**: 002 の各コレクションで「所有者」を 1 フィールドに統一する（例: `userId` を追加し、creatorId/actorId と同一値で保存）。ルールは `resource.data.userId == request.auth.uid` で 001 と揃えられる。  
※ 本番で Firestore を**サーバー専用**（Admin SDK のみ）で使っている場合は、ルールは「将来のクライアント直接アクセス」用として追加すればよい。

---

## 3. PR / diff の扱い（小〜中）

| 項目 | 001 | 002 | ネック |
|------|-----|-----|--------|
| PR コンテキスト | FR-004: title, description, comments, **diff content** を ingest | diff 全文は保存しない。diffHash + prUrl + baseSHA/headSHA のみ | 001 は LLM 用に diff を保持している；002 は監査・トレサビリティ用にハッシュのみ |
| 衝突の有無 | pr-events に PR データを保存 | agent_runs に PR メタのみ | **衝突なし**: 目的が違う（001=キャリア資産生成、002=AI レビュー実行）。同じ PR から 001 は AssetCard、002 は AgentRun を別系統で扱える |
| 注意点 | 001 の diff 保存を「最小化」すると AssetCard 生成に影響 | 002 は最初から diff を保存しない | 001 の既存挙動は変えず、002 だけ diff 最小化でよい。**ネックにならない** |

---

## 4. ナビゲーション・UI（中程度のネック）

| 項目 | 001 | 002 | ネック |
|------|-----|-----|--------|
| ルート | /inbox, /library, /repositories, /export | /policy, /approvals, /exceptions, /audit（plan より） | パスは被らないが、**ダッシュボードの「顔」が 2 系統**になる |
| 懸念 | 001 ユーザーは「Inbox / Library」が主、002 は「Approvals Inbox / Exceptions / Audit」が主 | 両方あると「どの機能をメインにするか」が曖昧になる | ネックというより**設計判断**: 001 と 002 を同一アプリで提供する場合、タブ・サブメニュー・ロール別メニューなどで分ける必要がある |

**対応**: 002 実装時に「002 用レイアウト」を追加し、ヘッダーで「AssetCard（001）」と「AI Review（002）」を切り替える、など。001 既存 UI を壊さなければネックは小さい。

---

## 5. Constitution・製品の位置づけ（小〜中）

| 項目 | 001 | 002 | ネック |
|------|-----|-----|--------|
| 現在の Constitution | 旧 v1.0: キャリア資産、自動蓄積、採点しない | 現行 v2.0: Intent/Approval/AgentRun/Audit、実行ゲート、監査、採点しない | Constitution の「主役」が 002 に移っている |
| 矛盾の有無 | 001 は「採点しない」「固定スキーマ」で 002 憲法とも整合 | 002 は「監査・統制」が主で 001 は対象外ではない | **機能的な矛盾はない**。ただし「プロダクトの主目的」が 002 寄りに読める |
| ドキュメント | 001 を Legacy と明記していない | 002 が「メイン仕様」のように見える | **運用で解消**: README や APP-OVERVIEW で「001 = キャリア資産、002 = AI レビュー統制」と併記するか、001 を Legacy と明示するか決める |

---

## 6. Webhook・非同期処理（小）

| 項目 | 001 | 002 | ネック |
|------|-----|-----|--------|
| 001 Webhook | GitHub PR → ingest PREvent → Cloud Tasks → AssetCard 生成 | — | 002 は Webhook から直接動かさない |
| 002 トリガー | — | Requestor が Intent 作成 → AgentRun 作成（API） | 001 の Webhook と 002 の API は**独立**。同じリポジトリで両方動いても衝突しない |
| Stretch (PR→Intent 下書き) | PR イベントを 001 と 002 の両方で参照する場合あり | 下書き生成が 001 の ingest と同時に動く想定 | 実装時に「001 の Webhook 後に 002 下書きを生成する」など順序を決めればよい。Stretch のため現時点のネックは小さい |

---

## 7. LLM・インフラ（小）

| 項目 | 001 | 002 | ネック |
|------|-----|-----|--------|
| 用途 | PR → AssetCard（要約・構造化） | PR → Review findings（指摘・改善提案・リスク） | 同じ Vertex AI でもプロンプト・出力スキーマが違う |
| リソース | 既存 Vertex クライアント | 002 用に別サービス or 同一クライアントで別モデル/プロンプト | クォータ・コストは増えるが、**技術的な衝突はない** |

---

## まとめ：ネックの大きさと対応

| ネック | 程度 | 対応 |
|--------|------|------|
| **認証の揃え方**（userId vs actorId） | 中 | 002 では session.user.id を creatorId/actorId/approverId に渡すと決める。必要なら 002 ドキュメントに userId を追加。 |
| **Firestore ルール**（002 用コレクション未定義） | 中 | 002 用コレクションのルールを追加。所有者を userId で統一すると 001 と一貫する。 |
| **UI・ナビ**（2 系統の機能） | 中 | 002 用ルートとレイアウトを追加し、001 と 002 をタブやメニューで分ける設計にする。 |
| **Constitution・製品位置づけ**（001 が Legacy に見える） | 小 | README や概要ドキュメントで 001/002 の役割を明示する。 |
| **PR/diff の扱い** | 小 | 001 は現状のまま。002 は diff 保存しない方針でそのまま実装してよい。 |
| **Webhook・LLM** | 小 | 独立したフローなので、明確なネックなし。 |

**結論**: 001 と 002 を**同一リポジトリで両立**させるうえで、**致命的な仕様衝突はない**。ネックになりうるのは (1) Firestore ルールと所有者フィールドの追加、(2) 認証を userId に揃える取り決め、(3) UI で 001 と 002 をどう並べるかの設計、の 3 点。いずれも 002 実装時に設計で吸収できる範囲である。
