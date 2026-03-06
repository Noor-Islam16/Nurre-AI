// Privacy and consent management types

export type ConsentCategory = 'necessary' | 'functional' | 'analytics' | 'marketing';

export interface ConsentPreferences {
  necessary: boolean; // Always true - required for app to function
  functional: boolean; // Enhanced features like AI coaching
  analytics: boolean; // Usage tracking and behavior analysis
  marketing: boolean; // Newsletter, promotional content
}

export interface ConsentRecord {
  id: string;
  userId: string;
  version: string; // Privacy policy version
  preferences: ConsentPreferences;
  consentedAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface DataExportRequest {
  userId: string;
  requestedAt: Date;
  format: 'json' | 'csv';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  downloadUrl?: string;
  expiresAt?: Date;
}

export interface DataDeletionRequest {
  id: string;
  userId: string;
  requestedAt: Date;
  scheduledFor: Date; // 30 days from request
  status: 'pending' | 'scheduled' | 'processing' | 'completed' | 'cancelled';
  reason?: string;
  confirmedAt?: Date;
  completedAt?: Date;
}

export interface RetentionPolicy {
  events: number; // days
  conversations: number;
  tasks: number;
  focusSessions: number;
  moodEntries: number;
}

export const DEFAULT_RETENTION_POLICY: RetentionPolicy = {
  events: 90,
  conversations: 365,
  tasks: 365,
  focusSessions: 180,
  moodEntries: 365
};

export const PRIVACY_POLICY_VERSION = '1.0.0';

export interface PrivacySettings {
  dataCollection: {
    enableEventTracking: boolean;
    enableAIAnalysis: boolean;
    enableAnonymousMetrics: boolean;
  };
  dataRetention: RetentionPolicy;
  dataSharing: {
    allowImprovementData: boolean;
    allowAnonymousSharing: boolean;
  };
}