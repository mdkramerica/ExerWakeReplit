import express from "express";
import { registerRoutes } from "./routes";
import { setupVite } from "./vite";

const app = express();
app.use(express.json());

(async () => {
  try {
    // Setup routes
    const server = registerRoutes(app);

    // Setup Vite in development
    if (app.get("env") === "development") {
      await setupVite(app, server);
    }

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
})();