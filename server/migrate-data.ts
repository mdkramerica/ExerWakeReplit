import { PersistentMemoryStorage } from "./persistent-storage";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { 
  users, 
  assessments, 
  userAssessments,
  clinicalUsers,
  injuryTypes 
} from "@shared/schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function migrateAllData() {
  console.log('Starting PostgreSQL migration...');
  
  const fileStorage = new PersistentMemoryStorage();
  
  try {
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
        // Skip if already exists
      }
    }
    console.log('Migrated injury types');
    
    // Migrate users
    const allUsers = await fileStorage.getUsers();
    for (const user of allUsers) {
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
        // Skip if already exists
      }
    }
    console.log(`Migrated ${allUsers.length} users`);
    
    // Migrate assessments
    const allAssessments = await fileStorage.getAssessments();
    for (const assessment of allAssessments) {
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
        // Skip if already exists
      }
    }
    console.log(`Migrated ${allAssessments.length} assessments`);
    
    // Migrate user assessments with full ROM data
    const allUserAssessments = await fileStorage.getUserAssessments();
    for (const ua of allUserAssessments) {
      try {
        await db.insert(userAssessments).values({
          id: ua.id,
          userId: ua.userId,
          assessmentId: ua.assessmentId,
          sessionNumber: ua.sessionNumber || 1,
          isCompleted: ua.isCompleted || false,
          completedAt: ua.completedAt ? new Date(ua.completedAt) : null,
          qualityScore: ua.qualityScore ? parseFloat(ua.qualityScore.toString()) : null,
          
          // Preserve ROM data
          totalActiveRom: ua.totalActiveRom ? parseFloat(ua.totalActiveRom.toString()) : null,
          indexFingerRom: ua.indexFingerRom ? parseFloat(ua.indexFingerRom.toString()) : null,
          middleFingerRom: ua.middleFingerRom ? parseFloat(ua.middleFingerRom.toString()) : null,
          ringFingerRom: ua.ringFingerRom ? parseFloat(ua.ringFingerRom.toString()) : null,
          pinkyFingerRom: ua.pinkyFingerRom ? parseFloat(ua.pinkyFingerRom.toString()) : null,
          
          // Preserve joint angles
          maxMcpAngle: ua.maxMcpAngle ? parseFloat(ua.maxMcpAngle.toString()) : null,
          maxPipAngle: ua.maxPipAngle ? parseFloat(ua.maxPipAngle.toString()) : null,
          maxDipAngle: ua.maxDipAngle ? parseFloat(ua.maxDipAngle.toString()) : null,
          
          // Preserve Kapandji
          kapandjiScore: ua.kapandjiScore ? parseFloat(ua.kapandjiScore.toString()) : null,
          maxThumbOpposition: ua.maxThumbOpposition ? parseFloat(ua.maxThumbOpposition.toString()) : null,
          
          // Preserve wrist data
          wristFlexionAngle: ua.wristFlexionAngle ? parseFloat(ua.wristFlexionAngle.toString()) : null,
          wristExtensionAngle: ua.wristExtensionAngle ? parseFloat(ua.wristExtensionAngle.toString()) : null,
          maxWristFlexion: ua.maxWristFlexion ? parseFloat(ua.maxWristFlexion.toString()) : null,
          maxWristExtension: ua.maxWristExtension ? parseFloat(ua.maxWristExtension.toString()) : null,
          
          handType: ua.handType,
          shareToken: ua.shareToken,
          romData: ua.romData || {},
          repetitionData: ua.repetitionData || []
        });
      } catch (e) {
        // Skip if already exists
      }
    }
    console.log(`Migrated ${allUserAssessments.length} user assessments`);
    
    // Migrate clinical users
    const allClinicalUsers = await fileStorage.getClinicalUsers();
    for (const clinicalUser of allClinicalUsers) {
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
        // Skip if already exists
      }
    }
    console.log(`Migrated ${allClinicalUsers.length} clinical users`);
    
    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

migrateAllData();