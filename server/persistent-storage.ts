import fs from 'fs/promises';
import path from 'path';

interface StorageData {
  users: Array<{ id: number; [key: string]: any }>;
  userAssessments: Array<{ id: number; [key: string]: any }>;
  assessments: Array<{ id: number; [key: string]: any }>;
  injuryTypes: Array<{ [key: string]: any }>;
}

export class PersistentMemoryStorage {
  private users = new Map<number, any>();
  private userByCode = new Map<string, any>();
  private userAssessments = new Map<number, any>();
  private assessments = new Map<number, any>();
  private injuryTypes: any[] = [];
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
      
      console.log(`Loaded ${parsed.users.length} users, ${parsed.userAssessments.length} user assessments, ${parsed.assessments.length} assessments`);
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
        injuryTypes: this.injuryTypes
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

    console.log('Memory storage initialized with 5 assessments and sample completed data');
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
    // Only allow creation of users with valid access codes
    const validCodes = ['DEMO01', 'TEST01', 'ADMIN1']; // Define valid access codes
    
    if (!validCodes.includes(userData.code)) {
      console.log(`Persistent storage createUser rejected invalid code: ${userData.code}`);
      return null;
    }
    
    const newUser = {
      id: Math.max(...Array.from(this.users.keys())) + 1,
      ...userData,
      createdAt: new Date(),
      isFirstTime: true
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
}