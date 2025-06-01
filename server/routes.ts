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
      
      // Combine assessments with user progress and sort by orderIndex
      const assessmentsWithProgress = allAssessments.map(assessment => {
        // Find all user assessments for this assessment
        const allUserAssessments = userAssessments.filter(ua => ua.assessmentId === assessment.id);
        
        // Check if any session is completed
        const hasCompletedSession = allUserAssessments.some(ua => ua.isCompleted);
        
        // Get the most recent completed session or the most recent session
        const mostRecentCompleted = allUserAssessments
          .filter(ua => ua.isCompleted)
          .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())[0];
        
        const mostRecentSession = allUserAssessments
          .sort((a, b) => (b.completedAt ? new Date(b.completedAt).getTime() : 0) - (a.completedAt ? new Date(a.completedAt).getTime() : 0))[0];
        
        const representativeSession = mostRecentCompleted || mostRecentSession;
        
        return {
          ...assessment,
          isCompleted: hasCompletedSession,
          completedAt: representativeSession?.completedAt,
          qualityScore: representativeSession?.qualityScore,
          userAssessmentId: representativeSession?.id
        };
      }).sort((a, b) => a.orderIndex - b.orderIndex);
      
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
      const { romData, repetitionData, qualityScore, handType } = req.body;
      
      // Calculate ROM values from repetition data for trigger finger assessments
      let maxMcpAngle: number | null = null;
      let maxPipAngle: number | null = null;
      let maxDipAngle: number | null = null;
      let totalActiveRom: number | null = null;
      
      // Individual finger ROM calculations
      let indexFingerRom: number | null = null;
      let middleFingerRom: number | null = null;
      let ringFingerRom: number | null = null;
      let pinkyFingerRom: number | null = null;
      
      // Individual joint angles for each finger
      let middleFingerMcp: number | null = null;
      let middleFingerPip: number | null = null;
      let middleFingerDip: number | null = null;
      
      let ringFingerMcp: number | null = null;
      let ringFingerPip: number | null = null;
      let ringFingerDip: number | null = null;
      
      let pinkyFingerMcp: number | null = null;
      let pinkyFingerPip: number | null = null;
      let pinkyFingerDip: number | null = null;
      
      if (repetitionData && Array.isArray(repetitionData)) {
        // Collect all motion frames for multi-finger ROM calculation
        const allMotionFrames: any[] = [];
        
        repetitionData.forEach((rep: any) => {
          if (rep.romData) {
            // Keep existing index finger calculations for backward compatibility
            maxMcpAngle = Math.max(maxMcpAngle || 0, rep.romData.mcpAngle || 0);
            maxPipAngle = Math.max(maxPipAngle || 0, rep.romData.pipAngle || 0);
            maxDipAngle = Math.max(maxDipAngle || 0, rep.romData.dipAngle || 0);
            totalActiveRom = Math.max(totalActiveRom || 0, rep.romData.totalActiveRom || 0);
          }
          
          // Collect motion data for all finger calculations
          if (rep.motionData && Array.isArray(rep.motionData)) {
            allMotionFrames.push(...rep.motionData);
          }
        });
        
        // Calculate max ROM for all fingers if motion data exists
        if (allMotionFrames.length > 0) {
          try {
            // Import ROM calculation function from shared module using dynamic import
            const romCalculatorModule = await import('../shared/rom-calculator.js');
            const { calculateAllFingersMaxROM } = romCalculatorModule;
            
            // Ensure motion frames have the correct structure
            const formattedFrames = allMotionFrames.map(frame => ({
              landmarks: frame.landmarks || frame
            }));
            
            console.log(`Calculating ROM for ${formattedFrames.length} motion frames`);
            const allFingersROM = calculateAllFingersMaxROM(formattedFrames);
            
            console.log('Raw allFingersROM object:', JSON.stringify(allFingersROM, null, 2));
            
            indexFingerRom = allFingersROM.index?.totalActiveRom || null;
            middleFingerRom = allFingersROM.middle?.totalActiveRom || null;
            ringFingerRom = allFingersROM.ring?.totalActiveRom || null;
            pinkyFingerRom = allFingersROM.pinky?.totalActiveRom || null;
            
            // Store individual joint angles for detailed breakdown
            middleFingerMcp = allFingersROM.middle?.mcpAngle || null;
            middleFingerPip = allFingersROM.middle?.pipAngle || null;
            middleFingerDip = allFingersROM.middle?.dipAngle || null;
            
            ringFingerMcp = allFingersROM.ring?.mcpAngle || null;
            ringFingerPip = allFingersROM.ring?.pipAngle || null;
            ringFingerDip = allFingersROM.ring?.dipAngle || null;
            
            pinkyFingerMcp = allFingersROM.pinky?.mcpAngle || null;
            pinkyFingerPip = allFingersROM.pinky?.pipAngle || null;
            pinkyFingerDip = allFingersROM.pinky?.dipAngle || null;
            
            console.log('Multi-finger ROM calculated:', {
              index: indexFingerRom,
              middle: middleFingerRom,
              ring: ringFingerRom,
              pinky: pinkyFingerRom
            });
            
            console.log('Individual joint angles calculated:', {
              middle: { mcp: middleFingerMcp, pip: middleFingerPip, dip: middleFingerDip },
              ring: { mcp: ringFingerMcp, pip: ringFingerPip, dip: ringFingerDip },
              pinky: { mcp: pinkyFingerMcp, pip: pinkyFingerPip, dip: pinkyFingerDip }
            });
          } catch (error) {
            console.log('ROM calculation for all fingers failed:', error);
            console.log('Using index finger only');
          }
        }
      }
      
      // Find existing user assessments to determine session number
      const existingAssessments = await storage.getUserAssessments(userId);
      const sessionCount = existingAssessments.filter(ua => ua.assessmentId === assessmentId).length;
      const sessionNumber = sessionCount + 1;
      
      // Create new assessment (don't update existing ones - allow multiple sessions)
      const userAssessment = await storage.createUserAssessment({
        userId,
        assessmentId,
        sessionNumber,
        isCompleted: true,
        completedAt: new Date(),
        romData,
        repetitionData,
        qualityScore,
        maxMcpAngle: maxMcpAngle !== null ? maxMcpAngle.toString() : null,
        maxPipAngle: maxPipAngle !== null ? maxPipAngle.toString() : null,
        maxDipAngle: maxDipAngle !== null ? maxDipAngle.toString() : null,
        totalActiveRom: totalActiveRom !== null ? totalActiveRom.toString() : null,
        indexFingerRom: indexFingerRom !== null ? indexFingerRom.toString() : null,
        middleFingerRom: middleFingerRom !== null ? middleFingerRom.toString() : null,
        ringFingerRom: ringFingerRom !== null ? ringFingerRom.toString() : null,
        pinkyFingerRom: pinkyFingerRom !== null ? pinkyFingerRom.toString() : null,
        
        // Individual joint angles for detailed breakdown
        middleFingerMcp: middleFingerMcp !== null ? middleFingerMcp.toString() : null,
        middleFingerPip: middleFingerPip !== null ? middleFingerPip.toString() : null,
        middleFingerDip: middleFingerDip !== null ? middleFingerDip.toString() : null,
        
        ringFingerMcp: ringFingerMcp !== null ? ringFingerMcp.toString() : null,
        ringFingerPip: ringFingerPip !== null ? ringFingerPip.toString() : null,
        ringFingerDip: ringFingerDip !== null ? ringFingerDip.toString() : null,
        
        pinkyFingerMcp: pinkyFingerMcp !== null ? pinkyFingerMcp.toString() : null,
        pinkyFingerPip: pinkyFingerPip !== null ? pinkyFingerPip.toString() : null,
        pinkyFingerDip: pinkyFingerDip !== null ? pinkyFingerDip.toString() : null,
        handType: handType || null
      });
      
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

  app.get("/api/users/:userId/history", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const userAssessments = await storage.getUserAssessments(userId);
      
      // Get all assessments to join with user assessments
      const allAssessments = await storage.getAssessments();
      
      // Filter only completed assessments and join with assessment details
      const completedAssessments = userAssessments
        .filter(ua => ua.isCompleted && ua.completedAt)
        .map(ua => {
          const assessment = allAssessments.find(a => a.id === ua.assessmentId);
          return {
            id: ua.id,
            assessmentName: assessment?.name || 'Unknown Assessment',
            assessmentId: ua.assessmentId,
            completedAt: ua.completedAt,
            qualityScore: ua.qualityScore,
            maxMcpAngle: ua.maxMcpAngle,
            maxPipAngle: ua.maxPipAngle,
            maxDipAngle: ua.maxDipAngle,
            totalActiveRom: ua.totalActiveRom,
            indexFingerRom: ua.indexFingerRom,
            middleFingerRom: ua.middleFingerRom,
            ringFingerRom: ua.ringFingerRom,
            pinkyFingerRom: ua.pinkyFingerRom,
            sessionNumber: ua.sessionNumber || 1,
            repetitionData: ua.repetitionData
          };
        })
        .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime()); // Sort by completion date, newest first
      
      res.json({ history: completedAssessments });
    } catch (error) {
      res.status(400).json({ message: "Failed to fetch assessment history" });
    }
  });

  app.get("/api/user-assessments/:userAssessmentId/motion-data", async (req, res) => {
    try {
      const userAssessmentId = parseInt(req.params.userAssessmentId);
      
      // Try to find the user assessment by iterating through all users
      let userAssessment = null;
      for (let userId = 1; userId <= 100; userId++) { // Increased search range
        try {
          const userAssessments = await storage.getUserAssessments(userId);
          const found = userAssessments.find(ua => ua.id === userAssessmentId);
          if (found) {
            userAssessment = found;
            break;
          }
        } catch (e) {
          // Continue searching
        }
      }
      
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

  // Get assessment history for a user
  app.get("/api/users/:userId/assessment-history", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const userAssessments = await storage.getUserAssessments(userId);
      const assessments = await storage.getAssessments();
      
      // Group by assessment and include session details
      const history = userAssessments.map(ua => {
        const assessment = assessments.find(a => a.id === ua.assessmentId);
        return {
          ...ua,
          assessmentName: assessment?.name || 'Unknown',
          assessmentDescription: assessment?.description || '',
        };
      }).sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime());
      
      res.json({ history });
    } catch (error) {
      res.status(400).json({ message: "Failed to retrieve assessment history" });
    }
  });

  // Get detailed results for a specific user assessment
  app.get("/api/user-assessments/:userAssessmentId/details", async (req, res) => {
    try {
      const userAssessmentId = parseInt(req.params.userAssessmentId);
      
      // Find the user assessment and user data
      let userAssessment = null;
      let user = null;
      for (let userId = 1; userId <= 100; userId++) {
        try {
          const userAssessments = await storage.getUserAssessments(userId);
          const found = userAssessments.find(ua => ua.id === userAssessmentId);
          if (found) {
            userAssessment = found;
            user = await storage.getUser(userId);
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (!userAssessment) {
        return res.status(404).json({ message: "Assessment not found" });
      }
      
      res.json({ userAssessment, user });
    } catch (error) {
      res.status(400).json({ message: "Failed to retrieve assessment details" });
    }
  });

  // Generate shareable link for user assessment
  app.post("/api/user-assessments/:id/share", async (req, res) => {
    try {
      const userAssessmentId = parseInt(req.params.id);
      
      if (isNaN(userAssessmentId)) {
        return res.status(400).json({ error: "Invalid user assessment ID" });
      }

      const shareToken = await storage.generateShareToken(userAssessmentId);
      res.json({ shareToken, shareUrl: `/shared/${shareToken}` });
    } catch (error) {
      console.error("Error generating share token:", error);
      res.status(500).json({ error: "Failed to generate shareable link" });
    }
  });

  // Get shared user assessment by token (public route)
  app.get("/api/shared/:token", async (req, res) => {
    try {
      const { token } = req.params;
      
      const userAssessment = await storage.getUserAssessmentByShareToken(token);
      if (!userAssessment) {
        return res.status(404).json({ error: "Shared assessment not found" });
      }

      // Get assessment details for display
      const assessment = await storage.getAssessment(userAssessment.assessmentId);
      if (!assessment) {
        return res.status(404).json({ error: "Assessment not found" });
      }

      res.json({ userAssessment, assessment });
    } catch (error) {
      console.error("Error fetching shared assessment:", error);
      res.status(500).json({ error: "Failed to fetch shared assessment" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
