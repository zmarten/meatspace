import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'HITL — Human-in-the-Loop',
  description: 'Your taste, judgment, and opinion — on demand for any AI agent.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
