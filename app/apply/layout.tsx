import "./apply.css";
import type { ReactNode } from "react";

export default function ApplyLayout({ children }: { children: ReactNode }) {
  return (
    <main className="bee-apply-bg">
      <div className="relative z-10 mx-auto max-w-6xl px-4 md:px-8 py-10 md:py-14">
        {children}
      </div>
    </main>
  );
}