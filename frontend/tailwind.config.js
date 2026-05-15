export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        bg:     { DEFAULT: '#0a0f1a', 2: '#111827', 3: '#1a2235', 4: '#243048' },
        border: { DEFAULT: '#1e2d45', hi: '#2d4060' },
        text:   { DEFAULT: '#e2e8f0', dim: '#7a8fa8', muted: '#4a5568' },
        accent: { DEFAULT: '#3b82f6', hi: '#60a5fa' },
        // estado colors
        nova:   { bg: '#0d1f35', border: '#1e4d82', text: '#60a5fa' },
        mmad:   { bg: '#1f1500', border: '#7c4a00', text: '#fbbf24' },
        revisar:{ bg: '#1f0a12', border: '#7c1a2e', text: '#f87171' },
        asignada:{ bg: '#0d2015', border: '#1a5c35', text: '#34d399' },
        encurso:{ bg: '#1a0d2e', border: '#5b21b6', text: '#a78bfa' },
        solucionada:{ bg: '#0f2a0f', border: '#166534', text: '#86efac' },
        finalizada:{ bg: '#151515', border: '#374151', text: '#9ca3af' },
      },
      animation: {
        'fade-in': 'fadeIn 0.15s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
      },
      keyframes: {
        fadeIn:  { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
      }
    }
  },
  plugins: []
}
