import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Libraries go in their own long-lived chunks: they rarely change, so after a deploy the browser keeps them cached
// and only downloads the (much smaller) app code again. Pages are already split per route in App.tsx.
const VENDOR: [string, RegExp][] = [
  ["react", /node_modules\/(react|react-dom|scheduler|react-router|react-router-dom|@remix-run)\//],
  ["supabase", /node_modules\/(@supabase|iceberg-js|tslib)\//],
  ["icons", /node_modules\/lucide-react\//],
];

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const p = id.replace(/\\/g, "/");
          return VENDOR.find(([, re]) => re.test(p))?.[0];
        },
      },
    },
  },
});
