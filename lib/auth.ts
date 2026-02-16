import { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";

if (!process.env.DISCORD_CLIENT_ID || !process.env.DISCORD_CLIENT_SECRET) {
  throw new Error("Missing DISCORD_CLIENT_ID or DISCORD_CLIENT_SECRET");
}

if (!process.env.NEXTAUTH_SECRET) {
  throw new Error("Missing NEXTAUTH_SECRET");
}

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    // ...your callbacks...
  },
  debug: process.env.NEXTAUTH_DEBUG === "true",
  logger: {
    error(code, ...message) {
      console.error("[next-auth][error]", code, ...message);
    },
    warn(code) {
      console.warn("[next-auth][warn]", code);
    },
    debug(code, ...message) {
      console.log("[next-auth][debug]", code, ...message);
    },
  },
};