import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MeatSpace — Human-in-the-Loop API for AI Agents',
  description: 'When your AI agent needs subjective human judgment, MeatSpace routes the decision to a human and returns a structured result. REST API, MCP, and SDK support.',
  keywords: ['human-in-the-loop', 'HITL', 'AI agents', 'MCP', 'Model Context Protocol', 'agent tools', 'human judgment API'],
  metadataBase: new URL('https://meatspace.run'),
  openGraph: {
    title: 'MeatSpace — Human-in-the-Loop for AI Agents',
    description: 'Give your AI agent a way to ask a human. Submit choices, get a decision back. REST API, MCP, TypeScript & Python SDKs.',
    url: 'https://meatspace.run',
    siteName: 'MeatSpace',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'MeatSpace — Human-in-the-Loop for AI Agents',
    description: 'Give your AI agent a way to ask a human. Submit choices, get a decision back.',
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://meatspace.run',
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
