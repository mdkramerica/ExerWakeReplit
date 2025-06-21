#!/usr/bin/env tsx

import { readFileSync, existsSync } from 'fs';
import { db } from './db';
import { 
  users, 
  assessments, 
  userAssessments,
  clinicalUsers,
  type InsertUser,
  type InsertAssessment,
  type InsertUserAssessment,
  type InsertClinicalUser
} from '@shared/schema';

interface LegacyData {
  users: any[];
  assessments: any[];
  userAssessments: any[];
  clinicalUsers: any[];
}

async function migrateLegacyData() {
  const storageFile = './data/storage.json';
  
  if (!existsSync(storageFile)) {
    console.log('No legacy data file found. Starting with fresh database.');
    return;
  }

  console.log('Reading legacy data from storage.json...');
  const rawData = readFileSync(storageFile, 'utf8');
  const legacyData: LegacyData = JSON.parse(rawData);

  console.log(`Found ${legacyData.users?.length || 0} users to migrate`);
  console.log(`Found ${legacyData.assessments?.length || 0} assessments to migrate`);
  console.log(`Found ${legacyData.userAssessments?.length || 0} user assessments to migrate`);
  console.log(`Found ${legacyData.clinicalUsers?.length || 0} clinical users to migrate`);

  // Migrate users
  if (legacyData.users?.length > 0) {
    console.log('Migrating users...');
    for (const user of legacyData.users) {
      const insertUser: InsertUser = {
        code: user.code,
        createdAt: new Date(user.createdAt),
        isFirstTime: user.isFirstTime || false,
        injuryType: user.injuryType,
        studyStartDate: new Date(user.studyStartDate),
        studyDurationDays: user.studyDurationDays || 28,
        studyEndDate: new Date(user.studyEndDate)
      };

      await db.insert(users).values(insertUser).onConflictDoNothing();
    }
    console.log(`✓ Migrated ${legacyData.users.length} users`);
  }

  // Migrate assessments
  if (legacyData.assessments?.length > 0) {
    console.log('Migrating assessments...');
    for (const assessment of legacyData.assessments) {
      const insertAssessment: InsertAssessment = {
        name: assessment.name,
        description: assessment.description,
        videoUrl: assessment.videoUrl,
        duration: assessment.duration,
        repetitions: assessment.repetitions,
        instructions: assessment.instructions,
        isActive: assessment.isActive !== false,
        orderIndex: assessment.orderIndex,
        injuryTypes: assessment.injuryTypes || []
      };

      await db.insert(assessments).values(insertAssessment).onConflictDoNothing();
    }
    console.log(`✓ Migrated ${legacyData.assessments.length} assessments`);
  }

  // Migrate clinical users
  if (legacyData.clinicalUsers?.length > 0) {
    console.log('Migrating clinical users...');
    for (const clinicalUser of legacyData.clinicalUsers) {
      const insertClinicalUser: InsertClinicalUser = {
        username: clinicalUser.username,
        hashedPassword: clinicalUser.hashedPassword,
        role: clinicalUser.role || 'clinician',
        isActive: clinicalUser.isActive !== false,
        createdAt: new Date(clinicalUser.createdAt || Date.now())
      };

      await db.insert(clinicalUsers).values(insertClinicalUser).onConflictDoNothing();
    }
    console.log(`✓ Migrated ${legacyData.clinicalUsers.length} clinical users`);
  }

  // Migrate user assessments
  if (legacyData.userAssessments?.length > 0) {
    console.log('Migrating user assessments...');
    for (const userAssessment of legacyData.userAssessments) {
      const insertUserAssessment: InsertUserAssessment = {
        userId: userAssessment.userId,
        assessmentId: userAssessment.assessmentId,
        sessionNumber: userAssessment.sessionNumber,
        isCompleted: userAssessment.isCompleted || false,
        completedAt: userAssessment.completedAt ? new Date(userAssessment.completedAt) : null,
        romData: userAssessment.romData || null,
        repetitionData: userAssessment.repetitionData || []
      };

      await db.insert(userAssessments).values(insertUserAssessment).onConflictDoNothing();
    }
    console.log(`✓ Migrated ${legacyData.userAssessments.length} user assessments`);
  }

  console.log('✅ Migration completed successfully!');
}

// Run migration when script is executed directly
migrateLegacyData()
  .then(() => {
    console.log('Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });

export { migrateLegacyData };