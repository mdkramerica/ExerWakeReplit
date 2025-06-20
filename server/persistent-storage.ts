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

    // Create injury types
    this.injuryTypes = [
      { name: 'Carpal Tunnel', description: 'Median nerve compression requiring comprehensive assessment' },
      { name: 'Tennis Elbow', description: 'Lateral epicondylitis affecting forearm and wrist' },
      { name: 'Golfer\'s Elbow', description: 'Medial epicondylitis affecting grip and wrist motion' },
      { name: 'Trigger Finger', description: 'Stenosing tenosynovitis affecting finger flexion' }
    ];

    // Create demo user and test users
    const predefinedUsers = [
      {
        id: 1,
        code: 'DEMO01',
        createdAt: new Date(),
        isFirstTime: false,
        injuryType: 'Carpal Tunnel'
      },
      {
        id: 2,
        code: 'TEST01',
        createdAt: new Date(),
        isFirstTime: true,
        injuryType: null
      },
      {
        id: 3,
        code: 'ADMIN1',
        createdAt: new Date(),
        isFirstTime: true,
        injuryType: null
      }
    ];
    
    predefinedUsers.forEach(user => {
      this.users.set(user.id, user);
      this.userByCode.set(user.code, user);
    });

    // Create sample completed assessments for demonstration
    const sampleAssessments = [
      {
        id: 6,
        userId: 1,
        assessmentId: 3,
        sessionNumber: 1,
        isCompleted: true,
        completedAt: new Date().toISOString(),
        qualityScore: 95,
        maxWristFlexion: 65,
        maxWristExtension: 58,
        wristFlexionAngle: 65,
        wristExtensionAngle: 58,
        handType: 'LEFT',
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
        sessionNumber: 1,
        isCompleted: true,
        completedAt: new Date().toISOString(),
        qualityScore: 88,
        kapandjiScore: 8,
        maxThumbOpposition: 85,
        handType: 'LEFT',
        romData: {
          assessmentId: "2",
          repetitionsCompleted: 1,
          totalDuration: 10,
          averageQuality: 88
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

    console.log('Memory storage initialized with 5 assessments, sample completed data, and 3 clinical users');
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
    return Array.from(this.assessments.values()).filter(a => a.isActive);
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
    // Allow creation of users with any 6-digit access code
    if (!userData.code || userData.code.length !== 6) {
      console.log(`Persistent storage createUser rejected invalid code format: ${userData.code}`);
      return null;
    }
    
    const newUser = {
      id: this.users.size > 0 ? Math.max(...Array.from(this.users.keys())) + 1 : 1,
      ...userData,
      createdAt: new Date(),
      isFirstTime: true,
      injuryType: null
    };
    this.users.set(newUser.id, newUser);
    this.userByCode.set(newUser.code, newUser);
    await this.saveToFile();
    console.log(`Persistent storage createUser created user with code: ${newUser.code}`);
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
    if (!user) return { completed: 0, total: 0, percentage: 0 };

    const userAssessments = await this.getUserAssessments(userId);
    const completedAssessments = userAssessments.filter(ua => ua.completedAt);
    
    const totalAssessments = user.injuryType 
      ? await this.getAssessmentsForInjuryType(user.injuryType)
      : await this.getAssessments();

    return {
      completed: completedAssessments.length,
      total: totalAssessments.length,
      percentage: Math.round((completedAssessments.length / totalAssessments.length) * 100)
    };
  }

  async getAssessmentsForInjuryType(injuryType: string): Promise<any[]> {
    // For now, return all assessments regardless of injury type
    const assessments = await this.getAssessments();
    console.log(`Persistent storage getAssessmentsForInjuryType(${injuryType}) returning:`, assessments.length, 'assessments');
    return assessments;
  }

  async getInjuryTypes(): Promise<any[]> {
    return this.injuryTypes;
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
      { id: 1, name: 'Carpal Tunnel Study', patientCount: 25, status: 'active' },
      { id: 2, name: 'Tennis Elbow Research', patientCount: 18, status: 'active' },
      { id: 3, name: 'Trigger Finger Analysis', patientCount: 12, status: 'completed' }
    ];
  }

  async getPatients(): Promise<any[]> {
    return [
      { id: 1, patientId: 'PT001', alias: 'Patient A', status: 'improving', lastAssessment: new Date() },
      { id: 2, patientId: 'PT002', alias: 'Patient B', status: 'stable', lastAssessment: new Date() },
      { id: 3, patientId: 'PT003', alias: 'Patient C', status: 'declining', lastAssessment: new Date() }
    ];
  }

  async createAuditLog(logData: any): Promise<any> {
    // Simple audit log implementation
    console.log('Audit Log:', logData);
    return { id: Date.now(), ...logData, timestamp: new Date() };
  }
}