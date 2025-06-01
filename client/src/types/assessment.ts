export interface Assessment {
  id: number;
  name: string;
  description: string;
  videoUrl?: string;
  duration: number;
  repetitions: number;
  instructions?: string;
  isActive: boolean;
  orderIndex: number;
}

export interface AssessmentWithProgress extends Assessment {
  isCompleted: boolean;
  completedAt?: Date;
  qualityScore?: number;
  userAssessmentId?: number;
}

export interface InjuryType {
  id: number;
  name: string;
  description: string;
  icon: string;
}

export interface User {
  id: number;
  code: string;
  injuryType?: string;
  createdAt: Date;
  isFirstTime: boolean;
}

export interface UserAssessment {
  id: number;
  userId: number;
  assessmentId: number;
  isCompleted: boolean;
  completedAt?: Date;
  romData?: any;
  repetitionData?: any;
  qualityScore?: number;
}

export interface Progress {
  completed: number;
  total: number;
  percentage: number;
}
