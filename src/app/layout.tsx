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

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: 'What is a human-in-the-loop MCP server?',
    a: 'A human-in-the-loop (HITL) MCP server lets an AI agent pause mid-task and route a decision to a real human. The agent submits a question and 2–4 choices via the Model Context Protocol; a human reviews and selects one; the agent resumes with the answer. MeatSpace is a hosted HITL MCP server — your agent calls the ask_human tool over HTTPS and a human approves via a magic-link page, no login required.',
  },
  {
    q: 'How do I add human approval to a Claude, Cursor, or Cline agent?',
    a: 'Install MeatSpace as a remote MCP server. In Claude Code: `claude mcp add meatspace --transport http https://meatspace.run/api/mcp`. In Cursor or Cline, add the same URL under mcpServers in your config. Provision an API key by calling the unauthenticated provision_api_key tool (no signup). The agent can then call ask_human before any destructive or subjective action.',
  },
  {
    q: 'How do I pause an AI agent for a human decision?',
    a: 'In code: call the MeatSpace ask_human tool (MCP) or POST /api/requests (REST) with your question and 2–4 choices, then long-poll GET /api/requests/{id}/wait or register a webhook callback URL. The agent blocks (or fires-and-forgets) until a human selects an option. For LangGraph use the ask_human helper in our safe-autonomous-agent template; for Claude Code use the meatspace-hitl skill.',
  },
  {
    q: 'What is the ask_human MCP tool?',
    a: 'ask_human is MeatSpace’s primary MCP tool. It accepts a title, content, choices array, optional confidence and recommended_option, and returns the human-selected choice id. Requires a Bearer token (provision one for free via provision_api_key, no signup). Long-polls up to 25 seconds; pass callback_url for webhook delivery on longer waits.',
  },
  {
    q: 'How does MeatSpace compare to gotoHuman, HumanLayer, and ask-human-mcp?',
    a: 'MeatSpace is hosted (no infra to run), MCP-native (works with any MCP client), framework-agnostic (LangGraph, CrewAI, AutoGen, vanilla Anthropic/OpenAI SDK), and reviewer-anonymous (the human gets a magic link by email/SMS — no account, no dashboard). HumanLayer is SDK-decorator-based and IDE-centric. gotoHuman is dashboard-based. ask-human-mcp is local-file-based. Pick MeatSpace when the reviewer is on a phone or isn’t the developer.',
  },
  {
    q: 'How do I add human-in-the-loop to a LangChain or LangGraph agent?',
    a: 'Use the safe-autonomous-agent template (examples/safe-autonomous-agent in the MeatSpace repo). It wraps LangGraph’s tools node so any tool in DANGEROUS_TOOLS routes through MeatSpace ask_human before execution. Works alongside LangGraph’s built-in interrupt() — MeatSpace handles the reviewer notification, magic link, and result delivery so you don’t have to build a reviewer UI.',
  },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'MeatSpace',
              url: 'https://meatspace.run',
              description:
                'Human-in-the-loop API and MCP server for AI agents. Pause your agent for a human decision via magic-link review. Works with Claude Code, Cursor, Cline, LangChain, LangGraph, CrewAI, AutoGen.',
              applicationCategory: 'DeveloperApplication',
              operatingSystem: 'Any',
              offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
              featureList: [
                'MCP server (ask_human tool)',
                'REST API',
                'Browser SDK',
                'Self-serve API keys (no signup)',
                'Webhook callbacks (HMAC-signed)',
                'Long-polling',
                'Magic-link reviewer UX (no login)',
                'Multi-choice decision routing (2-4 options)',
              ],
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: FAQ_ITEMS.map((item) => ({
                '@type': 'Question',
                name: item.q,
                acceptedAnswer: { '@type': 'Answer', text: item.a },
              })),
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'MeatSpace',
              url: 'https://meatspace.run',
              logo: 'https://meatspace.run/icon.png',
              description:
                'MeatSpace is a hosted human-in-the-loop MCP server for AI agents.',
              sameAs: [
                'https://github.com/zmarten/meatspace',
                'https://registry.modelcontextprotocol.io/v0/servers?search=meatspace',
              ],
            }),
          }}
        />
        {children}
      </body>
    </html>
  );
}
