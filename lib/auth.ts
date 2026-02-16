import type { NextAuthOptions } from "next-auth";
// import DiscordProvider from "next-auth/providers/discord"; // example

export const authOptions: NextAuthOptions = {
  providers: [
    // ...your providers...
  ],
  callbacks: {
    // ...your callbacks...
  }
};