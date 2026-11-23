// Vitest を起動するための小さなラッパー。
// Windows でパスのドライブ名が小文字（c:\）だと、Vitest が同じモジュールを別物として
// 2 回読み込み、テストが 1 件も動かなくなる。ドライブ名を大文字（C:\）にそろえて起動する。
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const upperDrive = (p) =>
  process.platform === "win32" && /^[a-z]:/.test(p)
    ? p[0].toUpperCase() + p.slice(1)
    : p;

const require = createRequire(import.meta.url);
const vitestBin = upperDrive(
  join(dirname(require.resolve("vitest/package.json")), "vitest.mjs"),
);

const result = spawnSync(
  process.execPath,
  [vitestBin, ...process.argv.slice(2)],
  { cwd: upperDrive(process.cwd()), stdio: "inherit" },
);
process.exit(result.status ?? 1);
