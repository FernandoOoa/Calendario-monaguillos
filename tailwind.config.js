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
        "primary-fixed": "#ffdad4",
        "on-error-container": "#93000a",
        "on-tertiary-fixed": "#231b00",
        "surface-variant": "#e1e3e4",
        "surface-container-highest": "#e1e3e4",
        "on-primary-fixed-variant": "#930000",
        "on-error": "#ffffff",
        "background": "#f8f9fa",
        "on-surface": "#191c1d",
        "inverse-on-surface": "#f0f1f2",
        "tertiary-fixed": "#f3e2ac",
        "outline-variant": "#e4beb8",
        "secondary-fixed": "#ffe088",
        "on-tertiary-container": "#4a3f18",
        "secondary-fixed-dim": "#e9c349",
        "on-primary": "#ffffff",
        "on-background": "#191c1d",
        "surface-container-high": "#e7e8e9",
        "primary": "#6e0000",
        "outline": "#8f706b",
        "inverse-surface": "#2e3132",
        "on-surface-variant": "#5b403c",
        "surface-dim": "#d9dadb",
        "tertiary-container": "#bbab79",
        "surface-container": "#edeeef",
        "surface-bright": "#f8f9fa",
        "primary-fixed-dim": "#ffb4a8",
        "on-secondary-container": "#745c00",
        "primary-container": "#990000",
        "on-tertiary": "#ffffff",
        "on-secondary-fixed": "#241a00",
        "secondary": "#735c00",
        "surface-container-lowest": "#ffffff",
        "secondary-container": "#fed65b",
        "surface-container-low": "#f3f4f5",
        "inverse-primary": "#ffb4a8",
        "surface-tint": "#b82014",
        "error-container": "#ffdad6",
        "on-primary-container": "#ffa092"
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
