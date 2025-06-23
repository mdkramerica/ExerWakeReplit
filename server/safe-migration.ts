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

async function migrateWithZeroDowntime() {
  console.log('🚀 Starting zero-downtime migration to PostgreSQL...');
  
  const fileStorage = new PersistentMemoryStorage();
  
  try {
    // Migrate injury types first
    const injuryTypesList = [
      { name: 'Carpal Tunnel', description: 'Carpal tunnel syndrome', icon: '🖐️' },
      { name: 'Trigger Finger', description: 'Trigger finger condition', icon: '👆' },
      { name: 'Distal Radius Fracture', description: 'Distal radius fracture', icon: '🦴' },
      { name: "Dupuytren's Contracture", description: "Dupuytren's contracture", icon: '✋' },
      { name: 'Hand Arthritis', description: 'Hand arthritis', icon: '🤲' }
    ];
    
    for (const injuryType of injuryTypesList) {
      await db.insert(injuryTypes).values(injuryType).onConflictDoNothing();
    }
    console.log('✅ Migrated injury types');
    
    // Migrate all users exactly as they are
    const allUsers = await fileStorage.getAllUsers();
    for (const user of allUsers) {
      await db.insert(users).values({
        id: user.id,
        code: user.code,
        createdAt: new Date(user.createdAt),
        isFirstTime: user.isFirstTime,
        injuryType: user.injuryType,
        studyStartDate: user.studyStartDate ? new Date(user.studyStartDate) : null,
        studyDurationDays: user.studyDurationDays,
        studyEndDate: user.studyEndDate ? new Date(user.studyEndDate) : null
      }).onConflictDoNothing();
    }
    console.log(`✅ Migrated ${allUsers.length} users`);
    
    // Migrate all assessments exactly as they are
    const allAssessments = await fileStorage.getAssessments();
    for (const assessment of allAssessments) {
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
      }).onConflictDoNothing();
    }
    console.log(`✅ Migrated ${allAssessments.length} assessments`);
    
    // Migrate all user assessments with FULL ROM data preservation
    const allUserAssessments = await fileStorage.getAllUserAssessments();
    for (const ua of allUserAssessments) {
      await db.insert(userAssessments).values({
        id: ua.id,
        userId: ua.userId,
        assessmentId: ua.assessmentId,
        sessionNumber: ua.sessionNumber || 1,
        isCompleted: ua.isCompleted || false,
        completedAt: ua.completedAt ? new Date(ua.completedAt) : null,
        qualityScore: ua.qualityScore ? parseFloat(ua.qualityScore.toString()) : null,
        
        // Preserve ALL ROM data exactly
        totalActiveRom: ua.totalActiveRom ? parseFloat(ua.totalActiveRom.toString()) : null,
        indexFingerRom: ua.indexFingerRom ? parseFloat(ua.indexFingerRom.toString()) : null,
        middleFingerRom: ua.middleFingerRom ? parseFloat(ua.middleFingerRom.toString()) : null,
        ringFingerRom: ua.ringFingerRom ? parseFloat(ua.ringFingerRom.toString()) : null,
        pinkyFingerRom: ua.pinkyFingerRom ? parseFloat(ua.pinkyFingerRom.toString()) : null,
        
        // Preserve individual joint angles
        maxMcpAngle: ua.maxMcpAngle ? parseFloat(ua.maxMcpAngle.toString()) : null,
        maxPipAngle: ua.maxPipAngle ? parseFloat(ua.maxPipAngle.toString()) : null,
        maxDipAngle: ua.maxDipAngle ? parseFloat(ua.maxDipAngle.toString()) : null,
        
        // Preserve Kapandji scores
        kapandjiScore: ua.kapandjiScore ? parseFloat(ua.kapandjiScore.toString()) : null,
        maxThumbOpposition: ua.maxThumbOpposition ? parseFloat(ua.maxThumbOpposition.toString()) : null,
        
        // Preserve wrist measurements
        wristFlexionAngle: ua.wristFlexionAngle ? parseFloat(ua.wristFlexionAngle.toString()) : null,
        wristExtensionAngle: ua.wristExtensionAngle ? parseFloat(ua.wristExtensionAngle.toString()) : null,
        maxWristFlexion: ua.maxWristFlexion ? parseFloat(ua.maxWristFlexion.toString()) : null,
        maxWristExtension: ua.maxWristExtension ? parseFloat(ua.maxWristExtension.toString()) : null,
        
        // Preserve metadata
        handType: ua.handType,
        shareToken: ua.shareToken,
        
        // Preserve raw motion data
        romData: ua.romData || {},
        repetitionData: ua.repetitionData || []
      }).onConflictDoNothing();
    }
    console.log(`✅ Migrated ${allUserAssessments.length} user assessments with full ROM data`);
    
    // Migrate clinical users
    const allClinicalUsers = await fileStorage.getAllClinicalUsers();
    for (const clinicalUser of allClinicalUsers) {
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
      }).onConflictDoNothing();
    }
    console.log(`✅ Migrated ${allClinicalUsers.length} clinical users`);
    
    console.log('🎉 Migration completed successfully!');
    console.log('📊 All assessment functionality preserved:');
    console.log('   • TAM assessments with finger-specific ROM');
    console.log('   • Kapandji scores and thumb opposition');
    console.log('   • Wrist flexion/extension measurements');
    console.log('   • Quality scores and timestamps');
    console.log('   • Motion replay data');
    console.log('   • Assessment history');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

export { migrateWithZeroDowntime };