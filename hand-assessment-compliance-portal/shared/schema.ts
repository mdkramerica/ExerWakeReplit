import { pgTable, serial, text, varchar, timestamp, boolean, integer, json } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// Users table (simplified patient records)
export const users = pgTable('portal_users', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 6 }).notNull().unique(),
  patientId: varchar('patient_id', { length: 10 }).notNull().unique(), // P001, P002, etc.
  injuryType: text('injury_type').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  lastVisit: timestamp('last_visit'),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Admins table
export const admins = pgTable('portal_admins', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const insertAdminSchema = createInsertSchema(admins).omit({
  id: true,
  createdAt: true,
});
export type InsertAdmin = z.infer<typeof insertAdminSchema>;
export type Admin = typeof admins.$inferSelect;

// Assessments table (5 core assessments)
export const assessments = pgTable('portal_assessments', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  estimatedMinutes: integer('estimated_minutes').notNull(),
  orderIndex: integer('order_index').notNull(),
});

export const insertAssessmentSchema = createInsertSchema(assessments).omit({
  id: true,
});
export type InsertAssessment = z.infer<typeof insertAssessmentSchema>;
export type Assessment = typeof assessments.$inferSelect;

// User Assessments table (completed assessments)
export const userAssessments = pgTable('portal_user_assessments', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  assessmentId: integer('assessment_id').notNull().references(() => assessments.id),
  completedAt: timestamp('completed_at').notNull().defaultNow(),
  
  // TAM results
  indexFingerRom: text('index_finger_rom'),
  middleFingerRom: text('middle_finger_rom'),
  ringFingerRom: text('ring_finger_rom'),
  pinkyFingerRom: text('pinky_finger_rom'),
  
  // Kapandji results
  kapandjiScore: integer('kapandji_score'),
  
  // Wrist results
  wristFlexion: text('wrist_flexion'),
  wristExtension: text('wrist_extension'),
  wristRadialDeviation: text('wrist_radial_deviation'),
  wristUlnarDeviation: text('wrist_ulnar_deviation'),
  
  // DASH results
  dashScore: integer('dash_score'),
  dashResponses: json('dash_responses'),
  
  // Motion data
  motionData: json('motion_data'),
  qualityScore: text('quality_score'),
});

export const insertUserAssessmentSchema = createInsertSchema(userAssessments).omit({
  id: true,
  completedAt: true,
});
export type InsertUserAssessment = z.infer<typeof insertUserAssessmentSchema>;
export type UserAssessment = typeof userAssessments.$inferSelect;

// Access codes table (pre-generated codes)
export const accessCodes = pgTable('portal_access_codes', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 6 }).notNull().unique(),
  isUsed: boolean('is_used').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  usedAt: timestamp('used_at'),
  usedByUserId: integer('used_by_user_id').references(() => users.id),
});