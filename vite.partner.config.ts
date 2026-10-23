import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

const root = fileURLToPath(new URL("./partner-preview", import.meta.url));
const dataUrl = (file: string, mime: string) => `data:${mime};base64,${readFileSync(new URL(file, import.meta.url)).toString("base64")}`;
export default defineConfig({
  root,
  base: "./",
  publicDir: false,
  define: {
    __OSK_PARTNER_PREVIEW__: "true",
    __OSK_LOGO_URL__: JSON.stringify(dataUrl("./public/osk-logo.svg", "image/svg+xml")),
  },
  plugins: [react(), {
    name: "osk-inline-hero",
    enforce: "pre",
    transform(code, id) {
      if (id.endsWith("/app/globals.css")) return code.replaceAll("/hero-rider.png", dataUrl("./public/hero-rider.png", "image/png"));
    },
  }, viteSingleFile()],
  build: { outDir: "../dist-partner/plain", emptyOutDir: true, sourcemap: false },
});
