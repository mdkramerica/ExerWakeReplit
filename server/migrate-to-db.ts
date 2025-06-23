import { PersistentMemoryStorage } from "./persistent-storage";
import { Storage } from "./storage";

async function migrateData() {
  console.log('Starting migration from file storage to PostgreSQL...');
  
  const fileStorage = new PersistentMemoryStorage();
  const dbStorage = new Storage();
  
  try {
    // Get all data from file storage
    const users = await fileStorage.getAllUsers();
    const assessments = await fileStorage.getAssessments();
    const userAssessments = await fileStorage.getAllUserAssessments();
    const clinicalUsers = await fileStorage.getAllClinicalUsers();
    
    console.log(`Found ${users.length} users, ${assessments.length} assessments, ${userAssessments.length} user assessments`);
    
    // Migrate injury types/cohorts first
    const cohorts = [
      { name: 'Carpal Tunnel', description: 'Carpal tunnel syndrome patients', isActive: true },
      { name: 'Trigger Finger', description: 'Trigger finger patients', isActive: true },
      { name: 'Distal Radius Fracture', description: 'Distal radius fracture patients', isActive: true },
      { name: 'Dupuytren\'s Contracture', description: 'Dupuytren\'s contracture patients', isActive: true },
      { name: 'Hand Arthritis', description: 'Hand arthritis patients', isActive: true }
    ];
    
    for (const cohort of cohorts) {
      await dbStorage.createCohort(cohort);
    }
    console.log('Migrated cohorts');
    
    // Migrate assessments
    for (const assessment of assessments) {
      await dbStorage.createAssessment({
        name: assessment.name,
        description: assessment.description,
        videoUrl: assessment.videoUrl,
        duration: assessment.duration,
        repetitions: assessment.repetitions,
        instructions: assessment.instructions,
        isActive: assessment.isActive,
        orderIndex: assessment.orderIndex
      });
    }
    console.log('Migrated assessments');
    
    // Migrate clinical users
    for (const clinicalUser of clinicalUsers) {
      await dbStorage.createClinicalUser({
        username: clinicalUser.username,
        password: clinicalUser.password,
        email: clinicalUser.email,
        firstName: clinicalUser.firstName,
        lastName: clinicalUser.lastName,
        role: clinicalUser.role,
        isActive: clinicalUser.isActive
      });
    }
    console.log('Migrated clinical users');
    
    // Migrate users as patients
    const allCohorts = await dbStorage.getCohorts();
    for (const user of users) {
      const cohort = allCohorts.find(c => c.name === user.injuryType);
      
      await dbStorage.createPatient({
        patientId: user.code,
        alias: `Patient ${user.code}`,
        cohortId: cohort?.id || null,
        status: 'stable',
        surgeryDate: user.studyStartDate ? new Date(user.studyStartDate) : null,
        injuryType: user.injuryType,
        studyStartDate: user.studyStartDate ? new Date(user.studyStartDate) : null,
        studyDurationDays: user.studyDurationDays || 28,
        studyEndDate: user.studyEndDate ? new Date(user.studyEndDate) : null,
        isActive: true
      });
    }
    console.log('Migrated patients');
    
    // Migrate user assessments as patient assessments
    const allPatients = await dbStorage.getPatients();
    const allAssessments = await dbStorage.getAssessments();
    
    for (const userAssessment of userAssessments) {
      if (!userAssessment.isCompleted) continue;
      
      const user = users.find(u => u.id === userAssessment.userId);
      const patient = allPatients.find(p => p.patientId === user?.code);
      const assessment = allAssessments.find(a => a.id === userAssessment.assessmentId);
      
      if (patient && assessment) {
        await dbStorage.createPatientAssessment({
          patientId: patient.id,
          assessmentId: assessment.id,
          sessionNumber: userAssessment.sessionNumber || 1,
          isCompleted: true,
          completedAt: userAssessment.completedAt ? new Date(userAssessment.completedAt) : new Date(),
          qualityScore: userAssessment.qualityScore,
          romData: userAssessment.romData || {},
          repetitionData: userAssessment.repetitionData || [],
          totalActiveRom: userAssessment.totalActiveRom,
          indexFingerRom: userAssessment.indexFingerRom,
          middleFingerRom: userAssessment.middleFingerRom,
          ringFingerRom: userAssessment.ringFingerRom,
          pinkyFingerRom: userAssessment.pinkyFingerRom,
          kapandjiScore: userAssessment.kapandjiScore,
          maxWristFlexion: userAssessment.maxWristFlexion,
          maxWristExtension: userAssessment.maxWristExtension,
          handType: userAssessment.handType,
          shareToken: userAssessment.shareToken
        });
      }
    }
    console.log('Migrated patient assessments');
    
    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateData().catch(console.error);
}

export { migrateData };