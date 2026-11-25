# Workout Log

筋トレの記録と、記録を共有する SNS をひとつにした Web アプリ（講義課題）。

- 要件定義書：[docs/README.md](docs/README.md)
- 開発ルール（Issue・ブランチ・PR）：[CLAUDE.md](CLAUDE.md)

## 必要なもの

- Node.js 24
- Docker Desktop（MySQL・S3Mock・Mailpit を動かす）

## はじめての起動

```bash
cp .env.example .env      # 環境変数（そのままでローカルの Docker につながる）
docker compose up -d      # MySQL・S3Mock・Mailpit を起動
npm install               # 依存関係を入れる（Prisma のクライアントも生成される）
npx prisma migrate dev    # テーブルを作る
npx prisma db seed        # 初期データ（プリセット種目 36 件）を入れる
npm run dev               # http://localhost:3000
```

動作確認：http://localhost:3000/api/health が `{"status":"ok"}` を返せば、DB までつながっている。

## ローカルのサービスとポート

ポートは固定（[CLAUDE.md](CLAUDE.md)）。埋まっているときは、別のポートに逃がさず、使っているプロセスを確かめる。

| サービス | URL・ポート | 用途 |
| --- | --- | --- |
| Next.js | http://localhost:3000 | アプリ本体 |
| MySQL 8.4 | `localhost:3306`（ユーザー `workout` / パスワード `workout`） | DB `workout_log`、結合テスト用 `workout_log_test` |
| S3Mock | http://localhost:9090 | 画像の保存先（バケット `workout-log-local`） |
| Mailpit | SMTP `localhost:1025`、受信箱 http://localhost:8025 | 送信したメールの確認 |

## よく使うコマンド

| コマンド | 内容 |
| --- | --- |
| `npm run dev` | 開発サーバー |
| `npm run lint` / `npm run typecheck` | 静的解析 / 型チェック |
| `npm run format` | コードの整形（Prettier） |
| `npm test` | 単体・画面のテスト（Vitest） |
| `npm run test:e2e` | E2E テスト（Playwright。本番ビルドを作ってから流す。Docker のサービスを起動しておく） |
| `npx prisma migrate dev` | スキーマの変更からマイグレーションを作って適用 |
| `npx prisma db seed` | 初期データ（プリセット種目）を入れる。何度流しても同じ結果になる |
| `npx prisma studio` | DB の中身をブラウザで見る |
| `docker compose down` | サービスを止める（データは残る。`-v` を付けると DB も消える） |

## 困ったとき

- **`npx playwright test` でブラウザがないと言われる**：`npx playwright install chromium webkit`
- **DB を作り直したい**：`docker compose down -v` → `docker compose up -d` → `npx prisma migrate dev` → `npx prisma db seed`
