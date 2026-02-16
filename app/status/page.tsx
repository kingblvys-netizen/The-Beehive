"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Database, Server, Shield, Wifi, ChevronLeft, Cpu } from 'lucide-react';
import Link from 'next/link';
import { SITE_VERSION, CORE_SATELLITE } from '@/lib/config';

export default function StatusPage() {
  const [dbStatus, setDbStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [latency, setLatency] = useState<number | null>(null);

  useEffect(() => {
    const checkCore = async () => {
      const start = Date.now();
      try {
        const res = await fetch('/api/apply'); // Use existing GET route to test DB
        if (res.ok) {
          setDbStatus('online');
          setLatency(Date.now() - start);
        } else {
          setDbStatus('offline');
        }
      } catch {
        setDbStatus('offline');
      }
    };
    checkCore();
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-white font-mono p-6 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#FACC15 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

      <main className="max-w-2xl w-full relative z-10">
        <Link href="/" className="inline-flex items-center gap-2 text-neutral-500 hover:text-yellow-500 transition-colors mb-12 text-[10px] uppercase font-black tracking-widest">
          <ChevronLeft size={14} /> Back to Hub
        </Link>

        <div className="mb-12 border-l-2 border-yellow-500 pl-6">
          <h1 className="text-4xl font-black uppercase tracking-tighter mb-2">Core <span className="text-yellow-500">Integrity</span></h1>
          <p className="text-neutral-500 text-xs uppercase tracking-widest">System Diagnostics & Neural Link Status</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {/* DATABASE STATUS */}
          <div className="bg-neutral-900/50 border border-white/5 p-6 rounded-2xl backdrop-blur-md">
            <div className="flex justify-between items-start mb-6">
              <Database className={dbStatus === 'online' ? 'text-green-500' : 'text-red-500'} size={24} />
              <div className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest ${dbStatus === 'online' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                {dbStatus}
              </div>
            </div>
            <div className="text-[10px] font-black text-neutral-500 uppercase mb-1">Database Engine</div>
            <div className="text-sm font-bold uppercase tracking-widest">Neon-Postgres Core</div>
            {latency && <div className="text-[9px] text-neutral-600 mt-2">LATENCY: {latency}ms</div>}
          </div>

          {/* SERVER STATUS */}
          <div className="bg-neutral-900/50 border border-white/5 p-6 rounded-2xl backdrop-blur-md">
            <div className="flex justify-between items-start mb-6">
              <Server className="text-blue-500" size={24} />
              <div className="px-2 py-1 bg-blue-500/10 text-blue-500 rounded text-[8px] font-black uppercase tracking-widest">Active</div>
            </div>
            <div className="text-[10px] font-black text-neutral-500 uppercase mb-1">Compute Cluster</div>
            <div className="text-sm font-bold uppercase tracking-widest">Vercel Edge Network</div>
          </div>
        </div>

        {/* LOG PANEL */}
        <div className="bg-black border border-white/10 p-6 rounded-2xl font-mono text-[10px] leading-relaxed">
          <div className="flex items-center gap-2 mb-4 text-neutral-500">
            <Activity size={12} />
            <span className="uppercase font-black">System Feed</span>
          </div>
          <div className="space-y-1 overflow-hidden h-32 text-neutral-400">
            <p className="text-green-500/70">[ OK ] INITIALIZING HANDSHAKE...</p>
            <p className="text-green-500/70">[ OK ] {CORE_SATELLITE} CONNECTED</p>
            <p>[ INFO ] VERSION {SITE_VERSION} ACTIVE</p>
            <p>[ INFO ] FIREWALL LEVEL 5 ENGAGED</p>
            <p className={dbStatus === 'online' ? "text-green-500/70" : "text-red-500"}>
              {dbStatus === 'online' ? "[ OK ] DB_LINK_ESTABLISHED" : "[ ERR ] DB_LINK_CRITICAL"}
            </p>
            <motion.p animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
              [ WAIT ] SCANNING NEURAL UPLINKS...
            </motion.p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <span className="text-[9px] font-black text-neutral-800 uppercase tracking-[0.5em]">Global Defense Initiative // The Beehive</span>
        </div>
      </main>
    </div>
  );
}