declare global {
  interface Window {
    electronAPI?: {
      send: (channel: string, data?: any) => void;
      on: (channel: string, func: (...args: any[]) => void) => void;
      off: (channel: string, func: (...args: any[]) => void) => void;
      invoke: (channel: string, data?: any) => Promise<any>;
    };
  }
}

export type Month = 'June' | 'July' | 'August' | 'September' | 'October' | 'November' | 'December';

export type GoalCategory = 'Career' | 'Health' | 'Finance' | 'Business' | 'Learning' | 'Personal';

export type GoalStatus = 'Not Started' | 'In Progress' | 'Completed';

export interface Milestone {
  id: string;
  title: string;
  completed: boolean;
}

export interface Goal {
  id: string;
  title: string;
  month: Month;
  status: GoalStatus;
  progress: number; // 0 to 100
  isPinned: boolean;
  deadline: string;
  category: string;
  notes: string;
  milestones: Milestone[];
  monthlyReview?: string;
  achievementUnlocked?: boolean;
  createdAt?: string;
  categoryColor?: string;
  isDeleted?: boolean;
  deletedAt?: string;
}

export type TaskColumn = 'todo' | 'in-progress' | 'completed';
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  column: TaskColumn;
  priority: TaskPriority;
  dueDate: string;
  isRecurring: boolean;
  recurrenceRule?: 'daily' | 'weekly' | 'none';
  subtasks: Subtask[];
  tags: string[];
  label: string;
  estTime: number; // in minutes
  spentTime: number; // in minutes
  isArchived: boolean;
  createdAt: string;
  completedAt?: string;
  notes?: string;
  links?: { name: string; url: string }[];
  attachments?: { id: string; name: string; type: string; dataUrl: string; size: number }[];
  isPinned?: boolean;
  isDeleted?: boolean;
  deletedAt?: string;
}

export interface VoiceReminder {
  id: string;
  message: string;
  type: 'daily' | 'weekly' | 'one-time' | 'countdown' | 'interval';
  time: string; // "HH:MM"
  isCompleted: boolean;
  category: string;
  isActive: boolean;
  soundEffect?: string;
  countdownMinutes?: number;
  intervalMinutes?: number;
  daysOfWeek?: string[];
  elapsedSeconds?: number;
  isLoopingAlert?: boolean;
  requireShortcutToDismiss?: boolean;
  dismissKey?: string;
}

export type FocusSessionType = 'pomodoro' | 'deepwork' | 'custom' | 'stopwatch';

export interface BreakSession {
  id: string;
  startTime: string;
  endTime?: string;
  durationSeconds: number; // calculated at end
}

export interface FocusSession {
  id: string;
  type: FocusSessionType;
  startTime: string;
  endTime?: string;
  durationSeconds: number;
  mode: string; // Focus Mode name/ID
  completed: boolean;
}

export type NoteType = 'quick' | 'journal' | 'braindump' | 'idea';

export interface Note {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  folder: string; // e.g. "Work", "Personal", "Drafts"
  isPinned: boolean;
  lastModified: string;
  type: NoteType;
  isBookmarked?: boolean;
}

export type FinanceType = 'savings' | 'debt' | 'income' | 'expense';

export interface FinanceRecord {
  id: string;
  type: FinanceType;
  title: string;
  amount: number;
  category: string;
  date: string; // YYYY-MM-DD
  // Specific fields for savings/debt tracking:
  targetAmount?: number;
  progressAmount?: number;
  targetMonth?: Month;
  note?: string;
  color?: string;
}

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  billingCycle: 'monthly' | 'yearly';
  renewalDate: string; // YYYY-MM-DD
  status: 'active' | 'paused';
  category: string;
  color?: string;
}

export interface FocusMode {
  id: string;
  name: string;
  reminderInterval: number; // minutes
  voiceReminders: string[];
  borderStyle: 'flowing' | 'pulse' | 'solid';
  colors: string[]; // array of hex gradient colors
  productivityGoals: string[];
}

export interface AuraConfig {
  thickness: number; // 2px to 20px
  brightness: number; // 0 to 100
  speed: number; // 1 to 20 seconds
  colors: string[]; // array of colors e.g. ['#8b5cf6', '#f472b6', '#3b82f6']
  transparency: number; // 0 to 100 (opacity of border)
  mode: 'subtle' | 'normal' | 'aggressive';
}

export interface AppSettings {
  focusInterval: number; // minutes, e.g. 15
  ttsVoice: string; // selected voice name
  ttsVolume: number; // 0 to 1
  ttsSpeed: number; // 0.1 to 2
  strictModeEnabled: boolean;
  customFocusMessages: string[];
  currentFocusMode: string; // ID of active FocusMode
  shortcuts: Record<string, string>;
  auraConfig: AuraConfig;
  focusModes: FocusMode[];
  isAuraActive: boolean; // overlay activation state
  userName?: string;
  themeBgColor?: string;
  themeBgImage?: string;
  categoryColors?: Record<string, string>;
  fontSizeZoom?: number;
  appFontFamily?: string;
  autoDeleteAfter15Days?: boolean;
  titleSizeZoom?: number;
  bodySizeZoom?: number;
  sidebarSizeZoom?: number;
  pinFinanceToDashboard?: boolean;
  customReminderSound?: string;
  breakAllowanceMinutes?: number;
  customFolders?: string[];
  useDemoData?: boolean;
  loopDismissKey?: string;
  customReminderSounds?: Array<{ id: string; name: string; dataUrl: string }>;
  themeAccentColor?: string;
  dashboardLayout?: { col1: string[]; col2: string[]; col3: string[]; };
}

export interface DailyActivityLog {
  date: string; // YYYY-MM-DD
  tasksCompletedCount: number;
  goalsCompletedCount: number;
  focusSeconds: number;
  breakSeconds: number;
  reminderComplianceRate: number; // 0 to 100
  productivityScore: number; // 0 to 100
}

export interface ScheduleBlock {
  id: string;
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  task: string;
  color: string;
  category?: string;
}

export interface AppState {
  goals: Goal[];
  tasks: Task[];
  reminders: VoiceReminder[];
  focusSessions: FocusSession[];
  breakSessions: BreakSession[];
  notes: Note[];
  finances: FinanceRecord[];
  settings: AppSettings;
  activityLog: DailyActivityLog[];
  subscriptions?: Subscription[];
  scheduleBlocks?: ScheduleBlock[];
}
