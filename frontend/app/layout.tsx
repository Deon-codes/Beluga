import type { Metadata } from 'next';
import './globals.css';
import { ShellLayout } from '@/components/ShellLayout';

export const metadata: Metadata = {
  title: 'Beluga',
  description:
    'Beluga: Automated Side-Scan Sonar marine debris/hazard detection system identifying shipwrecks, ghost nets, pipelines and seafloor anomalies.',
  openGraph: {
    title: 'Beluga',
    description:
      'Beluga: Automated Side-Scan Sonar marine debris/hazard detection system identifying shipwrecks, ghost nets, pipelines and seafloor anomalies.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning className="antialiased overflow-hidden">
        <ShellLayout>{children}</ShellLayout>
      </body>
    </html>
  );
}
