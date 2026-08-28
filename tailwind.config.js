/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        base: "rgb(var(--bg-base) / <alpha-value>)",
        surface: "rgb(var(--bg-surface) / <alpha-value>)",
        elevated: "rgb(var(--bg-elevated) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        'text-main': "rgb(var(--text-main) / <alpha-value>)",
        'text-muted': "rgb(var(--text-muted) / <alpha-value>)",
      }
    },
  },
  plugins: [
    function({ addUtilities }) {
      addUtilities({
        '.artist-banner': {
          position: 'relative',
          height: '15rem', 
          width: '100%',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'flex-end',
          padding: '3rem', 
          borderRadius: '0.75rem', 
          marginBottom: '3rem', 
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', 
          backgroundImage: 'linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0.2), rgba(0,0,0,0))',
        },
        '.artist-banner-img': {
          position: 'absolute',
          inset: '0',
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: '-10',
          transitionProperty: 'transform',
          transitionDuration: '500ms',
        }
      })
    }
  ]
}