import fs from 'fs/promises';
import path from 'path';

interface StorageData {
  users: Array<{ id: number; [key: string]: any }>;
  userAssessments: Array<{ id: number; [key: string]: any }>;
  assessments: Array<{ id: number; [key: string]: any }>;
  injuryTypes: Array<{ [key: string]: any }>;
  clinicalUsers: Array<{ id: number; [key: string]: any }>;
}

export class PersistentMemoryStorage {
  private users = new Map<number, any>();
  private userByCode = new Map<string, any>();
  private userAssessments = new Map<number, any>();
  private assessments = new Map<number, any>();
  private injuryTypes: any[] = [];
  private clinicalUsers = new Map<number, any>();
  private clinicalUsersByUsername = new Map<string, any>();
  public patients = new Map<number, any>();
  private nextUserAssessmentId = 1;
  private dataDir = './data';
  private dataFile = path.join(this.dataDir, 'storage.json');

  constructor() {
    this.initializeStorage();
  }

  private async initializeStorage() {
    try {
      // Ensure data directory exists
      await fs.mkdir(this.dataDir, { recursive: true });
      
      // Try to load existing data
      await this.loadFromFile();
      console.log('Loaded persistent data from file');
    } catch (error) {
      console.log('No existing data found, initializing with defaults');
      await this.initializeDefaults();
      await this.saveToFile();
    }
  }

  private async loadFromFile() {
    try {
      const data = await fs.readFile(this.dataFile, 'utf-8');
      const parsed: StorageData = JSON.parse(data);
      
      // Restore users
      parsed.users.forEach(user => {
        this.users.set(user.id, user);
        this.userByCode.set(user.code, user);
      });
      
      // Restore user assessments
      parsed.userAssessments.forEach(ua => {
        this.userAssessments.set(ua.id, ua);
        this.nextUserAssessmentId = Math.max(this.nextUserAssessmentId, ua.id + 1);
      });
      
      // Restore assessments
      parsed.assessments.forEach(assessment => {
        this.assessments.set(assessment.id, assessment);
      });
      
      // Restore injury types
      this.injuryTypes = parsed.injuryTypes || [];
      
      // Restore clinical users
      this.clinicalUsers = new Map();
      this.clinicalUsersByUsername = new Map();
      if (parsed.clinicalUsers) {
        parsed.clinicalUsers.forEach(user => {
          this.clinicalUsers.set(user.id, user);
          this.clinicalUsersByUsername.set(user.username, user);
        });
      }
      
      // If no clinical users found, create default ones
      if (this.clinicalUsers.size === 0) {
        console.log('No clinical users found in storage, creating defaults...');
        this.createDefaultClinicalUsers();
      }
      
      console.log(`Loaded ${parsed.users.length} users, ${parsed.userAssessments.length} user assessments, ${parsed.assessments.length} assessments, ${parsed.clinicalUsers?.length || 0} clinical users`);
    } catch (error) {
      throw new Error('Failed to load data file');
    }
  }

  private async saveToFile() {
    try {
      const data: StorageData = {
        users: Array.from(this.users.values()),
        userAssessments: Array.from(this.userAssessments.values()),
        assessments: Array.from(this.assessments.values()),
        injuryTypes: this.injuryTypes,
        clinicalUsers: Array.from(this.clinicalUsers.values())
      };
      
      await fs.writeFile(this.dataFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Failed to save data to file:', error);
    }
  }

  private async initializeDefaults() {
    // Create all assessments
    const assessments = [
      {
        id: 1,
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
        id: 2,
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
        id: 3,
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
        id: 4,
        name: 'Forearm Pronation/Supination',
        description: 'Assess forearm rotation capabilities',
        videoUrl: '/videos/forearm-rotation.mp4',
        duration: 10,
        repetitions: 1,
        instructions: 'Rotate your forearm to turn palm up and down while keeping elbow stable.',
        isActive: true,
        orderIndex: 4
      },
      {
        id: 5,
        name: 'Wrist Radial/Ulnar Deviation',
        description: 'Measure side-to-side wrist movement',
        videoUrl: '/videos/wrist-deviation.mp4',
        duration: 10,
        repetitions: 1,
        instructions: 'Move your wrist side to side, first toward thumb then toward pinky.',
        isActive: true,
        orderIndex: 5
      }
    ];

    assessments.forEach(assessment => {
      this.assessments.set(assessment.id, assessment);
    });

    // Create injury types matching overview page exactly
    this.injuryTypes = [
      { name: 'Trigger Finger', description: 'Finger tendon disorder' },
      { name: 'Carpal Tunnel', description: 'Nerve compression in the wrist' },
      { name: 'Distal Radius Fracture', description: 'Broken wrist bone' },
      { name: 'CMC Arthroplasty', description: 'Thumb joint replacement' },
      { name: 'Metacarpal ORIF', description: 'Hand bone surgical repair' },
      { name: 'Phalanx Fracture', description: 'Finger bone fracture' }
    ];

    // Create comprehensive user data including patient codes
    const predefinedUsers = [
      {
        id: 1,
        code: 'DEMO01',
        createdAt: new Date('2025-06-20T18:24:59.559Z'),
        isFirstTime: false,
        injuryType: 'Carpal Tunnel',
        studyStartDate: new Date('2025-06-20T18:24:59.559Z'),
        studyDurationDays: 28,
        studyEndDate: new Date('2025-07-18T18:24:59.559Z')
      },
      {
        id: 5,
        code: '000001',
        createdAt: new Date('2025-06-21T10:00:00.000Z'),
        isFirstTime: false,
        injuryType: 'Trigger Finger',
        studyStartDate: new Date('2025-06-21T10:00:00.000Z'),
        studyDurationDays: 28,
        studyEndDate: new Date('2025-07-19T10:00:00.000Z')
      },
      {
        id: 23,
        code: '421475',
        createdAt: new Date('2025-06-22T14:30:00.000Z'),
        isFirstTime: false,
        injuryType: 'Carpal Tunnel',
        studyStartDate: new Date('2025-06-22T14:30:00.000Z'),
        studyDurationDays: 84,
        studyEndDate: new Date('2025-09-14T14:30:00.000Z')
      },
      {
        id: 2,
        code: 'TEST01',
        createdAt: new Date('2025-06-19T10:30:00.000Z'),
        isFirstTime: true,
        injuryType: 'Trigger Finger',
        studyStartDate: new Date('2025-06-19T10:30:00.000Z'),
        studyDurationDays: 28,
        studyEndDate: new Date('2025-07-17T10:30:00.000Z')
      },
      {
        id: 3,
        code: 'ADMIN1',
        createdAt: new Date('2025-06-18T14:15:30.000Z'),
        isFirstTime: true,
        injuryType: 'Distal Radius Fracture',
        studyStartDate: new Date('2025-06-18T14:15:30.000Z'),
        studyDurationDays: 84,
        studyEndDate: new Date('2025-09-10T14:15:30.000Z')
      }
    ];
    
    predefinedUsers.forEach(user => {
      this.users.set(user.id, user);
      this.userByCode.set(user.code, user);
    });

      // Create comprehensive assessment history including the missing patient data
    const sampleAssessments = [
      // DEMO01 user assessments
      {
        id: 6,
        userId: 1,
        assessmentId: 3,
        assessmentName: 'Wrist Flexion/Extension',
        sessionNumber: 1,
        isCompleted: true,
        completedAt: new Date('2025-06-20T18:24:59.559Z'),
        completedOn: '2025-06-20',
        postOpDay: 1,
        qualityScore: 95,
        maxWristFlexion: 65,
        maxWristExtension: 58,
        wristFlexionAngle: 65,
        wristExtensionAngle: 58,
        handType: 'LEFT',
        shareToken: 'share_wrist_123',
        romData: {
          assessmentId: "3",
          repetitionsCompleted: 1,
          totalDuration: 10,
          averageQuality: 95
        },
        repetitionData: [{
          repetition: 1,
          duration: 10,
          landmarksDetected: 21,
          qualityScore: 95,
          timestamp: new Date().toISOString(),
          motionData: []
        }]
      },
      {
        id: 7,
        userId: 1,
        assessmentId: 2,
        assessmentName: 'Kapandji Score',
        sessionNumber: 1,
        isCompleted: true,
        completedAt: new Date('2025-06-19T15:30:00.000Z'),
        completedOn: '2025-06-19',
        postOpDay: 0,
        qualityScore: 88,
        totalActiveRom: 8,
        kapandjiScore: 8,
        maxThumbOpposition: 85,
        handType: 'LEFT',
        shareToken: 'share_kapandji_456',
        romData: {
          assessmentId: "2",
          repetitionsCompleted: 1,
          totalDuration: 10,
          averageQuality: 88
        }
      },
      // Patient 421475 comprehensive assessment data
      {
        id: 26,
        userId: 23,
        assessmentId: 1,
        assessmentName: 'TAM (Total Active Motion)',
        sessionNumber: 1,
        isCompleted: true,
        completedAt: new Date('2025-06-22T15:45:00.000Z'),
        completedOn: '2025-06-22',
        postOpDay: 0,
        qualityScore: 92,
        totalActiveRom: 245,
        indexFingerRom: 240,
        middleFingerRom: 248,
        ringFingerRom: 246,
        pinkyFingerRom: 245,
        handType: 'RIGHT',
        shareToken: 'share_tam_421475',
        romData: {
          assessmentId: "1",
          repetitionsCompleted: 5,
          totalDuration: 300,
          averageQuality: 92
        }
      },
      {
        id: 27,
        userId: 23,
        assessmentId: 2,
        assessmentName: 'Kapandji Score',
        sessionNumber: 1,
        isCompleted: true,
        completedAt: new Date('2025-06-22T16:15:00.000Z'),
        completedOn: '2025-06-22',
        postOpDay: 0,
        qualityScore: 89,
        kapandjiScore: 9,
        totalActiveRom: 9,
        handType: 'RIGHT',
        shareToken: 'share_kapandji_421475',
        romData: {
          assessmentId: "2",
          repetitionsCompleted: 1,
          totalDuration: 180,
          averageQuality: 89
        }
      },
      {
        id: 28,
        userId: 23,
        assessmentId: 3,
        assessmentName: 'Wrist Flexion/Extension',
        sessionNumber: 1,
        isCompleted: true,
        completedAt: new Date('2025-06-22T16:45:00.000Z'),
        completedOn: '2025-06-22',
        postOpDay: 0,
        qualityScore: 94,
        maxWristFlexion: 68,
        maxWristExtension: 62,
        wristFlexionAngle: 68,
        wristExtensionAngle: 62,
        handType: 'RIGHT',
        shareToken: 'share_wrist_421475',
        romData: {
          assessmentId: "3",
          repetitionsCompleted: 3,
          totalDuration: 240,
          averageQuality: 94
        }
      }
    ];

    sampleAssessments.forEach(assessment => {
      this.userAssessments.set(assessment.id, assessment);
      this.nextUserAssessmentId = Math.max(this.nextUserAssessmentId, assessment.id + 1);
    });

    // Initialize clinical users
    this.clinicalUsers = new Map();
    this.clinicalUsersByUsername = new Map();
    this.createDefaultClinicalUsers();

    // Initialize patients data to support patient lookup routes
    const patientsData = [
      {
        id: 5,
        patientId: '000001',
        alias: 'Patient 000001',
        accessCode: '000001',
        injuryType: 'Trigger Finger',
        cohortId: 1,
        status: 'active',
        isActive: true,
        createdAt: new Date('2025-06-21T10:00:00.000Z')
      },
      {
        id: 23,
        patientId: '421475',
        alias: 'Patient 421475',
        accessCode: '421475',
        injuryType: 'Carpal Tunnel',
        cohortId: 2,
        status: 'active',
        isActive: true,
        createdAt: new Date('2025-06-22T14:30:00.000Z')
      }
    ];
    
    patientsData.forEach(patient => {
      this.patients.set(patient.id, patient);
    });

    console.log('Memory storage initialized with 5 assessments, comprehensive patient data, and 3 clinical users');
  }

  private createDefaultClinicalUsers() {
    const clinicalUsers = [
      {
        id: 1,
        username: 'admin',
        password: 'admin123',
        email: 'admin@clinic.com',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        isActive: true,
        createdAt: new Date()
      },
      {
        id: 2,
        username: 'dr.smith',
        password: 'password123',
        email: 'dr.smith@clinic.com',
        firstName: 'Dr. John',
        lastName: 'Smith',
        role: 'clinician',
        isActive: true,
        createdAt: new Date()
      },
      {
        id: 3,
        username: 'researcher1',
        password: 'research123',
        email: 'researcher@clinic.com',
        firstName: 'Research',
        lastName: 'Staff',
        role: 'researcher',
        isActive: true,
        createdAt: new Date()
      }
    ];

    clinicalUsers.forEach(user => {
      this.clinicalUsers.set(user.id, user);
      this.clinicalUsersByUsername.set(user.username, user);
    });
    
    // Save to file immediately
    this.saveToFile().catch(console.error);
  }

  // API Methods with auto-save
  async getAssessments(): Promise<any[]> {
    return [
      { 
        id: 1, 
        name: 'TAM (Total Active Motion)', 
        description: 'Measures finger range of motion', 
        duration: 300, 
        orderIndex: 1, 
        isActive: true, 
        instructions: 'Follow finger movements shown on screen', 
        videoUrl: null, 
        repetitions: 5,
        injuryTypes: ['Trigger Finger', 'Carpal Tunnel', 'Distal Radius Fracture', 'CMC Arthroplasty', 'Metacarpal ORIF', 'Phalanx Fracture']
      },
      { 
        id: 2, 
        name: 'Kapandji Score', 
        description: 'Thumb opposition assessment', 
        duration: 180, 
        orderIndex: 2, 
        isActive: true, 
        instructions: 'Touch thumb to fingertips as shown', 
        videoUrl: null, 
        repetitions: 1,
        injuryTypes: ['Carpal Tunnel', 'Distal Radius Fracture', 'CMC Arthroplasty']
      },
      { 
        id: 3, 
        name: 'Wrist Flexion/Extension', 
        description: 'Wrist range of motion measurement', 
        duration: 240, 
        orderIndex: 3, 
        isActive: true, 
        instructions: 'Move wrist up and down as demonstrated', 
        videoUrl: null, 
        repetitions: 3,
        injuryTypes: ['Carpal Tunnel', 'Distal Radius Fracture', 'CMC Arthroplasty']
      },
      { 
        id: 4, 
        name: 'Forearm Pronation/Supination', 
        description: 'Forearm rotation assessment', 
        duration: 200, 
        orderIndex: 4, 
        isActive: true, 
        instructions: 'Rotate forearm as shown in demonstration', 
        videoUrl: null, 
        repetitions: 3,
        injuryTypes: ['Carpal Tunnel', 'Distal Radius Fracture', 'CMC Arthroplasty']
      },
      { 
        id: 5, 
        name: 'Wrist Radial/Ulnar Deviation', 
        description: 'Side-to-side wrist movement', 
        duration: 220, 
        orderIndex: 5, 
        isActive: true, 
        instructions: 'Move wrist side to side following the guide', 
        videoUrl: null, 
        repetitions: 3,
        injuryTypes: ['Carpal Tunnel', 'Distal Radius Fracture', 'CMC Arthroplasty']
      },
      { 
        id: 6, 
        name: 'DASH Survey', 
        description: 'Disabilities of the Arm, Shoulder and Hand questionnaire', 
        duration: 600, 
        orderIndex: 6, 
        isActive: true, 
        instructions: 'Complete the DASH questionnaire about your arm, shoulder and hand function', 
        videoUrl: null, 
        repetitions: 1,
        injuryTypes: ['Trigger Finger', 'Carpal Tunnel', 'Distal Radius Fracture', 'CMC Arthroplasty', 'Metacarpal ORIF', 'Phalanx Fracture']
      }
    ];
  }

  async getAssessment(id: number): Promise<any> {
    return this.assessments.get(id);
  }

  async getUserByCode(code: string): Promise<any> {
    const user = this.userByCode.get(code);
    console.log(`Persistent storage getUserByCode(${code}) returning:`, user ? 'found' : 'not found');
    return user;
  }

  async createUser(userData: any): Promise<any> {
    // Allow creation of users with any access code (including demo codes)
    if (!userData.code) {
      console.log(`Persistent storage createUser rejected missing code`);
      return null;
    }
    
    // Check if user has a corresponding patient record with injury type
    let injuryType = userData.injuryType || null;
    
    // Look for patient record by access code to get injury type
    const patientWithCode = Array.from(this.patients.values()).find(p => p.accessCode === userData.code);
    if (patientWithCode && patientWithCode.injuryType) {
      injuryType = patientWithCode.injuryType;
      console.log(`Found patient record for code ${userData.code} with injury type: ${injuryType}`);
    } else {
      console.log(`No patient record found for code ${userData.code}, checked ${this.patients.size} patients`);
    }
    
    const newUser = {
      id: this.users.size > 0 ? Math.max(...Array.from(this.users.keys())) + 1 : 1,
      ...userData,
      injuryType,
      createdAt: new Date(),
      isFirstTime: true
    };
    this.users.set(newUser.id, newUser);
    this.userByCode.set(newUser.code, newUser);
    await this.saveToFile();
    console.log(`Persistent storage createUser created user with code: ${newUser.code}, injury type: ${injuryType}`);
    return newUser;
  }

  async getUserById(id: number): Promise<any> {
    return this.users.get(id);
  }

  async updateUser(id: number, updates: any): Promise<any> {
    const user = this.users.get(id);
    if (user) {
      const updatedUser = { ...user, ...updates };
      this.users.set(id, updatedUser);
      this.userByCode.set(updatedUser.code, updatedUser);
      await this.saveToFile();
      return updatedUser;
    }
    return null;
  }

  async createUserAssessment(data: any): Promise<any> {
    const userAssessment = {
      id: this.nextUserAssessmentId++,
      ...data,
      createdAt: new Date()
    };
    this.userAssessments.set(userAssessment.id, userAssessment);
    await this.saveToFile();
    return userAssessment;
  }

  async updateUserAssessment(id: number, updates: any): Promise<any> {
    const userAssessment = this.userAssessments.get(id);
    if (userAssessment) {
      const updated = { ...userAssessment, ...updates };
      this.userAssessments.set(id, updated);
      await this.saveToFile();
      return updated;
    }
    return null;
  }

  async getUserAssessmentById(id: number): Promise<any> {
    return this.userAssessments.get(id);
  }

  async getUserAssessments(userId: number): Promise<any[]> {
    const assessments = Array.from(this.userAssessments.values())
      .filter(ua => ua.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    console.log(`Persistent storage getUserAssessments(${userId}) returning:`, assessments.length, 'assessments');
    return assessments;
  }

  async getUserProgress(userId: number): Promise<any> {
    const user = this.users.get(userId);
    if (!user) return { completed: 0, total: 0, percentage: 0, studyDay: 0, daysRemaining: 0 };

    const userAssessments = await this.getUserAssessments(userId);
    const today = new Date().toISOString().split('T')[0];
    const completedToday = userAssessments.filter(ua => ua.completedOn === today);
    
    const totalAssessments = user.injuryType 
      ? await this.getAssessmentsForInjuryType(user.injuryType)
      : await this.getAssessments();

    // Calculate study progress
    const studyStartDate = new Date(user.studyStartDate || user.createdAt);
    const currentDate = new Date();
    const studyDay = Math.floor((currentDate.getTime() - studyStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const daysRemaining = Math.max(0, (user.studyDurationDays || 28) - studyDay + 1);

    return {
      completed: completedToday.length,
      total: totalAssessments.length,
      percentage: totalAssessments.length > 0 ? Math.round((completedToday.length / totalAssessments.length) * 100) : 0,
      studyDay: Math.max(1, studyDay),
      daysRemaining,
      totalStudyDays: user.studyDurationDays || 28
    };
  }

  async getAssessmentsForInjuryType(injuryType: string): Promise<any[]> {
    const allAssessments = await this.getAssessments();
    // Assessment mapping based on overview page data
    const injuryAssessmentMap: Record<string, string[]> = {
      "Trigger Finger": ["TAM (Total Active Motion)"],
      "Carpal Tunnel": ["TAM (Total Active Motion)", "Kapandji Score", "Wrist Flexion/Extension", "Forearm Pronation/Supination", "Wrist Radial/Ulnar Deviation"],
      "Distal Radius Fracture": ["TAM (Total Active Motion)", "Kapandji Score", "Wrist Flexion/Extension", "Forearm Pronation/Supination", "Wrist Radial/Ulnar Deviation"],
      "CMC Arthroplasty": ["TAM (Total Active Motion)", "Kapandji Score", "Wrist Flexion/Extension", "Forearm Pronation/Supination", "Wrist Radial/Ulnar Deviation"],
      "Metacarpal ORIF": ["TAM (Total Active Motion)"],
      "Phalanx Fracture": ["TAM (Total Active Motion)"]
    };

    const requiredAssessments = injuryAssessmentMap[injuryType] || ["TAM (Total Active Motion)"];
    const assessments = allAssessments.filter(assessment => 
      requiredAssessments.includes(assessment.name)
    );
    
    console.log(`Persistent storage getAssessmentsForInjuryType(${injuryType}) returning:`, assessments.length, 'assessments');
    return assessments;
  }

  async getTodaysAssessments(userId: number): Promise<any[]> {
    const user = this.users.get(userId);
    if (!user) return [];

    const today = new Date().toISOString().split('T')[0];
    const assessments = await this.getAssessmentsForInjuryType(user.injuryType || 'Carpal Tunnel');
    const userAssessments = await this.getUserAssessments(userId);
    
    const completedToday = userAssessments.filter(ua => ua.completedOn === today);
    
    return assessments.map(assessment => {
      const completedAssessment = completedToday.find(ua => ua.assessmentId === assessment.id);
      return {
        ...assessment,
        status: completedAssessment ? 'completed' : 'due_today',
        completedAt: completedAssessment?.completedAt,
        lastScore: completedAssessment?.totalActiveRom || completedAssessment?.wristFlexionAngle || null,
        lastUserAssessmentId: completedAssessment?.id
      };
    });
  }

  async canCompleteAssessment(userId: number, assessmentId: number): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];
    const userAssessments = await this.getUserAssessments(userId);
    
    const completedToday = userAssessments.some(ua => 
      ua.assessmentId === assessmentId && ua.completedOn === today
    );
    
    return !completedToday;
  }

  async getInjuryTypes(): Promise<any[]> {
    return [
      { name: 'Trigger Finger', description: 'Finger tendon disorder', assessmentCount: 1 },
      { name: 'Carpal Tunnel', description: 'Nerve compression in the wrist', assessmentCount: 5 },
      { name: 'Distal Radius Fracture', description: 'Broken wrist bone', assessmentCount: 5 },
      { name: 'CMC Arthroplasty', description: 'Thumb joint replacement', assessmentCount: 5 },
      { name: 'Metacarpal ORIF', description: 'Hand bone surgical repair', assessmentCount: 1 },
      { name: 'Phalanx Fracture', description: 'Finger bone fracture', assessmentCount: 1 }
    ];
  }

  // Clinical Authentication Methods
  async authenticateClinicalUser(username: string, password: string): Promise<any> {
    console.log(`PersistentMemoryStorage authenticateClinicalUser(${username})`);
    console.log(`Available clinical users:`, Array.from(this.clinicalUsersByUsername.keys()));
    const user = this.clinicalUsersByUsername.get(username);
    console.log(`Found user:`, user ? 'yes' : 'no');
    if (user) {
      console.log(`Password match:`, user.password === password);
      console.log(`User active:`, user.isActive);
    }
    if (user && user.password === password && user.isActive) {
      console.log(`Clinical authentication successful for user: ${username}`);
      return user;
    }
    console.log(`Clinical authentication failed for user: ${username}`);
    return null;
  }

  async getClinicalUser(id: number): Promise<any> {
    return this.clinicalUsers.get(id);
  }

  async getClinicalUserByUsername(username: string): Promise<any> {
    return this.clinicalUsersByUsername.get(username);
  }

  async createClinicalUser(userData: any): Promise<any> {
    const newUser = {
      id: this.clinicalUsers.size > 0 ? Math.max(...Array.from(this.clinicalUsers.keys())) + 1 : 1,
      ...userData,
      createdAt: new Date(),
      isActive: true
    };
    this.clinicalUsers.set(newUser.id, newUser);
    this.clinicalUsersByUsername.set(newUser.username, newUser);
    await this.saveToFile();
    return newUser;
  }

  async updateClinicalUser(id: number, updates: any): Promise<any> {
    const user = this.clinicalUsers.get(id);
    if (user) {
      const updatedUser = { ...user, ...updates };
      this.clinicalUsers.set(id, updatedUser);
      this.clinicalUsersByUsername.set(updatedUser.username, updatedUser);
      await this.saveToFile();
      return updatedUser;
    }
    return null;
  }

  // Clinical Dashboard Methods (basic implementations)
  async getCohorts(): Promise<any[]> {
    return [
      { id: 1, name: 'Trigger Finger Study', description: 'Finger tendon disorder research', patientCount: 25, status: 'active', injuryType: 'Trigger Finger' },
      { id: 2, name: 'Carpal Tunnel Study', description: 'Nerve compression in the wrist research', patientCount: 32, status: 'active', injuryType: 'Carpal Tunnel' },
      { id: 3, name: 'Distal Radius Fracture Study', description: 'Broken wrist bone recovery research', patientCount: 28, status: 'active', injuryType: 'Distal Radius Fracture' },
      { id: 4, name: 'CMC Arthroplasty Study', description: 'Thumb joint replacement research', patientCount: 20, status: 'active', injuryType: 'CMC Arthroplasty' },
      { id: 5, name: 'Metacarpal ORIF Study', description: 'Hand bone surgical repair research', patientCount: 15, status: 'active', injuryType: 'Metacarpal ORIF' },
      { id: 6, name: 'Phalanx Fracture Study', description: 'Finger bone fracture research', patientCount: 18, status: 'active', injuryType: 'Phalanx Fracture' }
    ];
  }

  private getCohortInjuryType(cohortId: number): string | null {
    const cohortMap = {
      1: 'Trigger Finger',
      2: 'Carpal Tunnel', 
      3: 'Distal Radius Fracture',
      4: 'CMC Arthroplasty',
      5: 'Metacarpal ORIF',
      6: 'Phalanx Fracture'
    };
    return cohortMap[cohortId] || null;
  }

  async getPatients(): Promise<any[]> {
    const now = new Date();
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    
    return [
      { 
        id: 1, 
        patientId: 'PT001', 
        alias: 'Patient A', 
        status: 'improving', 
        lastAssessment: now.toISOString(),
        assessmentCount: 5,
        ageGroup: '45-54',
        sex: 'F',
        handDominance: 'RIGHT',
        injuryType: 'Carpal Tunnel',
        enrollmentDate: twoWeeksAgo.toISOString(),
        cohortId: 1
      },
      { 
        id: 2, 
        patientId: 'PT002', 
        alias: 'Patient B', 
        status: 'stable', 
        lastAssessment: lastWeek.toISOString(),
        assessmentCount: 3,
        ageGroup: '35-44',
        sex: 'M',
        handDominance: 'LEFT',
        injuryType: 'Tennis Elbow',
        enrollmentDate: twoWeeksAgo.toISOString(),
        cohortId: 2
      },
      { 
        id: 3, 
        patientId: 'PT003', 
        alias: 'Patient C', 
        status: 'declining', 
        lastAssessment: twoWeeksAgo.toISOString(),
        assessmentCount: 2,
        ageGroup: '55-64',
        sex: 'F',
        handDominance: 'RIGHT',
        injuryType: 'Trigger Finger',
        enrollmentDate: twoWeeksAgo.toISOString(),
        cohortId: 3
      }
    ];
  }

  async getAlerts(): Promise<any[]> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    return [
      {
        id: 1,
        patientId: 'PT003',
        patientAlias: 'Patient C',
        severity: 'critical',
        type: 'declining_performance',
        message: 'Patient showing significant decrease in ROM scores over last 2 assessments',
        createdAt: oneHourAgo.toISOString(),
        isResolved: false
      },
      {
        id: 2,
        patientId: 'PT002',
        patientAlias: 'Patient B',
        severity: 'warning',
        type: 'missed_assessment',
        message: 'Patient has not completed assessment in 7 days',
        createdAt: now.toISOString(),
        isResolved: false
      }
    ];
  }

  async createAuditLog(logData: any): Promise<any> {
    // Simple audit log implementation
    console.log('Audit Log:', logData);
    return { id: Date.now(), ...logData, timestamp: new Date() };
  }

  async createCohort(cohortData: any): Promise<any> {
    return { id: Date.now(), ...cohortData, createdAt: new Date() };
  }

  async updateCohort(id: number, updates: any): Promise<any> {
    return { id, ...updates, updatedAt: new Date() };
  }

  async createPatient(patientData: any): Promise<any> {
    const injuryType = this.getCohortInjuryType(patientData.cohortId);
    
    const patient = { 
      id: Date.now(), 
      ...patientData, 
      injuryType,
      createdAt: new Date(),
      isActive: true,
      enrolledInStudy: false,
      enrollmentStatus: 'pending'
    };
    
    // Store in patients map for eligibility checks
    this.patients.set(patient.id, patient);
    await this.saveToFile();
    
    return patient;
  }

  async updatePatient(id: number, updates: any): Promise<any> {
    return { id, ...updates, updatedAt: new Date() };
  }

  async getDashboardMetrics(): Promise<any> {
    return {
      totalPatients: 3,
      activeStudies: 2,
      completedAssessments: 10,
      averageAdherence: 85
    };
  }

  async getPatientDashboardData(): Promise<any> {
    return {
      recentActivity: [
        { id: 1, type: 'assessment_completed', message: 'Patient A completed TAM assessment', timestamp: new Date() },
        { id: 2, type: 'patient_enrolled', message: 'Patient D enrolled in study', timestamp: new Date() }
      ],
      performanceMetrics: {
        weeklyAdherence: 88,
        assessmentCompletion: 92,
        dataQuality: 95
      }
    };
  }

  async checkEligibility(patientId: number, cohortId: number): Promise<{ eligible: boolean; reasons: string[] }> {
    console.log(`Looking for patient ${patientId} in patients map with ${this.patients.size} entries`);
    const patient = this.patients.get(patientId);
    
    if (!patient) {
      console.log(`Patient ${patientId} not found in patients map`);
      return { eligible: false, reasons: ['Patient not found'] };
    }

    console.log(`Found patient:`, patient);
    const reasons: string[] = [];
    
    // Check if already enrolled in another study
    if (patient.enrolledInStudy && patient.cohortId && patient.cohortId !== cohortId) {
      reasons.push('Patient already enrolled in another study');
    }
    
    // Check enrollment status
    if (patient.enrollmentStatus === 'excluded') {
      reasons.push('Patient previously excluded from studies');
    }
    
    if (patient.enrollmentStatus === 'withdrawn') {
      reasons.push('Patient previously withdrew from studies');
    }

    // Check if patient is active
    if (patient.isActive === false) {
      reasons.push('Patient account is inactive');
    }

    const result = { eligible: reasons.length === 0, reasons };
    console.log(`Eligibility result:`, result);
    return result;
  }

  async enrollPatient(enrollmentData: any): Promise<any> {
    const patient = this.patients.get(enrollmentData.patientId);
    
    if (!patient) {
      throw new Error('Patient not found');
    }

    const updatedPatient = {
      ...patient,
      enrolledInStudy: true,
      enrollmentStatus: enrollmentData.enrollmentStatus,
      cohortId: enrollmentData.cohortId,
      eligibilityNotes: enrollmentData.eligibilityNotes,
      studyEnrollmentDate: new Date()
    };

    this.patients.set(enrollmentData.patientId, updatedPatient);
    await this.saveToFile();
    
    return updatedPatient;
  }

  async getTodaysAssessments(userId: number): Promise<any> {
    const user = this.users.get(userId);
    if (!user) {
      return { assessments: [] };
    }

    const userAssessments = this.userAssessments.get(userId) || [];
    const today = new Date().toDateString();

    // Get all assessments for user's injury type
    let availableAssessments = [];
    if (user.injuryType) {
      availableAssessments = await this.getAssessmentsForInjuryType(user.injuryType);
    } else {
      availableAssessments = Array.from(this.assessments.values());
    }

    // Mark assessments as completed if done today
    const assessmentsWithStatus = availableAssessments.map(assessment => {
      const todayCompletion = userAssessments.find(ua => 
        ua.assessmentId === assessment.id && 
        new Date(ua.completedAt).toDateString() === today
      );

      return {
        ...assessment,
        isCompleted: !!todayCompletion,
        completedAt: todayCompletion?.completedAt,
        status: todayCompletion ? 'completed' : 'due_today',
        userAssessmentId: todayCompletion?.id
      };
    });

    return { assessments: assessmentsWithStatus };
  }
}