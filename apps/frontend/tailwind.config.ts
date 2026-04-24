import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      /* ── Font ── */
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },

      /* ── Colors (token-based) ── */
      colors: {
        border:      'hsl(var(--border))',
        input:       'hsl(var(--input))',
        ring:        'hsl(var(--ring))',
        background:  'hsl(var(--background))',
        foreground:  'hsl(var(--foreground))',
        primary: {
          DEFAULT:    'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT:    'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT:    'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT:    'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT:    'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT:    'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT:    'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },

      /* ── Border radius ── */
      borderRadius: {
        lg:   'var(--radius)',                      /* 10px — inputs/small btns */
        md:   'calc(var(--radius) - 2px)',          /* 8px  */
        sm:   'calc(var(--radius) - 4px)',          /* 6px  */
        xl:   '1rem',                               /* 16px — mid cards */
        '2xl':'1.25rem',                            /* 20px — dashboard cards */
        '3xl':'1.75rem',                            /* 28px — hero surfaces */
      },

      /* ── Elevation shadows ── */
      boxShadow: {
        xs:       'var(--shadow-xs)',
        sm:       'var(--shadow-sm)',
        md:       'var(--shadow-md)',
        card:     'var(--shadow-card)',
        elevated: 'var(--shadow-elevated)',
        dialog:   'var(--shadow-dialog)',
        /* Premium "floating" card shadow — dual-layer soft blur (SugarCRM style) */
        floating: '0 4px 6px rgba(0,0,0,0.02), 0 12px 40px rgba(0,0,0,0.08)',
        /* Pill button shadow — for circular header icons, floating pills */
        pill:     '0 2px 8px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        /* Colored glows for KPI cards */
        'glow-blue':    '0 4px 14px 0 rgba(59,130,246,0.15)',
        'glow-violet':  '0 4px 14px 0 rgba(139,92,246,0.15)',
        'glow-emerald': '0 4px 14px 0 rgba(16,185,129,0.15)',
        'glow-amber':   '0 4px 14px 0 rgba(245,158,11,0.15)',
      },

      /* ── Animations ── */
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-left': {
          from: { opacity: '0', transform: 'translateX(-8px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        'count-up': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'accordion-down': {
          from: { height: '0' },
          to:   { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to:   { height: '0' },
        },
      },
      animation: {
        'fade-in':       'fade-in 0.2s ease-out',
        'fade-up':       'fade-up 0.25s ease-out',
        'slide-in-left': 'slide-in-left 0.2s ease-out',
        'count-up':      'count-up 0.3s ease-out',
        'accordion-down':'accordion-down 0.2s ease-out',
        'accordion-up':  'accordion-up 0.2s ease-out',
      },

      /* ── Spacing for layout shell ── */
      spacing: {
        'header': 'var(--header-height, 64px)',
        'sidebar': 'var(--sidebar-width, 256px)',
        'sidebar-collapsed': 'var(--sidebar-collapsed, 64px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
