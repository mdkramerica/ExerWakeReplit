import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  injuryType: text("injury_type"),
  createdAt: timestamp("created_at").defaultNow(),
  isFirstTime: boolean("is_first_time").default(true),
});

export const assessments = pgTable("assessments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  videoUrl: text("video_url"),
  duration: integer("duration").notNull(), // in seconds
  repetitions: integer("repetitions").default(3),
  instructions: text("instructions"),
  isActive: boolean("is_active").default(true),
  orderIndex: integer("order_index").notNull(),
});

export const userAssessments = pgTable("user_assessments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  assessmentId: integer("assessment_id").notNull(),
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  romData: jsonb("rom_data"), // MediaPipe hand landmark data
  repetitionData: jsonb("repetition_data"), // Array of repetition recordings
  qualityScore: integer("quality_score"), // 1-100
});

export const injuryTypes = pgTable("injury_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
});

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

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertAssessment = z.infer<typeof insertAssessmentSchema>;
export type Assessment = typeof assessments.$inferSelect;

export type InsertUserAssessment = z.infer<typeof insertUserAssessmentSchema>;
export type UserAssessment = typeof userAssessments.$inferSelect;

export type InsertInjuryType = z.infer<typeof insertInjuryTypeSchema>;
export type InjuryType = typeof injuryTypes.$inferSelect;
