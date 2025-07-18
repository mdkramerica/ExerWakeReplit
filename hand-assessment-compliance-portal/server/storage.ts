import { users, admins, assessments, userAssessments, accessCodes } from "@shared/schema";
import type { User, InsertUser, Admin, InsertAdmin, Assessment, InsertAssessment, UserAssessment, InsertUserAssessment } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByCode(code: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserLastVisit(id: number): Promise<void>;
  
  // Admin operations
  getAdmin(id: number): Promise<Admin | undefined>;
  getAdminByUsername(username: string): Promise<Admin | undefined>;
  createAdmin(admin: InsertAdmin): Promise<Admin>;
  
  // Assessment operations
  getAssessments(): Promise<Assessment[]>;
  getAssessment(id: number): Promise<Assessment | undefined>;
  
  // User Assessment operations
  getUserAssessments(userId: number): Promise<UserAssessment[]>;
  createUserAssessment(assessment: InsertUserAssessment): Promise<UserAssessment>;
  
  // Access code operations
  getUnusedCode(): Promise<string | undefined>;
  markCodeAsUsed(code: string, userId: number): Promise<void>;
  
  // Compliance tracking
  getComplianceData(): Promise<{
    totalPatients: number;
    activePatients: number;
    totalAssessments: number;
    completedToday: number;
  }>;
}

export class DatabaseStorage implements IStorage {
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

  async updateUserLastVisit(id: number): Promise<void> {
    await db
      .update(users)
      .set({ lastVisit: new Date() })
      .where(eq(users.id, id));
  }

  async getAdmin(id: number): Promise<Admin | undefined> {
    const [admin] = await db.select().from(admins).where(eq(admins.id, id));
    return admin || undefined;
  }

  async getAdminByUsername(username: string): Promise<Admin | undefined> {
    const [admin] = await db.select().from(admins).where(eq(admins.username, username));
    return admin || undefined;
  }

  async createAdmin(insertAdmin: InsertAdmin): Promise<Admin> {
    const [admin] = await db
      .insert(admins)
      .values(insertAdmin)
      .returning();
    return admin;
  }

  async getAssessments(): Promise<Assessment[]> {
    return db.select().from(assessments).orderBy(assessments.orderIndex);
  }

  async getAssessment(id: number): Promise<Assessment | undefined> {
    const [assessment] = await db.select().from(assessments).where(eq(assessments.id, id));
    return assessment || undefined;
  }

  async getUserAssessments(userId: number): Promise<UserAssessment[]> {
    return db.select()
      .from(userAssessments)
      .where(eq(userAssessments.userId, userId))
      .orderBy(desc(userAssessments.completedAt));
  }

  async createUserAssessment(assessment: InsertUserAssessment): Promise<UserAssessment> {
    const [userAssessment] = await db
      .insert(userAssessments)
      .values(assessment)
      .returning();
    return userAssessment;
  }

  async getUnusedCode(): Promise<string | undefined> {
    const [code] = await db.select()
      .from(accessCodes)
      .where(eq(accessCodes.isUsed, false))
      .limit(1);
    return code?.code;
  }

  async markCodeAsUsed(code: string, userId: number): Promise<void> {
    await db
      .update(accessCodes)
      .set({ isUsed: true, usedAt: new Date(), usedByUserId: userId })
      .where(eq(accessCodes.code, code));
  }

  async getComplianceData(): Promise<{
    totalPatients: number;
    activePatients: number;
    totalAssessments: number;
    completedToday: number;
  }> {
    const allUsers = await db.select().from(users);
    const activeUsers = allUsers.filter(u => u.isActive);
    const allAssessments = await db.select().from(userAssessments);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayAssessments = allAssessments.filter(a => {
      const completedAt = new Date(a.completedAt);
      return completedAt >= today && completedAt < tomorrow;
    });

    return {
      totalPatients: allUsers.length,
      activePatients: activeUsers.length,
      totalAssessments: allAssessments.length,
      completedToday: todayAssessments.length,
    };
  }
}

export const storage = new DatabaseStorage();