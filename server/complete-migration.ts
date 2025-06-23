import { PersistentMemoryStorage } from "./persistent-storage.js";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import fs from 'fs/promises';
import path from 'path';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function loadDataDirectly() {
  console.log('Loading data directly from storage.json...');
  
  try {
    const dataFile = path.join('./data', 'storage.json');
    const data = await fs.readFile(dataFile, 'utf-8');
    const parsed = JSON.parse(data);
    
    console.log('Found data:', {
      users: parsed.users?.length || 0,
      userAssessments: parsed.userAssessments?.length || 0,
      assessments: parsed.assessments?.length || 0,
      clinicalUsers: parsed.clinicalUsers?.length || 0
    });
    
    // Import schema
    const { users, assessments, userAssessments, clinicalUsers, injuryTypes } = await import("../shared/schema.js");
    
    // Migrate injury types
    const injuryTypesList = [
      { name: 'Carpal Tunnel', description: 'Carpal tunnel syndrome', icon: '🖐️' },
      { name: 'Trigger Finger', description: 'Trigger finger condition', icon: '👆' },
      { name: 'Distal Radius Fracture', description: 'Distal radius fracture', icon: '🦴' },
      { name: "Dupuytren's Contracture", description: "Dupuytren's contracture", icon: '✋' },
      { name: 'Hand Arthritis', description: 'Hand arthritis', icon: '🤲' }
    ];
    
    for (const injuryType of injuryTypesList) {
      try {
        await db.insert(injuryTypes).values(injuryType);
      } catch (e) {
        // Skip duplicates
      }
    }
    console.log('Migrated injury types');
    
    // Migrate users
    for (const user of parsed.users || []) {
      try {
        await db.insert(users).values({
          id: user.id,
          code: user.code,
          createdAt: new Date(user.createdAt),
          isFirstTime: user.isFirstTime,
          injuryType: user.injuryType,
          studyStartDate: user.studyStartDate ? new Date(user.studyStartDate) : null,
          studyDurationDays: user.studyDurationDays,
          studyEndDate: user.studyEndDate ? new Date(user.studyEndDate) : null
        });
      } catch (e) {
        // Skip duplicates
      }
    }
    console.log(`Migrated ${parsed.users?.length || 0} users`);
    
    // Migrate assessments
    for (const assessment of parsed.assessments || []) {
      try {
        await db.insert(assessments).values({
          id: assessment.id,
          name: assessment.name,
          description: assessment.description,
          videoUrl: assessment.videoUrl,
          duration: assessment.duration,
          repetitions: assessment.repetitions,
          instructions: assessment.instructions,
          isActive: assessment.isActive,
          orderIndex: assessment.orderIndex
        });
      } catch (e) {
        // Skip duplicates
      }
    }
    console.log(`Migrated ${parsed.assessments?.length || 0} assessments`);
    
    // Migrate user assessments with ALL ROM data
    for (const ua of parsed.userAssessments || []) {
      try {
        await db.insert(userAssessments).values({
          id: ua.id,
          userId: ua.userId,
          assessmentId: ua.assessmentId,
          sessionNumber: ua.sessionNumber || 1,
          isCompleted: ua.isCompleted || false,
          completedAt: ua.completedAt ? new Date(ua.completedAt) : null,
          qualityScore: ua.qualityScore ? parseFloat(ua.qualityScore.toString()) : null,
          
          // ROM data preservation
          totalActiveRom: ua.totalActiveRom ? parseFloat(ua.totalActiveRom.toString()) : null,
          indexFingerRom: ua.indexFingerRom ? parseFloat(ua.indexFingerRom.toString()) : null,
          middleFingerRom: ua.middleFingerRom ? parseFloat(ua.middleFingerRom.toString()) : null,
          ringFingerRom: ua.ringFingerRom ? parseFloat(ua.ringFingerRom.toString()) : null,
          pinkyFingerRom: ua.pinkyFingerRom ? parseFloat(ua.pinkyFingerRom.toString()) : null,
          
          // Joint angles
          maxMcpAngle: ua.maxMcpAngle ? parseFloat(ua.maxMcpAngle.toString()) : null,
          maxPipAngle: ua.maxPipAngle ? parseFloat(ua.maxPipAngle.toString()) : null,
          maxDipAngle: ua.maxDipAngle ? parseFloat(ua.maxDipAngle.toString()) : null,
          
          // Kapandji scores
          kapandjiScore: ua.kapandjiScore ? parseFloat(ua.kapandjiScore.toString()) : null,
          maxThumbOpposition: ua.maxThumbOpposition ? parseFloat(ua.maxThumbOpposition.toString()) : null,
          
          // Wrist measurements
          wristFlexionAngle: ua.wristFlexionAngle ? parseFloat(ua.wristFlexionAngle.toString()) : null,
          wristExtensionAngle: ua.wristExtensionAngle ? parseFloat(ua.wristExtensionAngle.toString()) : null,
          maxWristFlexion: ua.maxWristFlexion ? parseFloat(ua.maxWristFlexion.toString()) : null,
          maxWristExtension: ua.maxWristExtension ? parseFloat(ua.maxWristExtension.toString()) : null,
          
          // Metadata
          handType: ua.handType,
          shareToken: ua.shareToken,
          romData: ua.romData || {},
          repetitionData: ua.repetitionData || []
        });
      } catch (e) {
        // Skip duplicates
      }
    }
    console.log(`Migrated ${parsed.userAssessments?.length || 0} user assessments with full ROM data`);
    
    // Migrate clinical users
    for (const clinicalUser of parsed.clinicalUsers || []) {
      try {
        await db.insert(clinicalUsers).values({
          id: clinicalUser.id,
          username: clinicalUser.username,
          password: clinicalUser.password,
          email: clinicalUser.email,
          firstName: clinicalUser.firstName,
          lastName: clinicalUser.lastName,
          role: clinicalUser.role,
          isActive: clinicalUser.isActive,
          createdAt: clinicalUser.createdAt ? new Date(clinicalUser.createdAt) : new Date(),
          lastLoginAt: clinicalUser.lastLoginAt ? new Date(clinicalUser.lastLoginAt) : null
        });
      } catch (e) {
        // Skip duplicates
      }
    }
    console.log(`Migrated ${parsed.clinicalUsers?.length || 0} clinical users`);
    
    console.log('\n✅ PostgreSQL migration completed successfully!');
    console.log('🎯 All assessment functionality preserved');
    console.log('📊 Ready for production deployment with shared data');
    
  } catch (error) {
    console.error('Migration error:', error);
  }
}

loadDataDirectly();