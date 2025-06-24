#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrateData() {
  console.log('🚀 Starting database migration...');
  
  try {
    // Read current storage file
    const storageData = JSON.parse(fs.readFileSync('data/storage.json', 'utf8'));
    console.log(`📖 Read storage file with ${storageData.users?.length || 0} users`);

    // Migrate users
    if (storageData.users) {
      console.log('👥 Migrating users...');
      for (const user of storageData.users) {
        await pool.query(`
          INSERT INTO users (id, code, created_at, is_first_time, injury_type, email, first_name, last_name, is_active)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (id) DO UPDATE SET
            code = EXCLUDED.code,
            injury_type = EXCLUDED.injury_type,
            is_first_time = EXCLUDED.is_first_time
        `, [
          user.id,
          user.code,
          user.createdAt || new Date().toISOString(),
          user.isFirstTime || false,
          user.injuryType || null,
          user.email || null,
          user.firstName || null,
          user.lastName || null,
          true
        ]);
      }
      console.log(`✅ Migrated ${storageData.users.length} users`);
    }

    // Migrate assessments
    if (storageData.assessments) {
      console.log('📋 Migrating assessments...');
      for (const assessment of storageData.assessments) {
        await pool.query(`
          INSERT INTO assessments (id, name, description, instructions, video_url, duration, repetitions, is_active, order_index)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            instructions = EXCLUDED.instructions,
            video_url = EXCLUDED.video_url,
            duration = EXCLUDED.duration,
            repetitions = EXCLUDED.repetitions,
            is_active = EXCLUDED.is_active,
            order_index = EXCLUDED.order_index
        `, [
          assessment.id,
          assessment.name,
          assessment.description,
          assessment.instructions || null,
          assessment.videoUrl || null,
          assessment.duration,
          assessment.repetitions || 1,
          assessment.isActive !== false,
          assessment.orderIndex || assessment.id
        ]);
      }
      console.log(`✅ Migrated ${storageData.assessments.length} assessments`);
    }

    // Migrate user assessments
    if (storageData.userAssessments) {
      console.log('🔬 Migrating user assessments...');
      for (const ua of storageData.userAssessments) {
        await pool.query(`
          INSERT INTO user_assessments (
            id, user_id, assessment_id, session_number, is_completed, completed_at,
            quality_score, index_finger_rom, middle_finger_rom, ring_finger_rom, 
            pinky_finger_rom, wrist_flexion_angle, wrist_extension_angle, max_wrist_flexion,
            max_wrist_extension, total_active_rom, hand_type, repetition_data,
            max_mcp_angle, max_pip_angle, max_dip_angle, middle_finger_mcp,
            middle_finger_pip, middle_finger_dip, ring_finger_mcp, ring_finger_pip,
            ring_finger_dip, pinky_finger_mcp, pinky_finger_pip, pinky_finger_dip, share_token
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31)
          ON CONFLICT (id) DO UPDATE SET
            is_completed = EXCLUDED.is_completed,
            completed_at = EXCLUDED.completed_at,
            quality_score = EXCLUDED.quality_score,
            repetition_data = EXCLUDED.repetition_data
        `, [
          ua.id,
          ua.userId,
          ua.assessmentId,
          ua.sessionNumber || 1,
          ua.isCompleted || false,
          ua.completedAt || null,
          ua.qualityScore || null,
          ua.indexFingerRom || null,
          ua.middleFingerRom || null,
          ua.ringFingerRom || null,
          ua.pinkyFingerRom || null,
          ua.wristFlexionAngle || null,
          ua.wristExtensionAngle || null,
          ua.maxWristFlexion || null,
          ua.maxWristExtension || null,
          ua.totalActiveRom || null,
          ua.handType || null,
          ua.repetitionData ? JSON.stringify(ua.repetitionData) : null,
          ua.maxMcpAngle || null,
          ua.maxPipAngle || null,
          ua.maxDipAngle || null,
          ua.middleFingerMcp || null,
          ua.middleFingerPip || null,
          ua.middleFingerDip || null,
          ua.ringFingerMcp || null,
          ua.ringFingerPip || null,
          ua.ringFingerDip || null,
          ua.pinkyFingerMcp || null,
          ua.pinkyFingerPip || null,
          ua.pinkyFingerDip || null,
          ua.shareToken || null
        ]);
      }
      console.log(`✅ Migrated ${storageData.userAssessments.length} user assessments`);
    }

    // Migrate clinical users
    if (storageData.clinicalUsers) {
      console.log('👨‍⚕️ Migrating clinical users...');
      for (const cu of storageData.clinicalUsers) {
        await pool.query(`
          INSERT INTO clinical_users (id, username, password, email, first_name, last_name, role, is_active, created_at, last_login_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (id) DO UPDATE SET
            username = EXCLUDED.username,
            email = EXCLUDED.email,
            role = EXCLUDED.role,
            is_active = EXCLUDED.is_active
        `, [
          cu.id,
          cu.username,
          cu.password,
          cu.email,
          cu.firstName,
          cu.lastName,
          cu.role,
          cu.isActive !== false,
          cu.createdAt || new Date().toISOString(),
          cu.lastLoginAt || null
        ]);
      }
      console.log(`✅ Migrated ${storageData.clinicalUsers.length} clinical users`);
    }

    console.log('🎉 Database migration completed successfully!');
    console.log('📊 Verifying data...');

    // Verify migration
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    const assessmentCount = await pool.query('SELECT COUNT(*) FROM assessments');
    const userAssessmentCount = await pool.query('SELECT COUNT(*) FROM user_assessments');
    
    console.log(`✅ Verification complete:`);
    console.log(`   Users: ${userCount.rows[0].count}`);
    console.log(`   Assessments: ${assessmentCount.rows[0].count}`);
    console.log(`   User Assessments: ${userAssessmentCount.rows[0].count}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migration
migrateData();