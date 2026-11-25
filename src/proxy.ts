import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/server/auth/cookie-name";

/** ログインが必要な画面（先頭がこれに一致するパス） */
const MEMBER_PATHS = [
  "/workouts",
  "/exercises",
  "/progress",
  "/notifications",
  "/profile",
];

const matches = (pathname: string, base: string) =>
  pathname === base || pathname.startsWith(`${base}/`);

/**
 * Cookie が無いときだけ、DB を読まずに先回りして振り分ける（Next.js の「楽観的なチェック」）。
 * Cookie があっても期限切れのことはあるので、本当の確認は各画面の requireUser() / getCurrentUser() が行う。
 *
 * 「Cookie があればログイン画面を開かせない」振り分けはしない。期限切れの Cookie が残っていると、
 * ログイン画面にたどり着けなくなるため。
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/explore", request.url));
  }
  if (MEMBER_PATHS.some((base) => matches(pathname, base))) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname + search);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  // API・静的ファイル・画像は通さない
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
