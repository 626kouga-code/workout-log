-- 結合テスト用のデータベース（docs/08_testing.md）。
-- MySQL のコンテナを初めて起動したときだけ実行される。
CREATE DATABASE IF NOT EXISTS workout_log_test
  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
GRANT ALL PRIVILEGES ON workout_log_test.* TO 'workout'@'%';

-- prisma migrate dev が使う一時的なデータベース（shadow database）を作れるようにする
GRANT CREATE, DROP, ALTER, INDEX, REFERENCES ON *.* TO 'workout'@'%';
