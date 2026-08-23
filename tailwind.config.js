/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        "navy-deep": "#0B1B33",
        "navy-panel": "#122A4D",
        "navy-panel-2": "#16335C",
        "hairline": "#24406B",
        "gold": "#C9962C",
        "gold-soft": "#E8C468",
        "cp-green": "#3FA796",
        "cp-red": "#E0554F",
        "paper": "#F3EFE4",
        "ink-muted": "#8AA0C4",
      },
      fontFamily: {
        disp: ["Sora", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
