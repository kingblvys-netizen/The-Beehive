"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import { ChevronLeft } from "lucide-react";
import MarkdownContent from "@/app/knowledge/components/MarkdownContent";

type Article = {
  id: number;
  slug: string;
  title: string;
  category: string;
  summary?: string | null;
  content: string;
  updated_at: string;
};

export default function KnowledgeArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const [article, setArticle] = useState<Article | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const { data: session, status } = useSession();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const p = await params;
        const res = await fetch(`/api/knowledge/articles/${encodeURIComponent(p.id)}`, { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error || "Failed to load article");
        }
        setArticle(data?.article || null);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load article";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    if (status === "authenticated") {
      load();
    }
  }, [params, status]);

  if (status === "loading" || loading) {
    return <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">Loading article...</div>;
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-black uppercase tracking-widest mb-3">Knowledge Base</h1>
          <p className="text-neutral-400 mb-5">Sign in to access staff documentation.</p>
          <button onClick={() => signIn("discord")} className="px-4 py-2 rounded-lg border border-yellow-500/40 bg-yellow-500/10 text-yellow-300">Sign in with Discord</button>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-[#050505] text-white p-4 md:p-6">
        <div className="max-w-3xl mx-auto">
          <Link href="/knowledge" className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-yellow-400 mb-6 min-h-10">
            <ChevronLeft size={14} /> Back to Knowledge Base
          </Link>
          <div className="text-red-400 uppercase text-sm tracking-widest">{error || "Article not found"}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-8 font-mono">
      <article className="max-w-4xl mx-auto pb-10">
        <Link href="/knowledge" className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-yellow-400 mb-6 min-h-10">
          <ChevronLeft size={14} /> Back to Knowledge Base
        </Link>

        <div className="border border-white/10 bg-black/30 rounded-2xl p-6 md:p-8">
          <div className="text-[10px] text-yellow-400 uppercase tracking-widest mb-2">{article.category}</div>
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight mb-4">{article.title}</h1>
          {article.summary ? <p className="text-neutral-300 mb-6">{article.summary}</p> : null}
          <p className="text-[10px] text-neutral-600 mb-6 uppercase tracking-widest">
            Updated {new Date(article.updated_at).toLocaleString()}
          </p>
          <MarkdownContent content={article.content} />
        </div>

        <Link href="/knowledge" className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-yellow-400 mt-6 min-h-10">
          <ChevronLeft size={14} /> Back to Knowledge Base
        </Link>
      </article>
    </div>
  );
}
