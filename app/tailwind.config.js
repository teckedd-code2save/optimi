/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        // Optimi light theme tokens
        optimi: {
          bg: '#fafaf9',
          card: '#ffffff',
          elevated: '#f5f5f4',
          hover: '#e7e5e4',
          border: '#e7e5e4',
          'border-subtle': '#f5f5f4',
          'border-focus': '#4f46e5',
        },
        // shadcn theme overrides for light theme
        background: '#fafaf9',
        foreground: '#1c1917',
        card: { DEFAULT: '#ffffff', foreground: '#1c1917' },
        popover: { DEFAULT: '#ffffff', foreground: '#1c1917' },
        primary: { DEFAULT: '#4f46e5', foreground: '#ffffff', hover: '#4338ca' },
        secondary: { DEFAULT: '#f5f5f4', foreground: '#57534e' },
        muted: { DEFAULT: '#f5f5f4', foreground: '#a8a29e' },
        accent: { DEFAULT: '#eef2ff', foreground: '#4f46e5' },
        destructive: { DEFAULT: '#f43f5e', foreground: '#ffffff' },
        border: '#e7e5e4',
        input: '#e7e5e4',
        ring: '#4f46e5',
      },
      borderRadius: {
        lg: '12px',
        md: '8px',
        sm: '6px',
      },
      boxShadow: {
        'xs': '0 1px 2px rgba(0,0,0,0.04)',
        'sm': '0 1px 3px rgba(0,0,0,0.06)',
        'md': '0 4px 12px rgba(0,0,0,0.06)',
        'lg': '0 8px 24px rgba(0,0,0,0.08)',
        'xl': '0 16px 48px rgba(0,0,0,0.10)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(120%) scale(0.95)', opacity: '0' },
          '100%': { transform: 'translateX(0) scale(1)', opacity: '1' },
        },
        'fade-slide-up': {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.5s ease infinite',
        'slide-in-right': 'slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-slide-up': 'fade-slide-up 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
