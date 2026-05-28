import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// IMPORTANT: set `base` to "/<your-repo-name>/" so JS/CSS load correctly on
// GitHub Pages. Example: repo github.com/you/burger-count -> base: "/burger-count/"
// If you later use a custom domain or username.github.io root repo, use "/".
export default defineConfig({
  plugins: [react()],
  base: "/burger-count/",
});
