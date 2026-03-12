/*
 * File Context:
 * Purpose: Defines the shared Next.js layout for layout.tsx.
 * Primary Functionality: Wraps child routes with shared structure, providers, and layout-level behavior.
 * Interlinked With: src/app/globals.css, src/components/ui/toaster.tsx, src/shared/components/providers.tsx
 * Role: role-based user-facing UI.
 */
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { Providers } from '@/shared/components/providers';

export const metadata: Metadata = {
  title: 'Busy Notify - Internal Ordering Portal',
  description:
    'Internal ordering system portal for customers and salesmen. Place orders, track history, and manage your business efficiently.',
  keywords: ['ordering', 'portal', 'internal', 'business', 'B2B'],
  authors: [{ name: 'Busy Notify Team' }],
  icons: {
    icon: '/logo.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground">
        <Providers>
          {children}
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
