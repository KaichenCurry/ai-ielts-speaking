import Link from "next/link";
import type { ReactNode } from "react";

export function PageShell({
  title,
  description,
  children,
  actions,
}: {
  title: string;
  description: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <main className="page-shell">
      <div className="page-header">
        <div>
          <p className="eyebrow">AI IELTS Speaking MVP</p>
          <h1>{title}</h1>
          <p className="page-description">{description}</p>
        </div>
        {actions ? <div className="page-actions">{actions}</div> : null}
      </div>
      {children}
    </main>
  );
}

export function SectionCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="card">
      <h2>{title}</h2>
      <div className="section-content">{children}</div>
    </section>
  );
}

export function LinkButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link className="link-button" href={href}>
      {children}
    </Link>
  );
}

export function InfoGrid({ children }: { children: ReactNode }) {
  return <div className="info-grid">{children}</div>;
}
