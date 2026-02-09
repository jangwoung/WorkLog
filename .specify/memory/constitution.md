<!--
Sync Impact Report:
Version change: 1.0.0 → 2.0.0 (MAJOR: principles and scope redefined for AgentRun/AI Review MVP)
Modified principles: Core Principles I–VI (WorkLog career-asset) → P-01–P-05 (execution gate, approval, audit, minimization, no scoring)
Added sections: Glossary, RACI, Workflows (UC-1/2/3), Implementation Guardrails (G-01–G-04), Deliverables (D-01–D-04), Decision Priority, Acceptance Gates, KPI, Implementation Order, Out of Scope
Removed sections: Previous Core Value, Role of AI, Product Philosophy, UX Principles, Technical Constraints, Non-goals (replaced by new principles)
Templates requiring updates:
  ✅ plan-template.md – Constitution Check updated to P-01–P-05 and execution/audit gates
  ✅ spec-template.md – No structural change (generic placeholders retained)
  ✅ tasks-template.md – No structural change (task categorization remains generic)
Follow-up TODOs: None
-->

# SpecKit Constitution — AgentRun（AIレビュー：PR解析）MVP

## 0. このConstitutionの目的

本Constitutionは、AIレビュー（PR解析）を **Intent → Approval → AgentRun → Audit** の鎖で統制し、実行ゲート・責任分界・監査可能性を最優先に実装するための、SpecKit向けの不変ルール（憲法）を定義する。

---

## 1. 不変原則（Non-Negotiables）

### P-01: “実行はIntentなしに存在しない”

- いかなるAIレビュー実行（AgentRun）も **intentId必須**。
- intentIdがない実行リクエストは **拒否（4xx）** し、拒否ログを残す。

**Rationale**: 統制の起点をIntentに置く。実行の意図が記録されていないRunは許可しない。

### P-02: “リスクは承認で受容される”

- Med/Highリスクは **有効なApprovalがない限り実行不可**。
- LowはApproval不要（ただし将来拡張を妨げないデータ設計にする）。

**Rationale**: リスク受容を明示し、Approverの責任分界を明確にする。

### P-03: “監査は欠損を許容しない”

- Audit Report は Intent / Approval（必要時）/ AgentRun / Evidence の欠損を検知し、**欠損は赤表示**して成功判定に反映する。

**Rationale**: 監査成功率を測り、欠損ゼロを目指す。SRE/セキュリティの要件。

### P-04: “機密は保存しない（最小化する）”

- PR diff全文の永続保存は避ける。
- 参照ID・ハッシュ（diffHash）中心でトレーサブルにする。

**Rationale**: 機密・知的財産の露出を最小化しつつ、追跡可能性を保つ。

### P-05: “採点しない。構造化したFindingsのみ”

- AI出力は採点・ランキングを行わず、固定スキーマのFindingsで記録する。

**Rationale**: 評価・採点は人間の責任。AIは指摘・改善提案・リスクの構造化に限定する。

---

## 2. 用語（Glossary）

- **Intent**: AIレビューの発注。Goal / Constraints / Success を含む。
- **Approval**: リスク受容の許可（必要時のみ）。
- **AgentRun**: AIレビュー実行1回の単位。PR入力→処理→レビュー結果出力までを一意に識別し追跡可能にする記録。
- **Audit Report**: 期間・対象指定で鎖（Intent/Approval/Run/Evidence）を欠損なく出力する監査レポート。
- **Evidence**: PR URL、commit SHA、diffHash、CI結果、関連Issue等の根拠。

---

## 3. 責任の分界（RACI）

- **Requestor（人間）**: Intent作成の責任
- **Approver（人間）**: Approval（リスク受容）の責任
- **Agent（サービス）**: AgentRun実行の主体（責任主体は組織）
- **System**: Audit生成主体（説明責任は組織）

---

## 4. ワークフロー（SpecKit Execution Chain）

### 4.1 Low Risk（UC-1）

1. RequestorがIntent作成（Goal/Constraints/Success）
2. システムがRisk判定（Low）
3. RequestorがAgentRun作成（intentId必須）
4. 実行→結果保存→監査出力可能

### 4.2 Med/High（UC-2）

1. Intent作成
2. Risk判定で承認要求
3. Approverが承認（テンプレ1〜3問）
4. AgentRun実行→結果保存→監査出力

### 4.3 Break-glass（UC-3）

1. 緊急Run許可（ポリシーで制御）
2. 事後承認Requiredとして例外受信箱に表示
3. 期限までに承認/却下/差戻し

---

## 5. 実装ガードレール（Hard Guards）

### G-01: AgentRun作成ゲート（API）

- `POST /api/agent-runs` は **intentId必須**（FR-RUN-01）
- IntentがMed/Highの場合、**approvalId必須**（FR-RUN-02）
- 同一runIdの重複登録は防止（idempotency）（FR-RUN-03）

### G-02: 入力の保存最小化

- PR識別（repoFullName, prNumber, prUrl）保持（FR-IN-01）
- baseSHA/headSHA/diffHash保持（FR-IN-02）
- diff全文は永続保存しない（NFR-S-01）

### G-03: 出力の固定スキーマ化

- ReviewOutput（summary + findings）は固定スキーマで保存（FR-OUT-01, FR-EXEC-02）
- severity と evidenceRef は必須（FR-OUT-02）
- status と errorCode を持つ（FR-OUT-03/04）

### G-04: 例外の記録（SRE/セキュリティ）

- 未承認High Risk試行は拒否ログとして例外記録（FR-EXC-01）
- Break-glassは事後承認Requiredで例外受信箱へ（FR-EXC-02）
- Approval期限切れは検知（MVPは一覧表示でも可）（FR-EXC-03）

---

## 6. 必須成果物（SpecKit Deliverables）

### D-01: 要件（Requirements）

- 本MVPの **FR/NFR/AC/KPI** を満たすこと。
- 対象外（自動コミット等）は **実装しない**。

### D-02: データ契約（Data Contract）

- AgentRun / ReviewOutput / Evidence の **MVPスキーマ** を実装し、保存する。
- モデル/エージェント/ルールセットのバージョンを記録する（FR-EXEC-03）。

### D-03: 監査契約（Audit Contract）

- `GET /api/audit/report` で、Intent/Approval/Run/Evidence の欠損検知を満たす出力を生成する（MVPはMarkdown可）。

### D-04: 画面（MVP最小UI）

- Policy Console（最小設定）
- Approvals Inbox
- Exceptions Inbox
- Audit Report Generator
- （任意）Run Detail

---

## 7. 仕様決定の優先順位（Decision Priority）

1. **統制（実行ゲート）**: intentId必須 / approval必須（Med/High）
2. **監査可能性**: 欠損検知・赤表示・成功率KPI
3. **保存最小化**: diff全文を避ける
4. **固定スキーマ**: Findingsを構造化して保存
5. **操作性**: Inbox/UIの改善は後回し（MVP最小）

---

## 8. 受入条件（Acceptance Gates）

- **AC-01**: intentId無しでAgentRun作成不可（4xx）
- **AC-02**: Med/HighでApproval無しのAgentRun作成不可（4xx）
- **AC-03**: 1実行=1 AgentRunとして保存され、PRに紐づく
- **AC-04**: 指定期間で監査レポートを出力でき、鎖が確認できる
- **AC-05**: KPI（紐付け率/承認ログ率/監査成功率）が集計可能

---

## 9. KPI（MVP）

- **紐付け率** = intentId付きAgentRun数 / AgentRun総数
- **承認ログ率** = （Med/HighでapprovalId付きAgentRun数）/（Med/High AgentRun総数）
- **監査出力成功率** = 必須項目欠損なしで生成できた監査レポート数 / 生成試行数

---

## 10. 実装手順（3日想定の固定順）

1. AgentRun登録（intentId必須）＋Risk/Approvalゲート
2. Findings固定スキーマ保存（summary + findings）
3. 例外受信箱（未承認/期限切れ/緊急）
4. 監査レポート（Markdown出力）
5. PR→Intent下書き生成（余力）

---

## 11. 禁止事項（Out of Scope / Do Not Build）

- AIによる自動コミット（コード改変）
- 人間の評価・採点・ランキング
- 高度なデータエスクロー/完全WORM（将来要件）

---

## 12. Governance（変更管理）

本Constitutionの変更は、**監査可能性・統制・保存最小化** の原則を弱めてはならない。変更時は、FR/NFR/AC/KPIへの影響と移行方針を必ず明記する。

**Amendment procedure**:

1. **Documentation**: 変更理由、影響分析、移行方針を明記する
2. **Versioning**: Semantic versioning（MAJOR.MINOR.PATCH）
   - **MAJOR**: 原則の削除・再定義など後方非互換な変更
   - **MINOR**: 新原則・新セクションの追加または大幅な拡張
   - **PATCH**: 文言の明確化、誤字修正、意味を変えない調整
3. **Compliance Review**: すべてのPRおよび機能仕様は、適用される原則への適合を確認すること
4. **Conflict Resolution**: リクエストが本原則と矛盾する場合は、矛盾を明示し、適合する代替案を提示してから進める

原則とリクエストが矛盾する場合、開発者は矛盾点を明示し、適合する代替案を提案し、承認された例外は正当な理由とともに記録する。

**Version**: 2.0.0 | **Ratified**: 2026-01-26 | **Last Amended**: 2026-02-08
