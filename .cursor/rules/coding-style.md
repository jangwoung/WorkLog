# コーディングスタイル

## イミュータビリティ（重要）

常に新しいオブジェクトを作成し、決して変更しない：

```javascript
// 間違い: ミューテーション
function updateUser(user, name) {
  user.name = name  // ミューテーション！
  return user
}

// 正しい: イミュータビリティ
function updateUser(user, name) {
  return {
    ...user,
    name
  }
}
```

## ファイル組織

多くの小さなファイル > 少数の大きなファイル：

- 高い凝集度、低い結合度
- 200-400行が典型的、最大800行
- 大きなコンポーネントからユーティリティを抽出
- 型ではなく機能/ドメインで整理

## エラーハンドリング

常に包括的にエラーを処理：

```typescript
try {
  const result = await riskyOperation()
  return result
} catch (error) {
  console.error('Operation failed:', error)
  throw new Error('詳細なユーザーフレンドリーなメッセージ')
}
```

## 入力検証

常にユーザー入力を検証：

```typescript
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  age: z.number().int().min(0).max(150)
})

const validated = schema.parse(input)
```

## コード品質チェックリスト

作業完了前に確認：

- [ ] コードは読みやすく、適切に命名されている
- [ ] 関数は小さい（<50行）
- [ ] ファイルは焦点が絞られている（<800行）
- [ ] 深いネストがない（>4レベル）
- [ ] 適切なエラーハンドリング
- [ ] console.logステートメントがない
- [ ] ハードコードされた値がない
- [ ] ミューテーションがない（イミュータブルパターンを使用）
