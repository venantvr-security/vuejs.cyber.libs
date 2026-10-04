// tailwind.preset.js
export default {
  theme: {
    extend: {
      // We can mutualize common cyber theme colors here if needed
      colors: {
        cyber: {
          dark: '#0f172a',
          panel: '#1e293b',
          accent: '#06b6d4',
          highlight: '#22d3ee'
        }
      },
      // Slightly larger default fonts if we want to override specific tailwind classes
      // But scaling html font-size in accessibility.css is already highly effective.
      fontSize: {
        'tiny': '0.7rem',
      }
    }
  }
}
