/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Cyanotype blueprint ground
        ink: { DEFAULT: "#0A2338", deep: "#061626", raised: "#0E2E47" },
        paper: { DEFAULT: "#EDF3F7", muted: "#9DB4C6", faint: "#63829A" },
        rule: "rgba(237,243,247,0.14)",
        // Thermal ramp: carries data meaning, not decoration
        thermal: {
          cold: "#57A9E2",
          mild: "#63BFA4",
          warm: "#E3A23C",
          hot: "#DD6A50",
        },
      },
      fontFamily: {
        sans: ["Archivo", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
      letterSpacing: { annot: "0.16em" },
      maxWidth: { reading: "62ch" },
    },
  },
  plugins: [],
};
