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

const appName =
  process.env.APP_NAME?.trim() ||
  process.env.NEXT_PUBLIC_APP_NAME?.trim() ||
  'Busy Notify';
const appTitle =
  process.env.APP_TITLE?.trim() ||
  process.env.NEXT_PUBLIC_APP_TITLE?.trim() ||
  `${appName} - Internal Ordering Portal`;
const appDescription =
  process.env.APP_DESCRIPTION?.trim() ||
  'Internal ordering system portal for customers and salesmen. Place orders, track history, and manage your business efficiently.';

export const metadata: Metadata = {
  title: appTitle,
  applicationName: appName,
  description: appDescription,
  keywords: ['ordering', 'portal', 'internal', 'business', 'B2B'],
  authors: [{ name: appName }],
  icons: {
    icon: '/theme/icon',
    shortcut: '/theme/icon',
    apple: '/theme/icon',
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
        <Providers appName={appName} appTitle={appTitle}>
          {children}
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
