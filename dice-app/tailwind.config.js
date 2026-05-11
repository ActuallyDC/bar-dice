/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bar: {
          bg: "#0b0b0d",
          panel: "#15151a",
          panel2: "#1c1c22",
          line: "#2a2a32",
          ink: "#f5e6c8",
          mute: "#9c9aa3",
          amber: "#f5a524",
          amberDeep: "#c47a0c",
          ember: "#e0432a",
          emberDeep: "#9a2316",
          good: "#76d188",
        },
      },
      fontFamily: {
        sys: [
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
