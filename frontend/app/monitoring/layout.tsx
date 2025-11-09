import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Live Monitoring | Nautilink',
  description: 'Real-time fleet monitoring with AI-powered insights',
};

export default function MonitoringLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
