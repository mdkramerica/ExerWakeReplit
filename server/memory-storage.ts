// In-memory storage fallback when database is unavailable
export class MemoryStorage {
  private users = new Map<number, any>();
  private userByCode = new Map<string, any>();
  private assessments = new Map<number, any>();
  private userAssessments = new Map<number, any>();
  private injuryTypeAssessments = new Map<string, any>();
  private nextUserAssessmentId = 1;

  constructor() {
    this.initializeDemoData();
  }

  private initializeDemoData() {
    // Create demo user
    const demoUser = {
      id: 1,
      code: 'DEMO01',
      createdAt: new Date(),
      isFirstTime: false,
      injuryType: 'Carpal Tunnel'
    };
    this.users.set(1, demoUser);
    this.userByCode.set('DEMO01', demoUser);

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

    // Create injury type mappings
    const injuryMappings = [
      // Carpal Tunnel - all assessments
      { injuryType: 'Carpal Tunnel', assessmentId: 1, isRequired: true, displayOrder: 1 },
      { injuryType: 'Carpal Tunnel', assessmentId: 2, isRequired: true, displayOrder: 2 },
      { injuryType: 'Carpal Tunnel', assessmentId: 3, isRequired: true, displayOrder: 3 },
      { injuryType: 'Carpal Tunnel', assessmentId: 4, isRequired: true, displayOrder: 4 },
      { injuryType: 'Carpal Tunnel', assessmentId: 5, isRequired: true, displayOrder: 5 },
      // Tennis Elbow
      { injuryType: 'Tennis Elbow', assessmentId: 1, isRequired: true, displayOrder: 1 },
      { injuryType: 'Tennis Elbow', assessmentId: 3, isRequired: true, displayOrder: 2 },
      // Golfer's Elbow
      { injuryType: 'Golfer\'s Elbow', assessmentId: 1, isRequired: true, displayOrder: 1 },
      { injuryType: 'Golfer\'s Elbow', assessmentId: 3, isRequired: true, displayOrder: 2 },
      // Trigger Finger
      { injuryType: 'Trigger Finger', assessmentId: 1, isRequired: true, displayOrder: 1 },
      { injuryType: 'Trigger Finger', assessmentId: 2, isRequired: true, displayOrder: 2 }
    ];

    injuryMappings.forEach(mapping => {
      const key = `${mapping.injuryType}:${mapping.assessmentId}`;
      this.injuryTypeAssessments.set(key, mapping);
    });
    
    console.log('Memory storage initialized with', assessments.length, 'assessments and', injuryMappings.length, 'injury mappings');
  }

  async getAssessments(): Promise<any[]> {
    const allAssessments = Array.from(this.assessments.values())
      .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
    console.log('Memory storage getAssessments returning:', allAssessments.length, 'assessments');
    return allAssessments;
  }

  async getAssessmentsForInjuryType(injuryType: string): Promise<any[]> {
    const mappings = Array.from(this.injuryTypeAssessments.values())
      .filter(mapping => mapping.injuryType === injuryType)
      .sort((a, b) => a.displayOrder - b.displayOrder);
    
    const assessments = mappings.map(mapping => {
      const assessment = this.assessments.get(mapping.assessmentId);
      return {
        ...assessment,
        isRequired: mapping.isRequired,
        displayOrder: mapping.displayOrder
      };
    }).filter(Boolean);
    
    console.log(`Memory storage getAssessmentsForInjuryType(${injuryType}) returning:`, assessments.length, 'assessments');
    return assessments;
  }

  async getAssessment(id: number): Promise<any> {
    return this.assessments.get(id);
  }

  async getUserByCode(code: string): Promise<any> {
    const user = this.userByCode.get(code);
    console.log(`Memory storage getUserByCode(${code}) returning:`, user ? 'found' : 'not found');
    return user;
  }

  async createUser(userData: any): Promise<any> {
    const newUser = {
      id: Math.max(...Array.from(this.users.keys())) + 1,
      ...userData,
      createdAt: new Date(),
      isFirstTime: true
    };
    this.users.set(newUser.id, newUser);
    this.userByCode.set(newUser.code, newUser);
    console.log(`Memory storage createUser created user with code: ${newUser.code}`);
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
    return userAssessment;
  }

  async updateUserAssessment(id: number, updates: any): Promise<any> {
    const userAssessment = this.userAssessments.get(id);
    if (userAssessment) {
      const updated = { ...userAssessment, ...updates };
      this.userAssessments.set(id, updated);
      return updated;
    }
    return null;
  }

  async getUserAssessmentById(id: number): Promise<any> {
    return this.userAssessments.get(id);
  }

  async getUserAssessments(userId: number): Promise<any[]> {
    return Array.from(this.userAssessments.values())
      .filter(ua => ua.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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

  // Clinical dashboard methods (minimal implementation)
  async authenticateClinicalUser(): Promise<any> { return null; }
  async getCohorts(): Promise<any[]> { return []; }
  async getPatients(): Promise<any[]> { return []; }
  async createAuditLog(): Promise<any> { return null; }
}