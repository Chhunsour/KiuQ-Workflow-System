import type { Config } from 'tailwindcss';

const withOpacity = (variable: string) => `rgb(var(${variable}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{vue,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: withOpacity('--color-bg'),
        sidebar: withOpacity('--color-sidebar-bg'),
        topbar: withOpacity('--color-topbar-bg'),
        card: withOpacity('--color-card-bg'),
        input: withOpacity('--color-input-bg'),
        primary: {
          DEFAULT: withOpacity('--color-primary'),
          hover: withOpacity('--color-primary-hover')
        },
        text: {
          main: withOpacity('--color-text-main'),
          muted: withOpacity('--color-text-muted')
        },
        border: {
          DEFAULT: withOpacity('--color-border')
        },
        soft: withOpacity('--color-soft-bg'),
        status: {
          'not-started-bg': '#f3f4f6',
          'not-started-fg': '#4b5563',
          'in-progress-bg': '#e0efff',
          'in-progress-fg': '#1d4ed8',
          'prompt-generated-bg': '#efe6ff',
          'prompt-generated-fg': '#6d28d9',
          'submitted-bg': '#ffedd5',
          'submitted-fg': '#c2410c',
          'needs-fix-bg': '#fee2e2',
          'needs-fix-fg': '#b91c1c',
          'approved-bg': '#dcfce7',
          'approved-fg': '#15803d',
          'wordpress-bg': '#ccfbf1',
          'wordpress-fg': '#0f766e'
        }
      },
      fontFamily: {
        sans: ['Raleway', 'system-ui', 'sans-serif'],
        ui: ['"Google Sans"', '"Product Sans"', 'Arial', 'sans-serif']
      },
      borderRadius: {
        card: '14px',
        btn: '10px'
      },
      boxShadow: {
        card: '0 1px 2px rgba(16, 24, 40, 0.04), 0 1px 3px rgba(16, 24, 40, 0.06)',
        soft: '0 4px 16px rgba(63, 141, 254, 0.08)'
      }
    }
  },
  plugins: []
} satisfies Config;
