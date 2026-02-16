import NextAuth from "next-auth";
import DiscordProvider from "next-auth/providers/discord";

const handler = NextAuth({
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID ?? "",
      clientSecret: process.env.DISCORD_CLIENT_SECRET ?? "",
      // 'identify' gives us the raw profile data
      authorization: { params: { scope: 'identify' } },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      // This runs only on the initial sign-in
      if (profile) {
        const profileData = profile as any;
        
        // 1. Capture the Discord ID
        token.id = profileData.id;
        
        // 2. THE FIX: Explicitly grab 'username' (unique handle) 
        // We ignore 'global_name' unless username is somehow missing.
        token.username = profileData.username || profileData.global_name || token.name;
      }
      return token;
    },
    async session({ session, token }) {
      // Pass the token data to the client-side session
      if (session.user) {
        (session.user as any).id = token.id;
        // 3. Overwrite 'name' with the unique handle we captured above
        (session.user as any).name = token.username; 
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };