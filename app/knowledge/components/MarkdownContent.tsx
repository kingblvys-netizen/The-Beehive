"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="max-w-none text-neutral-100 leading-relaxed text-sm md:text-base">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight mt-8 mb-4">{children}</h1>,
          h2: ({ children }) => <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight mt-7 mb-3 text-yellow-300">{children}</h2>,
          h3: ({ children }) => <h3 className="text-lg md:text-xl font-bold uppercase tracking-tight mt-6 mb-3">{children}</h3>,
          p: ({ children }) => <p className="mb-4 text-neutral-100">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-6 mb-4 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-6 mb-4 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="text-neutral-100">{children}</li>,
          a: ({ href, children }) => (
            <a href={href} className="text-yellow-400 underline underline-offset-4" target="_blank" rel="noreferrer">
              {children}
            </a>
          ),
          code: ({ children }) => (
            <code className="bg-black/50 border border-white/10 rounded px-1.5 py-0.5 text-yellow-300 text-xs md:text-sm">{children}</code>
          ),
          pre: ({ children }) => <pre className="bg-black/70 border border-white/10 rounded-xl p-3 md:p-4 overflow-x-auto mb-4">{children}</pre>,
          blockquote: ({ children }) => <blockquote className="border-l-2 border-yellow-500/60 pl-4 py-1 text-neutral-300 italic mb-4">{children}</blockquote>,
          hr: () => <hr className="my-6 border-white/10" />,
          table: ({ children }) => <div className="overflow-x-auto mb-4"><table className="w-full border-collapse text-left">{children}</table></div>,
          th: ({ children }) => <th className="border border-white/10 px-3 py-2 bg-black/40 text-xs uppercase tracking-widest">{children}</th>,
          td: ({ children }) => <td className="border border-white/10 px-3 py-2">{children}</td>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
