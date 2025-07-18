import type { Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type { Server } from "http";

const isTest = process.env.VITEST;

export async function setupVite(app: Express, server: Server) {
  const vite = await import("vite");
  const viteServer = await vite.createServer({
    server: { hmr: { port: 5174 } },
    appType: "custom",
  });

  app.use(viteServer.middlewares);

  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      let html = fs.readFileSync(
        path.resolve(__dirname, "..", "client", "index.html"),
        "utf-8",
      );

      html = await viteServer.transformIndexHtml(url, html);

      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (e: any) {
      if (!isTest) {
        viteServer.ssrFixStacktrace(e);
      }
      console.log(e.stack);
      res.status(500).end(e.stack);
    }
  });
}