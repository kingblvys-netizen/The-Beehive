"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import { BookOpen, ChevronLeft, Search } from "lucide-react";

type Article = {
  id: number;
  slug: string;
  title: string;
  category: string;
  summary?: string | null;
  updated_at: string;
};

export default function StaffKnowledgeIndexPage() {
  const { data: session, status } = useSession();
  const [articles, setArticles] = useState<Article[]>([]);
  const [accessDenied, setAccessDenied] = useState(false);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/knowledge/articles?audience=internal", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (res.status === 403 || res.status === 401) setAccessDenied(true);
          setArticles([]);
          return;
        }
        setAccessDenied(false);
        setArticles(Array.isArray(data?.articles) ? data.articles : []);
      } finally {
        setLoading(false);
      }
    };

    if (status === "authenticated") {
      load();
    }
  }, [status]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return articles.filter((a) => {
      const matchesQuery = !q || [a.title, a.category, a.summary || ""].join(" ").toLowerCase().includes(q);
      const matchesCategory = activeCategory === "all" || a.category === activeCategory;
      return matchesQuery && matchesCategory;
    });
  }, [activeCategory, articles, query]);

  const categories = useMemo(() => {
    const values = Array.from(new Set(articles.map((a) => a.category).filter(Boolean))).sort();
    return ["all", ...values];
  }, [articles]);

  if (status === "loading" || loading) {
    return <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">Loading staff knowledge...</div>;
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-black uppercase tracking-widest mb-3">Staff Knowledge</h1>
          <p className="text-neutral-400 mb-5">Sign in to access staff documentation.</p>
          <button onClick={() => signIn("discord")} className="px-4 py-2 rounded-lg border border-yellow-500/40 bg-yellow-500/10 text-yellow-300">Sign in with Discord</button>
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-black uppercase tracking-widest mb-3">Staff Knowledge</h1>
          <p className="text-neutral-400 mb-5">You are signed in, but not on the Staff/Managers access list yet.</p>
          <p className="text-xs uppercase tracking-widest text-yellow-400">Ask a Manager/Admin to grant staff access in Admin Panel.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto pb-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-yellow-400 mb-6 min-h-10">
          <ChevronLeft size={14} /> Back to Home
        </Link>

        <div className="mb-8 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-widest flex items-center gap-3">
              <BookOpen className="text-yellow-500" size={22} /> Staff Knowledge
            </h1>
            <p className="text-neutral-500 text-xs uppercase tracking-widest mt-2">Internal docs for staff and managers</p>
          </div>
          <Link href="/knowledge" className="px-3 py-2 border border-white/10 rounded-lg text-xs uppercase tracking-widest hover:border-yellow-500/40 min-h-10">Public Announcements</Link>
        </div>

        <div className="relative mb-5">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search staff knowledge"
            aria-label="Search staff knowledge"
            className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-3 py-3.5 text-sm outline-none focus:border-yellow-500/40"
          />
        </div>

        <div className="mb-5 overflow-x-auto pb-1">
          <div className="flex items-center gap-2 min-w-max">
            {categories.map((category) => {
              const selected = category === activeCategory;
              return (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`px-3 py-2 rounded-lg text-xs uppercase tracking-widest border min-h-10 ${selected ? "border-yellow-500/40 bg-yellow-500/10 text-yellow-300" : "border-white/10 text-neutral-300"}`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((article) => (
            <Link
              href={`/staff-knowledge/${article.slug}`}
              key={article.id}
              className="block border border-white/10 bg-black/30 rounded-xl p-4 hover:border-yellow-500/40 transition-colors min-h-[150px]"
            >
              <div className="text-sm font-black uppercase tracking-wide">{article.title}</div>
              <div className="text-[10px] text-yellow-400 uppercase tracking-widest mt-1">{article.category}</div>
              {article.summary ? <p className="text-sm text-neutral-400 mt-3 line-clamp-3">{article.summary}</p> : null}
              <p className="text-[10px] text-neutral-600 mt-3 uppercase tracking-widest">
                Updated {new Date(article.updated_at).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-xs text-neutral-600 uppercase tracking-widest mt-12">No internal articles published yet.</div>
        )}
      </div>
    </div>
  );
}
