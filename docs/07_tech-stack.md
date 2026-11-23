# 技術スタックと開発環境

[目次に戻る](README.md)

## 技術スタック

ライブラリのバージョンは、実装を始めるときの最新安定版に決め、この表に書き足す。

| レイヤー | 技術 | 用途・備考 |
| --- | --- | --- |
| 言語 | TypeScript | 画面もサーバー処理もすべて TypeScript で書く |
| フレームワーク | Next.js（App Router） | 画面（React Server Components）とサーバー処理（Server Actions・Route Handlers）を 1 つのプロジェクトで作る |
| UI | React、Tailwind CSS | |
| クライアント側のデータ取得 | TanStack Query | 無限スクロールのタイムライン・履歴、通知の未読数の定期取得に使う |
| DB | MySQL 8.4 LTS | AWS では RDS for MySQL を想定する |
| ORM・マイグレーション | Prisma | スキーマから TypeScript の型を生成する。マイグレーションとシード（プリセット種目）も Prisma で行う |
| 認証 | Auth.js（Credentials プロバイダー、Prisma アダプター） | メール＋パスワード。セッションは DB に保存する |
| パスワードのハッシュ化 | bcrypt | |
| 入力検証 | Zod | 画面のフォームとサーバーで同じスキーマを使う。フォームは React Hook Form と組み合わせる |
| グラフ | Recharts | 種目別の推移、体重、週間サマリー |
| 画像処理 | sharp | 形式の判定、Exif の除去、向きの補正、リサイズ、WebP への変換 |
| 画像の保存先 | AWS S3（AWS SDK for JavaScript v3） | ローカルでは S3 互換の S3Mock を使う（SNSアプリで動作実績がある） |
| メール送信 | Nodemailer（本番は AWS SES の SMTP、ローカルは Mailpit） | メールアドレス確認（F-02）のメール |
| 端末への保存 | IndexedDB（Dexie.js） | 圏外での記録と送信待ちの変更の保存（F-16） |
| PWA | Web App Manifest、Service Worker（Serwist） | ホーム画面への追加、静的ファイルのキャッシュ |
| 日付処理 | date-fns（date-fns-tz） | 日本時間の「実施日」の扱い、週の区切り |
| 実行環境 | Node.js 24 | |

### バージョン

2026-11-23 に確認した最新安定版。プレリリース版（rc・beta）は使わない。ここにないライブラリは、そのライブラリを使う Issue に着手するときに確認して書き足す。

| 技術 | バージョン | 備考 |
| --- | --- | --- |
| Node.js | 24.x | |
| Next.js | 16.4 | `cacheComponents` を有効にしている（create-next-app の既定） |
| React | 19.3 | |
| TypeScript | 6.0 | 最新は 7.0 だが、typescript-eslint が 6.0 までしか対応していないため |
| Tailwind CSS | 4.3 | |
| ESLint | 9.39 | 最新は 10 だが、eslint-config-next が使うプラグイン（react・import・jsx-a11y）が 9 までしか対応していないため |
| Prettier | 3.10 | |
| Vitest | 5.1 | Windows でドライブ名が小文字（`c:\`）だと動かないため、`scripts/vitest.mjs` を通して起動する |
| Playwright | 1.65 | |
| Prisma | 7.10 | 最新タグは 8.0 の rc のため、安定版の 7 系にする。MySQL にはドライバーアダプター `@prisma/adapter-mariadb` でつなぐ（Prisma 7 の方式）。MySQL 8.4 の認証方式のため `allowPublicKeyRetrieval` を有効にしている（`src/server/db-config.ts`） |

着手時に決めるもの：

- **Auth.js**：安定版は v4（`next-auth` 4.24）、v5 は beta のまま。また、Credentials プロバイダーは DB セッションに標準では対応していない。どちらも [#5](https://github.com/626kouga-code/workout-log/issues/5) で決める
- **日本時間の扱い**：date-fns 4 には公式の `@date-fns/tz` がある。date-fns-tz とどちらを使うか [#4](https://github.com/626kouga-code/workout-log/issues/4) で決める

## 選定理由（SNSアプリとの比較）

同じ開発者による「SNSアプリ」とは、意図的に構成を変えている。

| 観点 | SNSアプリ | このアプリ | 変えた理由 |
| --- | --- | --- | --- |
| 構成 | フロント（React + Vite）と API（Spring Boot）の分離型 | Next.js のフルスタック一体型 | 別の構成を経験するため。1 つの言語・1 つのプロジェクトで済み、記録・グラフ・タイマー・SNS と機能が多くても作り切りやすい |
| バックエンドの言語 | Java | TypeScript | 画面とサーバーで型（Zod のスキーマ・Prisma の型）を共有できる |
| 認証 | JWT（メモリ）＋リフレッシュトークン（Cookie）を自作 | Auth.js のセッション（Cookie） | 同じドメインで動く一体型なので、トークンを持ち回る必要がない |
| DB | PostgreSQL | MySQL | 別の DB を経験するため。集計（自己ベスト・グラフ）と SNS の関係データの両方に向くリレーショナル DB から選んだ |
| DB アクセス | Spring Data JPA ＋ Flyway | Prisma | スキーマ定義・型生成・マイグレーションを 1 つの道具で行える |
| API の形 | REST（OpenAPI で仕様書を生成） | Server Actions 中心 | 画面からサーバーの関数を直接呼べるので、API の定義を別に書かずに済む |

## 開発環境

- Node.js 24、npm
- Docker / Docker Compose（MySQL、S3Mock、Mailpit）
- エディターは VS Code（ESLint・Prettier・Prisma・Tailwind CSS の拡張機能）

| サービス | 用途 | ホスト側のポート |
| --- | --- | --- |
| Next.js 開発サーバー | 画面とサーバー処理 | `3000` |
| MySQL 8.4 | データベース | `3306` |
| S3Mock | 画像の保存先（S3 互換） | `9090` |
| Mailpit | 送信メールの受信確認（受信箱は http://localhost:8025） | `1025`（SMTP）、`8025`（Web UI） |

手順の詳細はリポジトリ直下の [README](../README.md) にある：

```bash
cp .env.example .env          # 環境変数
docker compose up -d          # MySQL、S3Mock、Mailpit を起動
npm install
npx prisma migrate dev        # テーブル作成とプリセット種目の投入
npm run dev                   # http://localhost:3000
```

スマートフォンの実機で確かめるときは、同じ LAN から PC の IP アドレスでアクセスする。Service Worker・Screen Wake Lock・振動は HTTPS（または localhost）でしか動かないため、実機確認には `next dev --experimental-https` などで HTTPS にする。
