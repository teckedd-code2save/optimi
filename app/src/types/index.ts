export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export type OpportunityType = 'hackathon' | 'accelerator' | 'grant' | 'government' | 'platform' | 'job' | 'other';
export type OpportunityStatus = 'saved' | 'researching' | 'preparing' | 'applied' | 'interview' | 'accepted' | 'rejected' | 'declined';

export interface Opportunity {
  id: string;
  title: string;
  organization: string;
  type: OpportunityType;
  status: OpportunityStatus;
  url: string;
  deadline: string | null;
  description: string;
  requirements: string[];
  prizes?: string;
  location?: string;
  checklist: ChecklistItem[];
  notes: string;
  dateAdded: string;
  dateModified?: string;
  parsedFrom?: string;
  extractionConfidence?: number;
}

export interface AppSettings {
  googleConnected: boolean;
  googleEmail: string | null;
  calendarSync: boolean;
  deadlineReminders: boolean;
  reminderDays: number;
  theme: 'light' | 'dark' | 'auto';
  compactMode: boolean;
  enableAnimations: boolean;
  backendUrl: string;
  aiEnabled: boolean;
}

export interface ExtractHistoryItem {
  url: string;
  title: string;
  date: string;
  added: boolean;
}

export interface ParsedOpportunity {
  title: string | null;
  organization: string | null;
  type: OpportunityType | null;
  description: string | null;
  deadline: string | null;
  location: string | null;
  prizes: string | null;
  requirements: string[];
  url: string;
  confidence: number;
  parserUsed: string;
}
