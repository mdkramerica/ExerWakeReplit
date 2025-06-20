import { 
  users, 
  assessments, 
  userAssessments, 
  injuryTypes,
  clinicalUsers,
  cohorts,
  patients,
  assessmentTypes,
  patientAssessments,
  outlierAlerts,
  auditLogs,
  dataExports,
  quickDashResponses,
  studyVisits,
  type User, 
  type InsertUser,
  type Assessment,
  type InsertAssessment,
  type UserAssessment,
  type InsertUserAssessment,
  type InjuryType,
  type InsertInjuryType,
  type ClinicalUser,
  type InsertClinicalUser,
  type Cohort,
  type InsertCohort,
  type Patient,
  type InsertPatient,
  type PatientWithDetails,
  type AssessmentType,
  type InsertAssessmentType,
  type PatientAssessment,
  type InsertPatientAssessment,
  type OutlierAlert,
  type InsertOutlierAlert,
  type AuditLog,
  type InsertAuditLog,
  type DataExport,
  type InsertDataExport,
  type QuickDashResponse,
  type InsertQuickDashResponse,
  type StudyVisit,
  type InsertStudyVisit,
  type CohortAnalytics
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, count, avg, asc } from "drizzle-orm";

export interface IStorage {
  // Clinical User methods
  getClinicalUser(id: number): Promise<ClinicalUser | undefined>;
  getClinicalUserByUsername(username: string): Promise<ClinicalUser | undefined>;
  createClinicalUser(user: InsertClinicalUser): Promise<ClinicalUser>;
  updateClinicalUser(id: number, updates: Partial<ClinicalUser>): Promise<ClinicalUser | undefined>;
  authenticateClinicalUser(username: string, password: string): Promise<ClinicalUser | null>;
  
  // Cohort methods
  getCohorts(): Promise<Cohort[]>;
  getCohort(id: number): Promise<Cohort | undefined>;
  createCohort(cohort: InsertCohort): Promise<Cohort>;
  updateCohort(id: number, updates: Partial<Cohort>): Promise<Cohort | undefined>;
  deleteCohort(id: number): Promise<boolean>;
  
  // Patient methods
  getPatients(clinicianId?: number): Promise<PatientWithDetails[]>;
  getPatient(id: number): Promise<Patient | undefined>;
  getPatientWithDetails(id: number): Promise<PatientWithDetails | undefined>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  updatePatient(id: number, updates: Partial<Patient>): Promise<Patient | undefined>;
  deletePatient(id: number): Promise<boolean>;
  
  // Patient enrollment
  checkEligibility(patientId: number, cohortId: number): Promise<{ eligible: boolean; reasons: string[] }>;
  enrollPatient(enrollment: any): Promise<Patient>;
  generateAccessCode(): Promise<string>;
  getPatientByAccessCode(accessCode: string): Promise<Patient | undefined>;
  
  // Assessment Type methods
  getAssessmentTypes(): Promise<AssessmentType[]>;
  getAssessmentType(id: number): Promise<AssessmentType | undefined>;
  createAssessmentType(assessmentType: InsertAssessmentType): Promise<AssessmentType>;
  updateAssessmentType(id: number, updates: Partial<AssessmentType>): Promise<AssessmentType | undefined>;
  
  // Patient Assessment methods
  getPatientAssessments(patientId: number, limit?: number): Promise<PatientAssessment[]>;
  getPatientAssessment(id: number): Promise<PatientAssessment | undefined>;
  createPatientAssessment(assessment: InsertPatientAssessment): Promise<PatientAssessment>;
  updatePatientAssessment(id: number, updates: Partial<PatientAssessment>): Promise<PatientAssessment | undefined>;
  getCohortAssessments(cohortId: number, limit?: number): Promise<PatientAssessment[]>;
  
  // Analytics methods
  getCohortAnalytics(cohortId: number): Promise<CohortAnalytics | null>;
  
  // Outlier Alert methods
  getOutlierAlerts(patientId?: number): Promise<OutlierAlert[]>;
  createOutlierAlert(alert: InsertOutlierAlert): Promise<OutlierAlert>;
  resolveOutlierAlert(id: number): Promise<boolean>;
  
  // Audit Log methods
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(userId?: number, limit?: number): Promise<AuditLog[]>;
  
  // Data Export methods
  createDataExport(exportRequest: InsertDataExport): Promise<DataExport>;
  getDataExport(id: number): Promise<DataExport | undefined>;
  updateDataExport(id: number, updates: Partial<DataExport>): Promise<DataExport | undefined>;
  
  // Legacy methods
  getUser(id: number): Promise<User | undefined>;
  getUserByCode(code: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  getAssessments(): Promise<Assessment[]>;
  getAssessmentsForInjury(injuryType: string): Promise<Assessment[]>;
  getAssessment(id: number): Promise<Assessment | undefined>;
  createAssessment(assessment: InsertAssessment): Promise<Assessment>;
  getUserAssessments(userId: number): Promise<UserAssessment[]>;
  getUserAssessment(userId: number, assessmentId: number): Promise<UserAssessment | undefined>;
  createUserAssessment(userAssessment: InsertUserAssessment): Promise<UserAssessment>;
  updateUserAssessment(id: number, updates: Partial<UserAssessment>): Promise<UserAssessment | undefined>;
  getUserAssessmentByShareToken(shareToken: string): Promise<UserAssessment | undefined>;
  generateShareToken(userAssessmentId: number): Promise<string>;
  getInjuryTypes(): Promise<InjuryType[]>;
  createInjuryType(injuryType: InsertInjuryType): Promise<InjuryType>;
}

export class DatabaseStorage implements IStorage {
  // Clinical User methods
  async getClinicalUser(id: number): Promise<ClinicalUser | undefined> {
    const [user] = await db.select().from(clinicalUsers).where(eq(clinicalUsers.id, id));
    return user || undefined;
  }

  async getClinicalUserByUsername(username: string): Promise<ClinicalUser | undefined> {
    const [user] = await db.select().from(clinicalUsers).where(eq(clinicalUsers.username, username));
    return user || undefined;
  }

  async createClinicalUser(insertUser: InsertClinicalUser): Promise<ClinicalUser> {
    const [user] = await db
      .insert(clinicalUsers)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateClinicalUser(id: number, updates: Partial<ClinicalUser>): Promise<ClinicalUser | undefined> {
    const [user] = await db
      .update(clinicalUsers)
      .set(updates)
      .where(eq(clinicalUsers.id, id))
      .returning();
    return user || undefined;
  }

  async authenticateClinicalUser(username: string, password: string): Promise<ClinicalUser | null> {
    const [user] = await db
      .select()
      .from(clinicalUsers)
      .where(and(eq(clinicalUsers.username, username), eq(clinicalUsers.password, password), eq(clinicalUsers.isActive, true)));
    
    if (user) {
      await this.updateClinicalUser(user.id, { lastLoginAt: new Date() });
      return user;
    }
    return null;
  }

  // Cohort methods
  async getCohorts(): Promise<Cohort[]> {
    return await db.select().from(cohorts).where(eq(cohorts.isActive, true)).orderBy(asc(cohorts.name));
  }

  async getCohort(id: number): Promise<Cohort | undefined> {
    const [cohort] = await db.select().from(cohorts).where(eq(cohorts.id, id));
    return cohort || undefined;
  }

  async createCohort(insertCohort: InsertCohort): Promise<Cohort> {
    const [cohort] = await db
      .insert(cohorts)
      .values(insertCohort)
      .returning();
    return cohort;
  }

  async updateCohort(id: number, updates: Partial<Cohort>): Promise<Cohort | undefined> {
    const [cohort] = await db
      .update(cohorts)
      .set(updates)
      .where(eq(cohorts.id, id))
      .returning();
    return cohort || undefined;
  }

  async deleteCohort(id: number): Promise<boolean> {
    const result = await db
      .update(cohorts)
      .set({ isActive: false })
      .where(eq(cohorts.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Patient methods
  async getPatients(clinicianId?: number): Promise<PatientWithDetails[]> {
    const query = db
      .select({
        id: patients.id,
        patientId: patients.patientId,
        alias: patients.alias,
        cohortId: patients.cohortId,
        assignedClinicianId: patients.assignedClinicianId,
        status: patients.status,
        isActive: patients.isActive,
        baselineAssessmentId: patients.baselineAssessmentId,
        createdAt: patients.createdAt,
        cohort: cohorts,
        assignedClinician: clinicalUsers,
        lastAssessment: patientAssessments,
        assessmentCount: count(patientAssessments.id)
      })
      .from(patients)
      .leftJoin(cohorts, eq(patients.cohortId, cohorts.id))
      .leftJoin(clinicalUsers, eq(patients.assignedClinicianId, clinicalUsers.id))
      .leftJoin(patientAssessments, eq(patients.id, patientAssessments.patientId))
      .where(eq(patients.isActive, true))
      .groupBy(patients.id, cohorts.id, clinicalUsers.id, patientAssessments.id)
      .orderBy(desc(patientAssessments.assessmentDate));

    if (clinicianId) {
      query.where(and(eq(patients.isActive, true), eq(patients.assignedClinicianId, clinicianId)));
    }

    return await query as PatientWithDetails[];
  }

  async getPatient(id: number): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.id, id));
    return patient || undefined;
  }

  async getPatientWithDetails(id: number): Promise<PatientWithDetails | undefined> {
    const result = await db
      .select({
        id: patients.id,
        patientId: patients.patientId,
        alias: patients.alias,
        cohortId: patients.cohortId,
        assignedClinicianId: patients.assignedClinicianId,
        status: patients.status,
        isActive: patients.isActive,
        baselineAssessmentId: patients.baselineAssessmentId,
        createdAt: patients.createdAt,
        cohort: cohorts,
        assignedClinician: clinicalUsers,
        lastAssessment: patientAssessments,
        assessmentCount: count(patientAssessments.id)
      })
      .from(patients)
      .leftJoin(cohorts, eq(patients.cohortId, cohorts.id))
      .leftJoin(clinicalUsers, eq(patients.assignedClinicianId, clinicalUsers.id))
      .leftJoin(patientAssessments, eq(patients.id, patientAssessments.patientId))
      .where(eq(patients.id, id))
      .groupBy(patients.id, cohorts.id, clinicalUsers.id, patientAssessments.id)
      .orderBy(desc(patientAssessments.assessmentDate))
      .limit(1);

    return result[0] as PatientWithDetails || undefined;
  }

  async createPatient(insertPatient: InsertPatient): Promise<Patient> {
    const [patient] = await db
      .insert(patients)
      .values(insertPatient)
      .returning();
    return patient;
  }

  async updatePatient(id: number, updates: Partial<Patient>): Promise<Patient | undefined> {
    const [patient] = await db
      .update(patients)
      .set(updates)
      .where(eq(patients.id, id))
      .returning();
    return patient || undefined;
  }

  async deletePatient(id: number): Promise<boolean> {
    const result = await db
      .update(patients)
      .set({ isActive: false })
      .where(eq(patients.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Assessment Type methods
  async getAssessmentTypes(): Promise<AssessmentType[]> {
    return await db.select().from(assessmentTypes).where(eq(assessmentTypes.isActive, true)).orderBy(asc(assessmentTypes.orderIndex));
  }

  async getAssessmentType(id: number): Promise<AssessmentType | undefined> {
    const [assessmentType] = await db.select().from(assessmentTypes).where(eq(assessmentTypes.id, id));
    return assessmentType || undefined;
  }

  async createAssessmentType(insertAssessmentType: InsertAssessmentType): Promise<AssessmentType> {
    const [assessmentType] = await db
      .insert(assessmentTypes)
      .values(insertAssessmentType)
      .returning();
    return assessmentType;
  }

  async updateAssessmentType(id: number, updates: Partial<AssessmentType>): Promise<AssessmentType | undefined> {
    const [assessmentType] = await db
      .update(assessmentTypes)
      .set(updates)
      .where(eq(assessmentTypes.id, id))
      .returning();
    return assessmentType || undefined;
  }

  // Patient Assessment methods
  async getPatientAssessments(patientId: number, limit = 100): Promise<PatientAssessment[]> {
    return await db
      .select()
      .from(patientAssessments)
      .where(eq(patientAssessments.patientId, patientId))
      .orderBy(desc(patientAssessments.assessmentDate))
      .limit(limit);
  }

  async getPatientAssessment(id: number): Promise<PatientAssessment | undefined> {
    const [assessment] = await db.select().from(patientAssessments).where(eq(patientAssessments.id, id));
    return assessment || undefined;
  }

  async createPatientAssessment(insertAssessment: InsertPatientAssessment): Promise<PatientAssessment> {
    const [assessment] = await db
      .insert(patientAssessments)
      .values(insertAssessment)
      .returning();
    return assessment;
  }

  async updatePatientAssessment(id: number, updates: Partial<PatientAssessment>): Promise<PatientAssessment | undefined> {
    const [assessment] = await db
      .update(patientAssessments)
      .set(updates)
      .where(eq(patientAssessments.id, id))
      .returning();
    return assessment || undefined;
  }

  async getCohortAssessments(cohortId: number, limit = 500): Promise<PatientAssessment[]> {
    return await db
      .select({
        id: patientAssessments.id,
        patientId: patientAssessments.patientId,
        assessmentTypeId: patientAssessments.assessmentTypeId,
        clinicianId: patientAssessments.clinicianId,
        assessmentDate: patientAssessments.assessmentDate,
        sessionNumber: patientAssessments.sessionNumber,
        deviceConfidenceScore: patientAssessments.deviceConfidenceScore,
        tamScore: patientAssessments.tamScore,
        indexFingerRom: patientAssessments.indexFingerRom,
        middleFingerRom: patientAssessments.middleFingerRom,
        ringFingerRom: patientAssessments.ringFingerRom,
        pinkyFingerRom: patientAssessments.pinkyFingerRom,
        indexMcp: patientAssessments.indexMcp,
        indexPip: patientAssessments.indexPip,
        indexDip: patientAssessments.indexDip,
        middleMcp: patientAssessments.middleMcp,
        middlePip: patientAssessments.middlePip,
        middleDip: patientAssessments.middleDip,
        ringMcp: patientAssessments.ringMcp,
        ringPip: patientAssessments.ringPip,
        ringDip: patientAssessments.ringDip,
        pinkyMcp: patientAssessments.pinkyMcp,
        pinkyPip: patientAssessments.pinkyPip,
        pinkyDip: patientAssessments.pinkyDip,
        kapandjiScore: patientAssessments.kapandjiScore,
        wristFlexionAngle: patientAssessments.wristFlexionAngle,
        wristExtensionAngle: patientAssessments.wristExtensionAngle,
        maxWristFlexion: patientAssessments.maxWristFlexion,
        maxWristExtension: patientAssessments.maxWristExtension,
        percentOfNormalRom: patientAssessments.percentOfNormalRom,
        changeFromBaseline: patientAssessments.changeFromBaseline,
        rawData: patientAssessments.rawData,
        notes: patientAssessments.notes,
        isCompleted: patientAssessments.isCompleted,
        completedAt: patientAssessments.completedAt
      })
      .from(patientAssessments)
      .innerJoin(patients, eq(patientAssessments.patientId, patients.id))
      .where(and(eq(patients.cohortId, cohortId), eq(patientAssessments.isCompleted, true)))
      .orderBy(desc(patientAssessments.assessmentDate))
      .limit(limit) as PatientAssessment[];
  }

  // Analytics methods
  async getCohortAnalytics(cohortId: number): Promise<CohortAnalytics | null> {
    const result = await db
      .select({
        cohortId: patients.cohortId,
        cohortName: cohorts.name,
        patientCount: count(sql`DISTINCT ${patients.id}`),
        avgTamScore: avg(patientAssessments.tamScore),
        avgKapandjiScore: avg(patientAssessments.kapandjiScore),
        avgWristFlexion: avg(patientAssessments.wristFlexionAngle),
        avgWristExtension: avg(patientAssessments.wristExtensionAngle),
        stdDevTamScore: sql`STDDEV(${patientAssessments.tamScore})`,
        stdDevKapandjiScore: sql`STDDEV(${patientAssessments.kapandjiScore})`,
        stdDevWristFlexion: sql`STDDEV(${patientAssessments.wristFlexionAngle})`,
        stdDevWristExtension: sql`STDDEV(${patientAssessments.wristExtensionAngle})`
      })
      .from(patients)
      .innerJoin(cohorts, eq(patients.cohortId, cohorts.id))
      .leftJoin(patientAssessments, and(eq(patients.id, patientAssessments.patientId), eq(patientAssessments.isCompleted, true)))
      .where(eq(patients.cohortId, cohortId))
      .groupBy(patients.cohortId, cohorts.name);

    return result[0] as CohortAnalytics || null;
  }

  // Outlier Alert methods
  async getOutlierAlerts(patientId?: number): Promise<OutlierAlert[]> {
    const query = db.select().from(outlierAlerts).where(eq(outlierAlerts.isResolved, false));
    
    if (patientId) {
      query.where(and(eq(outlierAlerts.isResolved, false), eq(outlierAlerts.patientId, patientId)));
    }
    
    return await query.orderBy(desc(outlierAlerts.createdAt));
  }

  async createOutlierAlert(insertAlert: InsertOutlierAlert): Promise<OutlierAlert> {
    const [alert] = await db
      .insert(outlierAlerts)
      .values(insertAlert)
      .returning();
    return alert;
  }

  async resolveOutlierAlert(id: number): Promise<boolean> {
    const result = await db
      .update(outlierAlerts)
      .set({ isResolved: true, resolvedAt: new Date() })
      .where(eq(outlierAlerts.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Audit Log methods
  async createAuditLog(insertLog: InsertAuditLog): Promise<AuditLog> {
    const [log] = await db
      .insert(auditLogs)
      .values(insertLog)
      .returning();
    return log;
  }

  async getAuditLogs(userId?: number, limit = 100): Promise<AuditLog[]> {
    const query = db.select().from(auditLogs);
    
    if (userId) {
      query.where(eq(auditLogs.userId, userId));
    }
    
    return await query.orderBy(desc(auditLogs.timestamp)).limit(limit);
  }

  // Data Export methods
  async createDataExport(insertExport: InsertDataExport): Promise<DataExport> {
    const [exportRequest] = await db
      .insert(dataExports)
      .values(insertExport)
      .returning();
    return exportRequest;
  }

  async getDataExport(id: number): Promise<DataExport | undefined> {
    const [exportRequest] = await db.select().from(dataExports).where(eq(dataExports.id, id));
    return exportRequest || undefined;
  }

  async updateDataExport(id: number, updates: Partial<DataExport>): Promise<DataExport | undefined> {
    const [exportRequest] = await db
      .update(dataExports)
      .set(updates)
      .where(eq(dataExports.id, id))
      .returning();
    return exportRequest || undefined;
  }

  // Research analytics methods
  async getAllStudyAssessments(): Promise<PatientAssessment[]> {
    return await db
      .select()
      .from(patientAssessments)
      .innerJoin(patients, eq(patientAssessments.patientId, patients.id))
      .where(eq(patients.enrolledInStudy, true))
      .orderBy(desc(patientAssessments.assessmentDate));
  }

  async getOutcomeData(): Promise<any[]> {
    // Get baseline and 12-week outcome data for predictive modeling
    const baselineData = await db
      .select()
      .from(patientAssessments)
      .innerJoin(patients, eq(patientAssessments.patientId, patients.id))
      .where(
        and(
          eq(patients.enrolledInStudy, true),
          eq(patientAssessments.studyWeek, 0)
        )
      );
    
    const outcomeData = await db
      .select()
      .from(patientAssessments)
      .innerJoin(patients, eq(patientAssessments.patientId, patients.id))
      .where(
        and(
          eq(patients.enrolledInStudy, true),
          sql`${patientAssessments.studyWeek} >= 12`
        )
      );
    
    // Combine baseline and outcome data
    return baselineData.map(baseline => {
      const outcome = outcomeData.find(o => o.patient_assessments.patientId === baseline.patient_assessments.patientId);
      return {
        patientId: baseline.patients.patientId,
        ageGroup: baseline.patients.ageGroup,
        sex: baseline.patients.sex,
        handDominance: baseline.patients.handDominance,
        injuryType: baseline.patients.injuryType,
        occupationCategory: baseline.patients.occupationCategory,
        baselineRom: baseline.patient_assessments.percentOfNormalRom,
        baselinePain: baseline.patient_assessments.vasScore,
        baselineFunction: baseline.patient_assessments.quickDashScore,
        outcomeRom: outcome?.patient_assessments.percentOfNormalRom,
        outcomePain: outcome?.patient_assessments.vasScore,
        outcomeFunction: outcome?.patient_assessments.quickDashScore,
        romImprovement: outcome ? (outcome.patient_assessments.percentOfNormalRom || 0) - (baseline.patient_assessments.percentOfNormalRom || 0) : null,
        painReduction: outcome ? (baseline.patient_assessments.vasScore || 0) - (outcome.patient_assessments.vasScore || 0) : null,
        functionImprovement: outcome ? (baseline.patient_assessments.quickDashScore || 0) - (outcome.patient_assessments.quickDashScore || 0) : null,
      };
    }).filter(data => data.outcomeRom !== undefined);
  }
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByCode(code: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.code, code));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async getAssessments(): Promise<Assessment[]> {
    return await db.select().from(assessments).where(eq(assessments.isActive, true));
  }

  // Patient enrollment methods
  async checkEligibility(patientId: number, cohortId: number): Promise<{ eligible: boolean; reasons: string[] }> {
    // Basic eligibility criteria - can be expanded based on requirements
    const patient = await db.select().from(patients).where(eq(patients.id, patientId)).limit(1);
    const cohort = await db.select().from(cohorts).where(eq(cohorts.id, cohortId)).limit(1);
    
    if (!patient.length || !cohort.length) {
      return { eligible: false, reasons: ['Patient or cohort not found'] };
    }
    
    const reasons: string[] = [];
    
    // Check if already enrolled in another study
    if (patient[0].enrolledInStudy && patient[0].cohortId !== cohortId) {
      reasons.push('Patient already enrolled in another study');
    }
    
    // Check enrollment status
    if (patient[0].enrollmentStatus === 'excluded') {
      reasons.push('Patient previously excluded from studies');
    }
    
    if (patient[0].enrollmentStatus === 'withdrawn') {
      reasons.push('Patient previously withdrew from studies');
    }
    
    return { eligible: reasons.length === 0, reasons };
  }

  async enrollPatient(enrollment: PatientEnrollment): Promise<Patient> {
    const { eligible } = await this.checkEligibility(enrollment.patientId, enrollment.cohortId);
    
    if (!eligible) {
      throw new Error('Patient is not eligible for enrollment');
    }
    
    const [updatedPatient] = await db
      .update(patients)
      .set({
        enrollmentStatus: enrollment.enrollmentStatus,
        cohortId: enrollment.cohortId,
        enrolledInStudy: enrollment.enrollmentStatus === 'enrolled',
        enrolledDate: enrollment.enrollmentStatus === 'enrolled' ? new Date() : null,
        eligibilityNotes: enrollment.eligibilityNotes,
      })
      .where(eq(patients.id, enrollment.patientId))
      .returning();
    
    return updatedPatient;
  }

  async generateAccessCode(): Promise<string> {
    let code: string;
    let exists = true;
    
    while (exists) {
      code = Math.floor(100000 + Math.random() * 900000).toString();
      const existing = await db.select().from(patients).where(eq(patients.accessCode, code)).limit(1);
      exists = existing.length > 0;
    }
    
    return code!;
  }

  async getPatientByAccessCode(accessCode: string): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.accessCode, accessCode)).limit(1);
    return patient || undefined;
  }

  async getAssessmentsForInjury(injuryType: string): Promise<Assessment[]> {
    const allAssessments = await db.select().from(assessments).where(eq(assessments.isActive, true));
    
    // Define which assessments are needed for each injury type
    const injuryAssessmentMap: Record<string, string[]> = {
      "Trigger Finger": ["TAM (Total Active Motion)"],
      "Carpal Tunnel": ["TAM (Total Active Motion)", "Kapandji Score", "Wrist Flexion/Extension", "Forearm Pronation/Supination", "Wrist Radial/Ulnar Deviation"],
      "Distal Radius Fracture": ["TAM (Total Active Motion)", "Kapandji Score", "Wrist Flexion/Extension", "Forearm Pronation/Supination", "Wrist Radial/Ulnar Deviation"],
      "CMC Arthroplasty": ["TAM (Total Active Motion)", "Kapandji Score", "Wrist Flexion/Extension", "Forearm Pronation/Supination", "Wrist Radial/Ulnar Deviation"],
      "Metacarpal ORIF": ["TAM (Total Active Motion)"],
      "Phalanx Fracture": ["TAM (Total Active Motion)"],
      "Radial Head Replacement": ["TAM (Total Active Motion)", "Kapandji Score", "Wrist Flexion/Extension", "Forearm Pronation/Supination", "Wrist Radial/Ulnar Deviation"],
      "Terrible Triad Injury": ["TAM (Total Active Motion)", "Kapandji Score", "Wrist Flexion/Extension", "Forearm Pronation/Supination", "Wrist Radial/Ulnar Deviation"],
      "Dupuytren's Contracture": ["TAM (Total Active Motion)"],
      "Flexor Tendon Injury": ["TAM (Total Active Motion)"],
      "Extensor Tendon Injury": ["TAM (Total Active Motion)"]
    };

    const requiredAssessments = injuryAssessmentMap[injuryType] || ["TAM (Total Active Motion)"];
    return allAssessments.filter(assessment => requiredAssessments.includes(assessment.name));
  }

  async getAssessment(id: number): Promise<Assessment | undefined> {
    const [assessment] = await db.select().from(assessments).where(eq(assessments.id, id));
    return assessment || undefined;
  }

  async createAssessment(insertAssessment: InsertAssessment): Promise<Assessment> {
    const [assessment] = await db
      .insert(assessments)
      .values(insertAssessment)
      .returning();
    return assessment;
  }

  async getUserAssessments(userId: number): Promise<UserAssessment[]> {
    return await db.select().from(userAssessments).where(eq(userAssessments.userId, userId));
  }

  async getUserAssessment(userId: number, assessmentId: number): Promise<UserAssessment | undefined> {
    const results = await db
      .select()
      .from(userAssessments)
      .where(eq(userAssessments.userId, userId));
    return results.find(ua => ua.assessmentId === assessmentId) || undefined;
  }

  async createUserAssessment(insertUserAssessment: InsertUserAssessment): Promise<UserAssessment> {
    const [userAssessment] = await db
      .insert(userAssessments)
      .values(insertUserAssessment)
      .returning();
    return userAssessment;
  }

  async updateUserAssessment(id: number, updates: Partial<UserAssessment>): Promise<UserAssessment | undefined> {
    const [userAssessment] = await db
      .update(userAssessments)
      .set(updates)
      .where(eq(userAssessments.id, id))
      .returning();
    return userAssessment || undefined;
  }

  async getUserAssessmentByShareToken(shareToken: string): Promise<UserAssessment | undefined> {
    const [userAssessment] = await db.select().from(userAssessments).where(eq(userAssessments.shareToken, shareToken));
    return userAssessment || undefined;
  }

  async generateShareToken(userAssessmentId: number): Promise<string> {
    const shareToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    await db.update(userAssessments)
      .set({ shareToken })
      .where(eq(userAssessments.id, userAssessmentId));
    return shareToken;
  }

  async getInjuryTypes(): Promise<InjuryType[]> {
    return await db.select().from(injuryTypes);
  }

  async createInjuryType(insertInjuryType: InsertInjuryType): Promise<InjuryType> {
    const [injuryType] = await db
      .insert(injuryTypes)
      .values(insertInjuryType)
      .returning();
    return injuryType;
  }
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private assessments: Map<number, Assessment>;
  private userAssessments: Map<number, UserAssessment>;
  private injuryTypes: Map<number, InjuryType>;
  private currentUserId: number;
  private currentAssessmentId: number;
  private currentUserAssessmentId: number;
  private currentInjuryTypeId: number;

  constructor() {
    this.users = new Map();
    this.assessments = new Map();
    this.userAssessments = new Map();
    this.injuryTypes = new Map();
    this.currentUserId = 1;
    this.currentAssessmentId = 1;
    this.currentUserAssessmentId = 1;
    this.currentInjuryTypeId = 1;
    
    this.initializeData();
  }

  private initializeData() {
    // Initialize default injury types
    const defaultInjuryTypes = [
      { name: "Wrist Fracture", description: "Recovery from wrist bone fractures and related mobility issues", icon: "fas fa-hand-paper" },
      { name: "Carpal Tunnel", description: "Post-surgical recovery from carpal tunnel release procedure", icon: "fas fa-hand-scissors" },
      { name: "Tendon Injury", description: "Recovery from hand or wrist tendon repair surgery", icon: "fas fa-hand-rock" },
      { name: "Other Injury", description: "Other hand or wrist conditions requiring assessment", icon: "fas fa-hand-spock" }
    ];

    defaultInjuryTypes.forEach(injuryType => {
      this.createInjuryType(injuryType);
    });

    // Initialize default assessments
    const defaultAssessments = [
      {
        name: "Wrist Flexion",
        description: "Measure forward bending range of motion",
        videoUrl: "/videos/wrist-flexion.mp4",
        duration: 10,
        repetitions: 3,
        instructions: "Slowly bend your wrist forward as far as comfortable, then return to neutral position",
        isActive: true,
        orderIndex: 1
      },
      {
        name: "Wrist Extension",
        description: "Measure backward bending range of motion",
        videoUrl: "/videos/wrist-extension.mp4",
        duration: 10,
        repetitions: 3,
        instructions: "Slowly bend your wrist backward as far as comfortable, then return to neutral position",
        isActive: true,
        orderIndex: 2
      },
      {
        name: "Finger Flexion",
        description: "Measure finger closing range of motion",
        videoUrl: "/videos/finger-flexion.mp4",
        duration: 10,
        repetitions: 3,
        instructions: "Slowly close your fingers into a fist, then open them completely",
        isActive: true,
        orderIndex: 3
      },
      {
        name: "Finger Extension",
        description: "Measure finger opening range of motion",
        videoUrl: "/videos/finger-extension.mp4",
        duration: 10,
        repetitions: 3,
        instructions: "Slowly extend your fingers as far as comfortable, spreading them apart",
        isActive: true,
        orderIndex: 4
      },
      {
        name: "Thumb Opposition",
        description: "Measure thumb to finger touch capability",
        videoUrl: "/videos/thumb-opposition.mp4",
        duration: 15,
        repetitions: 3,
        instructions: "Touch your thumb to each fingertip in sequence",
        isActive: true,
        orderIndex: 5
      },
      {
        name: "Shoulder Flexion",
        description: "Measure forward shoulder movement",
        videoUrl: "/videos/shoulder-flexion.mp4",
        duration: 20,
        repetitions: 3,
        instructions: "Raise your arm forward as high as comfortable",
        isActive: true,
        orderIndex: 6
      },
      {
        name: "Shoulder Abduction",
        description: "Measure sideways shoulder movement",
        videoUrl: "/videos/shoulder-abduction.mp4",
        duration: 20,
        repetitions: 3,
        instructions: "Raise your arm to the side as high as comfortable",
        isActive: true,
        orderIndex: 7
      },
      {
        name: "Elbow Flexion/Extension",
        description: "Measure elbow bending and straightening",
        videoUrl: "/videos/elbow-flexion.mp4",
        duration: 15,
        repetitions: 5,
        instructions: "Bend and straighten your elbow through full range",
        isActive: true,
        orderIndex: 8
      }
    ];

    defaultAssessments.forEach(assessment => {
      this.createAssessment(assessment);
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByCode(code: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.code === code);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser, 
      id, 
      createdAt: new Date(),
      isFirstTime: true
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Assessment methods
  async getAssessments(): Promise<Assessment[]> {
    return Array.from(this.assessments.values())
      .filter(assessment => assessment.isActive)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }

  async getAssessmentsForInjury(injuryType: string): Promise<Assessment[]> {
    const allAssessments = Array.from(this.assessments.values())
      .filter(assessment => assessment.isActive)
      .sort((a, b) => a.orderIndex - b.orderIndex);
    
    // Define which assessments are needed for each injury type
    const injuryAssessmentMap: Record<string, string[]> = {
      "Trigger Finger": ["TAM (Total Active Motion)"],
      "Carpal Tunnel": ["TAM (Total Active Motion)", "Kapandji Score", "Wrist Flexion/Extension", "Forearm Pronation/Supination", "Wrist Radial/Ulnar Deviation"],
      "Distal Radius Fracture": ["TAM (Total Active Motion)", "Kapandji Score", "Wrist Flexion/Extension", "Forearm Pronation/Supination", "Wrist Radial/Ulnar Deviation"],
      "CMC Arthroplasty": ["TAM (Total Active Motion)", "Kapandji Score", "Wrist Flexion/Extension", "Forearm Pronation/Supination", "Wrist Radial/Ulnar Deviation"],
      "Metacarpal ORIF": ["TAM (Total Active Motion)"],
      "Phalanx Fracture": ["TAM (Total Active Motion)"],
      "Radial Head Replacement": ["TAM (Total Active Motion)", "Kapandji Score", "Wrist Flexion/Extension", "Forearm Pronation/Supination", "Wrist Radial/Ulnar Deviation"],
      "Terrible Triad Injury": ["TAM (Total Active Motion)", "Kapandji Score", "Wrist Flexion/Extension", "Forearm Pronation/Supination", "Wrist Radial/Ulnar Deviation"],
      "Dupuytren's Contracture": ["TAM (Total Active Motion)"],
      "Flexor Tendon Injury": ["TAM (Total Active Motion)"],
      "Extensor Tendon Injury": ["TAM (Total Active Motion)"]
    };

    const requiredAssessments = injuryAssessmentMap[injuryType] || ["TAM (Total Active Motion)"];
    return allAssessments.filter(assessment => requiredAssessments.includes(assessment.name));
  }

  async getAssessment(id: number): Promise<Assessment | undefined> {
    return this.assessments.get(id);
  }

  async createAssessment(insertAssessment: InsertAssessment): Promise<Assessment> {
    const id = this.currentAssessmentId++;
    const assessment: Assessment = { ...insertAssessment, id };
    this.assessments.set(id, assessment);
    return assessment;
  }

  // User Assessment methods
  async getUserAssessments(userId: number): Promise<UserAssessment[]> {
    return Array.from(this.userAssessments.values())
      .filter(ua => ua.userId === userId);
  }

  async getUserAssessment(userId: number, assessmentId: number): Promise<UserAssessment | undefined> {
    return Array.from(this.userAssessments.values())
      .find(ua => ua.userId === userId && ua.assessmentId === assessmentId);
  }

  async createUserAssessment(insertUserAssessment: InsertUserAssessment): Promise<UserAssessment> {
    const id = this.currentUserAssessmentId++;
    const userAssessment: UserAssessment = { ...insertUserAssessment, id };
    this.userAssessments.set(id, userAssessment);
    return userAssessment;
  }

  async updateUserAssessment(id: number, updates: Partial<UserAssessment>): Promise<UserAssessment | undefined> {
    const userAssessment = this.userAssessments.get(id);
    if (!userAssessment) return undefined;
    
    const updatedUserAssessment = { ...userAssessment, ...updates };
    this.userAssessments.set(id, updatedUserAssessment);
    return updatedUserAssessment;
  }

  // Injury Type methods
  async getInjuryTypes(): Promise<InjuryType[]> {
    return Array.from(this.injuryTypes.values());
  }

  async createInjuryType(insertInjuryType: InsertInjuryType): Promise<InjuryType> {
    const id = this.currentInjuryTypeId++;
    const injuryType: InjuryType = { ...insertInjuryType, id };
    this.injuryTypes.set(id, injuryType);
    return injuryType;
  }

  async getUserAssessmentByShareToken(shareToken: string): Promise<UserAssessment | undefined> {
    for (const userAssessment of this.userAssessments.values()) {
      if (userAssessment.shareToken === shareToken) {
        return userAssessment;
      }
    }
    return undefined;
  }

  async generateShareToken(userAssessmentId: number): Promise<string> {
    const shareToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const userAssessment = this.userAssessments.get(userAssessmentId);
    if (userAssessment) {
      this.userAssessments.set(userAssessmentId, { ...userAssessment, shareToken });
    }
    return shareToken;
  }
}

// Initialize the database with default data
async function initializeDatabase() {
  try {
    // Check if data already exists
    const existingInjuryTypes = await db.select().from(injuryTypes);
    const existingAssessments = await db.select().from(assessments);

    if (existingInjuryTypes.length === 0) {
      // Initialize medical injury types based on clinical requirements
      const defaultInjuryTypes = [
        { name: "Trigger Finger", description: "Stenosing tenosynovitis affecting finger flexion", icon: "fas fa-hand-point-up" },
        { name: "Carpal Tunnel", description: "Median nerve compression requiring comprehensive assessment", icon: "fas fa-hand-scissors" },
        { name: "Distal Radius Fracture", description: "Wrist fracture requiring full range of motion evaluation", icon: "fas fa-hand-paper" },
        { name: "CMC Arthroplasty", description: "Thumb basal joint replacement recovery assessment", icon: "fas fa-thumbs-up" },
        { name: "Metacarpal ORIF", description: "Hand bone fracture repair recovery", icon: "fas fa-hand-rock" },
        { name: "Phalanx Fracture", description: "Finger bone fracture recovery assessment", icon: "fas fa-hand-point-right" },
        { name: "Radial Head Replacement", description: "Elbow joint replacement affecting hand function", icon: "fas fa-hand-spock" },
        { name: "Terrible Triad Injury", description: "Complex elbow injury requiring comprehensive evaluation", icon: "fas fa-hand-lizard" },
        { name: "Dupuytren's Contracture", description: "Palmar fascia contracture affecting finger extension", icon: "fas fa-hand-peace" },
        { name: "Flexor Tendon Injury", description: "Finger flexion tendon repair recovery", icon: "fas fa-hand-grab" },
        { name: "Extensor Tendon Injury", description: "Finger extension tendon repair recovery", icon: "fas fa-hand-stop" }
      ];

      await db.insert(injuryTypes).values(defaultInjuryTypes);
      console.log("Initialized injury types");
    }

    if (existingAssessments.length === 0) {
      // Initialize clinical assessments based on medical requirements
      const defaultAssessments = [
        {
          name: "TAM (Total Active Motion)",
          description: "Comprehensive finger flexion and extension measurement",
          videoUrl: "/videos/tam-assessment.mp4",
          duration: 10,
          repetitions: 1,
          instructions: "Make a complete fist, then fully extend all fingers. Repeat slowly and deliberately.",
          isActive: true,
          orderIndex: 1
        },
        {
          name: "Kapandji Score",
          description: "Thumb opposition assessment using standardized scoring",
          videoUrl: "/videos/kapandji-assessment.mp4",
          duration: 15,
          repetitions: 1,
          instructions: "Face camera palm-up. Keep fingers extended and still. Slowly move your thumb to touch: 1) Each fingertip (index, middle, ring, pinky), 2) Each finger base, 3) Palm center, 4) Beyond pinky side. Hold each position for 1 second.",
          isActive: true,
          orderIndex: 2
        },
        {
          name: "Wrist Flexion/Extension",
          description: "Measure wrist forward and backward bending range of motion",
          videoUrl: "/videos/wrist-fe-assessment.mp4",
          duration: 10,
          repetitions: 1,
          instructions: "Bend your wrist forward as far as comfortable, then backward. Keep forearm stable.",
          isActive: true,
          orderIndex: 3
        },
        {
          name: "Forearm Pronation/Supination",
          description: "Measure forearm rotation with palm up and palm down movements",
          videoUrl: "/videos/forearm-ps-assessment.mp4",
          duration: 10,
          repetitions: 1,
          instructions: "Rotate your forearm to turn palm up, then palm down. Keep elbow at your side.",
          isActive: true,
          orderIndex: 4
        },
        {
          name: "Wrist Radial/Ulnar Deviation",
          description: "Measure side-to-side wrist movement toward thumb and pinky",
          videoUrl: "/videos/wrist-ru-assessment.mp4",
          duration: 10,
          repetitions: 1,
          instructions: "Move your wrist toward your thumb side, then toward your pinky side. Keep hand flat.",
          isActive: true,
          orderIndex: 5
        }
      ];

      await db.insert(assessments).values(defaultAssessments);
      console.log("Initialized assessments");
    }
  } catch (error) {
    console.error("Error initializing database:", error);
  }
}

export const storage = new DatabaseStorage();

// Initialize database on startup
initializeDatabase();
