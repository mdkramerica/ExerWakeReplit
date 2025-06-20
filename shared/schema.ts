import { pgTable, text, serial, integer, boolean, timestamp, jsonb, numeric, varchar, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Clinical users (clinicians, researchers, admins)
export const clinicalUsers = pgTable("clinical_users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: text("role").notNull(), // "clinician", "researcher", "admin"
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  lastLoginAt: timestamp("last_login_at"),
});

// Cohort definitions for injury types
export const cohorts = pgTable("cohorts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description").notNull(),
  normalRomRanges: jsonb("normal_rom_ranges"), // Population normal ROM values
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Patients assigned to clinicians (PHI-free design)
export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  patientId: text("patient_id").notNull().unique(), // External patient identifier (PT001, PT002...)
  alias: text("alias").notNull(), // De-identified display name
  cohortId: integer("cohort_id").references(() => cohorts.id),
  assignedClinicianId: integer("assigned_clinician_id").references(() => clinicalUsers.id),
  status: text("status").notNull().default("stable"), // "improving", "stable", "declining"
  
  // Study demographics (de-identified)
  ageGroup: text("age_group"), // "18-25", "26-35", "36-45", "46-55", "56-65", "66-75"
  sex: text("sex"), // "M", "F", "Other"
  handDominance: text("hand_dominance"), // "Left", "Right", "Ambidextrous"
  occupationCategory: text("occupation_category"), // "Office Work", "Manual Labor", "Healthcare", "Education", "Retail", "Other"
  
  // Surgery details (for study tracking)
  surgeryDate: timestamp("surgery_date"), // For post-op day calculations only
  procedureCode: text("procedure_code"), // Standardized procedure codes
  laterality: text("laterality"), // "Left", "Right", "Bilateral"
  surgeonId: text("surgeon_id"), // De-identified surgeon identifier
  injuryType: text("injury_type"), // Specific injury classification
  
  // Enrollment fields
  enrollmentStatus: text("enrollment_status").default("screening"), // screening, enrolled, excluded, withdrawn
  enrolledDate: timestamp("enrolled_date"),
  accessCode: text("access_code").unique(), // 6-digit code for patient access
  phone: text("phone"),
  dateOfBirth: date("date_of_birth"),
  gender: text("gender"),
  injuryDate: date("injury_date"),
  eligibilityNotes: text("eligibility_notes"),
  
  isActive: boolean("is_active").default(true),
  baselineAssessmentId: integer("baseline_assessment_id"), // Reference to first assessment
  enrolledInStudy: boolean("enrolled_in_study").default(false),
  studyEnrollmentDate: timestamp("study_enrollment_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Assessment types/templates
export const assessmentTypes = pgTable("assessment_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  instructions: text("instructions"),
  videoUrl: text("video_url"),
  duration: integer("duration").notNull(),
  repetitions: integer("repetitions").default(3),
  isActive: boolean("is_active").default(true),
  orderIndex: integer("order_index").notNull(),
});

// Individual patient assessments with comprehensive metrics
export const patientAssessments = pgTable("patient_assessments", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  assessmentTypeId: integer("assessment_type_id").references(() => assessmentTypes.id).notNull(),
  clinicianId: integer("clinician_id").references(() => clinicalUsers.id).notNull(),
  assessmentDate: timestamp("assessment_date").defaultNow(),
  sessionNumber: integer("session_number").default(1),
  deviceConfidenceScore: numeric("device_confidence_score", { precision: 5, scale: 2 }),
  
  // TAM (Total Active Motion) metrics
  tamScore: numeric("tam_score", { precision: 5, scale: 2 }),
  indexFingerRom: numeric("index_finger_rom", { precision: 5, scale: 2 }),
  middleFingerRom: numeric("middle_finger_rom", { precision: 5, scale: 2 }),
  ringFingerRom: numeric("ring_finger_rom", { precision: 5, scale: 2 }),
  pinkyFingerRom: numeric("pinky_finger_rom", { precision: 5, scale: 2 }),
  
  // Individual joint angles
  indexMcp: numeric("index_mcp", { precision: 5, scale: 2 }),
  indexPip: numeric("index_pip", { precision: 5, scale: 2 }),
  indexDip: numeric("index_dip", { precision: 5, scale: 2 }),
  middleMcp: numeric("middle_mcp", { precision: 5, scale: 2 }),
  middlePip: numeric("middle_pip", { precision: 5, scale: 2 }),
  middleDip: numeric("middle_dip", { precision: 5, scale: 2 }),
  ringMcp: numeric("ring_mcp", { precision: 5, scale: 2 }),
  ringPip: numeric("ring_pip", { precision: 5, scale: 2 }),
  ringDip: numeric("ring_dip", { precision: 5, scale: 2 }),
  pinkyMcp: numeric("pinky_mcp", { precision: 5, scale: 2 }),
  pinkyPip: numeric("pinky_pip", { precision: 5, scale: 2 }),
  pinkyDip: numeric("pinky_dip", { precision: 5, scale: 2 }),
  
  // Kapandji score
  kapandjiScore: numeric("kapandji_score", { precision: 5, scale: 2 }),
  
  // Wrist flexion/extension angles
  wristFlexionAngle: numeric("wrist_flexion_angle", { precision: 5, scale: 2 }),
  wristExtensionAngle: numeric("wrist_extension_angle", { precision: 5, scale: 2 }),
  maxWristFlexion: numeric("max_wrist_flexion", { precision: 5, scale: 2 }),
  maxWristExtension: numeric("max_wrist_extension", { precision: 5, scale: 2 }),
  
  // Overall progress metrics
  percentOfNormalRom: numeric("percent_of_normal_rom", { precision: 5, scale: 2 }),
  changeFromBaseline: numeric("change_from_baseline", { precision: 5, scale: 2 }),
  
  // Raw data storage
  rawData: jsonb("raw_data"),
  notes: text("notes"),
  
  // Study-specific fields
  postOpDay: integer("post_op_day"), // Calculated from surgery date
  studyWeek: integer("study_week"), // Week 0-12 of study
  vasScore: integer("vas_score"), // Pain VAS 0-10
  quickDashScore: numeric("quick_dash_score", { precision: 5, scale: 2 }), // QuickDASH score
  missedVisit: boolean("missed_visit").default(false),
  retakeFlag: boolean("retake_flag").default(false), // If retaken due to low confidence
  
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
});

// Outlier detection alerts
export const outlierAlerts = pgTable("outlier_alerts", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  cohortId: integer("cohort_id").references(() => cohorts.id).notNull(),
  alertType: text("alert_type").notNull(), // "deviation_below_mean"
  severity: text("severity").notNull(), // "warning", "critical"
  metric: text("metric").notNull(), // Which metric triggered the alert
  deviationValue: numeric("deviation_value", { precision: 5, scale: 2 }),
  consecutiveOccurrences: integer("consecutive_occurrences").default(1),
  isResolved: boolean("is_resolved").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

// Audit log for compliance
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => clinicalUsers.id).notNull(),
  action: text("action").notNull(), // "data_export", "permission_change", "patient_access"
  targetEntity: text("target_entity"), // "patient_id:123", "cohort_id:456"
  details: jsonb("details"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Data export requests for tracking
export const dataExports = pgTable("data_exports", {
  id: serial("id").primaryKey(),
  requestedBy: integer("requested_by").references(() => clinicalUsers.id).notNull(),
  exportType: text("export_type").notNull(), // "patient_data", "cohort_data"
  filters: jsonb("filters"),
  downloadUrl: text("download_url"),
  expiresAt: timestamp("expires_at"),
  downloadedAt: timestamp("downloaded_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Legacy tables for backward compatibility
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  injuryType: text("injury_type"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  email: text("email"),
  createdAt: timestamp("created_at").defaultNow(),
  isFirstTime: boolean("is_first_time").default(true),
  isActive: boolean("is_active").default(true),
});

export const assessments = pgTable("assessments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  videoUrl: text("video_url"),
  duration: integer("duration").notNull(),
  repetitions: integer("repetitions").default(3),
  instructions: text("instructions"),
  isActive: boolean("is_active").default(true),
  orderIndex: integer("order_index").notNull(),
});

export const userAssessments = pgTable("user_assessments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  assessmentId: integer("assessment_id").notNull(),
  sessionNumber: integer("session_number").default(1),
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  romData: jsonb("rom_data"),
  repetitionData: jsonb("repetition_data"),
  qualityScore: integer("quality_score"),
  maxMcpAngle: numeric("max_mcp_angle", { precision: 5, scale: 2 }),
  maxPipAngle: numeric("max_pip_angle", { precision: 5, scale: 2 }),
  maxDipAngle: numeric("max_dip_angle", { precision: 5, scale: 2 }),
  totalActiveRom: numeric("total_active_rom", { precision: 5, scale: 2 }),
  indexFingerRom: numeric("index_finger_rom", { precision: 5, scale: 2 }),
  middleFingerRom: numeric("middle_finger_rom", { precision: 5, scale: 2 }),
  ringFingerRom: numeric("ring_finger_rom", { precision: 5, scale: 2 }),
  pinkyFingerRom: numeric("pinky_finger_rom", { precision: 5, scale: 2 }),
  middleFingerMcp: numeric("middle_finger_mcp", { precision: 5, scale: 2 }),
  middleFingerPip: numeric("middle_finger_pip", { precision: 5, scale: 2 }),
  middleFingerDip: numeric("middle_finger_dip", { precision: 5, scale: 2 }),
  ringFingerMcp: numeric("ring_finger_mcp", { precision: 5, scale: 2 }),
  ringFingerPip: numeric("ring_finger_pip", { precision: 5, scale: 2 }),
  ringFingerDip: numeric("ring_finger_dip", { precision: 5, scale: 2 }),
  pinkyFingerMcp: numeric("pinky_finger_mcp", { precision: 5, scale: 2 }),
  pinkyFingerPip: numeric("pinky_finger_pip", { precision: 5, scale: 2 }),
  pinkyFingerDip: numeric("pinky_finger_dip", { precision: 5, scale: 2 }),
  handType: text("hand_type"),
  wristFlexionAngle: numeric("wrist_flexion_angle", { precision: 5, scale: 2 }),
  wristExtensionAngle: numeric("wrist_extension_angle", { precision: 5, scale: 2 }),
  maxWristFlexion: numeric("max_wrist_flexion", { precision: 5, scale: 2 }),
  maxWristExtension: numeric("max_wrist_extension", { precision: 5, scale: 2 }),
  shareToken: text("share_token").unique(),
});

export const injuryTypes = pgTable("injury_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
});

// Clinical dashboard schemas
export const insertClinicalUserSchema = createInsertSchema(clinicalUsers).omit({
  id: true,
  createdAt: true,
  lastLoginAt: true,
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const insertCohortSchema = createInsertSchema(cohorts).omit({
  id: true,
  createdAt: true,
});

export const insertPatientSchema = createInsertSchema(patients).omit({
  id: true,
  createdAt: true,
});

export const insertAssessmentTypeSchema = createInsertSchema(assessmentTypes).omit({
  id: true,
});

export const insertPatientAssessmentSchema = createInsertSchema(patientAssessments).omit({
  id: true,
  assessmentDate: true,
  completedAt: true,
});

export const insertOutlierAlertSchema = createInsertSchema(outlierAlerts).omit({
  id: true,
  createdAt: true,
  resolvedAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  timestamp: true,
});

export const insertDataExportSchema = createInsertSchema(dataExports).omit({
  id: true,
  createdAt: true,
});

// QuickDASH questionnaire responses (study-specific)
export const quickDashResponses = pgTable("quick_dash_responses", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  assessmentId: integer("assessment_id").references(() => patientAssessments.id),
  postOpDay: integer("post_op_day").notNull(),
  studyWeek: integer("study_week").notNull(),
  
  // QuickDASH 11 items (scored 1-5)
  q1_difficulty_opening_jar: integer("q1_difficulty_opening_jar"),
  q2_difficulty_writing: integer("q2_difficulty_writing"),
  q3_difficulty_turning_key: integer("q3_difficulty_turning_key"),
  q4_difficulty_preparing_meal: integer("q4_difficulty_preparing_meal"),
  q5_difficulty_pushing_door: integer("q5_difficulty_pushing_door"),
  q6_difficulty_placing_object: integer("q6_difficulty_placing_object"),
  q7_arm_shoulder_hand_pain: integer("q7_arm_shoulder_hand_pain"),
  q8_arm_shoulder_hand_pain_activity: integer("q8_arm_shoulder_hand_pain_activity"),
  q9_tingling_arm_shoulder_hand: integer("q9_tingling_arm_shoulder_hand"),
  q10_weakness_arm_shoulder_hand: integer("q10_weakness_arm_shoulder_hand"),
  q11_stiffness_arm_shoulder_hand: integer("q11_stiffness_arm_shoulder_hand"),
  
  totalScore: numeric("total_score", { precision: 5, scale: 2 }),
  completedAt: timestamp("completed_at").defaultNow(),
});

// Study visit schedule and adherence tracking
export const studyVisits = pgTable("study_visits", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  scheduledWeek: integer("scheduled_week").notNull(),
  scheduledDate: timestamp("scheduled_date").notNull(),
  windowStart: timestamp("window_start").notNull(),
  windowEnd: timestamp("window_end").notNull(),
  visitStatus: text("visit_status").notNull().default("scheduled"),
  completedAt: timestamp("completed_at"),
  assessmentId: integer("assessment_id").references(() => patientAssessments.id),
  reminderSent: boolean("reminder_sent").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertQuickDashResponseSchema = createInsertSchema(quickDashResponses).omit({
  id: true,
  completedAt: true,
});

export const insertStudyVisitSchema = createInsertSchema(studyVisits).omit({
  id: true,
  createdAt: true,
});

// Legacy schemas
export const insertUserSchema = createInsertSchema(users).pick({
  code: true,
  injuryType: true,
});

export const insertAssessmentSchema = createInsertSchema(assessments).omit({
  id: true,
});

export const insertUserAssessmentSchema = createInsertSchema(userAssessments).omit({
  id: true,
});

export const insertInjuryTypeSchema = createInsertSchema(injuryTypes).omit({
  id: true,
});

// Clinical dashboard types
export type InsertClinicalUser = z.infer<typeof insertClinicalUserSchema>;
export type ClinicalUser = typeof clinicalUsers.$inferSelect;
export type LoginRequest = z.infer<typeof loginSchema>;

export type InsertCohort = z.infer<typeof insertCohortSchema>;
export type Cohort = typeof cohorts.$inferSelect;

export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type Patient = typeof patients.$inferSelect;

export type InsertAssessmentType = z.infer<typeof insertAssessmentTypeSchema>;
export type AssessmentType = typeof assessmentTypes.$inferSelect;

export type InsertPatientAssessment = z.infer<typeof insertPatientAssessmentSchema>;
export type PatientAssessment = typeof patientAssessments.$inferSelect;

export type InsertOutlierAlert = z.infer<typeof insertOutlierAlertSchema>;
export type OutlierAlert = typeof outlierAlerts.$inferSelect;

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

export type InsertDataExport = z.infer<typeof insertDataExportSchema>;
export type DataExport = typeof dataExports.$inferSelect;

// Enrollment specific schemas
export const enrollmentEligibilitySchema = z.object({
  patientId: z.number(),
  cohortId: z.number(),
  eligibilityNotes: z.string().optional(),
});

export const patientEnrollmentSchema = z.object({
  patientId: z.number(),
  cohortId: z.number(),
  enrollmentStatus: z.enum(['screening', 'enrolled', 'excluded', 'withdrawn']),
  eligibilityNotes: z.string().optional(),
});

export type EnrollmentEligibility = z.infer<typeof enrollmentEligibilitySchema>;
export type PatientEnrollment = z.infer<typeof patientEnrollmentSchema>;

// Legacy types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertAssessment = z.infer<typeof insertAssessmentSchema>;
export type Assessment = typeof assessments.$inferSelect;

export type InsertUserAssessment = z.infer<typeof insertUserAssessmentSchema>;
export type UserAssessment = typeof userAssessments.$inferSelect;

export type InsertInjuryType = z.infer<typeof insertInjuryTypeSchema>;
export type InjuryType = typeof injuryTypes.$inferSelect;

// Extended types for dashboard views
export type PatientWithDetails = Patient & {
  cohort: Cohort | null;
  assignedClinician: ClinicalUser | null;
  lastAssessment: PatientAssessment | null;
  assessmentCount: number;
};

export type CohortAnalytics = {
  cohortId: number;
  cohortName: string;
  patientCount: number;
  avgTamScore: number;
  avgKapandjiScore: number;
  avgWristFlexion: number;
  avgWristExtension: number;
  stdDevTamScore: number;
  stdDevKapandjiScore: number;
  stdDevWristFlexion: number;
  stdDevWristExtension: number;
};
