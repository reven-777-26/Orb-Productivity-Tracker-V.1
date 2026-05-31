import type { AppState, Goal, Task, VoiceReminder, Note, AppSettings, DailyActivityLog, FocusMode } from '../types';

export const INITIAL_GOALS: Goal[] = [
  {
    id: 'g1',
    title: 'Launch Orb Desktop Application v1.0',
    month: 'June',
    status: 'In Progress',
    progress: 75,
    isPinned: true,
    deadline: '2026-06-15',
    category: 'Business',
    notes: 'Finish the Focus Aura transparent overlay and the system tray integration. Test global hotkeys thoroughly.',
    milestones: [
      { id: 'gm1_1', title: 'Scaffold Electron project with React & TS', completed: true },
      { id: 'gm1_2', title: 'Implement Focus Aura transparent overlay window', completed: true },
      { id: 'gm1_3', title: 'Build system tray and global hotkeys', completed: true },
      { id: 'gm1_4', title: 'Package app and test on Windows', completed: false }
    ],
    monthlyReview: 'Development has been smooth. The CPU overhead is low, and the glassmorphic styling is clean.'
  },
  {
    id: 'g2',
    title: 'Build Focus Aura UI & Gradient Border Animations',
    month: 'June',
    status: 'Completed',
    progress: 100,
    isPinned: true,
    deadline: '2026-06-05',
    category: 'Career',
    notes: 'Create Gemini Live-inspired rainbow glow borders.',
    milestones: [
      { id: 'gm2_1', title: 'Design HSL gradient variables', completed: true },
      { id: 'gm2_2', title: 'Add conic-gradient rotate keyframes', completed: true },
      { id: 'gm2_3', title: 'Optimize hardware acceleration', completed: true }
    ],
    achievementUnlocked: true
  },
  {
    id: 'g3',
    title: 'Grow emergency savings fund to $10,000',
    month: 'July',
    status: 'In Progress',
    progress: 60,
    isPinned: false,
    deadline: '2026-07-31',
    category: 'Finance',
    notes: 'Transfer $1,500 at the start of July.',
    milestones: [
      { id: 'gm3_1', title: 'Transfer July deposit', completed: true },
      { id: 'gm3_2', title: 'Analyze expenditure', completed: false }
    ]
  },
  {
    id: 'g4',
    title: 'Run a 10K race under 50 minutes',
    month: 'August',
    status: 'Not Started',
    progress: 0,
    isPinned: false,
    deadline: '2026-08-20',
    category: 'Health',
    notes: 'Follow the training plan. Track splits weekly.',
    milestones: [
      { id: 'gm4_1', title: 'Base training building phase', completed: false },
      { id: 'gm4_2', title: 'Interval runs twice a week', completed: false }
    ]
  },
  {
    id: 'g5',
    title: 'Complete French B2 Certification preparation',
    month: 'September',
    status: 'Not Started',
    progress: 0,
    isPinned: false,
    deadline: '2026-09-30',
    category: 'Learning',
    notes: 'Vocabulary expansion and daily audio comprehension drills.',
    milestones: [
      { id: 'gm5_1', title: 'Complete 30 French conversational lessons', completed: false }
    ]
  }
];

export const INITIAL_TASKS: Task[] = [
  {
    id: 't1',
    title: 'Code the transparent, click-through overlay window in main.js',
    column: 'in-progress',
    priority: 'Critical',
    dueDate: '2026-06-01',
    isRecurring: false,
    subtasks: [
      { id: 'ts1_1', title: 'Set ignoreMouseEvents active', completed: true },
      { id: 'ts1_2', title: 'Disable click-through during fullscreen warning mode', completed: false },
      { id: 'ts1_3', title: 'Ensure transparent window stays on top', completed: true }
    ],
    tags: ['electron', 'aura', 'core'],
    label: 'Feature Dev',
    estTime: 120,
    spentTime: 95,
    isArchived: false,
    createdAt: '2026-05-30T10:00:00Z'
  },
  {
    id: 't2',
    title: 'Design the glassmorphic sidebar layout and navigation',
    column: 'completed',
    priority: 'High',
    dueDate: '2026-05-31',
    isRecurring: false,
    subtasks: [
      { id: 'ts2_1', title: 'Add navigation tabs', completed: true },
      { id: 'ts2_2', title: 'Apply backdrop-filter and borders', completed: true }
    ],
    tags: ['design', 'css'],
    label: 'UI/UX',
    estTime: 90,
    spentTime: 80,
    isArchived: false,
    createdAt: '2026-05-30T11:00:00Z',
    completedAt: '2026-05-31T01:00:00Z'
  },
  {
    id: 't3',
    title: 'Integrate SpeechSynthesis TTS reminders scheduler',
    column: 'todo',
    priority: 'High',
    dueDate: '2026-06-02',
    isRecurring: false,
    subtasks: [
      { id: 'ts3_1', title: 'Build speech voice loader and dropdown', completed: false },
      { id: 'ts3_2', title: 'Implement custom interval repeating alert', completed: false },
      { id: 'ts3_3', title: 'Connect to Windows TTS engines', completed: false }
    ],
    tags: ['voice', 'reminders'],
    label: 'TTS Engine',
    estTime: 150,
    spentTime: 0,
    isArchived: false,
    createdAt: '2026-05-30T12:00:00Z'
  },
  {
    id: 't4',
    title: 'Submit job applications for senior development positions',
    column: 'todo',
    priority: 'Medium',
    dueDate: '2026-06-01',
    isRecurring: true,
    recurrenceRule: 'daily',
    subtasks: [
      { id: 'ts4_1', title: 'Tailor resume for role 1', completed: false },
      { id: 'ts4_2', title: 'Write cover letter for role 2', completed: false }
    ],
    tags: ['career', 'jobs'],
    label: 'Job Search',
    estTime: 60,
    spentTime: 0,
    isArchived: false,
    createdAt: '2026-05-30T13:00:00Z'
  },
  {
    id: 't5',
    title: 'Daily workout: 30 minutes strength training',
    column: 'completed',
    priority: 'Low',
    dueDate: '2026-05-31',
    isRecurring: true,
    recurrenceRule: 'daily',
    subtasks: [],
    tags: ['health', 'fitness'],
    label: 'Lifestyle',
    estTime: 30,
    spentTime: 35,
    isArchived: false,
    createdAt: '2026-05-30T09:00:00Z',
    completedAt: '2026-05-31T00:45:00Z'
  }
];

export const INITIAL_REMINDERS: VoiceReminder[] = [
  {
    id: 'r1',
    message: 'user, it is time to work on Aura.',
    type: 'daily',
    time: '10:00',
    isCompleted: false,
    category: 'Aura',
    isActive: true
  },
  {
    id: 'r2',
    message: 'user, time for job applications.',
    type: 'daily',
    time: '14:00',
    isCompleted: false,
    category: 'Job Search',
    isActive: true
  },
  {
    id: 'r3',
    message: 'user, stop scrolling and get back to work!',
    type: 'daily',
    time: '16:30',
    isCompleted: false,
    category: 'Procrastination',
    isActive: true
  },
  {
    id: 'r4',
    message: 'user, it is time for French practice.',
    type: 'weekly',
    time: '18:00',
    isCompleted: false,
    category: 'Learning',
    isActive: true
  }
];

export const INITIAL_NOTES: Note[] = [
  {
    id: 'n1',
    title: 'Aura Tech Architecture Ideas',
    content: `<h2>Technology Stack for Focus Aura</h2>
<ul>
  <li><strong>Window overlay</strong>: Frameless transparent Electron browser window.</li>
  <li><strong>Performance</strong>: GPU accelerated animations. Use CSS conic-gradient rotation.</li>
  <li><strong>Click events</strong>: Set ignore mouse events to allow clicking applications underneath.</li>
  <li><strong>Strict focus mode</strong>: Toggle mouse capturing, dim screen with black overlay, and force user to click "I acknowledge" button before returning to work.</li>
</ul>`,
    category: 'Aura',
    tags: ['architecture', 'ideas', 'electron'],
    folder: 'Work',
    isPinned: true,
    lastModified: '2026-05-30T18:00:00Z',
    type: 'idea'
  },
  {
    id: 'n2',
    title: 'Daily Journal - May 31',
    content: `<h3>Focus &amp; Energy Level: High</h3>
<ul>
  <li><strong>What went well today</strong>: Built the boilerplate code and configured the CSS design system for Orb OS. It looks incredibly sleek.</li>
  <li><strong>Struggles</strong>: Spent a little time figuring out the transparent mouse ignore API for Windows in Electron, but got it sorted.</li>
  <li><strong>Goals for tomorrow</strong>: Finalize TTS speech trigger and build out the Kanban card drag-and-drop system.</li>
</ul>`,
    category: 'Journal',
    tags: ['journal', 'daily'],
    folder: 'Journal',
    isPinned: false,
    lastModified: '2026-05-31T01:30:00Z',
    type: 'journal'
  },
  {
    id: 'n3',
    title: 'Quick Brain Dump',
    content: 'Need to transfer funds for savings goal. Plan French grammar lessons. Check out Next.js page transitions. Call support for calendar sync API key.',
    category: 'Inbox',
    tags: ['todo', 'draft'],
    folder: 'Drafts',
    isPinned: false,
    lastModified: '2026-05-31T00:15:00Z',
    type: 'braindump'
  }
];



const DEFAULT_FOCUS_MODES: FocusMode[] = [
  {
    id: 'auradev',
    name: 'Aura Development Mode',
    reminderInterval: 10,
    voiceReminders: ['user, time to work on Aura.', 'user, make progress on the desktop shell.', 'Work on Aura focus animations.'],
    borderStyle: 'flowing',
    colors: ['#8b5cf6', '#c084fc', '#3b82f6'],
    productivityGoals: ['Optimize GPU graphics acceleration', 'Test transparent ignore-mouse window', 'Refine edge gradients']
  },
  {
    id: 'jobsearch',
    name: 'Job Search Mode',
    reminderInterval: 15,
    voiceReminders: ['user, time for job applications.', 'Submit senior developer roles.', 'Reach out to recruiters.'],
    borderStyle: 'flowing',
    colors: ['#3b82f6', '#22d3ee', '#8b5cf6'],
    productivityGoals: ['Send 3 job applications today', 'Update LinkedIn profile info', 'Review resume layouts']
  },
  {
    id: 'deepwork',
    name: 'Deep Work Mode',
    reminderInterval: 20,
    voiceReminders: ['user, avoid distractions and focus.', 'user, enter deep work focus.', 'Keep working on your core tasks.'],
    borderStyle: 'flowing',
    colors: ['#8b5cf6', '#12121a', '#c084fc'],
    productivityGoals: ['Write clean TypeScript interfaces', 'Debug race conditions in database', 'Implement main process window controls']
  },
  {
    id: 'study',
    name: 'Study Mode',
    reminderInterval: 15,
    voiceReminders: ['user, open your textbook.', 'Take notes on design principles.', 'Review algorithmic complexity sheets.'],
    borderStyle: 'pulse',
    colors: ['#10b981', '#3b82f6', '#22d3ee'],
    productivityGoals: ['Complete lesson 4 exercises', 'Write study summary guidelines', 'Solve 2 sorting challenges']
  },
  {
    id: 'learning',
    name: 'Learning Mode',
    reminderInterval: 10,
    voiceReminders: ['user, it is time for French practice.', 'Speak aloud in French.', 'Review your vocabulary deck.'],
    borderStyle: 'flowing',
    colors: ['#c084fc', '#f472b6', '#f59e0b'],
    productivityGoals: ['Learn 20 new vocabulary terms', 'Practice French listening drills', 'Review grammar structure rules']
  },
  {
    id: 'workout',
    name: 'Workout Mode',
    reminderInterval: 5,
    voiceReminders: ['user, get moving!', 'user, start your exercise routine.', 'Time to lift or run.'],
    borderStyle: 'pulse',
    colors: ['#ef4444', '#f59e0b', '#f472b6'],
    productivityGoals: ['Complete 30 minutes training', 'Stretch for mobility improvement', 'Log hydration levels']
  },
  {
    id: 'gaming',
    name: 'Gaming Mode',
    reminderInterval: 30,
    voiceReminders: ['user, gaming session limit reached. Stop scroll or play.', 'Time to wrap up the game.', 'user, take a break from screen play.'],
    borderStyle: 'solid',
    colors: ['#22d3ee', '#10b981', '#ef4444'],
    productivityGoals: ['Enforce 1 hour session maximum', 'Log breaks in between rounds', 'Rest your eyes for 5 minutes']
  },
  {
    id: 'custom',
    name: 'Custom Mode',
    reminderInterval: 15,
    voiceReminders: ['user, time to focus on your goals.', 'user, check your task scheduler.', 'Get back to productivity.'],
    borderStyle: 'flowing',
    colors: ['#d946ef', '#c084fc', '#ffffff'],
    productivityGoals: ['Define custom goals of the hour', 'Organize notes categories list', 'Log custom expenses logged']
  }
];

export const INITIAL_SETTINGS: AppSettings = {
  userName: 'user',
  focusInterval: 15,
  ttsVoice: '',
  ttsVolume: 0.8,
  ttsSpeed: 1.0,
  strictModeEnabled: false,
  customFocusMessages: [
    'user, it is time to work on Orb.',
    'user, time for job applications.',
    'user, stop scrolling and get back to work.',
    'user, it is time for French practice.',
    'user, take a break.'
  ],
  currentFocusMode: 'deepwork',
  shortcuts: {
    'toggle-aura': 'Ctrl+Shift+F',
    'enable-aura': 'Ctrl+Shift+A',
    'snooze-reminder': 'Ctrl+Shift+S',
    'dismiss-reminder': 'Ctrl+Shift+D',
    'start-focus': 'Ctrl+Shift+T',
    'start-break': 'Ctrl+Shift+B',
    'quick-note': 'Ctrl+Shift+N'
  },
  auraConfig: {
    thickness: 8,
    brightness: 80,
    speed: 6,
    colors: ['#8b5cf6', '#f472b6', '#3b82f6'],
    transparency: 15,
    mode: 'normal'
  },
  focusModes: DEFAULT_FOCUS_MODES,
  isAuraActive: false,
  fontSizeZoom: 100,
  appFontFamily: 'Outfit',
  autoDeleteAfter15Days: true,
  titleSizeZoom: 100,
  bodySizeZoom: 100,
  sidebarSizeZoom: 100,
  pinFinanceToDashboard: false,
  breakAllowanceMinutes: 60,
  customFolders: ['Work', 'Personal', 'Journal', 'Drafts'],
  themeAccentColor: '#8b5cf6',
  dashboardLayout: { col1: ['tasks', 'goals'], col2: ['focusTimer', 'breakTimer'], col3: ['schedule', 'stats'] }
};

// Generate 14 days of realistic productivity activity logs
export const generateActivityLogs = (): DailyActivityLog[] => {
  const logs: DailyActivityLog[] = [];
  const today = new Date();
  
  for (let i = 14; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateString = date.toISOString().split('T')[0];
    
    // Vary the stats realistically
    const seed = Math.sin(i * 1.5);
    const tasksCompleted = Math.floor(Math.abs(seed * 4) + 2);
    const goalsCompleted = i === 5 || i === 12 ? 1 : 0;
    const focusSeconds = Math.floor(Math.abs(seed * 7200) + 10800); // 3-5 hours
    const breakSeconds = Math.floor(Math.abs(seed * 1800) + 2400); // 40-70 mins
    const compliance = Math.floor(Math.abs(seed * 20) + 80); // 80-100%
    
    // Calculate productivity score
    const taskScore = Math.min(tasksCompleted * 15, 60);
    const timeScore = Math.min((focusSeconds / 18000) * 30, 30);
    const compScore = (compliance / 100) * 10;
    const productivityScore = Math.round(taskScore + timeScore + compScore);

    logs.push({
      date: dateString,
      tasksCompletedCount: tasksCompleted,
      goalsCompletedCount: goalsCompleted,
      focusSeconds,
      breakSeconds,
      reminderComplianceRate: compliance,
      productivityScore
    });
  }
  
  return logs;
};

export const INITIAL_SCHEDULE_BLOCKS = [
  { id: 'sb1', startTime: '09:00', endTime: '10:00', task: 'Review email / Daily Plan', color: '#3b82f6', category: 'General' },
  { id: 'sb2', startTime: '10:00', endTime: '12:00', task: 'Work on Orb Electron desktop shell', color: '#8b5cf6', category: 'Work' },
  { id: 'sb3', startTime: '13:00', endTime: '15:00', task: 'Submit Senior Dev Job Applications', color: '#f97316', category: 'Career' },
  { id: 'sb4', startTime: '15:00', endTime: '16:30', task: 'French practice / Conversation classes', color: '#ec4899', category: 'Learning' },
  { id: 'sb5', startTime: '17:00', endTime: '18:00', task: 'Exercise session', color: '#10b981', category: 'Health' }
];

export const DEFAULT_STATE: AppState = {
  goals: [],
  tasks: [],
  reminders: [],
  focusSessions: [],
  breakSessions: [],
  notes: [],
  finances: [],
  settings: {
    ...INITIAL_SETTINGS,
    useDemoData: false,
    loopDismissKey: 'D',
    customReminderSounds: []
  },
  activityLog: [],
  subscriptions: [],
  scheduleBlocks: []
};

export const loadState = async (): Promise<AppState> => {
  try {
    if (window.electronAPI && typeof window.electronAPI.invoke === 'function') {
      const data = await window.electronAPI.invoke('database:read');
      if (data) {
        return {
          ...DEFAULT_STATE,
          ...data,
          subscriptions: data.subscriptions || [],
          scheduleBlocks: data.scheduleBlocks || [],
          // Ensure nested properties are preserved
          settings: { 
            ...DEFAULT_STATE.settings, 
            ...data.settings,
            auraConfig: { ...DEFAULT_STATE.settings.auraConfig, ...(data.settings?.auraConfig || {}) },
            focusModes: data.settings?.focusModes || DEFAULT_STATE.settings.focusModes
          },
          activityLog: data.activityLog || (data.settings?.useDemoData ? generateActivityLogs() : [])
        };
      }
    } else {
      const data = localStorage.getItem('orb_db');
      if (data) {
        const parsed = JSON.parse(data);
        return {
          ...DEFAULT_STATE,
          ...parsed,
          subscriptions: parsed.subscriptions || [],
          scheduleBlocks: parsed.scheduleBlocks || [],
          settings: { 
            ...DEFAULT_STATE.settings, 
            ...parsed.settings,
            auraConfig: { ...DEFAULT_STATE.settings.auraConfig, ...(parsed.settings?.auraConfig || {}) },
            focusModes: parsed.settings?.focusModes || DEFAULT_STATE.settings.focusModes
          },
          activityLog: parsed.activityLog || (parsed.settings?.useDemoData ? generateActivityLogs() : [])
        };
      }
    }
  } catch (err) {
    console.error('Failed to load application state:', err);
  }
  return DEFAULT_STATE;
};

export const saveState = async (state: AppState): Promise<boolean> => {
  try {
    if (window.electronAPI && typeof window.electronAPI.invoke === 'function') {
      return await window.electronAPI.invoke('database:write', state);
    } else {
      localStorage.setItem('orb_db', JSON.stringify(state));
      return true;
    }
  } catch (err) {
    console.error('Failed to save state:', err);
    return false;
  }
};
