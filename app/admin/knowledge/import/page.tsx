"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ChevronLeft, FileUp, ListChecks } from "lucide-react";

function countSections(raw: string) {
  const normalized = raw.replace(/\r\n/g, "\n").trim();
  if (!normalized) return 0;
  const delimited = normalized.split(/\n\s*---\s*\n/g).filter((x) => x.trim());
  if (delimited.length > 1) return delimited.length;
  const headingSplit = normalized.split(/\n(?=#{1,3}\s+)/g).filter((x) => x.trim());
  if (headingSplit.length > 1) return headingSplit.length;
  return 1;
}

export default function KnowledgeBulkImportPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [canManageKnowledge, setCanManageKnowledge] = useState<boolean | null>(null);

  const [rawText, setRawText] = useState("");
  const [category, setCategory] = useState("general");
  const [audience, setAudience] = useState<"internal" | "public">("internal");
  const [published, setPublished] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ importedCount: number; imported: Array<{ id: number; title: string; slug: string; audience?: "internal" | "public" }> } | null>(null);

  useEffect(() => {
    const loadAccess = async () => {
      try {
        const res = await fetch("/api/admin/access/me", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        setCanManageKnowledge(Boolean(data?.canManageKnowledge));
      } catch {
        setCanManageKnowledge(false);
      }
    };

    if (status === "authenticated") loadAccess();
    if (status === "unauthenticated") setCanManageKnowledge(false);
  }, [status]);

  const estimatedSections = useMemo(() => countSections(rawText), [rawText]);

  const runImport = async () => {
    if (!rawText.trim()) {
      alert("Paste handbook content first.");
      return;
    }

    setImporting(true);
    setResult(null);
    try {
      const res = await fetch("/api/knowledge/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText, category, audience, published }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Import failed");
      }

      setResult({
        importedCount: Number(data?.importedCount || 0),
        imported: Array.isArray(data?.imported) ? data.imported : [],
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Import failed";
      alert(message);
    } finally {
      setImporting(false);
    }
  };

  if (status === "loading" || canManageKnowledge === null) {
    return <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">Loading...</div>;
  }

  if (!session || !canManageKnowledge) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">
        <div className="text-center">
          <p className="uppercase text-sm tracking-widest text-red-400">Admin access required</p>
          <button onClick={() => router.push("/")} className="mt-4 px-4 py-2 border border-white/10 rounded-lg">Back to Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-widest flex items-center gap-3">
              <FileUp className="text-yellow-500" size={22} /> Bulk Import Content
            </h1>
            <p className="text-neutral-500 text-xs uppercase tracking-widest mt-2">Paste content and split it into multiple internal or public posts.</p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/admin/knowledge" className="px-3 py-2 border border-white/10 rounded-lg text-xs uppercase tracking-widest flex items-center gap-2 hover:border-yellow-500/40 min-h-10">
              <ChevronLeft size={14} /> Back to Knowledge Editor
            </Link>
          </div>
        </div>

        <section className="border border-white/10 rounded-2xl bg-black/30 p-4 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Default category"
              className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-yellow-500/40"
            />
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value === "public" ? "public" : "internal")}
              className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-yellow-500/40"
            >
              <option value="internal">Post to: Admin Knowledge Page (Staff/Internal)</option>
              <option value="public">Post to: Public Announcement Page</option>
            </select>
            <label className="flex items-center gap-2 text-xs uppercase tracking-widest text-neutral-400 border border-white/10 rounded-lg px-3 py-2">
              <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
              Publish imported content immediately ({audience === "public" ? "public" : "staff-only"})
            </label>
          </div>

          <div className="mb-3 text-[11px] text-neutral-400 space-y-1">
            <p className="font-bold uppercase tracking-widest text-yellow-300 flex items-center gap-2"><ListChecks size={12} /> Import rules</p>
            <p>- Use `---` on its own line to split into separate content items, or use Markdown headings (`#`, `##`, `###`).</p>
            <p>- First heading in each section becomes the content title.</p>
            <p>- If no section markers exist, one content item is created.</p>
          </div>

          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Paste handbook content here..."
            className="w-full min-h-[320px] md:min-h-[420px] bg-black/40 border border-white/10 rounded-lg px-3 py-3 text-sm outline-none focus:border-yellow-500/40"
          />

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <span className="text-[10px] uppercase tracking-widest text-neutral-500">Estimated items: {estimatedSections}</span>
            <button
              onClick={runImport}
              disabled={importing}
              className="px-4 py-2.5 border border-yellow-500/40 bg-yellow-500/10 text-yellow-300 rounded-lg text-xs uppercase tracking-widest disabled:opacity-50"
            >
              {importing ? "Importing..." : "Import Content"}
            </button>
          </div>
        </section>

        {result && (
          <section className="mt-4 border border-green-500/20 rounded-2xl bg-green-500/5 p-4 md:p-6">
            <p className="text-sm uppercase tracking-widest text-green-400 font-bold">Imported {result.importedCount} item(s)</p>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
              {result.imported.map((item) => (
                <Link
                  key={item.id}
                  href={`${item.audience === "public" ? "/knowledge" : "/staff-knowledge"}/${item.slug}`}
                  className="px-3 py-2 border border-white/10 rounded-lg bg-black/30 text-sm hover:border-yellow-500/40"
                >
                  {item.title}
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
