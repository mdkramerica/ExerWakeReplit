import { db } from "./db";
import { users, admins, assessments, userAssessments, accessCodes } from "@shared/schema";
import { sql } from "drizzle-orm";
import * as crypto from "crypto";

async function initializeDatabase() {
  console.log("Initializing database...");

  try {
    // Clear existing data
    await db.delete(userAssessments);
    await db.delete(users);
    await db.delete(admins);
    await db.delete(assessments);
    await db.delete(accessCodes);

    // Create assessments
    const assessmentData = [
      {
        name: "TAM Assessment",
        description: "Total Active Motion assessment for finger flexibility",
        duration: 60,
        orderIndex: 1,
      },
      {
        name: "Kapandji Assessment",
        description: "Thumb opposition test measuring functional movement",
        duration: 45,
        orderIndex: 2,
      },
      {
        name: "Wrist Flexion/Extension",
        description: "Measures wrist bending range of motion",
        duration: 30,
        orderIndex: 3,
      },
      {
        name: "Wrist Deviation",
        description: "Measures side-to-side wrist movement",
        duration: 30,
        orderIndex: 4,
      },
      {
        name: "DASH Survey",
        description: "Disabilities of the Arm, Shoulder and Hand questionnaire",
        duration: 15,
        orderIndex: 5,
      },
    ];

    const createdAssessments = await db.insert(assessments).values(assessmentData).returning();
    console.log(`Created ${createdAssessments.length} assessments`);

    // Create admin user
    const adminData = {
      username: "admin",
      password: crypto.createHash('sha256').update('admin123').digest('hex'),
      name: "Admin User",
    };

    await db.insert(admins).values(adminData);
    console.log("Created admin user (username: admin, password: admin123)");

    // Create test patient with access code
    const testCode = "123456";
    const testUser = {
      patientId: "P001",
      code: testCode,
      injuryType: "Wrist Fracture",
      isFirstTime: true,
      createdAt: new Date(),
    };

    const [createdUser] = await db.insert(users).values(testUser).returning();
    console.log(`Created test patient with code: ${testCode}`);

    // Create additional access codes
    const additionalCodes = [];
    for (let i = 2; i <= 10; i++) {
      const code = String(100000 + i).padStart(6, '0');
      additionalCodes.push({
        code,
        isUsed: false,
        createdAt: new Date(),
      });
    }

    await db.insert(accessCodes).values(additionalCodes);
    console.log(`Created ${additionalCodes.length} additional access codes`);

    // Add some sample assessments for the test user
    const sampleAssessments = [
      {
        userId: createdUser.id,
        assessmentId: createdAssessments[0].id, // TAM
        completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        scoreData: JSON.stringify({
          indexFinger: { mcp: 85, pip: 90, dip: 75 },
          middleFinger: { mcp: 88, pip: 92, dip: 78 },
          ringFinger: { mcp: 86, pip: 89, dip: 76 },
          pinkyFinger: { mcp: 84, pip: 87, dip: 74 },
        }),
      },
      {
        userId: createdUser.id,
        assessmentId: createdAssessments[1].id, // Kapandji
        completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        scoreData: JSON.stringify({
          score: 8,
          maxScore: 10,
        }),
      },
    ];

    await db.insert(userAssessments).values(sampleAssessments);
    console.log(`Created ${sampleAssessments.length} sample assessments`);

    console.log("\n✅ Database initialized successfully!");
    console.log("\n📋 Test Credentials:");
    console.log("Patient Access Code: 123456");
    console.log("Admin Login: admin / admin123");
    console.log("\nAdditional unused codes: 100002, 100003, ... 100010");

  } catch (error) {
    console.error("Error initializing database:", error);
    process.exit(1);
  }

  process.exit(0);
}

initializeDatabase();