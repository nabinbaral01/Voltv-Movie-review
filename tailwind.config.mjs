const config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── VOLTV Design System ──────────────────
        bg: {
          primary:   "#0A0A0F",
          secondary: "#12121A",
          tertiary:  "#1A1A28",
        },
        accent: {
          red:   "#E50914",
          gold:  "#F5A623",
          green: "#22C55E",
        },
        verified: "#3B82F6",
        pro:      "#8B5CF6",
        text: {
          primary:   "#FFFFFF",
          secondary: "#A0A0B0",
          muted:     "#505060",
        },
        border:  "#1E1E2E",
        glass:   "rgba(255,255,255,0.05)",
        // Semantic aliases
        surface: "#12121A",
        elevated: "#1A1A28",
      },

      fontFamily: {
        display: ["var(--font-bebas)", "Impact", "sans-serif"],
        heading: ["var(--font-clash)", "system-ui", "sans-serif"],
        body:    ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        mono:    ["var(--font-jetbrains)", "ui-monospace", "monospace"],
        sans:    ["var(--font-dm-sans)", "system-ui", "sans-serif"],
      },

      backgroundImage: {
        "gradient-cinema":
          "linear-gradient(180deg, rgba(10,10,15,0) 0%, #0A0A0F 100%)",
        "gradient-card":
          "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
        "gradient-gold":
          "linear-gradient(135deg, #F5A623 0%, #E8971E 100%)",
        "gradient-red":
          "linear-gradient(135deg, #E50914 0%, #B8070F 100%)",
        "gradient-purple":
          "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)",
      },

      boxShadow: {
        "card":       "0 4px 24px rgba(0,0,0,0.4)",
        "card-hover": "0 8px 40px rgba(229,9,20,0.2)",
        "gold":       "0 0 20px rgba(245,166,35,0.3)",
        "red":        "0 0 20px rgba(229,9,20,0.3)",
        "purple":     "0 0 20px rgba(139,92,246,0.3)",
        "glass":      "inset 0 1px 0 rgba(255,255,255,0.1)",
      },

      borderRadius: {
        "card":  "12px",
        "badge": "6px",
        "pill":  "999px",
      },

      animation: {
        "fade-in":      "fadeIn 300ms ease-out",
        "slide-up":     "slideUp 300ms ease-out",
        "slide-down":   "slideDown 300ms ease-out",
        "scale-in":     "scaleIn 200ms ease-out",
        "pulse-red":    "pulseRed 2s ease-in-out infinite",
        "shimmer":      "shimmer 1.5s ease-in-out infinite",
        "streak-fire":  "streakFire 0.5s ease-out",
        "xp-pop":       "xpPop 600ms cubic-bezier(0.34,1.56,0.64,1)",
        "badge-unlock": "badgeUnlock 800ms cubic-bezier(0.34,1.56,0.64,1)",
      },

      keyframes: {
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%":   { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideDown: {
          "0%":   { opacity: "0", transform: "translateY(-16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%":   { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        pulseRed: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(229,9,20,0.4)" },
          "50%":      { boxShadow: "0 0 0 8px rgba(229,9,20,0)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        streakFire: {
          "0%":   { transform: "scale(1)" },
          "50%":  { transform: "scale(1.3)" },
          "100%": { transform: "scale(1)" },
        },
        xpPop: {
          "0%":   { opacity: "0", transform: "translateY(0) scale(0.5)" },
          "60%":  { opacity: "1", transform: "translateY(-20px) scale(1.1)" },
          "100%": { opacity: "0", transform: "translateY(-40px) scale(1)" },
        },
        badgeUnlock: {
          "0%":   { opacity: "0", transform: "scale(0.3) rotate(-10deg)" },
          "60%":  { opacity: "1", transform: "scale(1.1) rotate(3deg)" },
          "100%": { opacity: "1", transform: "scale(1) rotate(0deg)" },
        },
      },

      transitionDuration: {
        "250": "250ms",
        "300": "300ms",
        "400": "400ms",
      },

      transitionTimingFunction: {
        "spring": "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },

      backdropBlur: {
        "xs": "2px",
        "glass": "12px",
      },

      spacing: {
        "18": "4.5rem",
        "22": "5.5rem",
        "sidebar": "260px",
        "right-panel": "320px",
      },

      zIndex: {
        "modal":    "1000",
        "toast":    "1100",
        "tooltip":  "1200",
        "overlay":  "900",
        "sidebar":  "800",
        "topbar":   "700",
      },

      screens: {
        "xs": "480px",
        "3xl": "1920px",
      },
    },
  },
  plugins: [],
};

export default config;
