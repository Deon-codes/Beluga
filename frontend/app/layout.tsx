import type { Metadata } from 'next';
import './globals.css';
import { ShellLayout } from '@/components/ShellLayout';

export const metadata: Metadata = {
  title: 'SONAR-AI // Marine Debris & Hazard Detection System (NIOT-MoES)',
  description:
    'Automated Side-Scan Sonar marine debris/hazard detection system identifying shipwrecks, ghost nets, pipelines and seafloor anomalies from acoustic waterfall scans (Ministry of Earth Sciences / NIOT).',
  openGraph: {
    title: 'SONAR-AI // Marine Debris & Hazard Detection System',
    description:
      'Automated Side-Scan Sonar marine debris/hazard detection system identifying shipwrecks, ghost nets, pipelines and seafloor anomalies from acoustic waterfall scans.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body suppressHydrationWarning className="bg-[#020617] text-slate-200 antialiased overflow-hidden">
        <ShellLayout>{children}</ShellLayout>
      </body>
    </html>
  );
}
