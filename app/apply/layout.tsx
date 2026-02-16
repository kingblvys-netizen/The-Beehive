import "./apply.css";
import type { ReactNode } from "react";

export default function ApplyLayout({ children }: { children: ReactNode }) {
  return (
    <main className="home-theme min-h-screen text-white">
      <div className="mx-auto max-w-6xl px-4 md:px-8 py-10 md:py-14">
        {children}
      </div>
    </main>
  );
}