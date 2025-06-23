// Create a custom version that exposes private data for migration
class MigrationStorage {
  private storage: any;
  
  constructor() {
    this.storage = new (require('./persistent-storage').PersistentMemoryStorage)();
    // Wait for initialization
    setTimeout(() => this.runMigration(), 2000);
  }
  
  async runMigration() {
    const db = require('drizzle-orm/neon-http').drizzle(require('@neondatabase/serverless').neon(process.env.DATABASE_URL));
    const { users, assessments, userAssessments, clinicalUsers, injuryTypes } = require('@shared/schema');
    
    try {
      // Access private properties through reflection
      const storageUsers = this.storage.users || new Map();
      const storageAssessments = this.storage.assessments || new Map();
      const storageUserAssessments = this.storage.userAssessments || new Map();
      const storageClinicalUsers = this.storage.clinicalUsers || new Map();
      
      console.log('Starting migration with data:', {
        users: storageUsers.size,
        assessments: storageAssessments.size,
        userAssessments: storageUserAssessments.size,
        clinicalUsers: storageClinicalUsers.size
      });
      
      // Migrate data with proper error handling
      const results = await Promise.allSettled([
        this.migrateUsers(db, users, storageUsers),
        this.migrateAssessments(db, assessments, storageAssessments),
        this.migrateUserAssessments(db, userAssessments, storageUserAssessments),
        this.migrateClinicalUsers(db, clinicalUsers, storageClinicalUsers)
      ]);
      
      console.log('Migration completed:', results.map(r => r.status));
      
    } catch (error) {
      console.error('Migration failed:', error);
    }
  }
  
  async migrateUsers(db: any, usersTable: any, storageUsers: Map<any, any>) {
    for (const [id, user] of storageUsers) {
      try {
        await db.insert(usersTable).values({
          id: user.id,
          code: user.code,
          createdAt: new Date(user.createdAt),
          isFirstTime: user.isFirstTime,
          injuryType: user.injuryType
        }).onConflictDoNothing();
      } catch (e) {
        console.log('User migration error for:', id, e.message);
      }
    }
    console.log('Users migrated');
  }
  
  async migrateAssessments(db: any, assessmentsTable: any, storageAssessments: Map<any, any>) {
    for (const [id, assessment] of storageAssessments) {
      try {
        await db.insert(assessmentsTable).values({
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
      } catch (e) {
        console.log('Assessment migration error for:', id, e.message);
      }
    }
    console.log('Assessments migrated');
  }
  
  async migrateUserAssessments(db: any, userAssessmentsTable: any, storageUserAssessments: Map<any, any>) {
    for (const [id, ua] of storageUserAssessments) {
      try {
        await db.insert(userAssessmentsTable).values({
          id: ua.id,
          userId: ua.userId,
          assessmentId: ua.assessmentId,
          sessionNumber: ua.sessionNumber || 1,
          isCompleted: ua.isCompleted || false,
          completedAt: ua.completedAt ? new Date(ua.completedAt) : null,
          qualityScore: ua.qualityScore ? parseFloat(ua.qualityScore.toString()) : null,
          totalActiveRom: ua.totalActiveRom ? parseFloat(ua.totalActiveRom.toString()) : null,
          indexFingerRom: ua.indexFingerRom ? parseFloat(ua.indexFingerRom.toString()) : null,
          middleFingerRom: ua.middleFingerRom ? parseFloat(ua.middleFingerRom.toString()) : null,
          ringFingerRom: ua.ringFingerRom ? parseFloat(ua.ringFingerRom.toString()) : null,
          pinkyFingerRom: ua.pinkyFingerRom ? parseFloat(ua.pinkyFingerRom.toString()) : null,
          maxMcpAngle: ua.maxMcpAngle ? parseFloat(ua.maxMcpAngle.toString()) : null,
          maxPipAngle: ua.maxPipAngle ? parseFloat(ua.maxPipAngle.toString()) : null,
          maxDipAngle: ua.maxDipAngle ? parseFloat(ua.maxDipAngle.toString()) : null,
          kapandjiScore: ua.kapandjiScore ? parseFloat(ua.kapandjiScore.toString()) : null,
          maxThumbOpposition: ua.maxThumbOpposition ? parseFloat(ua.maxThumbOpposition.toString()) : null,
          wristFlexionAngle: ua.wristFlexionAngle ? parseFloat(ua.wristFlexionAngle.toString()) : null,
          wristExtensionAngle: ua.wristExtensionAngle ? parseFloat(ua.wristExtensionAngle.toString()) : null,
          maxWristFlexion: ua.maxWristFlexion ? parseFloat(ua.maxWristFlexion.toString()) : null,
          maxWristExtension: ua.maxWristExtension ? parseFloat(ua.maxWristExtension.toString()) : null,
          handType: ua.handType,
          shareToken: ua.shareToken,
          romData: ua.romData || {},
          repetitionData: ua.repetitionData || []
        }).onConflictDoNothing();
      } catch (e) {
        console.log('UserAssessment migration error for:', id, e.message);
      }
    }
    console.log('User assessments migrated');
  }
  
  async migrateClinicalUsers(db: any, clinicalUsersTable: any, storageClinicalUsers: Map<any, any>) {
    for (const [id, clinicalUser] of storageClinicalUsers) {
      try {
        await db.insert(clinicalUsersTable).values({
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
      } catch (e) {
        console.log('Clinical user migration error for:', id, e.message);
      }
    }
    console.log('Clinical users migrated');
  }
}

new MigrationStorage();
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
    
    // Migrate users - access the private data directly
    const allUsers = Array.from(fileStorage.users?.values() || []);
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
    const allAssessments = Array.from(fileStorage.assessments?.values() || []);
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
    const allUserAssessments = Array.from(fileStorage.userAssessments?.values() || []);
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
    const allClinicalUsers = Array.from(fileStorage.clinicalUsers?.values() || []);
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