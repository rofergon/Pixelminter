/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      backgroundColor: {
        'switch-unchecked': '#e0e0e0',
        'switch-checked': '#10b981',
        'pixel-primary': 'var(--pixel-bg-primary)',
        'pixel-secondary': 'var(--pixel-bg-secondary)',
        'pixel-tertiary': 'var(--pixel-bg-tertiary)',
      },
      
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Pixel Art Theme Colors
        pixel: {
          'bg-primary': 'var(--pixel-bg-primary)',
          'bg-secondary': 'var(--pixel-bg-secondary)',
          'bg-tertiary': 'var(--pixel-bg-tertiary)',
          'accent-primary': 'var(--pixel-accent-primary)',
          'accent-secondary': 'var(--pixel-accent-secondary)',
          'accent-tertiary': 'var(--pixel-accent-tertiary)',
          'text-primary': 'var(--pixel-text-primary)',
          'text-secondary': 'var(--pixel-text-secondary)',
          'text-muted': 'var(--pixel-text-muted)',
          'border': 'var(--pixel-border)',
          'hover': 'var(--pixel-hover)',
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "pixel-glow": {
          "0%, 100%": { 
            boxShadow: "0 0 5px var(--pixel-accent-primary)" 
          },
          "50%": { 
            boxShadow: "0 0 20px var(--pixel-accent-primary), 0 0 30px var(--pixel-accent-secondary)" 
          },
        },
        "neon-pulse": {
          "0%, 100%": { 
            opacity: "1",
            transform: "scale(1)" 
          },
          "50%": { 
            opacity: "0.8",
            transform: "scale(1.02)" 
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pixel-glow": "pixel-glow 2s ease-in-out infinite",
        "neon-pulse": "neon-pulse 2s ease-in-out infinite",
      },
      backdropBlur: {
        'xs': '2px',
      },
      boxShadow: {
        'pixel': '0 4px 6px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        'pixel-lg': '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        'neon': '0 0 20px rgba(99, 102, 241, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
        'neon-lg': '0 0 30px rgba(99, 102, 241, 0.5), 0 4px 20px rgba(0, 0, 0, 0.3)',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}