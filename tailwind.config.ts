import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Risk and warning colors
        'risk-red': '#ef4444',
        'warning-amber': '#f59e0b',
        'success-green': '#22c55e',
        'info-blue': '#3b82f6',
        // Custom palette
        'navy': '#1E3A5F',
        'forest': '#1B5E3F',
        'gold': '#C4A747',
        'burgundy': '#B83A3A',
        'cream': '#F5F5F0',
      },
      fontFamily: {
        'serif': ['Playfair Display', 'serif'],
        'sans': ['Inter', 'sans-serif'],
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(18px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        cascadeRed: {
          '0%': { boxShadow: 'none', borderColor: '#e5e7eb' },
          '30%': { boxShadow: '0 0 22px 6px rgba(184,58,58,.45)', borderColor: '#ef4444' },
          '100%': { boxShadow: '0 0 10px 2px rgba(184,58,58,.15)', borderColor: '#ef4444' },
        },
        pulseBorder: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(184,58,58,0)' },
          '50%': { boxShadow: '0 0 0 6px rgba(184,58,58,.25)' },
        },
        nodeEntry: {
          '0%': { opacity: '0', transform: 'scale(.8) translateY(10px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
      },
      animation: {
        fadeInUp: 'fadeInUp 0.6s ease-out',
        cascadeRed: 'cascadeRed 0.9s ease-out forwards',
        pulseBorder: 'pulseBorder 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        nodeEntry: 'nodeEntry 0.5s ease-out forwards',
      },
    },
  },
  darkMode: 'class',
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
export default config
