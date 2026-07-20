import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseGlobalOptions } from "./fetch";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      ...supabaseGlobalOptions,
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  async function getProfileRole(): Promise<string | null> {
    const { data: rpcRows } = await supabase.rpc("get_my_profile");
    if (rpcRows?.[0]?.role) {
      return rpcRows[0].role as string;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user!.id)
      .maybeSingle();

    return profile?.role ?? null;
  }

  if (path.startsWith("/admin")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", path);
      return NextResponse.redirect(url);
    }

    const role = await getProfileRole();

    if (role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.searchParams.set("error", "admin_only");
      return NextResponse.redirect(url);
    }
  }

  if (path === "/login" && user) {
    const role = await getProfileRole();

    if (role === "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/players";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  if (path === "/player/login" && user) {
    const role = await getProfileRole();

    if (role === "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/players";
      url.search = "";
      return NextResponse.redirect(url);
    }

    if (role === "player") {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
