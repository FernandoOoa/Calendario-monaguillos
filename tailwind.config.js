/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "tertiary-fixed-dim": "#d6c692",
        "primary-fixed": "#3a0000",
        "on-error-container": "#ffdad6",
        "on-tertiary-fixed": "#231b00",
        "surface-variant": "#2a2c2d",
        "surface-container-highest": "#2c2c2c",
        "on-primary-fixed-variant": "#ffdad4",
        "on-error": "#ffffff",
        "background": "#0c0c0c",
        "on-surface": "#ffffff",
        "inverse-on-surface": "#191c1d",
        "tertiary-fixed": "#f3e2ac",
        "outline-variant": "rgba(255, 255, 255, 0.08)",
        "secondary-fixed": "#ffe088",
        "on-tertiary-container": "#f3e2ac",
        "secondary-fixed-dim": "#e9c349",
        "on-primary": "#ffffff",
        "on-background": "#ffffff",
        "surface-container-high": "#222222",
        "primary": "#b82014",
        "outline": "rgba(255, 255, 255, 0.16)",
        "inverse-surface": "#f0f1f2",
        "on-surface-variant": "#a3a3a3",
        "surface-dim": "#121212",
        "tertiary-container": "#4a3f18",
        "surface-container": "#1c1c1c",
        "surface-bright": "#1a1a1a",
        "primary-fixed-dim": "#ffb4a8",
        "on-secondary-container": "#fed65b",
        "primary-container": "#8f0000",
        "on-tertiary": "#ffffff",
        "on-secondary-fixed": "#241a00",
        "secondary": "#d4af37",
        "surface-container-lowest": "#0e0e0e",
        "secondary-container": "#3a3000",
        "surface-container-low": "#161616",
        "inverse-primary": "#6e0000",
        "surface-tint": "#b82014",
        "error-container": "#93000a",
        "on-primary-container": "#ffdad4"
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "2xl": "1rem",     // 16px
        "3xl": "1.5rem",   // 24px
        "full": "9999px"
      },
      spacing: {
        "base": "8px",
        "card-gap": "20px",
        "container-padding-mobile": "16px",
        "gutter": "16px",
        "section-margin": "48px",
        "container-padding-desktop": "40px"
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"]
      }
    },
  },
  plugins: [],
}
