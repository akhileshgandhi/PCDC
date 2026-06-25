import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f2f7ff", 100: "#e4eefe", 200: "#cfe0fc",
          500: "#3b82f6", 600: "#2563eb", 700: "#1d4ed8", 800: "#1e40af",
        },
        ink: "#0f172a", slate2: "#64748b", line: "#e6edf6", bg2: "#f7f9fd",
      },
      borderRadius: { xl2: "16px" },
      boxShadow: { soft: "0 1px 2px rgba(16,24,40,.04),0 12px 28px -12px rgba(37,99,235,.10)" },
    },
  },
  plugins: [],
} satisfies Config;
