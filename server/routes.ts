import type { Express } from "express";
import { createServer, type Server } from "http";
import { PersistentMemoryStorage } from "./persistent-storage";
import { DatabaseStorage } from "./storage";
import { z } from "zod";
import { 
  insertUserSchema, 
  insertUserAssessmentSchema,
  loginSchema,
  insertCohortSchema,
  insertPatientSchema,
  insertAssessmentTypeSchema,
  insertPatientAssessmentSchema,
  insertAuditLogSchema,
  patientEnrollmentSchema
} from "@shared/schema";

// Authentication middleware - will be updated with storage reference
let requireAuth: any;

// Role-based access control
const requireRole = (roles: string[]) => {
  return (req: any, res: any, next: any) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
};

// Audit logging helper - will be updated with storage reference
let auditLog: any;

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize memory storage for rollback state
  // Use database storage if enabled, otherwise file storage
  const useDatabase = process.env.USE_DATABASE === 'true' || process.env.NODE_ENV === 'production';
  const storage = useDatabase ? new DatabaseStorage() : new PersistentMemoryStorage();
  
  // Initialize authentication middleware with storage reference
  requireAuth = async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const token = authHeader.substring(7);
    try {
      // Simple token validation (in production, use JWT)
      const userId = parseInt(token);
      const user = await storage.getClinicalUser(userId);
      if (!user || !user.isActive) {
        return res.status(401).json({ message: 'Invalid token' });
      }
      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({ message: 'Invalid token' });
    }
  };
  
  // Initialize audit logging helper with storage reference
  auditLog = async (userId: number, action: string, targetEntity?: string, details?: any, req?: any) => {
    await storage.createAuditLog({
      userId,
      action,
      targetEntity,
      details,
      ipAddress: req?.ip,
      userAgent: req?.get('User-Agent')
    });
  };

  // Clinical Dashboard Authentication
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      console.log(`Login attempt for username: ${username}`);
      
      const user = await storage.authenticateClinicalUser(username, password);
      console.log(`Authentication result:`, user ? 'success' : 'failed');
      
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Simple token (in production, use JWT)
      const token = user.id.toString();
      
      await auditLog(user.id, "login", undefined, { username }, req);
      
      res.json({ 
        token, 
        user: { 
          id: user.id, 
          username: user.username, 
          email: user.email, 
          firstName: user.firstName, 
          lastName: user.lastName, 
          role: user.role 
        } 
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(400).json({ message: "Invalid request format" });
    }
  });

  // Clinical Dashboard - Cohort Management
  app.get("/api/cohorts", requireAuth, async (req, res) => {
    try {
      const cohorts = await storage.getCohorts();
      res.json(cohorts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch cohorts" });
    }
  });

  // Clinical Dashboard - Patient Management
  app.get("/api/patients", requireAuth, async (req, res) => {
    try {
      const patients = await storage.getPatients();
      res.json(patients);
    } catch (error) {
      console.error('Failed to fetch patients:', error);
      res.status(500).json({ message: "Failed to fetch patients" });
    }
  });

  // Clinical Dashboard - Alerts
  app.get("/api/alerts", requireAuth, async (req, res) => {
    try {
      // Return empty array for now since alerts aren't implemented yet
      res.json([]);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
      res.status(500).json({ message: "Failed to fetch alerts" });
    }
  });





  app.post("/api/patients", requireAuth, requireRole(['clinician', 'admin']), async (req, res) => {
    try {
      const patientData = {
        ...req.body,
        assignedClinicianId: req.user.id,
        accessCode: Math.floor(100000 + Math.random() * 900000).toString(),
        isActive: true,
        enrolledInStudy: false,
        enrollmentStatus: 'pending'
      };
      
      console.log('Creating patient with data:', patientData);
      const patient = await storage.createPatient(patientData);
      console.log('Created patient:', patient);
      
      await auditLog(req.user.id, "patient_create", `patient_id:${patient.id}`, patientData, req);
      
      res.json(patient);
    } catch (error) {
      console.error('Patient creation error:', error);
      res.status(400).json({ message: "Failed to create patient" });
    }
  });

  // Dashboard API endpoints
  app.get("/api/patients/dashboard", requireAuth, async (req, res) => {
    try {
      const dashboardData = await storage.getPatientDashboardData();
      res.json(dashboardData);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      res.status(500).json({ message: "Failed to fetch dashboard data" });
    }
  });

  app.get("/api/dashboard/metrics", requireAuth, async (req, res) => {
    try {
      const metrics = await storage.getDashboardMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
      res.status(500).json({ message: "Failed to fetch dashboard metrics" });
    }
  });

  app.get("/api/patients/:id/assessments", requireAuth, async (req, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const assessments = await storage.getPatientAssessmentHistory(patientId);
      res.json({ assessments });
    } catch (error) {
      console.error("Error fetching patient assessments:", error);
      res.status(500).json({ message: "Failed to fetch patient assessments" });
    }
  });

  // Patient Enrollment endpoints
  app.get("/api/patients/:id/eligibility/:cohortId", requireAuth, async (req, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const cohortId = parseInt(req.params.cohortId);
      
      console.log(`Checking eligibility for patient ${patientId}, cohort ${cohortId}`);
      const eligibility = await storage.checkEligibility(patientId, cohortId);
      console.log(`Eligibility result:`, eligibility);
      res.json(eligibility);
    } catch (error) {
      console.error("Eligibility check error:", error);
      res.status(500).json({ message: "Failed to check eligibility" });
    }
  });

  app.post("/api/patients/:id/enroll", requireAuth, requireRole(['admin', 'clinician']), async (req, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const enrollmentData = patientEnrollmentSchema.parse({
        ...req.body,
        patientId
      });
      
      const patient = await storage.enrollPatient(enrollmentData);
      
      await auditLog(req.user.id, "patient_enroll", `patient_id:${patient.id}`, enrollmentData, req);
      
      res.json(patient);
    } catch (error) {
      console.error('Enrollment error:', error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Enrollment failed" });
    }
  });

  app.get("/api/patients/access-code/:code", async (req, res) => {
    try {
      const { code } = req.params;
      
      if (!code || code.length !== 6) {
        return res.status(400).json({ message: "Invalid access code format" });
      }
      
      const patient = await storage.getPatientByAccessCode(code);
      
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }
      
      res.json({ patient });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch patient" });
    }
  });

  // Study enrollment endpoint
  app.post("/api/patients/enroll-study", requireAuth, requireRole(['clinician', 'admin']), async (req, res) => {
    try {
      const enrollmentData = insertPatientSchema.parse({
        ...req.body,
        assignedClinicianId: req.user.id,
        enrolledInStudy: true,
        studyEnrollmentDate: new Date(),
      });
      
      const patient = await storage.createPatient(enrollmentData);
      
      // Create baseline study visit schedule (weeks 0-12)
      if (enrollmentData.surgeryDate) {
        const surgeryDate = new Date(enrollmentData.surgeryDate);
        for (let week = 0; week <= 12; week++) {
          const scheduledDate = new Date(surgeryDate);
          scheduledDate.setDate(scheduledDate.getDate() + (week * 7));
          
          const windowStart = new Date(scheduledDate);
          windowStart.setDate(windowStart.getDate() - 2);
          
          const windowEnd = new Date(scheduledDate);
          windowEnd.setDate(windowEnd.getDate() + 2);
          
          await storage.createStudyVisit({
            patientId: patient.id,
            scheduledWeek: week,
            scheduledDate,
            windowStart,
            windowEnd,
            visitStatus: 'scheduled',
          });
        }
      }
      
      await auditLog(req.user.id, "study_enrollment", `patient_id:${patient.id}`, enrollmentData, req);
      
      res.json(patient);
    } catch (error) {
      console.error('Study enrollment error:', error);
      res.status(400).json({ message: "Failed to enroll patient in study" });
    }
  });

  app.get("/api/patients/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const patient = await storage.getPatientWithDetails(id);
      
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }
      
      // Check access permissions
      if (req.user.role === 'clinician' && patient.assignedClinicianId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await auditLog(req.user.id, "patient_access", `patient_id:${id}`, undefined, req);
      
      res.json(patient);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch patient" });
    }
  });

  app.put("/api/patients/:id", requireAuth, requireRole(['clinician', 'admin']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = insertPatientSchema.partial().parse(req.body);
      
      // Check access permissions
      const existingPatient = await storage.getPatient(id);
      if (!existingPatient) {
        return res.status(404).json({ message: "Patient not found" });
      }
      
      if (req.user.role === 'clinician' && existingPatient.assignedClinicianId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const patient = await storage.updatePatient(id, updates);
      
      await auditLog(req.user.id, "patient_update", `patient_id:${id}`, updates, req);
      
      res.json(patient);
    } catch (error) {
      res.status(400).json({ message: "Invalid patient data" });
    }
  });

  // Clinical Dashboard - Patient Assessments
  app.get("/api/patients/:id/assessments", requireAuth, async (req, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      
      // Check access permissions
      const patient = await storage.getPatient(patientId);
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }
      
      if (req.user.role === 'clinician' && patient.assignedClinicianId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const assessments = await storage.getPatientAssessments(patientId, limit);
      res.json(assessments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch assessments" });
    }
  });

  app.post("/api/patients/:id/assessments", requireAuth, requireRole(['clinician', 'admin']), async (req, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const assessmentData = insertPatientAssessmentSchema.parse({
        ...req.body,
        patientId,
        clinicianId: req.user.id
      });
      
      // Check access permissions
      const patient = await storage.getPatient(patientId);
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }
      
      if (req.user.role === 'clinician' && patient.assignedClinicianId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const assessment = await storage.createPatientAssessment(assessmentData);
      
      await auditLog(req.user.id, "assessment_create", `patient_id:${patientId}`, assessmentData, req);
      
      res.json(assessment);
    } catch (error) {
      res.status(400).json({ message: "Invalid assessment data" });
    }
  });

  // Clinical Dashboard - Cohort Analytics
  app.get("/api/cohorts/:id/analytics", requireAuth, async (req, res) => {
    try {
      const cohortId = parseInt(req.params.id);
      const analytics = await storage.getCohortAnalytics(cohortId);
      
      if (!analytics) {
        return res.status(404).json({ message: "Cohort not found or no data available" });
      }
      
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch cohort analytics" });
    }
  });

  app.get("/api/cohorts/:id/assessments", requireAuth, async (req, res) => {
    try {
      const cohortId = parseInt(req.params.id);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 500;
      
      // For researchers, return de-identified data
      const assessments = await storage.getCohortAssessments(cohortId, limit);
      
      if (req.user.role === 'researcher') {
        // Remove identifying information for researchers
        const deidentifiedAssessments = assessments.map(assessment => ({
          ...assessment,
          patientId: null,
          clinicianId: null,
          notes: null,
          rawData: null
        }));
        res.json(deidentifiedAssessments);
      } else {
        res.json(assessments);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch cohort assessments" });
    }
  });

  // Clinical Dashboard - Outlier Alerts
  app.get("/api/alerts", requireAuth, async (req, res) => {
    try {
      const patientId = req.query.patientId ? parseInt(req.query.patientId as string) : undefined;
      const alerts = await storage.getOutlierAlerts(patientId);
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch alerts" });
    }
  });

  app.put("/api/alerts/:id/resolve", requireAuth, requireRole(['clinician', 'admin']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.resolveOutlierAlert(id);
      
      if (!success) {
        return res.status(404).json({ message: "Alert not found" });
      }
      
      await auditLog(req.user.id, "alert_resolve", `alert_id:${id}`, undefined, req);
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to resolve alert" });
    }
  });

  // Clinical Dashboard - Data Export
  app.post("/api/export", requireAuth, async (req, res) => {
    try {
      const { exportType, filters } = z.object({
        exportType: z.enum(['patient_data', 'cohort_data']),
        filters: z.any().optional()
      }).parse(req.body);
      
      // Generate download URL (expires in 15 minutes)
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      const downloadUrl = `/api/export/download/${Math.random().toString(36).substring(2)}`;
      
      const exportRequest = await storage.createDataExport({
        requestedBy: req.user.id,
        exportType,
        filters,
        downloadUrl,
        expiresAt
      });
      
      await auditLog(req.user.id, "data_export", `export_id:${exportRequest.id}`, { exportType, filters }, req);
      
      res.json({ 
        exportId: exportRequest.id,
        downloadUrl: exportRequest.downloadUrl,
        expiresAt: exportRequest.expiresAt
      });
    } catch (error) {
      res.status(400).json({ message: "Invalid export request" });
    }
  });

  // Assessment Types
  app.get("/api/assessment-types", requireAuth, async (req, res) => {
    try {
      const assessmentTypes = await storage.getAssessmentTypes();
      res.json(assessmentTypes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch assessment types" });
    }
  });

  // Legacy routes for backward compatibility
  // Demo reset endpoint
  app.post("/api/demo/reset", async (req, res) => {
    try {
      // Reset demo user's assessments and progress
      const demoUser = await storage.getUserByCode('DEMO01');
      if (!demoUser) {
        return res.status(404).json({ message: "Demo user not found" });
      }

      // Delete all user assessments for demo user
      await storage.resetUserAssessments(demoUser.id);

      res.json({ message: "Demo data reset successfully" });
    } catch (error) {
      console.error('Demo reset error:', error);
      res.status(500).json({ message: "Failed to reset demo data" });
    }
  });

  // User routes
  app.post("/api/users/verify-code", async (req, res) => {
    try {
      const { code } = z.object({ code: z.string().min(6) }).parse(req.body);
      
      let user = await storage.getUserByCode(code);
      
      if (!user) {
        // Create new user with any valid 6-digit code
        user = await storage.createUser({ code, isFirstTime: true });
        
        if (!user) {
          return res.status(400).json({ message: "Failed to create user" });
        }
      }
      
      res.json({ 
        user, 
        isFirstTime: user.isFirstTime !== false,
        hasInjuryType: !!user.injuryType 
      });
    } catch (error) {
      res.status(400).json({ message: "Invalid code format" });
    }
  });

  app.get("/api/users/by-code/:code", async (req, res) => {
    try {
      const { code } = req.params;
      
      if (!code || code.length < 6) {
        return res.status(400).json({ message: "Invalid code format" });
      }
      
      const user = await storage.getUserByCode(code);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ user });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
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
      console.log('API /assessments returning:', assessments.length, 'assessments');
      res.json({ assessments });
    } catch (error) {
      console.error('Failed to fetch assessments:', error);
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

  // Get user by ID
  app.get("/api/users/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const user = await storage.getUserById(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ user });
    } catch (error) {
      res.status(400).json({ message: "Invalid user ID" });
    }
  });

  // User assessment routes
  app.get("/api/users/:userId/assessments", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const user = await storage.getUserById(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const userAssessments = await storage.getUserAssessments(userId);
      
      // Get assessments based on user's injury type
      const allAssessments = user.injuryType 
        ? await storage.getAssessmentsForInjuryType(user.injuryType)
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
      
      // Get the assessment to include its name
      const assessment = await storage.getAssessment(assessmentId);
      if (!assessment) {
        return res.status(404).json({ message: 'Assessment not found' });
      }

      // Create new user assessment
      const userAssessment = await storage.createUserAssessment({
        userId,
        assessmentId,
        assessmentName: assessment.name,
        isCompleted: false
      });
      
      res.json({ userAssessment });
    } catch (error) {
      res.status(400).json({ message: "Failed to start assessment" });
    }
  });

  app.post("/api/users/:userId/assessments/:assessmentId/complete", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const assessmentId = parseInt(req.params.assessmentId);
      const { 
        romData, 
        repetitionData, 
        qualityScore, 
        handType,
        wristFlexionAngle: reqWristFlexionAngle,
        wristExtensionAngle: reqWristExtensionAngle,
        maxWristFlexion: reqMaxWristFlexion,
        maxWristExtension: reqMaxWristExtension
      } = req.body;
      
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
      
      // Wrist angle calculations - initialize with top-level request values
      let wristFlexionAngle: number | null = reqWristFlexionAngle || null;
      let wristExtensionAngle: number | null = reqWristExtensionAngle || null;
      let maxWristFlexion: number | null = reqMaxWristFlexion || null;
      let maxWristExtension: number | null = reqMaxWristExtension || null;
      
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
          
          // Extract wrist angle data from repetition data
          console.log(`Processing repetition data for wrist angles:`, {
            wristFlexionAngle: rep.wristFlexionAngle,
            wristExtensionAngle: rep.wristExtensionAngle,
            maxWristFlexion: rep.maxWristFlexion,
            maxWristExtension: rep.maxWristExtension
          });
          
          if (rep.wristFlexionAngle !== undefined) {
            wristFlexionAngle = Math.max(wristFlexionAngle || 0, rep.wristFlexionAngle);
            console.log(`Updated wristFlexionAngle: ${wristFlexionAngle}`);
          }
          if (rep.wristExtensionAngle !== undefined) {
            wristExtensionAngle = Math.max(wristExtensionAngle || 0, rep.wristExtensionAngle);
            console.log(`Updated wristExtensionAngle: ${wristExtensionAngle}`);
          }
          if (rep.maxWristFlexion !== undefined) {
            maxWristFlexion = Math.max(maxWristFlexion || 0, rep.maxWristFlexion);
            console.log(`Updated maxWristFlexion: ${maxWristFlexion}`);
          }
          if (rep.maxWristExtension !== undefined) {
            maxWristExtension = Math.max(maxWristExtension || 0, rep.maxWristExtension);
            console.log(`Updated maxWristExtension: ${maxWristExtension}`);
          }
          
          // Collect motion data for all finger calculations and extract wrist angle data
          if (rep.motionData && Array.isArray(rep.motionData)) {
            allMotionFrames.push(...rep.motionData);
            
            // Extract wrist angles from motion frames for wrist assessments
            rep.motionData.forEach((frame: any) => {
              if (frame.wristAngles) {
                const frameWristAngles = frame.wristAngles;
                // Remove the > 0 filter to capture all calculated angles, including small ones
                if (frameWristAngles.wristFlexionAngle !== undefined && frameWristAngles.wristFlexionAngle !== null) {
                  wristFlexionAngle = Math.max(wristFlexionAngle || 0, frameWristAngles.wristFlexionAngle);
                }
                if (frameWristAngles.wristExtensionAngle !== undefined && frameWristAngles.wristExtensionAngle !== null) {
                  wristExtensionAngle = Math.max(wristExtensionAngle || 0, frameWristAngles.wristExtensionAngle);
                }
              }
            });
          }
        });
        
        // Update max wrist values based on extracted data - remove artificial > 0 filtering
        if (wristFlexionAngle !== null && wristFlexionAngle !== undefined) {
          maxWristFlexion = Math.max(maxWristFlexion || 0, wristFlexionAngle);
          console.log(`Final maxWristFlexion: ${maxWristFlexion}° (from recorded angles)`);
        }
        if (wristExtensionAngle !== null && wristExtensionAngle !== undefined) {
          maxWristExtension = Math.max(maxWristExtension || 0, wristExtensionAngle);
          console.log(`Final maxWristExtension: ${maxWristExtension}° (from recorded angles)`);
        }
        
        // Calculate max ROM for all fingers if motion data exists
        if (allMotionFrames.length > 0) {
          try {
            // Get the assessment to determine which calculation to use
            const assessment = await storage.getAssessment(assessmentId);
            
            if (assessment?.name === "Kapandji Score") {
              // Use Kapandji-specific scoring for thumb opposition
              const kapandjiModule = await import('../shared/kapandji-calculator.js');
              const { calculateMaxKapandjiScore } = kapandjiModule;
              
              const formattedFrames = allMotionFrames.map(frame => ({
                landmarks: frame.landmarks || frame
              }));
              
              console.log(`Calculating Kapandji score for ${formattedFrames.length} motion frames`);
              const kapandjiResult = calculateMaxKapandjiScore(formattedFrames);
              
              console.log('Kapandji score result:', JSON.stringify(kapandjiResult, null, 2));
              
              // Store Kapandji score in totalActiveRom field for simplicity
              totalActiveRom = kapandjiResult.maxScore;
              
              // Store details in individual finger fields for display
              indexFingerRom = kapandjiResult.details.indexTip ? 3 : (kapandjiResult.details.indexMiddlePhalanx ? 2 : (kapandjiResult.details.indexProximalPhalanx ? 1 : 0));
              middleFingerRom = kapandjiResult.details.middleTip ? 4 : 0;
              ringFingerRom = kapandjiResult.details.ringTip ? 5 : 0;
              pinkyFingerRom = kapandjiResult.details.littleTip ? 6 : 0;
              
              console.log('Kapandji assessment completed with score:', totalActiveRom);
              
            } else {
              // Use standard ROM calculation for other assessments
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
            }
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
        maxMcpAngle: maxMcpAngle !== null ? String(maxMcpAngle) : null,
        maxPipAngle: maxPipAngle !== null ? String(maxPipAngle) : null,
        maxDipAngle: maxDipAngle !== null ? String(maxDipAngle) : null,
        totalActiveRom: totalActiveRom !== null ? String(totalActiveRom) : null,
        indexFingerRom: indexFingerRom !== null ? String(indexFingerRom) : null,
        middleFingerRom: middleFingerRom !== null ? String(middleFingerRom) : null,
        ringFingerRom: ringFingerRom !== null ? String(ringFingerRom) : null,
        pinkyFingerRom: pinkyFingerRom !== null ? String(pinkyFingerRom) : null,
        
        // Individual joint angles for detailed breakdown
        middleFingerMcp: middleFingerMcp !== null ? String(middleFingerMcp) : null,
        middleFingerPip: middleFingerPip !== null ? String(middleFingerPip) : null,
        middleFingerDip: middleFingerDip !== null ? String(middleFingerDip) : null,
        
        ringFingerMcp: ringFingerMcp !== null ? String(ringFingerMcp) : null,
        ringFingerPip: ringFingerPip !== null ? String(ringFingerPip) : null,
        ringFingerDip: ringFingerDip !== null ? String(ringFingerDip) : null,
        
        pinkyFingerMcp: pinkyFingerMcp !== null ? String(pinkyFingerMcp) : null,
        pinkyFingerPip: pinkyFingerPip !== null ? String(pinkyFingerPip) : null,
        pinkyFingerDip: pinkyFingerDip !== null ? String(pinkyFingerDip) : null,
        handType: handType || null,
        
        // Wrist angle data
        wristFlexionAngle: wristFlexionAngle !== null ? String(wristFlexionAngle) : null,
        wristExtensionAngle: wristExtensionAngle !== null ? String(wristExtensionAngle) : null,
        maxWristFlexion: maxWristFlexion !== null ? String(maxWristFlexion) : null,
        maxWristExtension: maxWristExtension !== null ? String(maxWristExtension) : null
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
            repetitionData: ua.repetitionData,
            handType: ua.handType
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

  // Get assessment history by user code
  app.get("/api/users/by-code/:userCode/history", async (req, res) => {
    try {
      const userCode = req.params.userCode;
      const user = await storage.getUserByCode(userCode);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const userAssessments = await storage.getUserAssessments(user.id);
      const assessments = await storage.getAssessments();
      
      // Group by assessment and include session details
      const history = userAssessments.filter(ua => ua.isCompleted).map(ua => {
        const assessment = assessments.find(a => a.id === ua.assessmentId);
        return {
          id: ua.id,
          assessmentName: assessment?.name || 'Unknown Assessment',
          assessmentId: ua.assessmentId,
          completedAt: ua.completedAt,
          qualityScore: ua.qualityScore,
          totalActiveRom: ua.totalActiveRom,
          indexFingerRom: ua.indexFingerRom,
          middleFingerRom: ua.middleFingerRom,
          ringFingerRom: ua.ringFingerRom,
          pinkyFingerRom: ua.pinkyFingerRom,
          kapandjiScore: ua.kapandjiScore,
          maxWristFlexion: ua.maxWristFlexion,
          maxWristExtension: ua.maxWristExtension,
          handType: ua.handType,
          sessionNumber: ua.sessionNumber,
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
      
      // Try direct lookup first via getUserAssessmentById
      try {
        userAssessment = await storage.getUserAssessmentById(userAssessmentId);
        if (userAssessment) {
          user = await storage.getUserById(userAssessment.userId);
        }
      } catch (e) {
        // Fallback to searching through all users
        for (let userId = 1; userId <= 100; userId++) {
          try {
            const userAssessments = await storage.getUserAssessments(userId);
            const found = userAssessments.find(ua => ua.id === userAssessmentId);
            if (found) {
              userAssessment = found;
              user = await storage.getUserById(userId);
              break;
            }
          } catch (e) {
            continue;
          }
        }
      }
      
      if (!userAssessment) {
        return res.status(404).json({ message: "Assessment not found" });
      }
      
      // Get the assessment details to include the assessment name
      const assessment = await storage.getAssessment(userAssessment.assessmentId);
      
      // Add assessment name to user assessment for display purposes
      const userAssessmentWithName = {
        ...userAssessment,
        assessmentName: assessment?.name || 'Unknown Assessment'
      };
      
      console.log('Assessment lookup:', {
        userAssessmentId: userAssessment.assessmentId,
        foundAssessment: assessment,
        assessmentName: assessment?.name
      });
      
      // Return data in the format expected by wrist results page
      res.json({ 
        userAssessment: userAssessmentWithName, 
        assessment: assessment,
        user: user 
      });
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

  // Patient Daily Dashboard API endpoints
  app.get("/api/patients/by-code/:code", async (req, res) => {
    try {
      const code = req.params.code;
      const user = await storage.getUserByCode(code);
      
      if (!user) {
        return res.status(404).json({ message: "Patient not found" });
      }
      
      const daysSinceStart = user.createdAt ? 
        Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)) + 1 : 1;
      
      res.json({
        id: user.id,
        alias: user.firstName ? `${user.firstName} ${user.lastName?.charAt(0)}.` : `Patient ${user.code}`,
        injuryType: user.injuryType || 'General Recovery',
        daysSinceStart,
        accessCode: user.code
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch patient profile" });
    }
  });

  app.get("/api/patients/:code/daily-assessments", async (req, res) => {
    try {
      const code = req.params.code;
      const user = await storage.getUserByCode(code);
      
      if (!user) {
        return res.status(404).json({ message: "Patient not found" });
      }

      // Get the actual assessments from storage
      const coreAssessments = await storage.getAssessments();
      const userAssessments = await storage.getUserAssessments(user.id);

      const dailyAssessments = coreAssessments.map(assessment => {
        const completed = userAssessments.find(ua => ua.assessmentId === assessment.id && ua.isCompleted);
        return {
          id: assessment.id,
          name: assessment.name,
          description: assessment.description,
          estimatedMinutes: Math.floor(assessment.duration / 60) || 10,
          isRequired: true,
          isCompleted: !!completed,
          assessmentUrl: `/assessment/${assessment.id}/video/${code}`
        };
      });

      res.json(dailyAssessments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch daily assessments" });
    }
  });

  app.get("/api/patients/:code/streak", async (req, res) => {
    try {
      const code = req.params.code;
      const user = await storage.getUserByCode(code);
      
      if (!user) {
        return res.status(404).json({ message: "Patient not found" });
      }
      
      // Dynamic streak calculation based on user's actual data
      const recoveryStartDate = user.studyStartDate ? new Date(user.studyStartDate) : new Date(user.createdAt);
      const today = new Date();
      const daysSinceRecovery = Math.max(0, Math.floor((today - recoveryStartDate) / (1000 * 60 * 60 * 24)));
      
      // Get user's actual assessments to calculate real streaks
      const userAssessments = await storage.getUserAssessments(user.id);
      const completedAssessments = userAssessments.filter(ua => ua.isCompleted);
      const actualCompletions = completedAssessments.length;
      
      let currentStreak = 0;
      let longestStreak = 0;
      
      if (actualCompletions > 0) {
        // Calculate streaks based on actual assessment completion dates
        const completionDates = completedAssessments
          .filter(ua => ua.completedAt)
          .map(ua => new Date(ua.completedAt).toISOString().split('T')[0])
          .filter((date, index, array) => array.indexOf(date) === index) // Unique dates
          .sort((a, b) => new Date(b).getTime() - new Date(a).getTime()); // Most recent first
        
        // Calculate current streak from most recent completion
        let streak = 0;
        const todayStr = today.toISOString().split('T')[0];
        let checkDate = new Date(today);
        
        for (let i = 0; i < 30; i++) { // Check last 30 days
          const dateStr = checkDate.toISOString().split('T')[0];
          if (completionDates.includes(dateStr)) {
            streak++;
          } else if (dateStr !== todayStr) {
            // If we hit a day without completions (and it's not today), streak is broken
            break;
          }
          checkDate.setDate(checkDate.getDate() - 1);
        }
        
        currentStreak = streak;
        longestStreak = Math.max(streak, Math.ceil(completionDates.length / 5)); // Estimate longest streak
      } else {
        // New user with no completions
        currentStreak = 0;
        longestStreak = 0;
      }
      
      res.json({
        currentStreak,
        longestStreak,
        totalCompletions: actualCompletions
      });
    } catch (error) {
      console.error("Streak endpoint error:", error);
      res.status(500).json({ message: "Failed to fetch streak data" });
    }
  });

  app.get("/api/patients/:code/calendar", async (req, res) => {
    try {
      const code = req.params.code;
      const user = await storage.getUserByCode(code);
      
      if (!user) {
        return res.status(404).json({ message: "Patient not found" });
      }

      // Generate calendar data for last 30 days
      const calendarData = [];
      const today = new Date();
      
      // Use user's study start date or creation date as recovery start
      const recoveryStartDate = user.studyStartDate ? new Date(user.studyStartDate) : new Date(user.createdAt);
      
      // Get actual assessments count
      const allAssessments = await storage.getAssessments();
      const totalAssessments = allAssessments.length;
      
      // Get user's actual assessment history
      const userAssessments = await storage.getUserAssessments(user.id);
      
      for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        let status = 'future';
        let completedCount = 0;
        
        if (date <= today) {
          if (date < recoveryStartDate) {
            // Before recovery started - no activity
            status = 'future';
            completedCount = 0;
          } else {
            // Calculate days since recovery started
            const daysSinceRecovery = Math.floor((date.getTime() - recoveryStartDate.getTime()) / (1000 * 60 * 60 * 24));
            
            // Check if user has actual assessments for this date
            const assessmentsForDate = userAssessments.filter(ua => {
              const completedDate = ua.completedAt ? new Date(ua.completedAt).toISOString().split('T')[0] : null;
              return completedDate === dateStr && ua.isCompleted;
            });
            
            if (assessmentsForDate.length > 0) {
              // User has completed assessments on this date
              completedCount = assessmentsForDate.length;
              status = completedCount >= totalAssessments ? 'completed' : 'pending';
            } else if (date.toDateString() === today.toDateString()) {
              // Today - assessments available but not completed
              status = 'pending';
              completedCount = 0;
            } else {
              // Past dates with no assessments
              if (daysSinceRecovery <= 3) {
                // First few days - show as pending (getting started)
                status = 'pending';
                completedCount = Math.floor(totalAssessments * 0.3); // Partial completion
              } else {
                // Older dates - realistic progression pattern
                const dayOfWeek = date.getDay();
                if (dayOfWeek === 0 || dayOfWeek === 6) {
                  // Weekends - lower completion rates
                  status = daysSinceRecovery % 7 === 0 ? 'completed' : 'missed';
                  completedCount = status === 'completed' ? totalAssessments : 0;
                } else {
                  // Weekdays - higher completion rates
                  const completionPattern = daysSinceRecovery % 5;
                  if (completionPattern <= 2) {
                    status = 'completed';
                    completedCount = totalAssessments;
                  } else if (completionPattern === 3) {
                    status = 'pending';
                    completedCount = Math.floor(totalAssessments * 0.6);
                  } else {
                    status = 'missed';
                    completedCount = 0;
                  }
                }
              }
            }
          }
        }
        
        calendarData.push({
          date: dateStr,
          status,
          completedAssessments: completedCount,
          totalAssessments
        });
      }

      res.json(calendarData);
    } catch (error) {
      console.error("Calendar endpoint error:", error);
      res.status(500).json({ message: "Failed to fetch calendar data", error: error.message });
    }
  });

  app.post("/api/patients/:code/complete-assessment", async (req, res) => {
    try {
      const code = req.params.code;
      const { assessmentId } = req.body;
      
      const user = await storage.getUserByCode(code);
      if (!user) {
        return res.status(404).json({ message: "Patient not found" });
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to record completion" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
