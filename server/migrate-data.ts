import { db } from "./db";
import { 
  users, 
  assessments, 
  userAssessments, 
  injuryTypes,
  clinicalUsers,
  cohorts,
  patients,
  assessmentTypes
} from "@shared/schema";
import { sql } from "drizzle-orm";
import fs from 'fs';
import path from 'path';

export async function migrateExistingData() {
  console.log('Starting data migration from previous system...');

  // Load existing data from storage.json
  let existingData = null;
  const dataPath = path.join(process.cwd(), 'data', 'storage.json');
  try {
    if (fs.existsSync(dataPath)) {
      const rawData = fs.readFileSync(dataPath, 'utf-8');
      existingData = JSON.parse(rawData);
      console.log('Found existing storage data:', {
        users: existingData.users?.length || 0,
        assessments: existingData.assessments?.length || 0,
        userAssessments: existingData.userAssessments?.length || 0,
        clinicalUsers: existingData.clinicalUsers?.length || 0
      });
    }
  } catch (error) {
    console.log('No existing storage file found, using defaults only');
  }

  try {
    // 1. Migrate Injury Types
    const injuryTypeData = [
      { name: "Trigger Finger", description: "Stenosing tenosynovitis affecting finger flexion", icon: "fas fa-hand-point-up" },
      { name: "Carpal Tunnel", description: "Median nerve compression requiring comprehensive assessment", icon: "fas fa-hand-scissors" },
      { name: "Distal Radius Fracture", description: "Wrist fracture requiring full range of motion evaluation", icon: "fas fa-hand-paper" },
      { name: "CMC Arthroplasty", description: "Thumb basal joint replacement recovery assessment", icon: "fas fa-thumbs-up" },
      { name: "Metacarpal ORIF", description: "Hand bone fracture repair recovery", icon: "fas fa-hand-rock" },
      { name: "Phalanx Fracture", description: "Finger bone fracture recovery assessment", icon: "fas fa-hand-point-right" },
      { name: "Radial Head Replacement", description: "Elbow joint replacement affecting hand function", icon: "fas fa-hand-spock" },
      { name: "Terrible Triad Injury", description: "Complex elbow injury requiring comprehensive evaluation", icon: "fas fa-hand-peace" },
      { name: "Dupuytren's Contracture", description: "Palmar fascia contracture affecting finger extension", icon: "fas fa-hand-lizard" },
      { name: "Flexor Tendon Injury", description: "Finger flexor tendon repair recovery", icon: "fas fa-hand-grab" },
      { name: "Extensor Tendon Injury", description: "Finger extensor tendon repair recovery", icon: "fas fa-hand-pointer" }
    ];

    for (const injuryType of injuryTypeData) {
      await db.insert(injuryTypes).values(injuryType).onConflictDoNothing();
    }
    console.log('✓ Migrated injury types');

    // 2. Migrate Assessment Types (from old system's default assessments)
    const assessmentData = [
      {
        name: 'TAM (Total Active Motion)',
        description: 'Comprehensive finger flexion and extension measurement',
        videoUrl: '/videos/tam_video.mp4',
        duration: 10,
        repetitions: 1,
        instructions: 'Make a complete fist, then fully extend all fingers. Repeat slowly and deliberately.',
        isActive: true,
        orderIndex: 1
      },
      {
        name: 'Kapandji Score',
        description: 'Thumb opposition assessment using standardized scoring',
        videoUrl: '/videos/kapandji-instruction.mov',
        duration: 10,
        repetitions: 1,
        instructions: 'Touch your thumb to each finger tip, then to the base of each finger, progressing down the hand.',
        isActive: true,
        orderIndex: 2
      },
      {
        name: 'Wrist Flexion/Extension',
        description: 'Measure wrist forward and backward bending range of motion',
        videoUrl: '/videos/wrist-fe-assessment.mp4',
        duration: 10,
        repetitions: 1,
        instructions: 'Bend your wrist forward as far as comfortable, then backward. Keep forearm stable.',
        isActive: true,
        orderIndex: 3
      },
      {
        name: 'Forearm Pronation/Supination',
        description: 'Assess forearm rotation capabilities',
        videoUrl: '/videos/forearm-rotation.mp4',
        duration: 10,
        repetitions: 1,
        instructions: 'Rotate your forearm so palm faces down, then up. Keep elbow stable.',
        isActive: true,
        orderIndex: 4
      },
      {
        name: 'Wrist Radial/Ulnar Deviation',
        description: 'Measure side-to-side wrist movement',
        videoUrl: '/videos/wrist-deviation.mp4',
        duration: 8,
        repetitions: 1,
        instructions: 'Move your wrist side to side as far as comfortable. Keep forearm stable.',
        isActive: true,
        orderIndex: 5
      },
      {
        name: 'Finger Extension',
        description: 'Evaluate individual finger extension capability',
        videoUrl: '/videos/finger-extension.mp4',
        duration: 10,
        repetitions: 3,
        instructions: 'Slowly extend your fingers as far as comfortable, spreading them apart',
        isActive: true,
        orderIndex: 6
      },
      {
        name: 'Thumb Opposition',
        description: 'Measure thumb to finger touch capability',
        videoUrl: '/videos/thumb-opposition.mp4',
        duration: 15,
        repetitions: 3,
        instructions: 'Touch your thumb to each fingertip in sequence',
        isActive: true,
        orderIndex: 7
      },
      {
        name: 'Shoulder Flexion',
        description: 'Measure forward shoulder movement',
        videoUrl: '/videos/shoulder-flexion.mp4',
        duration: 20,
        repetitions: 3,
        instructions: 'Raise your arm forward as high as comfortable',
        isActive: true,
        orderIndex: 8
      }
    ];

    for (const assessment of assessmentData) {
      await db.insert(assessmentTypes).values(assessment).onConflictDoNothing();
    }
    console.log('✓ Migrated assessment types');

    // Also add to legacy assessments table for backward compatibility
    for (const assessment of assessmentData) {
      await db.insert(assessments).values(assessment).onConflictDoNothing();
    }
    console.log('✓ Migrated legacy assessments');

    // 3. Create Demo Cohort
    const [demoCorht] = await db.insert(cohorts).values({
      name: 'Demo Cohort',
      description: 'Demonstration cohort for testing and onboarding',
      normalRomRanges: {
        wristFlexion: { min: 70, max: 90 },
        wristExtension: { min: 60, max: 80 },
        tamScore: { min: 200, max: 260 },
        kapandjiScore: { min: 8, max: 10 }
      },
      isActive: true
    }).onConflictDoNothing().returning();
    console.log('✓ Created demo cohort');

    // 4. Create Clinical Users
    const clinicalUserData = [
      {
        username: 'admin',
        password: 'admin123',
        email: 'admin@demo.com',
        firstName: 'Demo',
        lastName: 'Administrator',
        role: 'admin',
        isActive: true
      },
      {
        username: 'clinician',
        password: 'clinician123',
        email: 'clinician@demo.com',
        firstName: 'Dr. Demo',
        lastName: 'Clinician',
        role: 'clinician',
        isActive: true
      },
      {
        username: 'researcher',
        password: 'researcher123',
        email: 'researcher@demo.com',
        firstName: 'Demo',
        lastName: 'Researcher',
        role: 'researcher',
        isActive: true
      }
    ];

    for (const clinicalUser of clinicalUserData) {
      await db.insert(clinicalUsers).values(clinicalUser).onConflictDoNothing();
    }
    console.log('✓ Migrated clinical users');

    // 5. Migrate existing users from storage.json
    if (existingData?.users) {
      console.log('Migrating existing users...');
      for (const user of existingData.users) {
        await db.insert(users).values({
          code: user.code,
          injuryType: user.injuryType || null,
          firstName: user.firstName || null,
          lastName: user.lastName || null,
          email: user.email || null,
          isFirstTime: user.isFirstTime ?? true,
          isActive: user.isActive ?? true
        }).onConflictDoNothing();
      }
      console.log(`✓ Migrated ${existingData.users.length} existing users`);
    } else {
      // Create Demo User if no existing data
      await db.insert(users).values({
        code: 'DEMO01',
        injuryType: 'Carpal Tunnel',
        firstName: 'Demo',
        lastName: 'Patient',
        email: 'demo@patient.com',
        isFirstTime: false,
        isActive: true
      }).onConflictDoNothing();
      console.log('✓ Created demo user DEMO01');
    }

    // 5b. Migrate existing user assessments
    if (existingData?.userAssessments) {
      console.log('Migrating existing user assessments...');
      for (const ua of existingData.userAssessments) {
        await db.insert(userAssessments).values({
          userId: ua.userId,
          assessmentId: ua.assessmentId,
          sessionNumber: ua.sessionNumber || 1,
          isCompleted: ua.isCompleted || false,
          completedAt: ua.completedAt ? new Date(ua.completedAt) : null,
          romData: ua.romData || null,
          repetitionData: ua.repetitionData || null,
          qualityScore: ua.qualityScore || null,
          maxMcpAngle: ua.maxMcpAngle ? parseFloat(ua.maxMcpAngle) : null,
          maxPipAngle: ua.maxPipAngle ? parseFloat(ua.maxPipAngle) : null,
          maxDipAngle: ua.maxDipAngle ? parseFloat(ua.maxDipAngle) : null,
          totalActiveRom: ua.totalActiveRom ? parseFloat(ua.totalActiveRom) : null,
          indexFingerRom: ua.indexFingerRom ? parseFloat(ua.indexFingerRom) : null,
          middleFingerRom: ua.middleFingerRom ? parseFloat(ua.middleFingerRom) : null,
          ringFingerRom: ua.ringFingerRom ? parseFloat(ua.ringFingerRom) : null,
          pinkyFingerRom: ua.pinkyFingerRom ? parseFloat(ua.pinkyFingerRom) : null,
          wristFlexionAngle: ua.wristFlexionAngle ? parseFloat(ua.wristFlexionAngle) : null,
          wristExtensionAngle: ua.wristExtensionAngle ? parseFloat(ua.wristExtensionAngle) : null,
          maxWristFlexion: ua.maxWristFlexion ? parseFloat(ua.maxWristFlexion) : null,
          maxWristExtension: ua.maxWristExtension ? parseFloat(ua.maxWristExtension) : null,
          handType: ua.handType || null,
          shareToken: ua.shareToken || null
        }).onConflictDoNothing();
      }
      console.log(`✓ Migrated ${existingData.userAssessments.length} existing user assessments`);
    }

    // 5c. Migrate existing clinical users
    if (existingData?.clinicalUsers) {
      console.log('Migrating existing clinical users...');
      for (const clinicalUser of existingData.clinicalUsers) {
        await db.insert(clinicalUsers).values({
          username: clinicalUser.username,
          password: clinicalUser.password,
          email: clinicalUser.email,
          firstName: clinicalUser.firstName,
          lastName: clinicalUser.lastName,
          role: clinicalUser.role || 'clinician',
          isActive: clinicalUser.isActive ?? true
        }).onConflictDoNothing();
      }
      console.log(`✓ Migrated ${existingData.clinicalUsers.length} existing clinical users`);
    }

    // 6. Create Demo Patient (New system)
    const accessCode = '421475';
    await db.insert(patients).values({
      patientId: 'PT001',
      alias: 'Demo Patient',
      cohortId: demoCorht?.id || 1,
      assignedClinicianId: 1,
      status: 'stable',
      ageGroup: '26-35',
      sex: 'F',
      handDominance: 'Right',
      occupationCategory: 'Office Work',
      injuryType: 'Carpal Tunnel',
      enrollmentStatus: 'enrolled',
      accessCode: accessCode,
      phone: '555-0123',
      gender: 'Female',
      enrolledInStudy: true,
      isActive: true
    }).onConflictDoNothing();
    console.log('✓ Created demo patient with access code:', accessCode);

    // 7. Create additional demo patients for variety
    const additionalPatients = [
      {
        patientId: 'PT002',
        alias: 'John Smith',
        injuryType: 'Trigger Finger',
        accessCode: '123456',
        ageGroup: '46-55',
        sex: 'M',
        occupationCategory: 'Manual Labor'
      },
      {
        patientId: 'PT003',
        alias: 'Sarah Johnson',
        injuryType: 'Distal Radius Fracture',
        accessCode: '789012',
        ageGroup: '36-45',
        sex: 'F',
        occupationCategory: 'Healthcare'
      }
    ];

    for (const patient of additionalPatients) {
      await db.insert(patients).values({
        ...patient,
        cohortId: demoCorht?.id || 1,
        assignedClinicianId: 1,
        status: 'stable',
        handDominance: 'Right',
        enrollmentStatus: 'enrolled',
        phone: '555-0000',
        gender: patient.sex === 'M' ? 'Male' : 'Female',
        enrolledInStudy: true,
        isActive: true
      }).onConflictDoNothing();
    }
    console.log('✓ Created additional demo patients');

    console.log('Data migration completed successfully!');
    console.log(`
Demo Access Codes:
- DEMO01 (legacy): Demo Patient - Carpal Tunnel
- 421475 (new): Demo Patient - Carpal Tunnel  
- 123456: John Smith - Trigger Finger
- 789012: Sarah Johnson - Distal Radius Fracture

Clinical Login:
- Username: admin, Password: admin123
- Username: clinician, Password: clinician123
    `);

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}