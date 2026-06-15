import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  future: { compatibilityVersion: 4 },
  compatibilityDate: "2025-05-15",
  devtools: { enabled: true },

  modules: ["@nuxtjs/supabase"],

  vite: {
    plugins: [tailwindcss()],
  },

  css: ["~/assets/css/main.css"],

  supabase: {
    redirectOptions: {
      login: "/login",
      callback: "/confirm",
      exclude: ["/", "/login", "/signup"],
    },
  },

  app: {
    head: {
      title: "re:read",
      meta: [
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { name: "description", content: "Read again. With a plan." },
        { name: "theme-color", content: "#0f172a" },
      ],
      link: [{ rel: "manifest", href: "/manifest.json" }],
    },
  },

  runtimeConfig: {
    public: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseKey: process.env.SUPABASE_KEY,
    },
  },
});
