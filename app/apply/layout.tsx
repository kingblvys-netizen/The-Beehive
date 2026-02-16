import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from '../providers';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { MAINTENANCE_MODE } from '@/lib/config';
import { getSessionAccessInfo } from '@/lib/access';
import { AlertTriangle, Cog } from 'lucide-react';
import '../globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'HIVE COMMAND // RECRUITMENT',
  description: 'Secure application portal for The Beehive.',
  icons: { icon: '/favicon.ico' },
  openGraph: {
    title: 'HIVE COMMAND // RECRUITMENT',
    description: 'Secure application portal for The Beehive.',
    siteName: 'Hive Command',
    locale: 'en_US',
    type: 'website',
  },
  themeColor: '#FACC15',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const access = await getSessionAccessInfo(session);
  const isAdmin = access.canAccessAdmin;

  // --- MAINTENANCE OVERLAY LOGIC ---
  const showMaintenance = MAINTENANCE_MODE && !isAdmin;

  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[#050505] text-white antialiased selection:bg-yellow-500 selection:text-black`}>
        <Providers>
          {showMaintenance ? (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-center font-mono relative overflow-hidden">
              {/* Background Effect */}
              <div className="absolute inset-0 opacity-10 pointer-events-none" 
                   style={{ backgroundImage: 'radial-gradient(#FACC15 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
              
              <div className="relative z-10">
                <div className="relative inline-block mb-8">
                  <Cog className="text-yellow-500 animate-spin-slow" size={80} />
                  <AlertTriangle className="text-red-500 absolute -bottom-2 -right-2" size={32} />
                </div>
                
                <h1 className="text-4xl font-black uppercase tracking-[0.2em] mb-4 text-white">
                  System <span className="text-yellow-500">Recalibrating</span>
                </h1>
                
                <div className="max-w-md mx-auto space-y-6">
                  <p className="text-neutral-500 text-xs uppercase tracking-[0.3em] leading-relaxed">
                    The Hive Command Center is currently undergoing critical hardware synchronization and security patching.
                  </p>
                  
                  <div className="flex items-center justify-center gap-4 py-4 border-y border-white/5">
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-black text-yellow-500/50 uppercase mb-1">Status</span>
                      <span className="text-[10px] font-bold text-white uppercase tracking-widest animate-pulse">Offline</span>
                    </div>
                    <div className="w-[1px] h-8 bg-white/10" />
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-black text-yellow-500/50 uppercase mb-1">Estimated Fix</span>
                      <span className="text-[10px] font-bold text-white uppercase tracking-widest">TBD</span>
                    </div>
                  </div>

                  <p className="text-[9px] text-neutral-700 font-bold uppercase tracking-widest">
                    All neural links are temporarily suspended. Stand by for signal restoration.
                  </p>
                </div>
              </div>

              {/* Decorative Line */}
              <div className="fixed bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-yellow-500/20 to-transparent shadow-[0_0_15px_#FACC15]" />
            </div>
          ) : (
            <>
              {/* If maintenance is ON but you are an Admin, show a tiny warning bar at the top */}
              {MAINTENANCE_MODE && isAdmin && (
                <div className="bg-yellow-500 text-black text-[9px] font-black uppercase tracking-[0.3em] py-1 text-center sticky top-0 z-[100] shadow-lg">
                  System Alert: Maintenance Mode Active (Visibility: Admins Only)
                </div>
              )}
              {children}
            </>
          )}
        </Providers>
      </body>
    </html>
  );
}