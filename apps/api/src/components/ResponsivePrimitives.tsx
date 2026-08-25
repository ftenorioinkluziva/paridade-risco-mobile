import type { ReactNode } from "react";

type GridProps = {
  children: ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
};

export function ResponsiveGrid({ children, columns = 3, className = "" }: GridProps) {
  return <div className={`responsive-grid responsive-grid--${columns} ${className}`.trim()}>{children}</div>;
}

type ContentStateProps = {
  title: string;
  description: string;
  tone?: "neutral" | "loading" | "danger" | "warning" | "success";
  action?: ReactNode;
};

export function ContentState({ title, description, tone = "neutral", action }: ContentStateProps) {
  return (
    <section
      className={`content-state content-state--${tone}`}
      role={tone === "danger" ? "alert" : "status"}
      aria-live={tone === "loading" ? "polite" : undefined}
      aria-busy={tone === "loading" || undefined}
    >
      {tone === "loading" ? <span className="content-state-skeleton" aria-hidden="true" /> : null}
      <strong>{title}</strong>
      <p>{description}</p>
      {action ? <div className="content-state-action">{action}</div> : null}
    </section>
  );
}

export function ResponsiveTable({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="responsive-table-region" role="region" aria-label={label} tabIndex={0}>
      <table className="responsive-table">{children}</table>
    </div>
  );
}
