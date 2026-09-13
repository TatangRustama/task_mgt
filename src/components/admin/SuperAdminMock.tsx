import { ReactNode } from "react";
import { PageHeader, PageMain } from "@/components/layout/PageMain";
import { Card, CardContent } from "@/components/ui/card";

export function SuperAdminMockNotice({ text }: { text: string }) {
  return (
    <p className="rounded-lg border border-dashed border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant">
      {text}
    </p>
  );
}

export function SuperAdminMockPage({
  title,
  subtitle,
  notice,
  children,
}: {
  title: string;
  subtitle: string;
  notice: string;
  children: ReactNode;
}) {
  return (
    <PageMain className="max-w-5xl space-y-4">
      <PageHeader title={title} subtitle={subtitle} />
      <SuperAdminMockNotice text={notice} />
      {children}
    </PageMain>
  );
}

export function SuperAdminMockCard({
  title,
  value,
  hint,
}: {
  title: string;
  value: string;
  hint: string;
}) {
  return (
    <Card>
      <CardContent className="space-y-1 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">{title}</p>
        <p className="text-2xl font-bold text-on-surface">{value}</p>
        <p className="text-xs text-on-surface-variant">{hint}</p>
      </CardContent>
    </Card>
  );
}
