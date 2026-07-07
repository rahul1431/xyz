import type { NextAuthConfig } from "next-auth";

// Edge-safe config (no Node-only deps like bcrypt or the DB driver) shared
// between middleware and the full server-side auth config.
export const authConfig: NextAuthConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isPublicPage =
        request.nextUrl.pathname === "/login" ||
        request.nextUrl.pathname === "/register";

      if (!isLoggedIn && !isPublicPage) return false;
      if (isLoggedIn && isPublicPage) {
        return Response.redirect(new URL("/chat", request.nextUrl));
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user) session.user.id = token.id as string;
      return session;
    },
  },
};
