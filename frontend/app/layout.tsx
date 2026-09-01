import type { Metadata } from 'next';
import './globals.css';
import { ShellLayout } from '@/components/ShellLayout';

export const metadata: Metadata = {
  title: 'Beluga - Sonar Intelligence',
  description:
    'Beluga: Automated Side-Scan Sonar marine debris/hazard detection system identifying shipwrecks, ghost nets, pipelines and seafloor anomalies.',
  icons: {
    icon: '/images/logo.jpeg',
    shortcut: '/images/logo.jpeg',
    apple: '/images/logo.jpeg',
  },
  openGraph: {
    title: 'Beluga - Sonar Intelligence',
    description:
      'Beluga: Automated Side-Scan Sonar marine debris/hazard detection system identifying shipwrecks, ghost nets, pipelines and seafloor anomalies.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/images/logo.jpeg" type="image/jpeg" />
      </head>
      <body suppressHydrationWarning className="antialiased overflow-hidden">
        <ShellLayout>{children}</ShellLayout>
      </body>
    </html>
  );
}
