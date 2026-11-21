/** AuthLayout — centred Card used by every public auth page (rendered outside AppShell). */
import type { ReactNode } from 'react';
import { Card } from '@/components/ui/Card';

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-neutral px-4 py-12">
      <Card className="w-full max-w-md p-8">{children}</Card>
    </div>
  );
}
