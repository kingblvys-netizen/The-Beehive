import "./apply.css";
import type { ReactNode } from "react";

export default function ApplyLayout({ children }: { children: ReactNode }) {
  return (
    <div className="apply-bg">
      <div className="apply-shell">{children}</div>
    </div>
  );
}