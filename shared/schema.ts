import { pgTable, text, serial, integer, boolean, timestamp, jsonb, numeric } from "drizzle-orm/pg-core";
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
  sessionNumber: integer("session_number").default(1), // Track multiple sessions
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  romData: jsonb("rom_data"), // ROM calculations: MCP, PIP, DIP angles
  repetitionData: jsonb("repetition_data"), // Array of repetition recordings
  qualityScore: integer("quality_score"), // 1-100
  maxMcpAngle: numeric("max_mcp_angle", { precision: 5, scale: 2 }), // Maximum MCP joint angle (index finger)
  maxPipAngle: numeric("max_pip_angle", { precision: 5, scale: 2 }), // Maximum PIP joint angle (index finger)
  maxDipAngle: numeric("max_dip_angle", { precision: 5, scale: 2 }), // Maximum DIP joint angle (index finger)
  totalActiveRom: numeric("total_active_rom", { precision: 5, scale: 2 }), // Sum of max angles (index finger)
  // Individual finger ROM data
  indexFingerRom: numeric("index_finger_rom", { precision: 5, scale: 2 }), // Index finger total ROM
  middleFingerRom: numeric("middle_finger_rom", { precision: 5, scale: 2 }), // Middle finger total ROM
  ringFingerRom: numeric("ring_finger_rom", { precision: 5, scale: 2 }), // Ring finger total ROM
  pinkyFingerRom: numeric("pinky_finger_rom", { precision: 5, scale: 2 }), // Pinky finger total ROM
  
  // Individual joint angles for each finger
  middleFingerMcp: numeric("middle_finger_mcp", { precision: 5, scale: 2 }),
  middleFingerPip: numeric("middle_finger_pip", { precision: 5, scale: 2 }),
  middleFingerDip: numeric("middle_finger_dip", { precision: 5, scale: 2 }),
  
  ringFingerMcp: numeric("ring_finger_mcp", { precision: 5, scale: 2 }),
  ringFingerPip: numeric("ring_finger_pip", { precision: 5, scale: 2 }),
  ringFingerDip: numeric("ring_finger_dip", { precision: 5, scale: 2 }),
  
  pinkyFingerMcp: numeric("pinky_finger_mcp", { precision: 5, scale: 2 }),
  pinkyFingerPip: numeric("pinky_finger_pip", { precision: 5, scale: 2 }),
  pinkyFingerDip: numeric("pinky_finger_dip", { precision: 5, scale: 2 }),
  shareToken: text("share_token").unique(), // Unique token for public sharing
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
