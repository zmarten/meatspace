import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MEATSPACE — flesh-in-the-loop',
  description: 'Your edge cases need thumbs. We have thumbs. MeatSpace is the flesh-in-the-loop dispatch layer for autonomous agents.',
  openGraph: {
    title: 'MEATSPACE',
    description: 'Flesh-in-the-loop dispatch for autonomous agents.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
