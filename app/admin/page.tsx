"use client";

import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from "next-auth/react";
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence, useSpring, useMotionValue } from 'framer-motion';
import { 
  Hexagon, Shield, Search, XCircle, 
  CheckCircle2, XSquare, Lock, Unlock, RefreshCw, 
  AlertTriangle, Power, Activity, Target, PieChart, ExternalLink, BookOpen, ClipboardList
} from 'lucide-react';
import { roles as staticRoleData, getQuestions } from '../data';
import { APPLICATION_RETENTION_DAYS } from '@/lib/config'; // use shared config

type ApplicationRecord = {
  id: number;
  discord_id: string;
  username: string;
  role_id?: string;
  role_title: string;
  status: string;
  audit_note?: string | null;
  created_at?: string;
  answers?: unknown;
  responses?: unknown;
  application_answers?: unknown;
};

type RoleSettingsPayload = {
  settings?: Record<string, boolean>;
};

type ApplicationsPayload = {
  applications?: ApplicationRecord[];
  pagination?: {
    page?: number;
    pageSize?: number;
    total?: number;
    totalPages?: number;
    hasPrev?: boolean;
    hasNext?: boolean;
  };
};

type AccessMePayload = {
  authenticated?: boolean;
  role?: "senior_admin" | "manager" | "staff" | null;
  canOpenAdminPanel?: boolean;
  canAccessAdmin?: boolean;
  canAccessKnowledge?: boolean;
  canManageKnowledge?: boolean;
  canViewLogs?: boolean;
  canManageAccessControl?: boolean;
  discordId?: string;
};

type AccessEntry = {
  discord_id: string;
  display_name?: string | null;
  role: "senior_admin" | "manager" | "staff";
  role_label?: string | null;
  source: "bootstrap" | "db";
  added_by?: string | null;
  updated_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type AccessAuditRow = {
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

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // Data State
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [roleSettings, setRoleSettings] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<ApplicationRecord | null>(null);
  const [appDetailLoading, setAppDetailLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "declined" | "reset">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalApplications, setTotalApplications] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [cleanupDays, setCleanupDays] = useState<number>(APPLICATION_RETENTION_DAYS);
  const [cleanupIncludeDeclined, setCleanupIncludeDeclined] = useState(true);
  const [cleanupIncludeReset, setCleanupIncludeReset] = useState(true);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<string>("");
  const [enableCursorFx, setEnableCursorFx] = useState(false);
  const [canOpenAdminPanel, setCanOpenAdminPanel] = useState<boolean | null>(null);
  const [canAccessAdmin, setCanAccessAdmin] = useState(false);
  const [canManageKnowledge, setCanManageKnowledge] = useState(false);
  const [canViewLogs, setCanViewLogs] = useState(false);
  const [canManageAccessControl, setCanManageAccessControl] = useState(false);
  const [currentAccessRole, setCurrentAccessRole] = useState<"senior_admin" | "manager" | "staff" | null>(null);
  const [accessEntries, setAccessEntries] = useState<AccessEntry[]>([]);
  const [accessLoading, setAccessLoading] = useState(false);
  const [newAccessName, setNewAccessName] = useState("");
  const [newAccessDiscordId, setNewAccessDiscordId] = useState("");
  const [newAccessRole, setNewAccessRole] = useState<"manager" | "staff">("staff");
  const [accessSubmitting, setAccessSubmitting] = useState(false);
  const [accessBackfilling, setAccessBackfilling] = useState(false);
  const [editingAccessDiscordId, setEditingAccessDiscordId] = useState<string | null>(null);
  const [editingAccessName, setEditingAccessName] = useState("");
  const [accessAudit, setAccessAudit] = useState<AccessAuditRow[]>([]);
  const [accessAuditLoading, setAccessAuditLoading] = useState(false);
  const deferredSearchTerm = useDeferredValue(searchTerm);

  // --- 1. SURGICAL PRECISION CURSOR (ZERO LAG) ---
  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);
  // Re-tuned for instant hardware tracking
  const springConfig = { damping: 40, stiffness: 1000, mass: 0.1 };
  const cursorX = useSpring(mouseX, springConfig);
  const cursorY = useSpring(mouseY, springConfig);
  const cursorFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const pointerMedia = window.matchMedia("(pointer: fine)");
    const motionMedia = window.matchMedia("(prefers-reduced-motion: reduce)");

    const sync = () => {
      setEnableCursorFx(pointerMedia.matches && !motionMedia.matches);
    };

    sync();
    pointerMedia.addEventListener("change", sync);
    motionMedia.addEventListener("change", sync);

    return () => {
      pointerMedia.removeEventListener("change", sync);
      motionMedia.removeEventListener("change", sync);
    };
  }, []);

  useEffect(() => {
    if (!enableCursorFx) return;

    const moveCursor = (e: MouseEvent) => {
      const nextX = e.clientX - 16;
      const nextY = e.clientY - 16;
      if (cursorFrameRef.current !== null) {
        cancelAnimationFrame(cursorFrameRef.current);
      }
      cursorFrameRef.current = requestAnimationFrame(() => {
        mouseX.set(nextX);
        mouseY.set(nextY);
        cursorFrameRef.current = null;
      });
    };
    window.addEventListener("mousemove", moveCursor, { passive: true });
    return () => {
      window.removeEventListener("mousemove", moveCursor);
      if (cursorFrameRef.current !== null) {
        cancelAnimationFrame(cursorFrameRef.current);
      }
    };
  }, [enableCursorFx, mouseX, mouseY]);

  const openApplication = async (app: ApplicationRecord) => {
    setSelectedApp(app);
    setAppDetailLoading(true);

    try {
      const res = await fetch(`/api/admin/applications/${app.id}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Failed to load application details");
      }

      const fullApp = data?.application as ApplicationRecord | undefined;
      if (!fullApp) return;

      setApplications((prev) => prev.map((row) => (row.id === app.id ? { ...row, ...fullApp } : row)));
      setSelectedApp((prev) => (prev?.id === app.id ? { ...prev, ...fullApp } : prev));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load application details";
      alert(message);
    } finally {
      setAppDetailLoading(false);
    }
  };

  const resolveAccess = async () => {
    try {
      const res = await fetch('/api/admin/access/me', { cache: 'no-store' });
      const data = (await res.json().catch(() => ({}))) as AccessMePayload;
      setCurrentAccessRole(data?.role || null);
      setCanOpenAdminPanel(Boolean(data?.canOpenAdminPanel));
      setCanAccessAdmin(Boolean(data?.canAccessAdmin));
      setCanManageKnowledge(Boolean(data?.canManageKnowledge));
      setCanViewLogs(Boolean(data?.canViewLogs));
      setCanManageAccessControl(Boolean(data?.canManageAccessControl));
    } catch {
      setCurrentAccessRole(null);
      setCanOpenAdminPanel(false);
      setCanAccessAdmin(false);
      setCanManageKnowledge(false);
      setCanViewLogs(false);
      setCanManageAccessControl(false);
    }
  };

  const loadAccessEntries = async () => {
    setAccessLoading(true);
    try {
      const res = await fetch('/api/admin/access', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setAccessEntries(Array.isArray(data?.entries) ? (data.entries as AccessEntry[]) : []);
      }
    } finally {
      setAccessLoading(false);
    }
  };

  const loadAccessAudit = async () => {
    setAccessAuditLoading(true);
    try {
      const res = await fetch('/api/admin/logs?area=access-control&limit=25', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setAccessAudit(Array.isArray(data?.logs) ? (data.logs as AccessAuditRow[]) : []);
      }
    } finally {
      setAccessAuditLoading(false);
    }
  };

  const upsertAccessEntry = async () => {
    const discordId = newAccessDiscordId.trim();
    if (!discordId) {
      alert('Discord ID is required.');
      return;
    }

    setAccessSubmitting(true);
    try {
      const res = await fetch('/api/admin/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discordId, displayName: newAccessName.trim(), role: newAccessRole }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to update access');
      setNewAccessName('');
      setNewAccessDiscordId('');
      await loadAccessEntries();
      await loadAccessAudit();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update access';
      alert(message);
    } finally {
      setAccessSubmitting(false);
    }
  };

  const removeAccessEntry = async (discordId: string) => {
    if (!confirm(`Remove access for ${discordId}?`)) return;
    try {
      const res = await fetch('/api/admin/access', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discordId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to remove access');
      await loadAccessEntries();
      await loadAccessAudit();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to remove access';
      alert(message);
    }
  };

  const changeAccessRole = async (discordId: string, role: "manager" | "staff") => {
    try {
      const res = await fetch('/api/admin/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discordId, role }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to update role');
      await loadAccessEntries();
      await loadAccessAudit();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update role';
      alert(message);
    }
  };

  const startEditAccessName = (entry: AccessEntry) => {
    setEditingAccessDiscordId(entry.discord_id);
    setEditingAccessName(String(entry.display_name || ""));
  };

  const cancelEditAccessName = () => {
    setEditingAccessDiscordId(null);
    setEditingAccessName("");
  };

  const saveAccessName = async (entry: AccessEntry) => {
    if (entry.role === "senior_admin") {
      alert("Senior Admin entries are protected.");
      return;
    }

    const nextName = editingAccessName.trim();
    try {
      const res = await fetch('/api/admin/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discordId: entry.discord_id,
          displayName: nextName,
          role: entry.role === "manager" ? "manager" : "staff",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to save name');
      await loadAccessEntries();
      await loadAccessAudit();
      cancelEditAccessName();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to save name';
      alert(message);
    }
  };

  const backfillKnownAccessNames = async () => {
    const candidates = accessEntries.filter(
      (entry) =>
        (entry.role === "manager" || entry.role === "staff") &&
        String(entry.display_name || '').trim()
    );
    if (candidates.length === 0) {
      alert('No known names available to backfill right now.');
      return;
    }

    setAccessBackfilling(true);
    try {
      await Promise.all(
        candidates.map(async (entry) => {
          await fetch('/api/admin/access', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              discordId: entry.discord_id,
              displayName: String(entry.display_name || '').trim(),
              role: entry.role,
            }),
          });
        })
      );

      await loadAccessEntries();
      await loadAccessAudit();
    } finally {
      setAccessBackfilling(false);
    }
  };

  // --- 2. DATA FETCHING (SATELLITE SYNC) ---
  const canModifyAccessEntry = (entry: AccessEntry) => {
    if (currentAccessRole === "senior_admin") return entry.role !== "senior_admin";
    if (currentAccessRole === "manager") return entry.role === "staff";
    return false;
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const appParams = new URLSearchParams({
        page: String(currentPage),
        pageSize: String(pageSize),
        status: statusFilter,
      });

      const trimmedQuery = deferredSearchTerm.trim();
      if (trimmedQuery) {
        appParams.set("q", trimmedQuery);
      }

      const [appRes, roleRes] = await Promise.all([
        fetch(`/api/admin/applications?${appParams.toString()}`, { cache: "no-store" }),
        fetch('/api/admin/toggle-role', { cache: "no-store" }),
      ]);

      const appPayload = (await appRes.json().catch(() => ({}))) as ApplicationsPayload | ApplicationRecord[];
      if (appRes.ok) {
        if (Array.isArray(appPayload)) {
          setApplications(appPayload as ApplicationRecord[]);
          setTotalApplications(appPayload.length);
          setTotalPages(1);
        } else {
          setApplications(Array.isArray(appPayload?.applications) ? appPayload.applications : []);
          const nextPage = Math.max(1, Number(appPayload?.pagination?.page || 1));
          const nextTotal = Math.max(0, Number(appPayload?.pagination?.total || 0));
          const nextTotalPages = Math.max(1, Number(appPayload?.pagination?.totalPages || 1));
          setCurrentPage(nextPage);
          setTotalApplications(nextTotal);
          setTotalPages(nextTotalPages);
        }
      }

      const rolePayload = (await roleRes.json().catch(() => ({}))) as RoleSettingsPayload | Array<{ role_id: string; is_open: boolean | null }>;

      const settingsMap: Record<string, boolean> = Array.isArray(rolePayload)
        ? Object.fromEntries(rolePayload.map((r) => [r.role_id, Boolean(r.is_open)]))
        : (rolePayload?.settings || {});

      setRoleSettings(settingsMap);
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, statusFilter, deferredSearchTerm]);

  useEffect(() => {
    if (status === "authenticated") {
      resolveAccess();
    }
    if (status === "unauthenticated") {
      setCurrentAccessRole(null);
      setCanOpenAdminPanel(false);
      setCanAccessAdmin(false);
      setCanManageKnowledge(false);
      setCanViewLogs(false);
      setCanManageAccessControl(false);
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    if (status === "authenticated" && canManageAccessControl) {
      loadAccessEntries();
    }
    if (status === "authenticated" && canViewLogs) {
      loadAccessAudit();
    }
    if (status === "authenticated" && canOpenAdminPanel === false) {
      setLoading(false);
    }
  }, [status, canOpenAdminPanel, canManageAccessControl, canViewLogs]);

  useEffect(() => {
    if (status === "authenticated" && canOpenAdminPanel) {
      fetchData();
    }
  }, [status, canOpenAdminPanel, fetchData]);

  // --- 3. DASHBOARD STATS ---
  const stats = useMemo(() => {
    const pending = applications.filter((app) => app.status === 'pending').length;
    const approved = applications.filter((app) => app.status === 'approved').length;
    const successRate = applications.length > 0 ? Math.round((approved / applications.length) * 100) : 0;

    const roleCount: Record<string, number> = {};
    for (const app of applications) {
      const key = app.role_title || 'unknown';
      roleCount[key] = (roleCount[key] || 0) + 1;
    }

    const mostPopular = applications.length > 0
      ? Object.entries(roleCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'
      : 'N/A';

    return { pending, successRate, mostPopular };
  }, [applications]);

  // --- 4. ACTIONS (APPROVE, DECLINE, RESET) ---
  const handleDecision = async (id: number, decision: string) => {
    setProcessingId(id);
    try {
      const res = await fetch('/api/admin/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          applicationId: id, 
          status: decision 
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setApplications(prev => prev.map(app =>
          app.id === id
            ? {
                ...app,
                status: data?.application?.status ?? (decision === 'reset' ? 'pending' : decision),
                audit_note: data?.application?.audit_note ?? app.audit_note
              }
            : app
        ));
        if (selectedApp?.id === id) {
          setSelectedApp((prev) => prev ? {
            ...prev,
            status: data?.application?.status ?? (decision === 'reset' ? 'pending' : decision),
            audit_note: data?.application?.audit_note ?? prev.audit_note
          } : prev);
        }
      } else {
        alert(data?.error || "Decision failed.");
      }
    } catch {
      alert("Action failed.");
    } finally {
      setProcessingId(null);
    }
  };

  const toggleRole = async (roleId: string, currentStatus: boolean) => {
    // Optimistic UI update
    setRoleSettings(prev => ({ ...prev, [roleId]: !currentStatus }));
    try {
      await fetch('/api/admin/toggle-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleId, isOpen: !currentStatus }),
      });
    } catch {
      setRoleSettings(prev => ({ ...prev, [roleId]: currentStatus }));
      alert("Failed to update recruitment channel.");
    }
  };

  const handleDeleteApplication = async (id: string) => {
    if (!confirm("Delete this application permanently?")) return;
    try {
      setDeletingId(id);
      const res = await fetch(`/api/admin/applications/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Delete failed");
      }
      setApplications((prev) => prev.filter((a) => String(a.id) !== String(id)));
      if (String(selectedApp?.id) === String(id)) setSelectedApp(null);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Delete failed";
      alert(message);
    } finally {
      setDeletingId(null);
    }
  };

  const runCleanup = async (dryRun: boolean) => {
    if (!cleanupIncludeDeclined && !cleanupIncludeReset) {
      alert("Select at least one status to clean up.");
      return;
    }

    try {
      setCleanupLoading(true);
      setCleanupResult("");
      const res = await fetch('/api/admin/cleanup-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dryRun,
          days: cleanupDays,
          includeDeclined: cleanupIncludeDeclined,
          includeReset: cleanupIncludeReset,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Cleanup request failed');
      }

      if (dryRun) {
        setCleanupResult(`Dry run complete: ${data?.willDelete ?? 0} records would be removed.`);
      } else {
        setCleanupResult(`Cleanup complete: ${data?.deletedCount ?? 0} records removed.`);
        await fetchData();
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Cleanup request failed';
      setCleanupResult(`Error: ${message}`);
    } finally {
      setCleanupLoading(false);
    }
  };

  const filteredApps = applications;

  // ACCESS GATE
  if (status === "loading" || canOpenAdminPanel === null || loading) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
      <RefreshCw className="text-yellow-500 animate-spin" size={48} />
      <span className="text-[10px] font-black uppercase tracking-[0.5em] animate-pulse">Loading admin data...</span>
    </div>
  );

  if (!session || !canOpenAdminPanel) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
        <Shield size={64} className="text-red-500 mb-6 animate-pulse" />
        <h1 className="text-3xl font-black uppercase tracking-widest">Access Forbidden</h1>
        <button onClick={() => router.push('/')} className="mt-8 px-8 py-3 border border-white/10 rounded font-bold uppercase text-[10px]">Exit Hub</button>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-[#050505] text-white font-sans selection:bg-yellow-500 selection:text-black relative antialiased ${enableCursorFx ? "cursor-none" : ""}`}>
      
      {/* CURSOR */}
      {enableCursorFx ? (
        <motion.div className="fixed top-0 left-0 pointer-events-none z-[9999] text-yellow-500 mix-blend-difference" style={{ x: cursorX, y: cursorY }}>
          <Hexagon fill="currentColor" size={24} className="opacity-80" />
        </motion.div>
      ) : null}

      {/* NAV */}
      <nav className="border-b border-white/5 bg-black/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/')}>
            <Hexagon className="text-yellow-500 fill-yellow-500" size={24} />
            <h1 className="text-lg font-black tracking-widest uppercase italic">Admin Panel</h1>
          </div>
          <div className="flex items-center gap-6">
            {canManageKnowledge ? (
              <Link
                href="/admin/knowledge"
                className="px-3 py-2 border border-yellow-500/30 bg-yellow-500/10 text-yellow-400 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-yellow-500/20"
              >
                <BookOpen size={12} /> Knowledge Editor
              </Link>
            ) : (
              <Link
                href="/staff-knowledge"
                className="px-3 py-2 border border-blue-500/30 bg-blue-500/10 text-blue-300 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-blue-500/20"
              >
                <BookOpen size={12} /> Staff Knowledge
              </Link>
            )}
            {canViewLogs && (
              <Link
                href="/admin/logs"
                className="px-3 py-2 border border-white/15 bg-white/5 text-neutral-200 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:border-yellow-500/30"
              >
                <ClipboardList size={12} /> Activity Logs
              </Link>
            )}
            <button
              onClick={() => {
                fetchData();
                if (canManageAccessControl) loadAccessEntries();
                if (canViewLogs) loadAccessAudit();
              }}
              className="p-2 text-neutral-500 hover:text-yellow-500 transition-colors"
            >
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
            <div className="text-right">
              <div className="text-[9px] font-black text-green-500 uppercase flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"/> Connected
              </div>
              <div className="text-xs font-bold text-neutral-400">{session.user?.name}</div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        
        {/* --- DASHBOARD SUMMARY --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-neutral-900/50 border border-white/5 p-6 rounded-xl flex items-center gap-4 backdrop-blur-sm">
            <Activity className="text-yellow-500" size={32} />
            <div>
              <div className="text-2xl font-black">{stats.pending}</div>
              <div className="text-[10px] text-neutral-500 uppercase tracking-widest">Pending Applications</div>
            </div>
          </div>
          <div className="bg-neutral-900/50 border border-white/5 p-6 rounded-xl flex items-center gap-4 backdrop-blur-sm">
            <PieChart className="text-green-500" size={32} />
            <div>
              <div className="text-2xl font-black">{stats.successRate}%</div>
              <div className="text-[10px] text-neutral-500 uppercase tracking-widest">Approval Rate</div>
            </div>
          </div>
          <div className="bg-neutral-900/50 border border-white/5 p-6 rounded-xl flex items-center gap-4 backdrop-blur-sm">
            <Target className="text-blue-500" size={32} />
            <div>
              <div className="text-lg font-black truncate max-w-[150px] uppercase">{stats.mostPopular}</div>
              <div className="text-[10px] text-neutral-500 uppercase tracking-widest">Most Applied Role</div>
            </div>
          </div>
        </div>

        {canAccessAdmin ? (
        <>
        {/* RECRUITMENT CHANNEL CONTROLS */}
        <div className="mb-12">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-600 mb-6 flex items-center gap-2">
            <Power size={12} /> Role Availability (Open/Locked)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {staticRoleData.map(role => {
              const isOpen = roleSettings[role.id] !== false; 
              return (
                <button key={role.id} onClick={() => toggleRole(role.id, isOpen)} className={`p-4 border rounded-xl text-left transition-all ${isOpen ? 'border-green-500/20 bg-green-500/5' : 'border-red-500/20 bg-red-500/5 grayscale opacity-50'}`}>
                  <div className="text-[9px] font-black uppercase text-neutral-500 mb-1 truncate">{role.title}</div>
                  <div className={`text-[10px] font-bold uppercase flex items-center gap-2 ${isOpen ? 'text-green-500' : 'text-red-500'}`}>
                    {isOpen ? <Unlock size={10} /> : <Lock size={10} />} {isOpen ? 'Open' : 'Locked'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* DATA RETENTION CLEANUP */}
        <div className="mb-12 bg-neutral-900/30 border border-white/5 rounded-2xl p-5 md:p-6 backdrop-blur-md">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-4 flex items-center gap-2">
            <AlertTriangle size={12} /> Old Application Cleanup
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <div className="md:col-span-1">
              <label className="block text-[10px] uppercase tracking-widest text-neutral-500 mb-2">Retention Days</label>
              <input
                type="number"
                min={7}
                max={3650}
                value={cleanupDays}
                onChange={(e) => setCleanupDays(Math.max(7, Number(e.target.value || APPLICATION_RETENTION_DAYS)))}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-yellow-500/40"
              />
            </div>

            <div className="md:col-span-2 flex flex-wrap items-end gap-4">
              <label className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-neutral-400">
                <input
                  type="checkbox"
                  checked={cleanupIncludeDeclined}
                  onChange={(e) => setCleanupIncludeDeclined(e.target.checked)}
                />
                Include Declined
              </label>
              <label className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-neutral-400">
                <input
                  type="checkbox"
                  checked={cleanupIncludeReset}
                  onChange={(e) => setCleanupIncludeReset(e.target.checked)}
                />
                Include Reset
              </label>
            </div>

            <div className="md:col-span-1 flex items-end justify-start md:justify-end gap-2">
              <button
                onClick={() => runCleanup(true)}
                disabled={cleanupLoading}
                className="px-3 py-2 border border-yellow-500/40 bg-yellow-500/10 text-yellow-300 rounded-lg text-[10px] uppercase tracking-widest disabled:opacity-50"
              >
                Dry Run
              </button>
              <button
                onClick={() => runCleanup(false)}
                disabled={cleanupLoading}
                className="px-3 py-2 border border-red-500/40 bg-red-500/10 text-red-300 rounded-lg text-[10px] uppercase tracking-widest disabled:opacity-50"
              >
                Execute
              </button>
            </div>
          </div>

          <p className="text-[10px] text-neutral-500 uppercase tracking-widest">
            Deletes records older than {cleanupDays} day(s) for selected statuses.
          </p>
          {cleanupResult && (
            <p className="mt-2 text-xs text-neutral-300">{cleanupResult}</p>
          )}
        </div>

        {/* ACCESS CONTROL */}
        <div className="mb-12 bg-neutral-900/30 border border-white/5 rounded-2xl p-5 md:p-6 backdrop-blur-md">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-4 flex items-center gap-2">
            <Shield size={12} /> Staff & Manager Access Control
          </h3>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <p className="text-xs text-neutral-400">
              Staff can read Staff Knowledge only. Managers/Admin can access the Admin Panel and create/edit knowledge content.
            </p>
            <button
              onClick={backfillKnownAccessNames}
              disabled={accessBackfilling || accessLoading || accessEntries.length === 0}
              className="px-3 py-2 border border-white/20 bg-white/5 text-neutral-200 rounded-lg text-[10px] uppercase tracking-widest disabled:opacity-50"
            >
              {accessBackfilling ? 'Backfilling...' : 'Backfill Known Names'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
            <input
              value={newAccessName}
              onChange={(e) => setNewAccessName(e.target.value)}
              placeholder="Discord name (optional)"
              className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-yellow-500/40"
            />
            <input
              value={newAccessDiscordId}
              onChange={(e) => setNewAccessDiscordId(e.target.value)}
              placeholder="Discord ID (snowflake)"
              className="md:col-span-2 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-yellow-500/40"
            />
            <select
              value={newAccessRole}
              onChange={(e) => setNewAccessRole(e.target.value as "manager" | "staff")}
              className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-yellow-500/40"
            >
              <option value="staff">Staff (Knowledge Read)</option>
              <option value="manager">Managers/Admin (Admin + Knowledge Edit)</option>
            </select>
            <button
              onClick={upsertAccessEntry}
              disabled={accessSubmitting}
              className="px-3 py-2 border border-yellow-500/40 bg-yellow-500/10 text-yellow-300 rounded-lg text-[10px] uppercase tracking-widest disabled:opacity-50"
            >
              {accessSubmitting ? "Saving..." : "Add / Update"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
            {accessEntries.map((entry) => (
              <div key={entry.discord_id} className="border border-white/10 rounded-xl p-3 bg-black/30">
                {(() => {
                  const canModifyEntry = canModifyAccessEntry(entry);
                  const roleLabel = String(
                    entry.role_label ||
                    (entry.role === 'senior_admin' ? 'Senior Admin' : entry.role === 'manager' ? 'Managers/Admin' : 'Staff')
                  );
                  const roleBadgeClass = entry.role === 'senior_admin'
                    ? 'border-purple-500/40 text-purple-300 bg-purple-500/10'
                    : entry.role === 'manager'
                    ? 'border-yellow-500/40 text-yellow-300 bg-yellow-500/10'
                    : 'border-blue-500/30 text-blue-300 bg-blue-500/10';

                  return (
                    <>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-black text-yellow-300 uppercase tracking-wider">{entry.display_name || 'Unknown User'}</div>
                    <div className="text-xs font-bold text-white break-all mt-1">{entry.discord_id}</div>
                  </div>
                  <span className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded border ${roleBadgeClass}`}>
                    {roleLabel}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-[10px] uppercase tracking-widest text-neutral-500">Source: {entry.source}</span>
                  <div className="flex items-center gap-2">
                    {canModifyEntry && editingAccessDiscordId === entry.discord_id ? (
                      <>
                        <button
                          onClick={() => saveAccessName(entry)}
                          className="text-[10px] uppercase tracking-widest px-2 py-1 rounded border border-green-500/40 bg-green-500/10 text-green-300"
                        >
                          Save Name
                        </button>
                        <button
                          onClick={cancelEditAccessName}
                          className="text-[10px] uppercase tracking-widest px-2 py-1 rounded border border-white/20 bg-white/5 text-neutral-300"
                        >
                          Cancel
                        </button>
                      </>
                    ) : canModifyEntry ? (
                      <button
                        onClick={() => startEditAccessName(entry)}
                        className="text-[10px] uppercase tracking-widest px-2 py-1 rounded border border-white/20 bg-white/5 text-neutral-300"
                      >
                        Edit Name
                      </button>
                    ) : null}

                  {entry.source !== 'bootstrap' && canModifyEntry ? (
                    <>
                      {entry.role === 'staff' && currentAccessRole === 'senior_admin' ? (
                        <button
                          onClick={() => changeAccessRole(entry.discord_id, 'manager')}
                          className="text-[10px] uppercase tracking-widest px-2 py-1 rounded border border-yellow-500/40 bg-yellow-500/10 text-yellow-300"
                        >
                          Promote
                        </button>
                      ) : null}
                      {entry.role === 'manager' && currentAccessRole === 'senior_admin' ? (
                        <button
                          onClick={() => changeAccessRole(entry.discord_id, 'staff')}
                          className="text-[10px] uppercase tracking-widest px-2 py-1 rounded border border-blue-500/40 bg-blue-500/10 text-blue-300"
                        >
                          Set Staff
                        </button>
                      ) : null}
                      <button
                        onClick={() => removeAccessEntry(entry.discord_id)}
                        className="text-[10px] uppercase tracking-widest px-2 py-1 rounded border border-red-500/40 bg-red-500/10 text-red-300"
                      >
                        Remove
                      </button>
                    </>
                  ) : canModifyEntry ? (
                    <span className="text-[10px] uppercase tracking-widest text-neutral-600">Protected</span>
                  ) : (
                    <span className="text-[10px] uppercase tracking-widest text-neutral-600">No Peer Control</span>
                  )}
                  </div>
                </div>
                {editingAccessDiscordId === entry.discord_id ? (
                  <div className="mt-2">
                    <input
                      value={editingAccessName}
                      onChange={(e) => setEditingAccessName(e.target.value)}
                      placeholder="Set display name"
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs outline-none focus:border-yellow-500/40"
                    />
                  </div>
                ) : null}
                <div className="mt-2 text-[10px] uppercase tracking-widest text-neutral-600 space-y-1">
                  {entry.updated_by ? <div>Updated by: {entry.updated_by}</div> : null}
                  {entry.updated_at ? <div>Updated: {new Date(entry.updated_at).toLocaleString()}</div> : null}
                </div>
                    </>
                  );
                })()}
              </div>
            ))}
            {!accessLoading && accessEntries.length === 0 && (
              <div className="text-xs text-neutral-500 uppercase tracking-widest">No access entries found.</div>
            )}
          </div>

          <div className="mt-5 border border-white/10 rounded-xl bg-black/20 overflow-hidden">
            <div className="px-3 py-2 border-b border-white/10 text-[10px] uppercase tracking-widest text-neutral-500 flex items-center justify-between">
              <span>Access Audit</span>
              {accessAuditLoading ? <span className="text-yellow-400">Syncing...</span> : null}
            </div>
            <div className="max-h-56 overflow-y-auto divide-y divide-white/5">
              {accessAudit.map((log) => (
                <div key={log.id} className="px-3 py-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-neutral-300 uppercase tracking-widest">{log.action}</span>
                    <span className="text-neutral-600">{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                  <div className="text-neutral-500 break-all">
                    {log.actor_name || log.actor_id} → {log.target || "-"}
                  </div>
                </div>
              ))}
              {!accessAuditLoading && accessAudit.length === 0 ? (
                <div className="px-3 py-6 text-center text-[10px] uppercase tracking-widest text-neutral-600">
                  No access audit events found.
                </div>
              ) : null}
            </div>
          </div>
        </div>
        </>
        ) : (
          <div className="mb-10 border border-blue-500/20 bg-blue-500/5 rounded-2xl p-4 md:p-5">
            <div className="text-blue-300 text-xs uppercase tracking-widest font-black">Staff Access Mode</div>
            <p className="text-sm text-neutral-300 mt-2">You can review applications and open Staff Knowledge. Manager-only controls are hidden.</p>
          </div>
        )}

        {/* SEARCH & TABLE */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_220px_160px] gap-3 items-center">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
            <input 
              type="text" 
              placeholder="SEARCH DATABASE..." 
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-neutral-900/50 border border-white/10 rounded-xl py-4 pl-12 pr-6 text-sm focus:border-yellow-500 outline-none transition-all placeholder:text-neutral-700 text-white font-bold uppercase tracking-widest"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as "all" | "pending" | "approved" | "declined" | "reset");
              setCurrentPage(1);
            }}
            className="bg-neutral-900/50 border border-white/10 rounded-xl py-4 px-4 text-sm focus:border-yellow-500 outline-none text-white font-bold uppercase tracking-widest"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="declined">Declined</option>
            <option value="reset">Reset</option>
          </select>

          <select
            value={String(pageSize)}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-neutral-900/50 border border-white/10 rounded-xl py-4 px-4 text-sm focus:border-yellow-500 outline-none text-white font-bold uppercase tracking-widest"
          >
            <option value="25">25 / Page</option>
            <option value="50">50 / Page</option>
            <option value="100">100 / Page</option>
          </select>
        </div>

        <div className="bg-neutral-900/30 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-md">
          <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left min-w-[860px]">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02] text-[9px] font-black uppercase text-neutral-500 tracking-widest">
                <th className="p-6">Identity</th>
                <th className="p-6">Assignment</th>
                <th className="p-6">Decision Log</th>
                <th className="p-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02]">
              {filteredApps.map((app) => (
                <tr key={app.id} className="group hover:bg-white/[0.02] transition-colors">
                  <td className="p-6">
                    <div className="font-bold text-white text-sm uppercase italic">{app.username}</div>
                    <a href={`https://discord.com/users/${app.discord_id}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-neutral-600 hover:text-blue-400 flex items-center gap-1 mt-1 transition-colors">
                      {app.discord_id} <ExternalLink size={10} />
                    </a>
                  </td>
                  <td className="p-6">
                    <span className="bg-white/5 border border-white/5 px-2 py-1 rounded text-[10px] text-neutral-400 font-bold uppercase">{app.role_title}</span>
                  </td>
                  <td className="p-6">
                    <div className={`text-[10px] font-bold uppercase mb-1 ${app.status === 'approved' ? 'text-green-500' : app.status === 'declined' ? 'text-red-500' : 'text-yellow-500'}`}>{app.status}</div>
                    <div className="text-[8px] text-neutral-600 italic font-medium">{app.audit_note || 'Waiting for manager review'}</div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openApplication(app)}
                      className="px-3 py-2 rounded-lg border border-white/15 text-neutral-200 hover:bg-white/5"
                    >
                      View
                    </button>

                    {canAccessAdmin && app.status !== "pending" && (
                      <button
                        onClick={() => handleDecision(app.id, 'reset')}
                        disabled={processingId === app.id}
                        className="ml-2 px-3 py-1.5 rounded-lg border border-yellow-500/40 bg-yellow-500/10 text-yellow-300 hover:bg-yellow-500/20 disabled:opacity-50"
                      >
                        {processingId === app.id ? "Resetting..." : "Reset"}
                      </button>
                    )}

                    {canAccessAdmin && (
                      <button
                        onClick={() => handleDeleteApplication(String(app.id))}
                        disabled={deletingId === String(app.id)}
                        className="ml-2 px-3 py-1.5 rounded-lg border border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20 disabled:opacity-50"
                      >
                        {deletingId === String(app.id) ? "Deleting..." : "Delete"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          <div className="md:hidden divide-y divide-white/[0.06]">
            {filteredApps.map((app) => (
              <div key={app.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-bold text-white text-sm uppercase italic">{app.username}</div>
                    <div className="text-[11px] text-neutral-500 mt-1 break-all">{app.discord_id}</div>
                  </div>
                  <span className={`text-[10px] font-bold uppercase ${app.status === 'approved' ? 'text-green-500' : app.status === 'declined' ? 'text-red-500' : 'text-yellow-500'}`}>{app.status}</span>
                </div>

                <div className="mt-2 text-[10px] uppercase tracking-widest text-neutral-500">{app.role_title}</div>
                <div className="mt-2 text-[10px] text-neutral-600 italic">{app.audit_note || 'Waiting for manager review'}</div>

                <div className={`mt-3 grid ${canAccessAdmin ? "grid-cols-3" : "grid-cols-1"} gap-2`}>
                  <button
                    onClick={() => openApplication(app)}
                    className="px-2 py-2 rounded-lg border border-white/15 text-neutral-200 hover:bg-white/5 text-[11px] uppercase"
                  >
                    View
                  </button>

                  {canAccessAdmin
                    ? (app.status !== 'pending' ? (
                        <button
                          onClick={() => handleDecision(app.id, 'reset')}
                          disabled={processingId === app.id}
                          className="px-2 py-2 rounded-lg border border-yellow-500/40 bg-yellow-500/10 text-yellow-300 hover:bg-yellow-500/20 disabled:opacity-50 text-[11px] uppercase"
                        >
                          Reset
                        </button>
                      ) : (
                        <div />
                      ))
                    : null}

                  {canAccessAdmin && (
                    <button
                      onClick={() => handleDeleteApplication(String(app.id))}
                      disabled={deletingId === String(app.id)}
                      className="px-2 py-2 rounded-lg border border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20 disabled:opacity-50 text-[11px] uppercase"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {filteredApps.length === 0 && <div className="py-24 text-center text-neutral-700 uppercase font-black tracking-widest text-xs opacity-50">Zero Records Found</div>}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-[10px] uppercase tracking-widest text-neutral-500">
            Showing page {currentPage} / {totalPages} · {totalApplications} total records
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage <= 1}
              className="px-3 py-2 rounded-lg border border-white/15 text-neutral-300 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage >= totalPages}
              className="px-3 py-2 rounded-lg border border-white/15 text-neutral-300 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </main>

      {/* --- DOSSIER MODAL --- */}
      <AnimatePresence>
        {selectedApp && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-[#0c0c0c] border border-white/10 p-5 md:p-10 rounded-2xl md:rounded-[2.5rem] max-w-2xl w-full max-h-[92vh] overflow-y-auto relative shadow-2xl">
              <button onClick={() => setSelectedApp(null)} className="absolute top-4 right-4 md:top-8 md:right-8 text-neutral-600 hover:text-white"><XCircle size={24} /></button>
              
              <div className="mb-8 md:mb-10">
                <div className="text-yellow-500 text-[9px] font-black uppercase tracking-[0.4em] mb-4 flex items-center gap-2"><Shield size={12} /> Application Details</div>
                <h2 className="text-2xl md:text-4xl font-black text-white uppercase italic tracking-tighter mb-4">{selectedApp.username}</h2>
                <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Applying for: <span className="text-white">{selectedApp.role_title}</span></div>
              </div>
              
              <div className="space-y-4 mb-10">
                {(() => {
                  if (appDetailLoading) {
                    return (
                      <div className="text-xs text-neutral-500 uppercase tracking-widest">
                        Loading full application answers...
                      </div>
                    );
                  }

                  const answersObj = normalizeAnswers(
                    selectedApp.answers ?? selectedApp.responses ?? selectedApp.application_answers
                  );
                  const answerEntries = Object.entries(answersObj);

                  const roleConfig = staticRoleData.find((r) =>
                    (selectedApp.role_id && r.id === selectedApp.role_id) ||
                    r.title.trim().toLowerCase() === String(selectedApp.role_title ?? '').trim().toLowerCase()
                  );
                  const allQuestions = roleConfig ? getQuestions(roleConfig.id) : [];

                  if (answerEntries.length === 0) {
                    return (
                      <div className="text-xs text-neutral-500 uppercase tracking-widest">
                        No answer payload found for this application.
                      </div>
                    );
                  }

                  return answerEntries.map(([key, value]) => {
                    const questionLabel = allQuestions.find((q) => q.id === key)?.label || key;
                    return (
                      <div key={key} className="bg-white/[0.02] border border-white/5 p-6 rounded-xl">
                        <div className="text-[9px] font-black uppercase text-neutral-500 mb-2 tracking-widest">{questionLabel}</div>
                        <div className="text-white text-sm leading-relaxed font-medium">{String(value)}</div>
                      </div>
                    );
                  });
                })()}
              </div>
              
              {/* --- ACTION ZONE --- */}
              {canAccessAdmin ? (
                <div className="flex flex-col gap-4 border-t border-white/5 pt-8">
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      disabled={processingId === selectedApp.id} 
                      onClick={() => handleDecision(selectedApp.id, 'approved')} 
                      className="py-4 bg-green-500/10 text-green-500 border border-green-500/20 rounded-xl font-black uppercase text-[10px] flex items-center justify-center gap-2 hover:bg-green-500 hover:text-black transition-all"
                    >
                      <CheckCircle2 size={16}/> Approve Entry
                    </button>
                    <button 
                      disabled={processingId === selectedApp.id} 
                      onClick={() => handleDecision(selectedApp.id, 'declined')} 
                      className="py-4 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl font-black uppercase text-[10px] flex items-center justify-center gap-2 hover:bg-red-500 hover:text-white transition-all"
                    >
                      <XSquare size={16}/> Decline Entry
                    </button>
                  </div>

                  {selectedApp.status !== 'pending' && (
                    <button 
                      disabled={processingId === selectedApp.id} 
                      onClick={() => handleDecision(selectedApp.id, 'reset')} 
                      className="w-full py-4 bg-white/5 text-neutral-500 border border-white/10 rounded-xl font-black uppercase text-[9px] tracking-[0.3em] flex items-center justify-center gap-2 hover:bg-yellow-500/10 hover:text-yellow-500 hover:border-yellow-500/50 transition-all group"
                    >
                      <RefreshCw size={14} className={processingId === selectedApp.id ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500"}/> 
                      Reset to Pending (Allow Re-review)
                    </button>
                  )}
                </div>
              ) : (
                <div className="border-t border-white/5 pt-6 text-xs uppercase tracking-widest text-blue-300">Read-only staff view</div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const normalizeAnswers = (raw: unknown): Record<string, unknown> => {
  if (!raw) return {};

  if (typeof raw === "string") {
    try {
      return normalizeAnswers(JSON.parse(raw));
    } catch {
      return {};
    }
  }

  if (Array.isArray(raw)) {
    const out: Record<string, unknown> = {};
    for (const item of raw) {
      if (item && typeof item === "object") {
        const i = item as Record<string, unknown>;
        const key = String(i.questionId ?? i.id ?? i.question ?? "");
        const val = i.answer ?? i.value ?? "";
        if (key) out[key] = val;
      }
    }
    return out;
  }

  if (typeof raw === "object") return raw as Record<string, unknown>;
  return {};
};