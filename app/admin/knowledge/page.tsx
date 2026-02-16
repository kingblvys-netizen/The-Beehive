"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ADMIN_IDS } from "@/lib/config";
import { BookOpen, ChevronLeft, Copy, Eye, Files, PenSquare, Plus, Save, Search, Trash2 } from "lucide-react";
import MarkdownContent from "@/app/knowledge/components/MarkdownContent";

type Article = {
  id: number;
  slug: string;
  title: string;
  category: string;
  summary?: string | null;
  content: string;
  published: boolean;
  updated_at: string;
};

type SessionUser = {
  id?: string;
  discordId?: string;
};

type FormState = {
  title: string;
  slug: string;
  category: string;
  summary: string;
  content: string;
  published: boolean;
};

type EditorTab = "write" | "preview";

type TemplateKey = "rules" | "commands" | "procedure" | "mobile";

const EMPTY_FORM: FormState = {
  title: "",
  slug: "",
  category: "general",
  summary: "",
  content: "",
  published: false,
};

const TEMPLATE_PRESETS: Record<TemplateKey, { label: string; template: Pick<FormState, "title" | "category" | "summary" | "content"> }> = {
  rules: {
    label: "Rules Template",
    template: {
      title: "Community Rules",
      category: "rules",
      summary: "Core behavior rules and moderation expectations.",
      content: `## Purpose\nBriefly explain what this ruleset covers.\n\n## Core Rules\n- Rule 1\n- Rule 2\n- Rule 3\n\n## Enforcement\n- First offense:\n- Repeated offense:\n\n## Notes for Staff\nAdd moderation context and edge cases here.`,
    },
  },
  commands: {
    label: "Commands Template",
    template: {
      title: "Staff Command Reference",
      category: "commands",
      summary: "Quick reference for in-game and Discord commands.",
      content: `## Command Table\n| Command | Usage | Permission |\n|---|---|---|\n| /example | What it does | Staff |\n\n## Command Details\n### /example\n- Purpose:\n- Parameters:\n- Expected output:\n\n## Troubleshooting\n- If command fails, check...`,
    },
  },
  procedure: {
    label: "Procedure Template",
    template: {
      title: "Operational Procedure",
      category: "procedures",
      summary: "Step-by-step process for a recurring staff task.",
      content: `## Scope\nWhat this procedure applies to.\n\n## Prerequisites\n- Access needed\n- Tools needed\n\n## Steps\n1. Step one\n2. Step two\n3. Step three\n\n## Escalation\nIf blocked, contact...\n\n## Checklist\n- [ ] Validation complete\n- [ ] Follow-up complete`,
    },
  },
  mobile: {
    label: "Mobile Quick Guide",
    template: {
      title: "Mobile Staff Quick Guide",
      category: "mobile",
      summary: "Phone-friendly quick actions and emergency steps.",
      content: `## Quick Actions (Phone)\n- Action 1\n- Action 2\n\n## Emergency Flow\n1. Confirm issue\n2. Contain issue\n3. Notify team\n\n## Mobile Tips\n- Keep messages short and clear\n- Use saved shortcuts\n- Confirm final state before closing`,
    },
  },
};

export default function AdminKnowledgePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [articles, setArticles] = useState<Article[]>([]);
  const [selected, setSelected] = useState<Article | null>(null);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editorTab, setEditorTab] = useState<EditorTab>("write");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);

  const sessionUser = (session?.user || {}) as SessionUser;
  const isAdmin = ADMIN_IDS.includes(String(sessionUser.id || sessionUser.discordId || ""));

  const loadArticles = async (search = "") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/knowledge/articles?q=${encodeURIComponent(search)}`, { cache: "no-store" });
      const data = await res.json();
      setArticles(Array.isArray(data?.articles) ? data.articles : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      loadArticles();
    }
  }, [status]);

  useEffect(() => {
    if (!selected) {
      setForm(EMPTY_FORM);
      return;
    }
    setForm({
      title: selected.title || "",
      slug: selected.slug || "",
      category: selected.category || "general",
      summary: selected.summary || "",
      content: selected.content || "",
      published: Boolean(selected.published),
    });
  }, [selected]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return articles;
    return articles.filter((a) =>
      [a.title, a.slug, a.category, a.summary || ""].join(" ").toLowerCase().includes(q)
    );
  }, [articles, query]);

  const wordCount = useMemo(() => {
    const normalized = form.content.trim();
    if (!normalized) return 0;
    return normalized.split(/\s+/).filter(Boolean).length;
  }, [form.content]);

  const readingTimeMins = useMemo(() => {
    if (!wordCount) return 0;
    return Math.max(1, Math.ceil(wordCount / 220));
  }, [wordCount]);

  const onCreateNew = () => {
    setSelected(null);
    setForm(EMPTY_FORM);
    setEditorTab("write");
  };

  const applyTemplate = (templateKey: TemplateKey) => {
    const preset = TEMPLATE_PRESETS[templateKey];
    if (!preset) return;

    const hasContent = Boolean(form.title.trim() || form.summary.trim() || form.content.trim());
    if (hasContent && !confirm("Replace current content with selected template?")) return;

    setSelected(null);
    setForm({
      ...EMPTY_FORM,
      ...preset.template,
      slug: "",
    });
    setEditorTab("write");
  };

  const duplicateCurrent = () => {
    if (!selected) return;
    setSelected(null);
    setForm((prev) => ({
      ...prev,
      title: `${prev.title} (Copy)`,
      slug: "",
      published: false,
    }));
    setEditorTab("write");
  };

  const copyArticleLink = async () => {
    if (!selected?.slug) return;
    const url = `${window.location.origin}/knowledge/${selected.slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      alert("Failed to copy article link.");
    }
  };

  const currentDraftKey = useMemo(() => {
    return selected?.id ? `kb_draft_${selected.id}` : "kb_draft_new";
  }, [selected?.id]);

  const applyMarkdownSnippet = useCallback((prefix: string, suffix = "") => {
    const el = textAreaRef.current;
    if (!el) {
      setForm((prev) => ({ ...prev, content: `${prev.content}${prefix}${suffix}` }));
      return;
    }

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const before = form.content.slice(0, start);
    const selectedText = form.content.slice(start, end);
    const after = form.content.slice(end);
    const next = `${before}${prefix}${selectedText}${suffix}${after}`;
    setForm((prev) => ({ ...prev, content: next }));

    setTimeout(() => {
      el.focus();
      const cursor = start + prefix.length + selectedText.length + suffix.length;
      el.setSelectionRange(cursor, cursor);
    }, 0);
  }, [form.content]);

  const onSave = useCallback(async () => {
    if (!form.title.trim() || !form.content.trim()) {
      alert("Title and content are required.");
      return;
    }

    setSaving(true);
    try {
      const isEditing = Boolean(selected?.id);
      const endpoint = isEditing ? `/api/knowledge/articles/${selected?.id}` : "/api/knowledge/articles";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Save failed");
      }

      const article = data?.article as Article;
      if (article) {
        setSelected(article);
      }
      localStorage.removeItem(currentDraftKey);
      setSavedAt(Date.now());
      await loadArticles(query);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Save failed";
      alert(message);
    } finally {
      setSaving(false);
    }
  }, [currentDraftKey, form, query, selected?.id]);

  const onDelete = async () => {
    if (!selected?.id) return;
    if (!confirm("Delete this article permanently?")) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/knowledge/articles/${selected.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Delete failed");

      setSelected(null);
      setForm(EMPTY_FORM);
      await loadArticles(query);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Delete failed";
      alert(message);
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem(currentDraftKey);
      if (!saved) return;

      const parsed = JSON.parse(saved) as FormState;
      if (parsed && typeof parsed === "object") {
        setForm((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      localStorage.removeItem(currentDraftKey);
    }
  }, [currentDraftKey]);

  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(currentDraftKey, JSON.stringify(form));
      setSavedAt(Date.now());
    }, 350);
    return () => clearTimeout(timer);
  }, [currentDraftKey, form]);

  useEffect(() => {
    const onKeydown = (event: KeyboardEvent) => {
      const isSaveCombo = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s";
      if (!isSaveCombo) return;
      event.preventDefault();
      void onSave();
    };
    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  }, [onSave]);

  if (status === "loading" || loading) {
    return <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">Loading knowledge base...</div>;
  }

  if (!session || !isAdmin) {
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
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-8 font-mono">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-widest flex items-center gap-3">
              <BookOpen className="text-yellow-500" size={22} /> Knowledge Base
            </h1>
            <p className="text-neutral-500 text-xs uppercase tracking-widest mt-2">Create and maintain staff documentation inside the platform</p>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Link href="/admin" className="px-3 py-2 border border-white/10 rounded-lg text-xs uppercase tracking-widest flex items-center gap-2 hover:border-yellow-500/40 min-h-10">
              <ChevronLeft size={14} /> Back
            </Link>
            <Link href="/knowledge" className="px-3 py-2 border border-white/10 rounded-lg text-xs uppercase tracking-widest hover:border-yellow-500/40 min-h-10">
              View Staff KB
            </Link>
            <Link href="/admin/knowledge/import" className="px-3 py-2 border border-white/10 rounded-lg text-xs uppercase tracking-widest hover:border-yellow-500/40 min-h-10">
              Bulk Import
            </Link>
            <span className="ml-auto md:ml-0 text-[10px] uppercase tracking-widest text-neutral-500">
              {savedAt ? `Draft Saved ${new Date(savedAt).toLocaleTimeString()}` : "Not Saved Yet"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <aside className="lg:col-span-1 border border-white/10 rounded-2xl bg-black/30 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search articles"
                  aria-label="Search knowledge articles"
                  className="w-full bg-black/40 border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none focus:border-yellow-500/40"
                />
              </div>
              <button onClick={() => loadArticles(query)} className="px-3 py-2.5 border border-white/10 rounded-lg text-xs uppercase min-h-10">Go</button>
            </div>

            <button onClick={onCreateNew} className="w-full mb-3 px-3 py-2.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 rounded-lg text-xs uppercase tracking-widest flex items-center justify-center gap-2 min-h-10">
              <Plus size={14} /> New Article
            </button>

            <div className="mb-3 grid grid-cols-2 gap-2">
              {(Object.keys(TEMPLATE_PRESETS) as TemplateKey[]).map((key) => (
                <button
                  key={key}
                  onClick={() => applyTemplate(key)}
                  className="px-2 py-2 border border-white/10 rounded-lg text-[10px] uppercase tracking-widest hover:border-yellow-500/40 bg-black/20"
                >
                  {TEMPLATE_PRESETS[key].label}
                </button>
              ))}
            </div>

            <div className="space-y-2 max-h-[62vh] overflow-y-auto pr-1">
              {filtered.map((article) => (
                <button
                  key={article.id}
                  onClick={() => setSelected(article)}
                  aria-label={`Open article ${article.title}`}
                  className={`w-full text-left p-3 rounded-lg border transition ${selected?.id === article.id ? "border-yellow-500/40 bg-yellow-500/10" : "border-white/10 bg-black/20 hover:border-white/20"}`}
                >
                  <div className="text-sm font-bold uppercase tracking-wide line-clamp-1">{article.title}</div>
                  <div className="text-[10px] text-neutral-500 mt-1 uppercase tracking-widest">{article.category} • {article.published ? "Published" : "Draft"}</div>
                </button>
              ))}
              {filtered.length === 0 && <div className="text-xs text-neutral-600 uppercase tracking-widest p-3">No articles found.</div>}
            </div>
          </aside>

          <section className="lg:col-span-2 border border-white/10 rounded-2xl bg-black/30 p-4 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <input
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Article title"
                aria-label="Article title"
                className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-yellow-500/40"
              />
              <input
                value={form.slug}
                onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
                placeholder="Slug (optional)"
                aria-label="Article slug"
                className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-yellow-500/40"
              />
              <input
                value={form.category}
                onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                placeholder="Category (rules, commands, procedures...)"
                aria-label="Article category"
                className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-yellow-500/40"
              />
              <input
                value={form.summary}
                onChange={(e) => setForm((prev) => ({ ...prev, summary: e.target.value }))}
                placeholder="Short summary"
                aria-label="Article summary"
                className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-yellow-500/40"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 mb-3 text-[10px] uppercase tracking-widest text-neutral-500">
              <span>{wordCount} words</span>
              <span>{readingTimeMins} min read</span>
              {selected?.updated_at ? <span>Updated {new Date(selected.updated_at).toLocaleDateString()}</span> : <span>Unsaved Article</span>}
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-3">
              <button onClick={() => applyMarkdownSnippet("## ")} className="px-2.5 py-1.5 border border-white/15 rounded text-[11px] uppercase">H2</button>
              <button onClick={() => applyMarkdownSnippet("### ")} className="px-2.5 py-1.5 border border-white/15 rounded text-[11px] uppercase">H3</button>
              <button onClick={() => applyMarkdownSnippet("**", "**")} className="px-2.5 py-1.5 border border-white/15 rounded text-[11px] uppercase">Bold</button>
              <button onClick={() => applyMarkdownSnippet("*", "*")} className="px-2.5 py-1.5 border border-white/15 rounded text-[11px] uppercase">Italic</button>
              <button onClick={() => applyMarkdownSnippet("- ")} className="px-2.5 py-1.5 border border-white/15 rounded text-[11px] uppercase">List</button>
              <button onClick={() => applyMarkdownSnippet("1. ")} className="px-2.5 py-1.5 border border-white/15 rounded text-[11px] uppercase">Numbered</button>
              <button onClick={() => applyMarkdownSnippet("`", "`")} className="px-2.5 py-1.5 border border-white/15 rounded text-[11px] uppercase">Code</button>
              <button onClick={() => applyMarkdownSnippet("[Link Text](https://)")} className="px-2.5 py-1.5 border border-white/15 rounded text-[11px] uppercase">Link</button>
              <button onClick={() => applyMarkdownSnippet("\n---\n")} className="px-2.5 py-1.5 border border-white/15 rounded text-[11px] uppercase">Divider</button>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => setEditorTab("write")}
                className={`px-3 py-2 rounded-lg text-xs uppercase tracking-widest border ${editorTab === "write" ? "border-yellow-500/40 bg-yellow-500/10 text-yellow-300" : "border-white/10 text-neutral-300"}`}
              >
                <PenSquare size={12} className="inline mr-2" /> Write
              </button>
              <button
                onClick={() => setEditorTab("preview")}
                className={`px-3 py-2 rounded-lg text-xs uppercase tracking-widest border ${editorTab === "preview" ? "border-yellow-500/40 bg-yellow-500/10 text-yellow-300" : "border-white/10 text-neutral-300"}`}
              >
                <Eye size={12} className="inline mr-2" /> Preview
              </button>
              <span className="text-[10px] text-neutral-500 uppercase tracking-widest">Cmd/Ctrl + S to save</span>
            </div>

            {editorTab === "write" ? (
              <textarea
                ref={textAreaRef}
                value={form.content}
                onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
                placeholder="Write article content here (markdown supported)."
                aria-label="Article content"
                className="w-full min-h-[360px] md:min-h-[440px] bg-black/40 border border-white/10 rounded-lg px-3 py-3 text-sm outline-none focus:border-yellow-500/40"
              />
            ) : (
              <div className="w-full min-h-[360px] md:min-h-[440px] bg-black/40 border border-white/10 rounded-lg px-3 py-3 overflow-y-auto">
                <MarkdownContent content={form.content || "No content yet. Start writing in the Write tab."} />
              </div>
            )}

            <div className="mt-4 hidden md:flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-xs uppercase tracking-widest text-neutral-400">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(e) => setForm((prev) => ({ ...prev, published: e.target.checked }))}
                />
                Published (visible to staff)
              </label>

              <div className="flex items-center gap-2">
                {selected?.slug && (
                  <button
                    onClick={copyArticleLink}
                    className="px-3 py-2 border border-white/15 bg-black/30 text-neutral-200 rounded-lg text-xs uppercase tracking-widest flex items-center gap-2 min-h-10"
                  >
                    <Copy size={14} /> {copied ? "Copied" : "Copy Link"}
                  </button>
                )}
                {selected?.id && (
                  <button
                    onClick={duplicateCurrent}
                    disabled={saving || deleting}
                    className="px-3 py-2 border border-white/20 bg-white/5 text-neutral-200 rounded-lg text-xs uppercase tracking-widest flex items-center gap-2 disabled:opacity-50 min-h-10"
                  >
                    <Files size={14} /> Duplicate
                  </button>
                )}
                {selected?.id && (
                  <button
                    onClick={onDelete}
                    disabled={deleting || saving}
                    className="px-3 py-2 border border-red-500/30 bg-red-500/10 text-red-300 rounded-lg text-xs uppercase tracking-widest flex items-center gap-2 disabled:opacity-50 min-h-10"
                  >
                    <Trash2 size={14} /> {deleting ? "Deleting..." : "Delete"}
                  </button>
                )}
                <button
                  onClick={onSave}
                  disabled={saving || deleting}
                  className="px-4 py-2 border border-yellow-500/40 bg-yellow-500/10 text-yellow-300 rounded-lg text-xs uppercase tracking-widest flex items-center gap-2 disabled:opacity-50 min-h-10"
                >
                  <Save size={14} /> {saving ? "Saving..." : selected?.id ? "Update Article" : "Create Article"}
                </button>
              </div>
            </div>

            <div className="md:hidden mt-4 border border-white/10 rounded-xl p-3 bg-black/40">
              <label className="flex items-center gap-2 text-xs uppercase tracking-widest text-neutral-400 mb-3">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(e) => setForm((prev) => ({ ...prev, published: e.target.checked }))}
                />
                Published (visible to staff)
              </label>
              <div className="flex items-center gap-2">
                {selected?.slug && (
                  <button
                    onClick={copyArticleLink}
                    className="flex-1 px-3 py-2.5 border border-white/15 bg-black/30 text-neutral-200 rounded-lg text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                  >
                    <Copy size={14} /> {copied ? "Copied" : "Link"}
                  </button>
                )}
                {selected?.id && (
                  <button
                    onClick={duplicateCurrent}
                    disabled={saving || deleting}
                    className="flex-1 px-3 py-2.5 border border-white/20 bg-white/5 text-neutral-200 rounded-lg text-xs uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Files size={14} /> Duplicate
                  </button>
                )}
                {selected?.id && (
                  <button
                    onClick={onDelete}
                    disabled={deleting || saving}
                    className="flex-1 px-3 py-2.5 border border-red-500/30 bg-red-500/10 text-red-300 rounded-lg text-xs uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Trash2 size={14} /> {deleting ? "Deleting..." : "Delete"}
                  </button>
                )}
                <button
                  onClick={onSave}
                  disabled={saving || deleting}
                  className="flex-1 px-4 py-2.5 border border-yellow-500/40 bg-yellow-500/10 text-yellow-300 rounded-lg text-xs uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Save size={14} /> {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
