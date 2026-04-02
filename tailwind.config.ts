import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        hitl: {
          bg: 'var(--hitl-bg)',
          surface: 'var(--hitl-surface)',
          'surface-hover': 'var(--hitl-surface-hover)',
          border: 'var(--hitl-border)',
          'border-hover': 'var(--hitl-border-hover)',
          text: 'var(--hitl-text)',
          'text-secondary': 'var(--hitl-text-secondary)',
          'text-muted': 'var(--hitl-text-muted)',
          accent: 'var(--hitl-accent)',
          'accent-soft': 'var(--hitl-accent-soft)',
          approve: 'var(--hitl-approve)',
          'approve-soft': 'var(--hitl-approve-soft)',
          reject: 'var(--hitl-reject)',
          'reject-soft': 'var(--hitl-reject-soft)',
          warning: 'var(--hitl-warning)',
          'warning-soft': 'var(--hitl-warning-soft)',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
