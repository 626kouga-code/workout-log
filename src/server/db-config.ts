/** mariadb ドライバーに渡す接続設定（使う項目だけ） */
export type DbPoolConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  allowPublicKeyRetrieval: boolean;
};

/**
 * DATABASE_URL（mysql://user:pass@host:port/db）を mariadb ドライバーの設定に変換する。
 *
 * MySQL 8.4 の標準の認証方式（caching_sha2_password）は、MySQL の再起動などで
 * 認証のキャッシュが消えると、暗号化していない接続ではサーバーの公開鍵が必要になる。
 * allowPublicKeyRetrieval を付けないと、DB が復旧してもアプリが再接続できなくなる。
 */
export function toPoolConfig(databaseUrl: string): DbPoolConfig {
  const url = new URL(databaseUrl);
  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
    allowPublicKeyRetrieval: true,
  };
}
