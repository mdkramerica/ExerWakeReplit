import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertUserSchema, insertUserAssessmentSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // User routes
  app.post("/api/users/verify-code", async (req, res) => {
    try {
      const { code } = z.object({ code: z.string().length(6) }).parse(req.body);
      
      let user = await storage.getUserByCode(code);
      
      if (!user) {
        // Create new user with the code
        user = await storage.createUser({ code });
      }
      
      res.json({ 
        user, 
        isFirstTime: user.isFirstTime,
        hasInjuryType: !!user.injuryType 
      });
    } catch (error) {
      res.status(400).json({ message: "Invalid code format" });
    }
  });

  app.patch("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      if (updates.injuryType) {
        updates.isFirstTime = false;
      }
      
      const user = await storage.updateUser(id, updates);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ user });
    } catch (error) {
      res.status(400).json({ message: "Invalid user data" });
    }
  });

  // Injury type routes
  app.get("/api/injury-types", async (req, res) => {
    try {
      const injuryTypes = await storage.getInjuryTypes();
      res.json({ injuryTypes });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch injury types" });
    }
  });

  // Assessment routes
  app.get("/api/assessments", async (req, res) => {
    try {
      const assessments = await storage.getAssessments();
      res.json({ assessments });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch assessments" });
    }
  });

  app.get("/api/assessments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const assessment = await storage.getAssessment(id);
      
      if (!assessment) {
        return res.status(404).json({ message: "Assessment not found" });
      }
      
      res.json({ assessment });
    } catch (error) {
      res.status(400).json({ message: "Invalid assessment ID" });
    }
  });

  // User assessment routes
  app.get("/api/users/:userId/assessments", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const userAssessments = await storage.getUserAssessments(userId);
      
      // Get assessments based on user's injury type
      const allAssessments = user.injuryType 
        ? await storage.getAssessmentsForInjury(user.injuryType)
        : await storage.getAssessments();
      
      // Combine assessments with user progress
      const assessmentsWithProgress = allAssessments.map(assessment => {
        const userAssessment = userAssessments.find(ua => ua.assessmentId === assessment.id);
        return {
          ...assessment,
          isCompleted: userAssessment?.isCompleted || false,
          completedAt: userAssessment?.completedAt,
          qualityScore: userAssessment?.qualityScore,
          userAssessmentId: userAssessment?.id
        };
      });
      
      res.json({ assessments: assessmentsWithProgress });
    } catch (error) {
      res.status(400).json({ message: "Invalid user ID" });
    }
  });

  app.post("/api/users/:userId/assessments/:assessmentId/start", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const assessmentId = parseInt(req.params.assessmentId);
      
      // Check if user assessment already exists
      let userAssessment = await storage.getUserAssessment(userId, assessmentId);
      
      if (!userAssessment) {
        userAssessment = await storage.createUserAssessment({
          userId,
          assessmentId,
          isCompleted: false
        });
      }
      
      res.json({ userAssessment });
    } catch (error) {
      res.status(400).json({ message: "Failed to start assessment" });
    }
  });

  app.post("/api/users/:userId/assessments/:assessmentId/complete", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const assessmentId = parseInt(req.params.assessmentId);
      const { romData, repetitionData, qualityScore } = req.body;
      
      let userAssessment = await storage.getUserAssessment(userId, assessmentId);
      
      if (!userAssessment) {
        userAssessment = await storage.createUserAssessment({
          userId,
          assessmentId,
          isCompleted: true,
          completedAt: new Date(),
          romData,
          repetitionData,
          qualityScore
        });
      } else {
        userAssessment = await storage.updateUserAssessment(userAssessment.id, {
          isCompleted: true,
          completedAt: new Date(),
          romData,
          repetitionData,
          qualityScore
        });
      }
      
      res.json({ userAssessment });
    } catch (error) {
      res.status(400).json({ message: "Failed to complete assessment" });
    }
  });

  app.get("/api/users/:userId/progress", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const userAssessments = await storage.getUserAssessments(userId);
      const allAssessments = await storage.getAssessments();
      
      const completed = userAssessments.filter(ua => ua.isCompleted).length;
      const total = allAssessments.length;
      
      res.json({ 
        completed, 
        total, 
        percentage: total > 0 ? Math.round((completed / total) * 100) : 0 
      });
    } catch (error) {
      res.status(400).json({ message: "Failed to fetch progress" });
    }
  });

  app.get("/api/user-assessments/:userAssessmentId/motion-data", async (req, res) => {
    try {
      const userAssessmentId = parseInt(req.params.userAssessmentId);
      const allUserAssessments = await storage.getUserAssessments(0); // Get all to find by ID
      const userAssessment = allUserAssessments.find(ua => ua.id === userAssessmentId);
      
      if (!userAssessment || !userAssessment.repetitionData) {
        return res.status(404).json({ message: "Motion data not found" });
      }
      
      // Extract motion data from repetition data
      const motionData: any[] = [];
      if (Array.isArray(userAssessment.repetitionData)) {
        userAssessment.repetitionData.forEach((rep: any) => {
          if (rep.motionData && Array.isArray(rep.motionData)) {
            motionData.push(...rep.motionData);
          }
        });
      }
      
      res.json({ motionData });
    } catch (error) {
      res.status(400).json({ message: "Failed to retrieve motion data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
