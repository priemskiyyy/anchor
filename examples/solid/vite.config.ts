import tailwindcss from "@tailwindcss/vite";
import solid from "vite-plugin-solid";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [solid(), tailwindcss()],
  resolve: { alias: { src: fileURLToPath(new URL("./src", import.meta.url)) } },
});
