export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Charcoal neumorphism base palette
        bg: {
          primary:   '#1c1c1e',   // OS desktop surface — neutral charcoal (Apple Space Gray)
          secondary: '#252523',   // Card / panel neu surface — warm neutral
          tertiary:  '#2e2c2a',   // Elevated / inset fields — warm neutral
        },
        text: {
          primary:   '#ffffff',
          secondary: '#a8b2d1',
          tertiary:  '#8f98b8',   // bumped from #6b7494 → passes 4.5:1 on all bg surfaces
        },
        accent: {
          cyan:   '#00d9ff',
          purple: '#9d4edd',
          pink:   '#ff006e',
          lime:   '#00ff88',
          orange: '#ff6b35',
          blue:   '#4361ee',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      spacing: {
        '2xs': '2px',
        xs:  '4px',
        sm:  '8px',
        md:  '12px',
        lg:  '16px',
        xl:  '24px',
        '2xl': '32px',
      },
      minHeight: {
        screen: '100dvh',
      },
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        md: '12px',
        lg: '20px',
      },
      boxShadow: {
        // Glow shadows (keep existing)
        glow:          '0 0 20px rgba(0, 217, 255, 0.3)',
        'glow-purple': '0 0 20px rgba(157, 78, 221, 0.3)',
        'glow-pink':   '0 0 20px rgba(255, 0, 110, 0.3)',
        'glow-lime':   '0 0 20px rgba(0, 255, 136, 0.3)',
        // Neumorphism shadows (new)
        'neu':          '6px 6px 12px rgba(0,0,0,0.4), -6px -6px 12px rgba(255,255,255,0.04)',
        'neu-lg':       '10px 10px 20px rgba(0,0,0,0.45), -10px -10px 20px rgba(255,255,255,0.045)',
        'neu-sm':       '3px 3px 7px rgba(0,0,0,0.35), -3px -3px 7px rgba(255,255,255,0.03)',
        'neu-inset':    'inset 4px 4px 8px rgba(0,0,0,0.38), inset -4px -4px 8px rgba(255,255,255,0.035)',
        'neu-inset-sm': 'inset 2px 2px 5px rgba(0,0,0,0.35), inset -2px -2px 5px rgba(255,255,255,0.03)',
        'neu-dock':     '0 -4px 30px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.06), 6px 6px 12px rgba(0,0,0,0.4), -6px -6px 12px rgba(255,255,255,0.04)',
      },
      animation: {
        // Keep existing
        'pulse-glow':   'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float':        'float 3s ease-in-out infinite',
        'slide-up':     'slide-up 0.3s ease-out',
        'fade-in':      'fade-in 0.3s ease-out',
        'scale-in':     'scale-in 0.2s ease-out',
        'bounce-light': 'bounce 1s ease-in-out infinite',
        // Cinematic OS animations (new)
        'view-enter':   'viewEnter 0.25s cubic-bezier(0.23, 1, 0.32, 1)',
        'palette-open': 'paletteOpen 0.15s cubic-bezier(0.23, 1, 0.32, 1)',
        'dock-item-in': 'dockItemIn 0.18s cubic-bezier(0.23, 1, 0.32, 1) both',
        'tooltip-show': 'tooltipShow 0.18s cubic-bezier(0.23, 1, 0.32, 1)',
        'animate-pulse-glow': 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        // Keep existing
        'pulse-glow': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.5' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-10px)' },
        },
        'slide-up': {
          from: { transform: 'translateY(10px)', opacity: '0' },
          to:   { transform: 'translateY(0)',    opacity: '1' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'scale-in': {
          from: { transform: 'scale(0.9)', opacity: '0' },
          to:   { transform: 'scale(1)',   opacity: '1' },
        },
        // Cinematic OS animations (new)
        viewEnter: {
          from: { opacity: '0', transform: 'scale(0.97) translateY(6px)' },
          to:   { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        paletteOpen: {
          // Keyboard-triggered (Ctrl+K) — kept very fast so it never feels sluggish
          from: { opacity: '0', transform: 'translateY(-8px) scale(0.97)' },
          to:   { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        dockItemIn: {
          // Start near-full-size — nothing in the real world appears from nothing (Emil rule)
          from: { opacity: '0', transform: 'translateY(10px) scale(0.93)' },
          to:   { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        tooltipShow: {
          from: { opacity: '0', transform: 'translateX(-50%) translateY(3px) scale(0.97)' },
          to:   { opacity: '1', transform: 'translateX(-50%) translateY(0) scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
