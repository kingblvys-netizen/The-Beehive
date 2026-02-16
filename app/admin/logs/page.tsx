"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ChevronLeft, RefreshCw, Shield } from "lucide-react";

type LogRow = {
  id: number;
  actor_id: string;
  actor_name?: string | null;
  actor_role?: string | null;
  area: string;
  action: string;
  target?: string | null;
  metadata?: unknown;
  created_at: string;
};

export default function AdminLogsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [canViewLogs, setCanViewLogs] = useState<boolean | null>(null);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const loadAccess = async () => {
    try {
      const res = await fetch("/api/admin/access/me", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      setCanViewLogs(Boolean(data?.canViewLogs));
    } catch {
      setCanViewLogs(false);
    }
  };

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/logs?limit=300", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setLogs(Array.isArray(data?.logs) ? (data.logs as LogRow[]) : []);
      } else {
        setLogs([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") loadAccess();
    if (status === "unauthenticated") {
      setCanViewLogs(false);
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    if (status === "authenticated" && canViewLogs) {
      loadLogs();
    }
  }, [status, canViewLogs]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return logs;
    return logs.filter((row) =>
      [row.actor_id, row.actor_name || "", row.area, row.action, row.target || ""].join(" ").toLowerCase().includes(q)
    );
  }, [logs, query]);

  if (status === "loading" || canViewLogs === null || loading) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">
        <RefreshCw className="text-yellow-500 animate-spin" size={28} />
      </div>
    );
  }

  if (!session || !canViewLogs) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6">
        <div className="text-center">
          <Shield className="text-red-500 mx-auto mb-4" size={42} />
          <p className="uppercase text-sm tracking-widest text-red-400">Admin access required</p>
          <button onClick={() => router.push("/")} className="mt-4 px-4 py-2 border border-white/10 rounded-lg">Back to Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-widest">Activity Logs</h1>
            <p className="text-neutral-500 text-xs uppercase tracking-widest mt-2">Admin panel and knowledge moderation events</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin" className="px-3 py-2 border border-white/10 rounded-lg text-xs uppercase tracking-widest flex items-center gap-2 hover:border-yellow-500/40 min-h-10">
              <ChevronLeft size={14} /> Back
            </Link>
            <button onClick={loadLogs} className="px-3 py-2 border border-yellow-500/30 bg-yellow-500/10 text-yellow-400 rounded-lg text-xs uppercase tracking-widest">
              Refresh
            </button>
          </div>
        </div>

        <div className="mb-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search logs by actor, action, area, target"
            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-yellow-500/40"
          />
        </div>

        <div className="border border-white/10 rounded-2xl overflow-hidden bg-black/30">
          <div className="hidden md:grid grid-cols-[170px_160px_180px_1fr_180px] gap-3 px-4 py-3 text-[10px] uppercase tracking-widest text-neutral-500 border-b border-white/10">
            <div>Time</div>
            <div>Actor</div>
            <div>Area / Action</div>
            <div>Target / Meta</div>
            <div>Role</div>
          </div>

          <div className="divide-y divide-white/10">
            {filtered.map((row) => (
              <div key={row.id} className="px-4 py-3 grid grid-cols-1 md:grid-cols-[170px_160px_180px_1fr_180px] gap-2 md:gap-3 text-sm">
                <div className="text-neutral-400 text-xs">{new Date(row.created_at).toLocaleString()}</div>
                <div className="text-white text-xs break-all">{row.actor_name || row.actor_id}</div>
                <div className="text-xs uppercase tracking-widest">
                  <span className="text-yellow-400">{row.area}</span>
                  <span className="text-neutral-500"> / </span>
                  <span className="text-neutral-200">{row.action}</span>
                </div>
                <div className="text-xs text-neutral-300 break-all">
                  {row.target || "-"}
                  {row.metadata ? <div className="mt-1 text-neutral-500">{JSON.stringify(row.metadata)}</div> : null}
                </div>
                <div className="text-xs uppercase tracking-widest text-neutral-500">{row.actor_role || "manager"}</div>
              </div>
            ))}

            {filtered.length === 0 && (
              <div className="px-4 py-10 text-center text-neutral-600 uppercase tracking-widest text-xs">No log entries found</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
