import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const role = (auth?.user as { role?: string } | undefined)?.role;
      const mustChange = (auth?.user as { mustChangePassword?: boolean } | undefined)
        ?.mustChangePassword;
      const { pathname } = request.nextUrl;
      const isLoginPage = pathname === "/login";
      const isSuperAdminPage = pathname.startsWith("/superadmin");
      const isProfilePage = pathname === "/settings/profile";
      const isAuthApi = pathname.startsWith("/api/auth");

      if (isAuthApi) return true;

      if (isLoginPage) {
        if (isLoggedIn) {
          const target =
            role === "SUPER_ADMIN"
              ? mustChange
                ? "/settings/profile"
                : "/superadmin"
              : mustChange
              ? "/settings/profile"
              : "/workspace";
          return Response.redirect(new URL(target, request.nextUrl));
        }
        return true;
      }

      // Если нужно сменить пароль — пускаем только на /settings/profile и в API смены пароля
      if (mustChange && !isProfilePage) {
        if (pathname.startsWith("/api/")) {
          return true; // API-запросы не блокируем
        }
        return Response.redirect(new URL("/settings/profile", request.nextUrl));
      }

      if (isSuperAdminPage) {
        return isLoggedIn && role === "SUPER_ADMIN";
      }

      return isLoggedIn;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.name = (user as { name?: string | null }).name ?? null;
        token.role = (user as { role?: string }).role;
        token.tenantId = (user as { tenantId?: string | null }).tenantId;
        token.mustChangePassword =
          (user as { mustChangePassword?: boolean }).mustChangePassword ?? false;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { name?: string | null }).name = token.name ?? null;
        (session.user as { role?: string }).role = token.role as string;
        (session.user as { tenantId?: string | null }).tenantId =
          token.tenantId as string | null;
        (session.user as { mustChangePassword?: boolean }).mustChangePassword =
          token.mustChangePassword as boolean;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;