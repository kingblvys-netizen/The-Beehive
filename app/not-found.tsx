"use client";
import { motion } from 'framer-motion';
import { Hexagon, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 font-mono">
      <motion.div animate={{ opacity: [1, 0.8, 1], x: [0, -2, 2, 0] }} transition={{ repeat: Infinity, duration: 0.2 }}>
        <AlertTriangle size={80} className="text-red-500 mb-8" />
      </motion.div>
      <h1 className="text-4xl font-black uppercase tracking-tighter mb-4">Signal Lost</h1>
      <p className="text-neutral-600 mb-12 text-center max-w-sm uppercase text-xs tracking-widest">
        The coordinate you are attempting to reach does not exist in the Hive database. Access restricted.
      </p>
      <Link href="/" className="px-10 py-4 border border-white/10 hover:bg-white text-black bg-white transition-all font-black uppercase text-[10px] tracking-widest">
        Recalibrate to Hub
      </Link>
    </div>
  );
}