import { 
  users, 
  assessments, 
  userAssessments, 
  injuryTypes,
  type User, 
  type InsertUser,
  type Assessment,
  type InsertAssessment,
  type UserAssessment,
  type InsertUserAssessment,
  type InjuryType,
  type InsertInjuryType
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByCode(code: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  
  // Assessment methods
  getAssessments(): Promise<Assessment[]>;
  getAssessmentsForInjury(injuryType: string): Promise<Assessment[]>;
  getAssessment(id: number): Promise<Assessment | undefined>;
  createAssessment(assessment: InsertAssessment): Promise<Assessment>;
  
  // User Assessment methods
  getUserAssessments(userId: number): Promise<UserAssessment[]>;
  getUserAssessment(userId: number, assessmentId: number): Promise<UserAssessment | undefined>;
  createUserAssessment(userAssessment: InsertUserAssessment): Promise<UserAssessment>;
  updateUserAssessment(id: number, updates: Partial<UserAssessment>): Promise<UserAssessment | undefined>;
  
  // Injury Type methods
  getInjuryTypes(): Promise<InjuryType[]>;
  createInjuryType(injuryType: InsertInjuryType): Promise<InjuryType>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByCode(code: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.code, code));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async getAssessments(): Promise<Assessment[]> {
    return await db.select().from(assessments).where(eq(assessments.isActive, true));
  }

  async getAssessmentsForInjury(injuryType: string): Promise<Assessment[]> {
    const allAssessments = await db.select().from(assessments).where(eq(assessments.isActive, true));
    
    // Define which assessments are needed for each injury type
    const injuryAssessmentMap: Record<string, string[]> = {
      "Trigger Finger": ["TAM (Total Active Motion)"],
      "Carpal Tunnel": ["TAM (Total Active Motion)", "Kapandji Score", "Wrist Flexion/Extension", "Forearm Pronation/Supination", "Wrist Radial/Ulnar Deviation"],
      "Distal Radius Fracture": ["TAM (Total Active Motion)", "Kapandji Score", "Wrist Flexion/Extension", "Forearm Pronation/Supination", "Wrist Radial/Ulnar Deviation"],
      "CMC Arthroplasty": ["TAM (Total Active Motion)", "Kapandji Score", "Wrist Flexion/Extension", "Forearm Pronation/Supination", "Wrist Radial/Ulnar Deviation"],
      "Metacarpal ORIF": ["TAM (Total Active Motion)"],
      "Phalanx Fracture": ["TAM (Total Active Motion)"],
      "Radial Head Replacement": ["TAM (Total Active Motion)", "Kapandji Score", "Wrist Flexion/Extension", "Forearm Pronation/Supination", "Wrist Radial/Ulnar Deviation"],
      "Terrible Triad Injury": ["TAM (Total Active Motion)", "Kapandji Score", "Wrist Flexion/Extension", "Forearm Pronation/Supination", "Wrist Radial/Ulnar Deviation"],
      "Dupuytren's Contracture": ["TAM (Total Active Motion)"],
      "Flexor Tendon Injury": ["TAM (Total Active Motion)"],
      "Extensor Tendon Injury": ["TAM (Total Active Motion)"]
    };

    const requiredAssessments = injuryAssessmentMap[injuryType] || ["TAM (Total Active Motion)"];
    return allAssessments.filter(assessment => requiredAssessments.includes(assessment.name));
  }

  async getAssessment(id: number): Promise<Assessment | undefined> {
    const [assessment] = await db.select().from(assessments).where(eq(assessments.id, id));
    return assessment || undefined;
  }

  async createAssessment(insertAssessment: InsertAssessment): Promise<Assessment> {
    const [assessment] = await db
      .insert(assessments)
      .values(insertAssessment)
      .returning();
    return assessment;
  }

  async getUserAssessments(userId: number): Promise<UserAssessment[]> {
    return await db.select().from(userAssessments).where(eq(userAssessments.userId, userId));
  }

  async getUserAssessment(userId: number, assessmentId: number): Promise<UserAssessment | undefined> {
    const results = await db
      .select()
      .from(userAssessments)
      .where(eq(userAssessments.userId, userId));
    return results.find(ua => ua.assessmentId === assessmentId) || undefined;
  }

  async createUserAssessment(insertUserAssessment: InsertUserAssessment): Promise<UserAssessment> {
    const [userAssessment] = await db
      .insert(userAssessments)
      .values(insertUserAssessment)
      .returning();
    return userAssessment;
  }

  async updateUserAssessment(id: number, updates: Partial<UserAssessment>): Promise<UserAssessment | undefined> {
    const [userAssessment] = await db
      .update(userAssessments)
      .set(updates)
      .where(eq(userAssessments.id, id))
      .returning();
    return userAssessment || undefined;
  }

  async getInjuryTypes(): Promise<InjuryType[]> {
    return await db.select().from(injuryTypes);
  }

  async createInjuryType(insertInjuryType: InsertInjuryType): Promise<InjuryType> {
    const [injuryType] = await db
      .insert(injuryTypes)
      .values(insertInjuryType)
      .returning();
    return injuryType;
  }
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private assessments: Map<number, Assessment>;
  private userAssessments: Map<number, UserAssessment>;
  private injuryTypes: Map<number, InjuryType>;
  private currentUserId: number;
  private currentAssessmentId: number;
  private currentUserAssessmentId: number;
  private currentInjuryTypeId: number;

  constructor() {
    this.users = new Map();
    this.assessments = new Map();
    this.userAssessments = new Map();
    this.injuryTypes = new Map();
    this.currentUserId = 1;
    this.currentAssessmentId = 1;
    this.currentUserAssessmentId = 1;
    this.currentInjuryTypeId = 1;
    
    this.initializeData();
  }

  private initializeData() {
    // Initialize default injury types
    const defaultInjuryTypes = [
      { name: "Wrist Fracture", description: "Recovery from wrist bone fractures and related mobility issues", icon: "fas fa-hand-paper" },
      { name: "Carpal Tunnel", description: "Post-surgical recovery from carpal tunnel release procedure", icon: "fas fa-hand-scissors" },
      { name: "Tendon Injury", description: "Recovery from hand or wrist tendon repair surgery", icon: "fas fa-hand-rock" },
      { name: "Other Injury", description: "Other hand or wrist conditions requiring assessment", icon: "fas fa-hand-spock" }
    ];

    defaultInjuryTypes.forEach(injuryType => {
      this.createInjuryType(injuryType);
    });

    // Initialize default assessments
    const defaultAssessments = [
      {
        name: "Wrist Flexion",
        description: "Measure forward bending range of motion",
        videoUrl: "/videos/wrist-flexion.mp4",
        duration: 10,
        repetitions: 3,
        instructions: "Slowly bend your wrist forward as far as comfortable, then return to neutral position",
        isActive: true,
        orderIndex: 1
      },
      {
        name: "Wrist Extension",
        description: "Measure backward bending range of motion",
        videoUrl: "/videos/wrist-extension.mp4",
        duration: 10,
        repetitions: 3,
        instructions: "Slowly bend your wrist backward as far as comfortable, then return to neutral position",
        isActive: true,
        orderIndex: 2
      },
      {
        name: "Finger Flexion",
        description: "Measure finger closing range of motion",
        videoUrl: "/videos/finger-flexion.mp4",
        duration: 10,
        repetitions: 3,
        instructions: "Slowly close your fingers into a fist, then open them completely",
        isActive: true,
        orderIndex: 3
      },
      {
        name: "Finger Extension",
        description: "Measure finger opening range of motion",
        videoUrl: "/videos/finger-extension.mp4",
        duration: 10,
        repetitions: 3,
        instructions: "Slowly extend your fingers as far as comfortable, spreading them apart",
        isActive: true,
        orderIndex: 4
      },
      {
        name: "Thumb Opposition",
        description: "Measure thumb to finger touch capability",
        videoUrl: "/videos/thumb-opposition.mp4",
        duration: 15,
        repetitions: 3,
        instructions: "Touch your thumb to each fingertip in sequence",
        isActive: true,
        orderIndex: 5
      },
      {
        name: "Shoulder Flexion",
        description: "Measure forward shoulder movement",
        videoUrl: "/videos/shoulder-flexion.mp4",
        duration: 20,
        repetitions: 3,
        instructions: "Raise your arm forward as high as comfortable",
        isActive: true,
        orderIndex: 6
      },
      {
        name: "Shoulder Abduction",
        description: "Measure sideways shoulder movement",
        videoUrl: "/videos/shoulder-abduction.mp4",
        duration: 20,
        repetitions: 3,
        instructions: "Raise your arm to the side as high as comfortable",
        isActive: true,
        orderIndex: 7
      },
      {
        name: "Elbow Flexion/Extension",
        description: "Measure elbow bending and straightening",
        videoUrl: "/videos/elbow-flexion.mp4",
        duration: 15,
        repetitions: 5,
        instructions: "Bend and straighten your elbow through full range",
        isActive: true,
        orderIndex: 8
      }
    ];

    defaultAssessments.forEach(assessment => {
      this.createAssessment(assessment);
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByCode(code: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.code === code);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser, 
      id, 
      createdAt: new Date(),
      isFirstTime: true
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Assessment methods
  async getAssessments(): Promise<Assessment[]> {
    return Array.from(this.assessments.values())
      .filter(assessment => assessment.isActive)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }

  async getAssessmentsForInjury(injuryType: string): Promise<Assessment[]> {
    const allAssessments = Array.from(this.assessments.values())
      .filter(assessment => assessment.isActive)
      .sort((a, b) => a.orderIndex - b.orderIndex);
    
    // Define which assessments are needed for each injury type
    const injuryAssessmentMap: Record<string, string[]> = {
      "Trigger Finger": ["TAM (Total Active Motion)"],
      "Carpal Tunnel": ["TAM (Total Active Motion)", "Kapandji Score", "Wrist Flexion/Extension", "Forearm Pronation/Supination", "Wrist Radial/Ulnar Deviation"],
      "Distal Radius Fracture": ["TAM (Total Active Motion)", "Kapandji Score", "Wrist Flexion/Extension", "Forearm Pronation/Supination", "Wrist Radial/Ulnar Deviation"],
      "CMC Arthroplasty": ["TAM (Total Active Motion)", "Kapandji Score", "Wrist Flexion/Extension", "Forearm Pronation/Supination", "Wrist Radial/Ulnar Deviation"],
      "Metacarpal ORIF": ["TAM (Total Active Motion)"],
      "Phalanx Fracture": ["TAM (Total Active Motion)"],
      "Radial Head Replacement": ["TAM (Total Active Motion)", "Kapandji Score", "Wrist Flexion/Extension", "Forearm Pronation/Supination", "Wrist Radial/Ulnar Deviation"],
      "Terrible Triad Injury": ["TAM (Total Active Motion)", "Kapandji Score", "Wrist Flexion/Extension", "Forearm Pronation/Supination", "Wrist Radial/Ulnar Deviation"],
      "Dupuytren's Contracture": ["TAM (Total Active Motion)"],
      "Flexor Tendon Injury": ["TAM (Total Active Motion)"],
      "Extensor Tendon Injury": ["TAM (Total Active Motion)"]
    };

    const requiredAssessments = injuryAssessmentMap[injuryType] || ["TAM (Total Active Motion)"];
    return allAssessments.filter(assessment => requiredAssessments.includes(assessment.name));
  }

  async getAssessment(id: number): Promise<Assessment | undefined> {
    return this.assessments.get(id);
  }

  async createAssessment(insertAssessment: InsertAssessment): Promise<Assessment> {
    const id = this.currentAssessmentId++;
    const assessment: Assessment = { ...insertAssessment, id };
    this.assessments.set(id, assessment);
    return assessment;
  }

  // User Assessment methods
  async getUserAssessments(userId: number): Promise<UserAssessment[]> {
    return Array.from(this.userAssessments.values())
      .filter(ua => ua.userId === userId);
  }

  async getUserAssessment(userId: number, assessmentId: number): Promise<UserAssessment | undefined> {
    return Array.from(this.userAssessments.values())
      .find(ua => ua.userId === userId && ua.assessmentId === assessmentId);
  }

  async createUserAssessment(insertUserAssessment: InsertUserAssessment): Promise<UserAssessment> {
    const id = this.currentUserAssessmentId++;
    const userAssessment: UserAssessment = { ...insertUserAssessment, id };
    this.userAssessments.set(id, userAssessment);
    return userAssessment;
  }

  async updateUserAssessment(id: number, updates: Partial<UserAssessment>): Promise<UserAssessment | undefined> {
    const userAssessment = this.userAssessments.get(id);
    if (!userAssessment) return undefined;
    
    const updatedUserAssessment = { ...userAssessment, ...updates };
    this.userAssessments.set(id, updatedUserAssessment);
    return updatedUserAssessment;
  }

  // Injury Type methods
  async getInjuryTypes(): Promise<InjuryType[]> {
    return Array.from(this.injuryTypes.values());
  }

  async createInjuryType(insertInjuryType: InsertInjuryType): Promise<InjuryType> {
    const id = this.currentInjuryTypeId++;
    const injuryType: InjuryType = { ...insertInjuryType, id };
    this.injuryTypes.set(id, injuryType);
    return injuryType;
  }
}

// Initialize the database with default data
async function initializeDatabase() {
  try {
    // Check if data already exists
    const existingInjuryTypes = await db.select().from(injuryTypes);
    const existingAssessments = await db.select().from(assessments);

    if (existingInjuryTypes.length === 0) {
      // Initialize medical injury types based on clinical requirements
      const defaultInjuryTypes = [
        { name: "Trigger Finger", description: "Stenosing tenosynovitis affecting finger flexion", icon: "fas fa-hand-point-up" },
        { name: "Carpal Tunnel", description: "Median nerve compression requiring comprehensive assessment", icon: "fas fa-hand-scissors" },
        { name: "Distal Radius Fracture", description: "Wrist fracture requiring full range of motion evaluation", icon: "fas fa-hand-paper" },
        { name: "CMC Arthroplasty", description: "Thumb basal joint replacement recovery assessment", icon: "fas fa-thumbs-up" },
        { name: "Metacarpal ORIF", description: "Hand bone fracture repair recovery", icon: "fas fa-hand-rock" },
        { name: "Phalanx Fracture", description: "Finger bone fracture recovery assessment", icon: "fas fa-hand-point-right" },
        { name: "Radial Head Replacement", description: "Elbow joint replacement affecting hand function", icon: "fas fa-hand-spock" },
        { name: "Terrible Triad Injury", description: "Complex elbow injury requiring comprehensive evaluation", icon: "fas fa-hand-lizard" },
        { name: "Dupuytren's Contracture", description: "Palmar fascia contracture affecting finger extension", icon: "fas fa-hand-peace" },
        { name: "Flexor Tendon Injury", description: "Finger flexion tendon repair recovery", icon: "fas fa-hand-grab" },
        { name: "Extensor Tendon Injury", description: "Finger extension tendon repair recovery", icon: "fas fa-hand-stop" }
      ];

      await db.insert(injuryTypes).values(defaultInjuryTypes);
      console.log("Initialized injury types");
    }

    if (existingAssessments.length === 0) {
      // Initialize clinical assessments based on medical requirements
      const defaultAssessments = [
        {
          name: "TAM (Total Active Motion)",
          description: "Comprehensive finger flexion and extension measurement",
          videoUrl: "/videos/tam-assessment.mp4",
          duration: 15,
          repetitions: 3,
          instructions: "Make a complete fist, then fully extend all fingers. Repeat slowly and deliberately.",
          isActive: true,
          orderIndex: 1
        },
        {
          name: "Kapandji Score",
          description: "Thumb opposition assessment using standardized scoring",
          videoUrl: "/videos/kapandji-assessment.mp4",
          duration: 12,
          repetitions: 3,
          instructions: "Touch your thumb to each finger tip, then to the base of each finger, progressing down the hand.",
          isActive: true,
          orderIndex: 2
        },
        {
          name: "Wrist Flexion/Extension",
          description: "Measure wrist forward and backward bending range of motion",
          videoUrl: "/videos/wrist-fe-assessment.mp4",
          duration: 10,
          repetitions: 3,
          instructions: "Bend your wrist forward as far as comfortable, then backward. Keep forearm stable.",
          isActive: true,
          orderIndex: 3
        },
        {
          name: "Forearm Pronation/Supination",
          description: "Measure forearm rotation with palm up and palm down movements",
          videoUrl: "/videos/forearm-ps-assessment.mp4",
          duration: 10,
          repetitions: 3,
          instructions: "Rotate your forearm to turn palm up, then palm down. Keep elbow at your side.",
          isActive: true,
          orderIndex: 4
        },
        {
          name: "Wrist Radial/Ulnar Deviation",
          description: "Measure side-to-side wrist movement toward thumb and pinky",
          videoUrl: "/videos/wrist-ru-assessment.mp4",
          duration: 10,
          repetitions: 3,
          instructions: "Move your wrist toward your thumb side, then toward your pinky side. Keep hand flat.",
          isActive: true,
          orderIndex: 5
        }
      ];

      await db.insert(assessments).values(defaultAssessments);
      console.log("Initialized assessments");
    }
  } catch (error) {
    console.error("Error initializing database:", error);
  }
}

export const storage = new DatabaseStorage();

// Initialize database on startup
initializeDatabase();
