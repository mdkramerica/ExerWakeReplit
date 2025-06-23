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
  type CohortAnalytics,
  type PatientEnrollment
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, count, avg, asc } from "drizzle-orm";
import type { IStorage } from "./storage";

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

  async createClinicalUser(user: InsertClinicalUser): Promise<ClinicalUser> {
    const [newUser] = await db.insert(clinicalUsers).values(user).returning();
    return newUser;
  }

  async updateClinicalUser(id: number, updates: Partial<ClinicalUser>): Promise<ClinicalUser | undefined> {
    const [updatedUser] = await db.update(clinicalUsers)
      .set(updates)
      .where(eq(clinicalUsers.id, id))
      .returning();
    return updatedUser || undefined;
  }

  async authenticateClinicalUser(username: string, password: string): Promise<ClinicalUser | null> {
    const [user] = await db.select().from(clinicalUsers)
      .where(and(
        eq(clinicalUsers.username, username),
        eq(clinicalUsers.password, password),
        eq(clinicalUsers.isActive, true)
      ));
    return user || null;
  }

  // Cohort methods
  async getCohorts(): Promise<Cohort[]> {
    return await db.select().from(cohorts).where(eq(cohorts.isActive, true)).orderBy(asc(cohorts.name));
  }

  async getCohort(id: number): Promise<Cohort | undefined> {
    const [cohort] = await db.select().from(cohorts).where(eq(cohorts.id, id));
    return cohort || undefined;
  }

  async createCohort(cohort: InsertCohort): Promise<Cohort> {
    const [newCohort] = await db.insert(cohorts).values(cohort).returning();
    return newCohort;
  }

  async updateCohort(id: number, updates: Partial<Cohort>): Promise<Cohort | undefined> {
    const [updatedCohort] = await db.update(cohorts)
      .set(updates)
      .where(eq(cohorts.id, id))
      .returning();
    return updatedCohort || undefined;
  }

  async deleteCohort(id: number): Promise<boolean> {
    const result = await db.update(cohorts)
      .set({ isActive: false })
      .where(eq(cohorts.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Patient methods
  async getPatients(clinicianId?: number): Promise<PatientWithDetails[]> {
    const query = db.select({
      id: patients.id,
      patientId: patients.patientId,
      alias: patients.alias,
      cohortId: patients.cohortId,
      assignedClinicianId: patients.assignedClinicianId,
      status: patients.status,
      ageGroup: patients.ageGroup,
      sex: patients.sex,
      handDominance: patients.handDominance,
      occupationCategory: patients.occupationCategory,
      surgeryDate: patients.surgeryDate,
      procedureCode: patients.procedureCode,
      laterality: patients.laterality,
      surgeonId: patients.surgeonId,
      injuryType: patients.injuryType,
      enrollmentStatus: patients.enrollmentStatus,
      enrolledDate: patients.enrolledDate,
      accessCode: patients.accessCode,
      phone: patients.phone,
      dateOfBirth: patients.dateOfBirth,
      gender: patients.gender,
      injuryDate: patients.injuryDate,
      eligibilityNotes: patients.eligibilityNotes,
      isActive: patients.isActive,
      baselineAssessmentId: patients.baselineAssessmentId,
      enrolledInStudy: patients.enrolledInStudy,
      studyEnrollmentDate: patients.studyEnrollmentDate,
      createdAt: patients.createdAt,
      cohort: cohorts,
      assignedClinician: clinicalUsers,
      assessmentCount: count(patientAssessments.id).as('assessmentCount')
    })
    .from(patients)
    .leftJoin(cohorts, eq(patients.cohortId, cohorts.id))
    .leftJoin(clinicalUsers, eq(patients.assignedClinicianId, clinicalUsers.id))
    .leftJoin(patientAssessments, eq(patients.id, patientAssessments.patientId))
    .where(eq(patients.isActive, true))
    .groupBy(patients.id, cohorts.id, clinicalUsers.id);

    if (clinicianId) {
      query.where(eq(patients.assignedClinicianId, clinicianId));
    }

    const results = await query;
    
    // Get last assessment for each patient
    const patientsWithLastAssessment = await Promise.all(
      results.map(async (patient) => {
        const [lastAssessment] = await db.select()
          .from(patientAssessments)
          .where(eq(patientAssessments.patientId, patient.id))
          .orderBy(desc(patientAssessments.assessmentDate))
          .limit(1);

        return {
          ...patient,
          lastAssessment: lastAssessment || null
        } as PatientWithDetails;
      })
    );

    return patientsWithLastAssessment;
  }

  async getPatient(id: number): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.id, id));
    return patient || undefined;
  }

  async getPatientWithDetails(id: number): Promise<PatientWithDetails | undefined> {
    const [result] = await db.select({
      patient: patients,
      cohort: cohorts,
      assignedClinician: clinicalUsers
    })
    .from(patients)
    .leftJoin(cohorts, eq(patients.cohortId, cohorts.id))
    .leftJoin(clinicalUsers, eq(patients.assignedClinicianId, clinicalUsers.id))
    .where(eq(patients.id, id));

    if (!result) return undefined;

    const [lastAssessment] = await db.select()
      .from(patientAssessments)
      .where(eq(patientAssessments.patientId, id))
      .orderBy(desc(patientAssessments.assessmentDate))
      .limit(1);

    const [assessmentCountResult] = await db.select({ count: count() })
      .from(patientAssessments)
      .where(eq(patientAssessments.patientId, id));

    return {
      ...result.patient,
      cohort: result.cohort,
      assignedClinician: result.assignedClinician,
      lastAssessment: lastAssessment || null,
      assessmentCount: assessmentCountResult?.count || 0
    } as PatientWithDetails;
  }

  async createPatient(patient: InsertPatient): Promise<Patient> {
    const [newPatient] = await db.insert(patients).values(patient).returning();
    return newPatient;
  }

  async updatePatient(id: number, updates: Partial<Patient>): Promise<Patient | undefined> {
    const [updatedPatient] = await db.update(patients)
      .set(updates)
      .where(eq(patients.id, id))
      .returning();
    return updatedPatient || undefined;
  }

  async deletePatient(id: number): Promise<boolean> {
    const result = await db.update(patients)
      .set({ isActive: false })
      .where(eq(patients.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Patient enrollment
  async checkEligibility(patientId: number, cohortId: number): Promise<{ eligible: boolean; reasons: string[] }> {
    // Basic eligibility check - can be enhanced with specific business rules
    const patient = await this.getPatient(patientId);
    const cohort = await this.getCohort(cohortId);
    
    if (!patient || !cohort) {
      return { eligible: false, reasons: ['Patient or cohort not found'] };
    }

    return { eligible: true, reasons: [] };
  }

  async enrollPatient(enrollment: PatientEnrollment): Promise<Patient> {
    const updates = {
      cohortId: enrollment.cohortId,
      enrollmentStatus: enrollment.enrollmentStatus,
      eligibilityNotes: enrollment.eligibilityNotes,
      enrolledInStudy: enrollment.enrollmentStatus === 'enrolled',
      studyEnrollmentDate: enrollment.enrollmentStatus === 'enrolled' ? new Date() : null
    };

    const [updatedPatient] = await db.update(patients)
      .set(updates)
      .where(eq(patients.id, enrollment.patientId))
      .returning();

    return updatedPatient;
  }

  async generateAccessCode(): Promise<string> {
    let code: string;
    let isUnique = false;
    
    while (!isUnique) {
      code = Math.floor(100000 + Math.random() * 900000).toString();
      const existing = await db.select().from(patients).where(eq(patients.accessCode, code));
      if (existing.length === 0) {
        isUnique = true;
        return code;
      }
    }
    
    return '';
  }

  async getPatientByAccessCode(accessCode: string): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.accessCode, accessCode));
    return patient || undefined;
  }

  // Assessment Type methods
  async getAssessmentTypes(): Promise<AssessmentType[]> {
    return await db.select().from(assessmentTypes)
      .where(eq(assessmentTypes.isActive, true))
      .orderBy(asc(assessmentTypes.orderIndex));
  }

  async getAssessmentType(id: number): Promise<AssessmentType | undefined> {
    const [assessmentType] = await db.select().from(assessmentTypes).where(eq(assessmentTypes.id, id));
    return assessmentType || undefined;
  }

  async createAssessmentType(assessmentType: InsertAssessmentType): Promise<AssessmentType> {
    const [newAssessmentType] = await db.insert(assessmentTypes).values(assessmentType).returning();
    return newAssessmentType;
  }

  async updateAssessmentType(id: number, updates: Partial<AssessmentType>): Promise<AssessmentType | undefined> {
    const [updatedAssessmentType] = await db.update(assessmentTypes)
      .set(updates)
      .where(eq(assessmentTypes.id, id))
      .returning();
    return updatedAssessmentType || undefined;
  }

  // Patient Assessment methods
  async getPatientAssessments(patientId: number, limit?: number): Promise<PatientAssessment[]> {
    let query = db.select().from(patientAssessments)
      .where(eq(patientAssessments.patientId, patientId))
      .orderBy(desc(patientAssessments.assessmentDate));
    
    if (limit) {
      query = query.limit(limit);
    }
    
    return await query;
  }

  async getPatientAssessment(id: number): Promise<PatientAssessment | undefined> {
    const [assessment] = await db.select().from(patientAssessments).where(eq(patientAssessments.id, id));
    return assessment || undefined;
  }

  async createPatientAssessment(assessment: InsertPatientAssessment): Promise<PatientAssessment> {
    const [newAssessment] = await db.insert(patientAssessments).values(assessment).returning();
    return newAssessment;
  }

  async updatePatientAssessment(id: number, updates: Partial<PatientAssessment>): Promise<PatientAssessment | undefined> {
    const [updatedAssessment] = await db.update(patientAssessments)
      .set(updates)
      .where(eq(patientAssessments.id, id))
      .returning();
    return updatedAssessment || undefined;
  }

  async getCohortAssessments(cohortId: number, limit?: number): Promise<PatientAssessment[]> {
    let query = db.select({
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
      postOpDay: patientAssessments.postOpDay,
      studyWeek: patientAssessments.studyWeek,
      vasScore: patientAssessments.vasScore,
      quickDashScore: patientAssessments.quickDashScore,
      missedVisit: patientAssessments.missedVisit,
      retakeFlag: patientAssessments.retakeFlag,
      isCompleted: patientAssessments.isCompleted,
      completedAt: patientAssessments.completedAt
    })
    .from(patientAssessments)
    .innerJoin(patients, eq(patientAssessments.patientId, patients.id))
    .where(eq(patients.cohortId, cohortId))
    .orderBy(desc(patientAssessments.assessmentDate));
    
    if (limit) {
      query = query.limit(limit);
    }
    
    return await query;
  }

  // Analytics methods
  async getCohortAnalytics(cohortId: number): Promise<CohortAnalytics | null> {
    const [result] = await db.select({
      cohortId: cohorts.id,
      cohortName: cohorts.name,
      patientCount: count(patients.id),
      avgTamScore: avg(patientAssessments.tamScore),
      avgKapandjiScore: avg(patientAssessments.kapandjiScore),
      avgWristFlexion: avg(patientAssessments.wristFlexionAngle),
      avgWristExtension: avg(patientAssessments.wristExtensionAngle),
      stdDevTamScore: sql`STDDEV(${patientAssessments.tamScore})`,
      stdDevKapandjiScore: sql`STDDEV(${patientAssessments.kapandjiScore})`,
      stdDevWristFlexion: sql`STDDEV(${patientAssessments.wristFlexionAngle})`,
      stdDevWristExtension: sql`STDDEV(${patientAssessments.wristExtensionAngle})`
    })
    .from(cohorts)
    .leftJoin(patients, eq(cohorts.id, patients.cohortId))
    .leftJoin(patientAssessments, eq(patients.id, patientAssessments.patientId))
    .where(eq(cohorts.id, cohortId))
    .groupBy(cohorts.id, cohorts.name);

    if (!result) return null;

    return {
      cohortId: result.cohortId || 0,
      cohortName: result.cohortName || '',
      patientCount: result.patientCount || 0,
      avgTamScore: Number(result.avgTamScore) || 0,
      avgKapandjiScore: Number(result.avgKapandjiScore) || 0,
      avgWristFlexion: Number(result.avgWristFlexion) || 0,
      avgWristExtension: Number(result.avgWristExtension) || 0,
      stdDevTamScore: Number(result.stdDevTamScore) || 0,
      stdDevKapandjiScore: Number(result.stdDevKapandjiScore) || 0,
      stdDevWristFlexion: Number(result.stdDevWristFlexion) || 0,
      stdDevWristExtension: Number(result.stdDevWristExtension) || 0
    };
  }

  // Outlier Alert methods
  async getOutlierAlerts(patientId?: number): Promise<OutlierAlert[]> {
    let query = db.select().from(outlierAlerts)
      .where(eq(outlierAlerts.isResolved, false))
      .orderBy(desc(outlierAlerts.createdAt));
    
    if (patientId) {
      query = query.where(eq(outlierAlerts.patientId, patientId));
    }
    
    return await query;
  }

  async createOutlierAlert(alert: InsertOutlierAlert): Promise<OutlierAlert> {
    const [newAlert] = await db.insert(outlierAlerts).values(alert).returning();
    return newAlert;
  }

  async resolveOutlierAlert(id: number): Promise<boolean> {
    const result = await db.update(outlierAlerts)
      .set({ isResolved: true, resolvedAt: new Date() })
      .where(eq(outlierAlerts.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Audit Log methods
  async createAuditLog(logData: InsertAuditLog): Promise<AuditLog> {
    const [newLog] = await db.insert(auditLogs).values(logData).returning();
    return newLog;
  }

  async getAuditLogs(userId?: number, limit?: number): Promise<AuditLog[]> {
    let query = db.select().from(auditLogs)
      .orderBy(desc(auditLogs.timestamp));
    
    if (userId) {
      query = query.where(eq(auditLogs.userId, userId));
    }
    
    if (limit) {
      query = query.limit(limit);
    }
    
    return await query;
  }

  // Data Export methods
  async createDataExport(exportData: InsertDataExport): Promise<DataExport> {
    const [newExport] = await db.insert(dataExports).values(exportData).returning();
    return newExport;
  }

  async getDataExports(userId?: number): Promise<DataExport[]> {
    let query = db.select().from(dataExports)
      .orderBy(desc(dataExports.createdAt));
    
    if (userId) {
      query = query.where(eq(dataExports.requestedBy, userId));
    }
    
    return await query;
  }

  // Legacy methods for backward compatibility
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.code, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getAssessments(): Promise<Assessment[]> {
    return await db.select().from(assessments)
      .where(eq(assessments.isActive, true))
      .orderBy(asc(assessments.orderIndex));
  }

  async getAssessment(id: number): Promise<Assessment | undefined> {
    const [assessment] = await db.select().from(assessments).where(eq(assessments.id, id));
    return assessment || undefined;
  }

  async createUserAssessment(data: InsertUserAssessment): Promise<UserAssessment> {
    const [userAssessment] = await db.insert(userAssessments).values(data).returning();
    return userAssessment;
  }

  async updateUserAssessment(id: number, updates: Partial<UserAssessment>): Promise<UserAssessment | undefined> {
    const [updatedAssessment] = await db.update(userAssessments)
      .set(updates)
      .where(eq(userAssessments.id, id))
      .returning();
    return updatedAssessment || undefined;
  }

  async getUserAssessmentById(id: number): Promise<UserAssessment | undefined> {
    const [assessment] = await db.select().from(userAssessments).where(eq(userAssessments.id, id));
    return assessment || undefined;
  }

  async getUserAssessments(userId: number): Promise<UserAssessment[]> {
    return await db.select().from(userAssessments)
      .where(eq(userAssessments.userId, userId))
      .orderBy(desc(userAssessments.id));
  }

  async getUserProgress(userId: number): Promise<any> {
    const assessments = await this.getUserAssessments(userId);
    const completed = assessments.filter(a => a.isCompleted).length;
    const total = assessments.length;
    
    return {
      completed,
      total,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
      assessments
    };
  }

  async getInjuryTypes(): Promise<InjuryType[]> {
    return await db.select().from(injuryTypes);
  }

  async getUserByCode(code: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.code, code));
    return user || undefined;
  }
}