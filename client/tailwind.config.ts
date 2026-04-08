import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist', 'Inter', 'sans-serif'],
        mono: ['Geist Mono', 'monospace'],
      },
      colors: {
        background: 'var(--bg-base)',
        surface: 'var(--bg-surface)',
        'surface-overlay': 'var(--bg-overlay)',
        'surface-subtle': 'var(--bg-subtle)',
        'surface-muted': 'var(--bg-muted)',
        
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-tertiary': 'var(--text-tertiary)',
        'text-disabled': 'var(--text-disabled)',
        
        accent: 'var(--accent)',
        'accent-dim': 'var(--accent-dim)',
        'accent-muted': 'var(--accent-muted)',
        'accent-border': 'var(--accent-border)',
        
        red: 'var(--red)',
        'red-bg': 'var(--red-bg)',
        amber: 'var(--amber)',
        
        'border-subtle': 'var(--border-subtle)',
        'border-default': 'var(--border-default)',
        'border-strong': 'var(--border-strong)',

        // Stitch Exports
        "on-surface": "var(--stitch-on-surface)",
        "surface-container-lowest": "var(--stitch-surface-lowest)",
        "primary-container": "#6ee7b7", // explicit emerald fallback to connect with accent
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        full: 'var(--radius-full)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      },
      animation: {
        'speaking': 'speaking-pulse 1s ease-in-out infinite',
      },
      keyframes: {
        'speaking-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(110, 231, 183, 0.4)' },
          '50%': { boxShadow: '0 0 0 3px rgba(110, 231, 183, 0.2)' },
        }
      }
    },
  },
  plugins: [],
};

export default config;
