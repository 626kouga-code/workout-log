# CI/CD

[目次に戻る](README.md)

GitHub Actions を使う。

| タイミング | 実行内容 |
| --- | --- |
| PR の作成・更新、main への push | CI（`.github/workflows/ci.yml`）。静的解析、テスト、ビルド、E2E テスト |
| 手動（AWS で動作確認するとき） | AWS に環境を作ってデプロイする（`aws-up.yml`）／全部消す（`aws-down.yml`）。[作成と削除](12_aws-architecture.md#作成と削除) |

- AWS の環境は置きっぱなしにせず、動作確認するときに作り、終わったら全部消す。そのため main へのマージでは自動でデプロイしない
- AWS への認証には GitHub Actions の OIDC 連携を使い、長期のアクセスキーは保存しない

## CI（PR ごと）

次の 4 つのジョブを並列に流す。

| ジョブ | 内容 | コマンド |
| --- | --- | --- |
| `lint` | 静的解析（ESLint）、型チェック、書式（Prettier） | `npm run lint`、`npm run typecheck`、`npm run format:check` |
| `test` | 単体・結合・画面のテスト（MySQL をサービスコンテナで起動する） | `npx prisma migrate deploy`、`npm test` |
| `build` | 本番ビルド | `npm run build` |
| `e2e` | Playwright の E2E テスト（MySQL・S3Mock・Mailpit を起動し、本番ビルドに対して流す） | `npm run test:e2e` |

- **4 つすべてが成功しないと、PR は main にマージできない**（main のブランチ保護で、必須のチェックにする）
- 同じ PR に続けて push すると、古い実行は取り消す
- E2E で失敗したテストは 1 回だけやり直す。やり直しで通ったものは HTML レポートに「flaky」と出る

### 失敗したとき

1. PR の「Checks」タブで、失敗したジョブとステップのログを見る
2. 詳しいレポートを artifact に残す（14 日保存）
   - `test-reports`：Vitest の結果（失敗したときだけ）
   - `playwright-report`：E2E の HTML レポート。失敗したテストのスクリーンショット・動画・トレースを含む
3. ローカルで同じコマンドを流して再現させてから直す

## CD（手動デプロイ）

| ワークフロー | 内容 |
| --- | --- |
| `aws-up` | ① AWS CDK で環境（ネットワーク・RDS・S3・ECR など）を作る → ② コンテナイメージを作って ECR に置く → ③ ECS Express Mode のサービスを作る・更新する → ④ データベースのマイグレーション（`prisma migrate deploy`）を流す → ⑤ 公開 URL を出力する |
| `aws-down` | ① RDS の最終スナップショットを取る → ② 環境を全部消す。S3 の画像を残すかどうかを入力で選べる |

- `aws-up` には「前回のスナップショットから復元するか」を入力で選べるようにする
- コンテナイメージは ARM（Graviton）向けに作る（Fargate の料金が安いため）

## Dependabot

npm と GitHub Actions の依存を週 1 回確認し、更新の PR を作る。Dependabot の PR は、Issue 登録とブランチ命名のルールの例外とし、CI が通ればマージしてよい（[CLAUDE.md](../CLAUDE.md)）。
