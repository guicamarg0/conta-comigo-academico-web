import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const proxy = {
    "/api": {
      target: env.VITE_API_PROXY_TARGET || "http://localhost:8080",
      changeOrigin: true,
    },
  };
  return {
    plugins: [react()],
    server: { host: "0.0.0.0", port: 3000, proxy },
    preview: { proxy },
    build: {
      rolldownOptions: {
        output: {
          manualChunks(id) {
            if (
              id.includes("node_modules/recharts") ||
              id.includes("node_modules/d3-")
            )
              return "charts";
            if (
              id.includes("node_modules/react") ||
              id.includes("node_modules/scheduler")
            )
              return "react";
          },
        },
      },
    },
  };
});
