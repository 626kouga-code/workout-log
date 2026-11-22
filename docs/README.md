# Workout Log 要件定義書

- 作成日：2026-11-22
- 更新日：2026-11-23
- 版：0.4（ドラフト）

Workout Log は、筋力トレーニング・運動の記録と、その成果を共有できる SNS を組み合わせた Web アプリ（PWA）。この文書は、その開発のための要件定義書で、テーマごとにファイルを分けている。

## 目次

| ファイル | 内容 |
| --- | --- |
| [01_overview.md](01_overview.md) | 概要・目的、前提条件・想定利用者、リリース計画・スコープ外 |
| [02_functional-requirements.md](02_functional-requirements.md) | 機能要件（F-01〜F-89、優先度つき）、プリセット種目一覧 |
| [03_non-functional-requirements.md](03_non-functional-requirements.md) | 非機能要件（セキュリティ、性能、対応環境、PWA など） |
| [04_screens.md](04_screens.md) | 画面一覧と画面遷移 |
| [05_data-model.md](05_data-model.md) | データモデル（ER 図とテーブル定義） |
| [06_api.md](06_api.md) | サーバー処理（Server Actions・Route Handlers・記録の同期）の設計 |
| [07_tech-stack.md](07_tech-stack.md) | 技術スタックと選定理由、開発環境 |
| [08_testing.md](08_testing.md) | テスト方針 |
| [09_ci-cd.md](09_ci-cd.md) | CI/CD |
| [10_operations.md](10_operations.md) | ログ・監視・エラー通知、バックアップ |
| [11_open-issues.md](11_open-issues.md) | 未決事項 |
| [12_aws-architecture.md](12_aws-architecture.md) | AWS 構成（ECS Express Mode・RDS・S3・SES）、作成と削除、費用 |

開発のルール（Issue・ブランチ・PR）は、リポジトリ直下の [CLAUDE.md](../CLAUDE.md) にある。
