import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = ["/tien-do-hoc-tap", "/account-profile", "/hop-thu", "/vocabulary-sets", "/vocabulary-cart", "/admin"];

function toLogin(request: NextRequest, path: string) {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", path);
  return NextResponse.redirect(url);
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED.some((p) => path === p || path.startsWith(p + "/"));
  const hasSession = request.cookies.getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));

  // Anonymous visitors: no Supabase round trip at all (the vast majority of requests).
  if (!hasSession) return isProtected ? toLogin(request, path) : NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );
  // getClaims verifies the JWT locally when possible and refreshes an expired
  // session (rewriting the cookies) — far cheaper than getUser() per request.
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims && isProtected) return toLogin(request, path);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|manifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp3|wav|ogg|m4a|woff2?)$).*)"],
};
