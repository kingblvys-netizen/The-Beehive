import { ReactNode } from "react";

export default function ApplicationShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#070b16] via-[#0b1220] to-[#06080f] text-white">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">{title}</h1>
        {subtitle ? (
          <p className="mt-3 text-sm md:text-base text-white/70">{subtitle}</p>
        ) : null}

        <section className="mt-8 rounded-2xl border border-white/10 bg-black/30 backdrop-blur-md shadow-[0_0_40px_rgba(255,200,0,.08)] p-6 md:p-8">
          {children}
        </section>
      </div>
    </main>
  );
}