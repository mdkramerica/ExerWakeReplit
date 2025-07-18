import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertAdminSchema, insertUserAssessmentSchema } from "@shared/schema";
import { z } from "zod";

export function registerRoutes(app: Express): Server {
  // Patient login endpoint
  app.post("/api/patient/login", async (req, res) => {
    try {
      const { code } = req.body;
      
      if (!code || code.length !== 6) {
        return res.status(400).json({ error: "Invalid access code" });
      }

      const user = await storage.getUserByCode(code);
      if (!user) {
        return res.status(401).json({ error: "Invalid access code" });
      }

      if (!user.isActive) {
        return res.status(403).json({ error: "Account is inactive" });
      }

      // Update last visit
      await storage.updateUserLastVisit(user.id);

      res.json({
        id: user.id,
        patientId: user.patientId,
        injuryType: user.injuryType
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get user info
  app.get("/api/patient/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({
        id: user.id,
        patientId: user.patientId,
        injuryType: user.injuryType,
        createdAt: user.createdAt,
        lastVisit: user.lastVisit
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get available assessments
  app.get("/api/assessments", async (req, res) => {
    try {
      const assessments = await storage.getAssessments();
      res.json(assessments);
    } catch (error) {
      console.error("Get assessments error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get user's assessment history
  app.get("/api/patient/:id/assessments", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const assessments = await storage.getUserAssessments(userId);
      res.json(assessments);
    } catch (error) {
      console.error("Get user assessments error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Submit assessment
  app.post("/api/assessment", async (req, res) => {
    try {
      const validatedData = insertUserAssessmentSchema.parse(req.body);
      const assessment = await storage.createUserAssessment(validatedData);
      res.json(assessment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid assessment data", details: error.errors });
      }
      console.error("Create assessment error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Admin login
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      // TODO: Implement proper password hashing
      const admin = await storage.getAdminByUsername(username);
      if (!admin || admin.passwordHash !== password) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      res.json({
        id: admin.id,
        username: admin.username
      });
    } catch (error) {
      console.error("Admin login error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get compliance data
  app.get("/api/admin/compliance", async (req, res) => {
    try {
      const data = await storage.getComplianceData();
      res.json(data);
    } catch (error) {
      console.error("Get compliance data error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get all patients (for admin)
  app.get("/api/admin/patients", async (req, res) => {
    try {
      // TODO: Implement pagination
      const patients = []; // TODO: Add getAllPatients to storage
      res.json(patients);
    } catch (error) {
      console.error("Get patients error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}