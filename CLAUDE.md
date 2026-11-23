# 開発ルール

Workout Log（筋トレ記録＋SNS の Web アプリ）。要件定義書は [docs/README.md](docs/README.md)。

Next.js 16 は以前の版と書き方が変わっている。コードを書く前に [AGENTS.md](AGENTS.md) の指示に従い、`node_modules/next/dist/docs/` の該当ガイドを読む。

## Issue登録

- バグ報告・機能追加は、作業を始める前に必ずGitHub Issueを登録する。
- 小さなtypo修正やドキュメントの誤字など軽微な変更はIssue不要。
- Issueには最低限「背景・目的」「対応内容」を記載する。

## ブランチ命名規則

形式: `type/issue番号-短い説明`

- 例: `feature/12-add-workout-sync`, `fix/8-timer-drift`
- `type`は以下から選ぶ:
  - `feature` — 新機能追加
  - `fix` — バグ修正
  - `refactor` — リファクタリング
  - `chore` — 依存更新・設定変更などその他
- 説明部分は英語の短いkebab-caseで、内容が分かるようにする。
- 対応するIssueがない場合はブランチを切らない（Issue登録を先に行う）。

## mainブランチ

- mainへの直接pushは禁止。必ずブランチを切ってPR経由でマージする。
- CI（`.github/workflows/ci.yml`）の4つのジョブ（lint・test・build・e2e）がすべて成功したPRだけマージできる（ブランチ保護の必須チェック）。詳細は [docs/09_ci-cd.md](docs/09_ci-cd.md)。
- Dependabot が作る依存更新のPR（`chore(deps): ...`）は、Issue登録とブランチ命名のルールの例外とする。CIが通ればマージしてよい。

## Pull Request

- PRの説明に `closes #issue番号` を記載し、マージ時にIssueが自動closeされるようにする（GitHubのキーワード連携機能）。
- PRタイトルはブランチと同様にtypeを先頭につける（例: `feat: 記録の同期を追加`）。

## 開発サーバーのポート固定ルール

ローカル開発のポートは以下に固定する。ポートが埋まっていても、別のポートへ逃がさない（既に動いているプロセスを確認し、止めてよいか判断してから起動し直す）。

| サービス | ポート |
| --- | --- |
| Next.js 開発サーバー | `3000`（`next dev -p 3000`） |
| MySQL | `3306` |
| S3Mock | `9090` |
| Mailpit | `1025`（SMTP）、`8025`（Web UI） |
