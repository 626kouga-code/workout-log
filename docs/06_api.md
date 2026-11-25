# サーバー処理の設計

[目次に戻る](README.md)

Next.js のフルスタック構成のため、SNSアプリのような「フロントから REST API を呼ぶ」形ではなく、次の 3 つを使い分ける。

| 種類 | 使う場面 | 例 |
| --- | --- | --- |
| Server Components | 画面を最初に表示するときのデータ取得。サーバーで DB から直接読み、HTML にして返す | 投稿詳細、プロフィール、メニュー一覧、進捗グラフ |
| Server Actions | フォームやボタンからの作成・更新・削除。画面からは関数を呼ぶ形で使う | ワークアウトの記録、セットの追加、いいね、フォロー |
| Route Handlers（`/api/...`） | 画面の表示後に、ブラウザから繰り返し取得するもの。画像のアップロード | タイムラインの続き、通知の未読数、画像のアップロード |

## 共通の方針

- **層の分け方**：DB を扱う処理は `src/server/`（機能ごとのサービス関数）にまとめ、Server Components・Server Actions・Route Handlers からはそれを呼ぶだけにする。認可（ログイン中のユーザーのデータか）はサービス関数の中で必ず確認する。SNS の操作（投稿・コメント・いいね・フォロー）では、メールアドレスが確認済みかどうかも確認し、未確認ならエラー（`EMAIL_NOT_VERIFIED`、403）を返す
- **入力検証**：Server Actions と Route Handlers の入口で Zod のスキーマを使って検証する。同じスキーマを画面のフォームの検証にも使う
- **Server Actions の戻り値**：`{ ok: true, data }` または `{ ok: false, error: { code, message, fieldErrors? } }`。想定内のエラー（入力不正・権限なし）は例外にせず、この形で返す
- **Route Handlers のエラー**：HTTP ステータス（400 / 401 / 404 / 409 / 413）と `{ error: { code, message } }` を返す
- **ページング**：一覧は `?cursor=<最後のid>&limit=20` のカーソル方式。ID は UUIDv7 なので、作成順に並べるキーとしてそのまま使える。応答は `{ items, nextCursor }`
- **再表示**：Server Actions で更新したら、`revalidatePath` / `revalidateTag` で関係する画面のキャッシュを更新する

## Route Handlers 一覧

| 分類 | メソッドとパス | 概要 |
| --- | --- | --- |
| タイムライン | `GET /api/timeline/home` `GET /api/timeline/explore` | ホーム／全体タイムラインの続き（無限スクロール） |
| | `GET /api/timeline/home/new-count?since=<id>` `GET /api/timeline/explore/new-count?since=<id>` | 新着件数（`since` より新しい、自分以外の投稿の数。30 秒ごとに取得する。F-57） |
| 投稿 | `GET /api/users/[handle]/posts` | プロフィールの投稿一覧の続き |
| 記録 | `GET /api/workouts?cursor=&exerciseId=&bodyPart=` | 履歴リストの続き（本人のみ） |
| 画像 | `POST /api/uploads/post-images`（multipart、1 枚ずつ） | 画像を検証・変換して S3 に保存し、一時的な画像 ID を返す。投稿作成時にその ID を指定する。24 時間以内に投稿に使われなかった画像は削除する |
| | `POST /api/uploads/avatar`（multipart） | アイコン画像のアップロード |
| 通知 | `GET /api/notifications` | 通知一覧の続き |
| | `GET /api/notifications/unread-count` | 未読数（60 秒ごとに取得） |
| 検索 | `GET /api/search/users?q=` | ユーザー検索 |

## Server Actions 一覧

| 分類 | 関数 | 概要 |
| --- | --- | --- |
| アカウント | `signUpAction` | 新規登録（続けてログインし、確認メールを送る） |
| | `logInAction(input, next)` | ログイン。成功したら `next`（自サイト内のパスだけ）かホームへ移る（F-03） |
| | `logOutAction` | ログアウト。セッションを削除してログイン画面へ移る（F-03） |
| | `verifyEmailAction(token)` | メールアドレスの確認（確認リンクの着地ページのボタンから呼ぶ。結果は `verified`・`expired`・`used`・`invalid`。F-02） |
| | `resendVerificationEmailAction` | 確認メールの再送（1 分に 1 回まで） |
| | `deleteAccount({ password })` | 退会。成功したらログアウトしてトップへ移る（F-06） |
| | `updateProfile` | 表示名・自己紹介・アイコンの変更 |
| | `updateSettings` | 画面スリープ防止の切り替え |
| 種目 | `createExerciseAction` `updateExerciseAction` | 自分の種目の追加・編集 |
| | `hideExerciseAction` `unhideExerciseAction` | 自分の種目の非表示・再表示 |
| | `deleteExerciseAction` | 自分の種目の削除。記録・メニューで使っている種目は削除できない（CONFLICT） |
| ワークアウト | `updateWorkout` `deleteWorkout` | 終了済みのワークアウトの実施日・メモ・セットの修正、削除（F-14） |

ワークアウトの開始から終了までの操作（記録中の操作）は、圏外でも使えるよう Server Actions にせず、[記録中のデータの同期](#記録中のデータの同期)で扱う。
| メニュー | `createRoutine` `updateRoutine` `deleteRoutine` | メニューの作成・更新（項目をまとめて置き換える）・削除 |
| 体重 | `upsertBodyWeight` `deleteBodyWeight` | 体重の記録（同じ日は上書き）・削除 |
| | `updateTargetWeight({ targetWeightKg })` | 目標体重の設定・解除（null で解除。F-42） |
| 投稿 | `createPost({ body, imageIds, workoutId? })` | 投稿の作成。workoutId は本人の終了済みワークアウトに限る |
| | `deletePost` | 投稿の削除（画像も S3 から削除する） |
| いいね | `likePost` `unlikePost` | いいね・取り消し（冪等。`{ liked, likeCount }` を返す） |
| コメント | `createComment({ postId, body, parentId? })` `deleteComment` | コメント・返信の作成、削除 |
| フォロー | `follow` `unfollow` | フォロー・解除（冪等） |
| 通知 | `markNotificationsRead` | 通知一覧を開いたときに既読にする |

## 記録中のデータの同期

記録画面（S-11）は圏外でも使えるよう、次の流れで動かす（F-16）。

1. **準備**：オンラインのときに `GET /api/workouts/offline-data` で、記録に必要なデータ（種目一覧、メニュー、種目ごとの前回の記録、自己ベストの現在値）を取得し、端末（IndexedDB）に保存しておく。記録トップ（S-10）を開いたときと、ワークアウトの終了後に更新する
2. **記録**：ワークアウトの開始、種目の追加・並べ替え・削除、セットの追加・更新・削除・完了、終了は、すべて端末の中で行う。ワークアウト・ワークアウトの種目・セットの ID は端末で UUIDv7 を作る。操作は「変更の一覧（送信待ち）」として端末に溜める
3. **自己ベストの判定**：セットを完了したとき、端末に保存した自己ベストの現在値と比べて、その場で「PR」バッジを出す（圏外でも出る）
4. **送信**：通信できるときに、送信待ちの変更を `POST /api/workouts/sync` へ古い順にまとめて送る。送れなかった場合は、通信が戻ったとき（`online` イベント）と、画面を開き直したときに再送する
5. **確定**：サーバーは受け取った変更を反映し、自己ベストを判定し直した結果を返す。端末の判定と違えば、サーバーの結果で表示を直す

| メソッドとパス | 概要 |
| --- | --- |
| `GET /api/workouts/offline-data` | 記録に必要なデータをまとめて返す（本人のみ）：`exercises`（種目一覧）、`previousRecords`（種目ごとに、終了済みで最も新しいワークアウトのセット）、`routines`（#13 まで空）、`personalRecords`（#16 まで空） |
| `POST /api/workouts/sync` | 変更の一覧 `{ changes: [{ changeId, entity, op, id, data?, clientUpdatedAt }] }`（200 件まで）を受け取り、送られた順に 1 つのトランザクションで反映する。応答は `{ results: [{ changeId, status, reason? }], autoFinished, personalRecords }` |

- **変更の形**：`entity` は `workout`・`workoutExercise`・`set`、`op` は `upsert`（そのエンティティの**全項目**を `data` に入れて送る）と `delete` の 2 種類。開始・メモ変更・終了はワークアウトの upsert、追加・並べ替えはワークアウトの種目の upsert、入力・完了はセットの upsert になる。毎回全項目を送るので、競合したときは新しいほうを丸ごと採用するだけで済む
- **変更ごとの結果（status）**：`applied`（反映した）・`duplicate`（反映済みの changeId）・`ignored`（ほかの端末の新しい変更がある、または削除済み）・`rejected`（不正な値・他人のデータ・存在しない親。`reason` に理由）。端末はどの結果でも、その変更を送信待ちから消す。1 件が不正でも、ほかの変更は反映する（送信待ちが詰まらないように）
- **二重送信への備え（冪等性）**：変更ごとに端末で作った `changeId` を付け、サーバーは反映済みの `changeId` を一定期間（7 日）覚えておき、同じものは反映しない。応答が届かずに再送した場合も、二重に登録されない
- **競合の扱い**：同じものを複数の端末で変えた場合は、`clientUpdatedAt`（端末で変更した時刻）が新しいほうを採用する（同じ時刻なら先に届いたほう）。削除されたものへの更新は無視する。そのため、削除したもの（子の種目・セットも含む）の ID を `deleted_records` に 7 日間覚えておく
- **種別ごとの検証**：セットの項目は種目の種別に合わせる（例：有酸素に回数は入れられない）。必須の項目（重量種目の重量と回数など）は、「完了」にしたときだけ求める（記録中は値を入れる前のセットを先に作るため。`src/lib/workout-set.ts`）
- **記録中は 1 件まで**：別の端末で記録中のワークアウトがあるのに新しく開始した場合は、同期の時点で、開始がいちばん新しいもの以外を「新しいほうの開始時刻」で終了にする。終了にしたワークアウトの ID を `autoFinished` で返し、画面で知らせる
- **古い記録の掃除**：7 日より古い `applied_changes`・`deleted_records` は、そのユーザーの同期のついでに消す（定期実行の仕組みを持たないため）
- **更新した自己ベスト**：`personalRecords` に入れる。判定は #16 で作り、それまでは空で返す
- **CSRF 対策**：`Origin` がリクエスト先のホストと同じときだけ受け付ける（`isSameOrigin`、`src/server/http.ts`）
- **ログアウト時**：送信待ちの変更があれば警告し、送ってから端末のデータを消す

## 集計処理（Server Components から呼ぶ）

| 関数 | 概要 |
| --- | --- |
| `getExerciseProgress(exerciseId, range)` | 日ごとの最大重量・推定 1RM・総ボリューム（F-30, F-31） |
| `getPersonalRecords()` | 種目ごとの自己ベスト一覧（最大重量・推定 1RM・重量ごとの最大回数。F-32） |
| `getWeeklySummary(weeks = 8)` | 週ごとのトレーニング日数・総ボリューム・部位別の割合（F-34） |
| `getBodyWeightSeries(range)` | 体重・体脂肪率と 7 日間の移動平均、目標体重と最新値との差（F-41, F-42） |
| `getProfileStats(userId)` | 総トレーニング日数・今月のトレーニング日数（F-70。他人にも公開する集計値） |
