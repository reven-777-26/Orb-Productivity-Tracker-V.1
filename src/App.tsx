import React, { useState, useEffect } from 'react';
import {
  Activity, Award, BookOpen, Calendar, CheckSquare,
  Clock, Home, Maximize2, Minimize2, Plus, Save, Settings,
  ShieldAlert, Sparkles, Volume2, X, Play, Pause,
  RotateCcw, Coffee, ShieldCheck, ChevronRight, Search, Trash,
  Pin, Paperclip, Link, Image, Trash2, AlignLeft, AlignCenter, AlignRight, Edit, Move
} from 'lucide-react';
import type { Goal, GoalStatus, Task, TaskColumn, TaskPriority, Subtask, VoiceReminder, FocusSession, FocusSessionType, Note, AppSettings, AppState } from './types';
import { loadState, saveState, INITIAL_GOALS, INITIAL_TASKS, INITIAL_REMINDERS, INITIAL_NOTES, INITIAL_SCHEDULE_BLOCKS, generateActivityLogs } from './utils/storage';
import { speakText, stopSpeaking, getAvailableVoices } from './utils/tts';

// -------------------------------------------------------------
// WEB AUDIO API SYNTH SOUND GENERATOR
// -------------------------------------------------------------
const playSynthSound = (type: string, customData?: string) => {
  if ((type === 'custom' || type.startsWith('custom-')) && customData) {
    try {
      const audio = new Audio(customData);
      audio.play().catch(e => console.error("Failed to play custom sound:", e));
    } catch (err) {
      console.error("Custom sound play failed:", err);
    }
    return;
  }

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === 'beep') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(850, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else if (type === 'chime') {
      const playNote = (freq: number, delay: number, dur: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
        gain.gain.setValueAtTime(0, ctx.currentTime + delay);
        gain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + delay + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + dur);
      };
      playNote(523.25, 0, 0.35); // C5
      playNote(659.25, 0.08, 0.35); // E5
      playNote(783.99, 0.16, 0.45); // G5
    } else if (type === 'bell') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);

      const playOvertone = (freq: number, gainAmt: number) => {
        const oscO = ctx.createOscillator();
        const gainO = ctx.createGain();
        oscO.type = 'sine';
        oscO.frequency.setValueAtTime(freq, ctx.currentTime);
        gainO.gain.setValueAtTime(gainAmt, ctx.currentTime);
        gainO.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
        oscO.connect(gainO);
        gainO.connect(ctx.destination);
        oscO.start();
        oscO.stop(ctx.currentTime + 1.2);
      };

      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1.5);

      playOvertone(880, 0.04);
      playOvertone(1320, 0.02);
    } else if (type === 'breeze') {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(220, ctx.currentTime);
      osc1.frequency.linearRampToValueAtTime(330, ctx.currentTime + 0.6);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(222, ctx.currentTime);
      osc2.frequency.linearRampToValueAtTime(440, ctx.currentTime + 0.6);

      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.8);
      osc2.stop(ctx.currentTime + 0.8);
    }
  } catch (audioErr) {
    console.error("Audio Context play error:", audioErr);
  }
};

// -------------------------------------------------------------
// DUAL-WINDOW ROUTING CHECK
// -------------------------------------------------------------
const isOverlayWindow = window.location.search.includes('overlay=true');

export default function App() {
  if (isOverlayWindow) {
    return <FocusAuraOverlay />;
  }

  return <MainDashboardApp />;
}

// =============================================================
// SUB-WINDOW: FOCUS AURA OVERLAY
// =============================================================
function FocusAuraOverlay() {
  const [data, setData] = useState<{
    isAuraActive: boolean;
    auraConfig: {
      thickness: number;
      brightness: number;
      speed: number;
      colors: string[];
      transparency: number;
      mode: 'subtle' | 'normal' | 'aggressive';
    };
    strictLevel: number;
    activeAlertMessage: string;
  } | null>(null);

  useEffect(() => {
    // Make body background transparent for the overlay window to prevent solid black screen covering desktop
    document.body.style.backgroundColor = 'transparent';
    document.body.style.background = 'transparent';

    const handleDraw = (overlayData: any) => {
      setData(overlayData);
    };

    window.electronAPI?.on('overlay:draw', handleDraw);

    // Initial fetch trigger (main window will push updates on load)
    return () => {
      window.electronAPI?.off('overlay:draw', handleDraw);
    };
  }, []);

  if (!data) return null;

  const { isAuraActive, auraConfig, strictLevel, activeAlertMessage } = data;

  let finalSpeed = auraConfig.speed;
  let finalThickness = auraConfig.thickness;
  let finalOpacity = (auraConfig.transparency / 100) * (auraConfig.brightness / 100);

  if (auraConfig.mode === 'subtle') {
    finalSpeed = auraConfig.speed * 1.5;
    finalThickness = Math.max(2, auraConfig.thickness - 2);
    finalOpacity = finalOpacity * 0.6;
  } else if (auraConfig.mode === 'aggressive') {
    finalSpeed = auraConfig.speed * 0.6;
    finalThickness = auraConfig.thickness + 4;
    finalOpacity = Math.min(1.0, finalOpacity * 1.3);
  }

  const isFlashing = strictLevel > 0;

  const borderStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderStyle: 'solid',
    borderWidth: `${finalThickness}px`,
    pointerEvents: 'none',
    boxSizing: 'border-box',
    transition: 'all 0.3s ease',
    opacity: isAuraActive ? finalOpacity : 0,
    background: isAuraActive
      ? `linear-gradient(90deg, ${auraConfig.colors.join(', ')}, ${auraConfig.colors[0]})`
      : 'transparent',
    backgroundSize: '400% 400%',
    animation: isAuraActive
      ? `aura-flow ${finalSpeed}s linear infinite${isFlashing ? ', pulse-glow 1.5s infinite' : ''}`
      : 'none',
    WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
    WebkitMaskComposite: 'xor',
    maskComposite: 'exclude',
  };

  const handleAcknowledge = () => {
    window.electronAPI?.send('overlay:acknowledge');
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 999999 }}>

      {/* Screen Glowing Border */}
      {isAuraActive && <div style={borderStyle} />}

      {/* Screen Dimmer / Flashing Effect in Strict Mode */}
      {strictLevel > 0 && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: strictLevel >= 4
            ? 'rgba(0, 0, 0, 0.85)'
            : 'rgba(239, 68, 68, 0.08)',
          backdropFilter: strictLevel >= 4 ? 'blur(8px)' : 'none',
          pointerEvents: strictLevel >= 4 ? 'auto' : 'none',
          transition: 'all 0.5s ease',
          zIndex: 1000,
        }} />
      )}

      {/* Center text alert popup */}
      {isAuraActive && activeAlertMessage && strictLevel < 4 && (
        <div style={{
          position: 'absolute',
          top: '30%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          color: '#ffffff',
          textShadow: '0 0 20px rgba(139, 92, 246, 0.8)',
          fontSize: '44px',
          fontWeight: 800,
          letterSpacing: '0.1em',
          animation: 'text-grow 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          pointerEvents: 'none',
          zIndex: 1005,
        }}>
          {activeAlertMessage.toUpperCase()}
        </div>
      )}

      {/* Fullscreen blocker level 4 overlay */}
      {strictLevel >= 4 && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1010,
          pointerEvents: 'auto',
          textAlign: 'center',
          maxWidth: '520px',
          padding: '40px',
          background: 'rgba(10, 10, 15, 0.95)',
          border: '2px solid #ef4444',
          borderRadius: '20px',
          boxShadow: '0 0 50px rgba(239, 68, 68, 0.4)',
          color: '#ffffff',
          fontFamily: 'Outfit, Inter, sans-serif'
        }}>
          <div style={{ color: '#ef4444', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
            Strict Focus Blockade
          </div>
          <h2 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '16px', color: '#ffffff' }}>FOCUS REQUIRED</h2>
          <p style={{ fontSize: '18px', color: '#e5e7eb', marginBottom: '24px', fontStyle: 'italic' }}>
            "{activeAlertMessage}"
          </p>
          <div style={{ color: '#9ca3af', fontSize: '13px', marginBottom: '32px', lineHeight: 1.5 }}>
            You have enabled Strict Focus Mode. This screen will lock until you acknowledge this warning message. Stop procrastinating and get back to work!
          </div>
          <button
            onClick={handleAcknowledge}
            style={{
              background: '#ef4444',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 32px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 0 15px rgba(239, 68, 68, 0.4)',
              transition: 'all 0.2s ease',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <ShieldCheck size={18} />
            I Acknowledge - Back to Work!
          </button>
        </div>
      )}

    </div>
  );
}

function getCategoryColorStyles(colorHex?: string, categoryName?: string) {
  const defaultColors: Record<string, string> = {
    'Career': '#8b5cf6', // purple
    'Health': '#10b981', // green
    'Finance': '#3b82f6', // blue
    'Business': '#6366f1', // indigo
    'Learning': '#f97316', // orange
    'Personal': '#ec4899'  // pink
  };

  const hex = colorHex || (categoryName ? defaultColors[categoryName] : null) || '#8b5cf6';

  let r = 139, g = 92, b = 246;
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (match) {
    r = parseInt(match[1], 16);
    g = parseInt(match[2], 16);
    b = parseInt(match[3], 16);
  }

  return {
    color: `rgb(${r}, ${g}, ${b})`,
    background: `rgba(${r}, ${g}, ${b}, 0.12)`,
    border: `1px solid rgba(${r}, ${g}, ${b}, 0.3)`
  };
}

// =============================================================
// MAIN SYSTEM APP: STANDARD WORKSPACE
// =============================================================
function MainDashboardApp() {
  const noteRichEditorRef = React.useRef<HTMLDivElement>(null);
  // Core State
  const [state, setState] = useState<AppState | null>(null);
  const [activeTab, setActiveTab] = useState<string>('home');
  const [showSplash, setShowSplash] = useState(true);
  const [editingReminderId, setEditingReminderId] = useState<string | null>(null);
  const [remFormDismissKey, setRemFormDismissKey] = useState<string>('D');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Active Timer and Break States
  const [timerType, setTimerType] = useState<FocusSessionType>('pomodoro');
  const [timerStatus, setTimerStatus] = useState<'idle' | 'running' | 'paused'>('idle');
  const [timeLeft, setTimeLeft] = useState<number>(25 * 60);
  const [timerDuration, setTimerDuration] = useState<number>(25);
  const [timerStreak, setTimerStreak] = useState<number>(0);
  const [breakStatus, setBreakStatus] = useState<'idle' | 'running' | 'paused'>('idle');
  const [breakTimeToday, setBreakTimeToday] = useState<number>(0);

  // Custom Timer and Break Timer additions
  const [customFocusMins, setCustomFocusMins] = useState<number>(30);
  const [draggedPanelId, setDraggedPanelId] = useState<string | null>(null);

  const [breakTimerMode, setBreakTimerMode] = useState<'preset-5' | 'preset-15' | 'allowance' | 'stopwatch'>('allowance');
  const [breakTimeLeft, setBreakTimeLeft] = useState<number>(60 * 60);
  const [breakTimerDuration, setBreakTimerDuration] = useState<number>(60);
  const [trackingTaskId, setTrackingTaskId] = useState<string | null>(null);
  const [trackingIntervalId, setTrackingIntervalId] = useState<any>(null);
  const [trackingSeconds, setTrackingSeconds] = useState<number>(0);

  // Custom Settings UI States
  const [isAuraActive, setIsAuraActive] = useState<boolean>(false);
  // const [selectedFocusModeId, setSelectedFocusModeId] = useState<string>('deepwork');

  // Strict Focus / Voice Alert States
  const [strictEscalationLevel, setStrictEscalationLevel] = useState<number>(0);
  const [activeAlertMessage, setActiveAlertMessage] = useState<string>('');
  const [strictIntervalId, setStrictIntervalId] = useState<any>(null);

  // Notes state
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [isWritingFullscreen, setIsWritingFullscreen] = useState(false);
  const [noteEditTitle, setNoteEditTitle] = useState('');
  const [noteEditContent, setNoteEditContent] = useState('');
  const [noteEditFolder, setNoteEditFolder] = useState('Drafts');
  const [noteEditCategory, setNoteEditCategory] = useState('Inbox');

  // Goals state
  // const [selectedMonth] = useState<Month>('June');
  const [newGoalCategory, setNewGoalCategory] = useState('Career');
  const [newGoalCategoryColor, setNewGoalCategoryColor] = useState('#8b5cf6');
  const [isAddGoalModalOpen, setIsAddGoalModalOpen] = useState(false);
  const [newGoalMilestones, setNewGoalMilestones] = useState<string[]>([]);
  const [newMilestoneText, setNewMilestoneText] = useState('');
  const [goalSortOption, setGoalSortOption] = useState<'recently-added' | 'deadline' | 'status' | 'category'>('recently-added');
  const [goalFilterCategory, setGoalFilterCategory] = useState<string>('All');
  const [goalFilterStatus, setGoalFilterStatus] = useState<string>('All');
  const [isCustomCategoryActive, setIsCustomCategoryActive] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalDeadline, setNewGoalDeadline] = useState('');
  const [newGoalNotes, setNewGoalNotes] = useState('');
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);

  // Tasks state
  const [taskSearch, setTaskSearch] = useState('');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskFormTitle, setTaskFormTitle] = useState('');
  const [taskFormColumn, setTaskFormColumn] = useState<TaskColumn>('todo');
  const [taskFormPriority, setTaskFormPriority] = useState<TaskPriority>('Medium');
  const [taskFormDueDate, setTaskFormDueDate] = useState('');
  const [taskFormLabel, setTaskFormLabel] = useState('');
  const [taskFormTags, setTaskFormTags] = useState<string[]>([]);
  const [taskFormEstTime, setTaskFormEstTime] = useState<number>(30);
  const [taskFormSpentTime, setTaskFormSpentTime] = useState<number>(0);
  const [taskFormNotes, setTaskFormNotes] = useState('');
  const [taskFormIsPinned, setTaskFormIsPinned] = useState(false);
  const [taskFormSubtasks, setTaskFormSubtasks] = useState<Subtask[]>([]);
  const [taskFormLinks, setTaskFormLinks] = useState<{ name: string; url: string }[]>([]);
  const [taskFormAttachments, setTaskFormAttachments] = useState<{ id: string; name: string; type: string; dataUrl: string; size: number }[]>([]);
  const [newSubtaskTitleText, setNewSubtaskTitleText] = useState('');
  const [newLinkNameText, setNewLinkNameText] = useState('');
  const [newLinkUrlText, setNewLinkUrlText] = useState('');
  const [manualTimeToAddText, setManualTimeToAddText] = useState('');
  const [taskFormTagInput, setTaskFormTagInput] = useState('');
  const [taskFilterPriority, setTaskFilterPriority] = useState<string>('All');
  const [taskFilterCategory, setTaskFilterCategory] = useState<string>('All');
  const [taskFilterDueDate, setTaskFilterDueDate] = useState<string>('All');
  const [taskSortOption, setTaskSortOption] = useState<string>('recently-added');
  const [isTaskCustomCategory, setIsTaskCustomCategory] = useState<boolean>(false);
  const [taskCustomCategoryInput, setTaskCustomCategoryInput] = useState<string>('');
  const [isKanbanHistoryOpen, setIsKanbanHistoryOpen] = useState<boolean>(false);

  // Analytics states
  const [analyticsTimeRange, setAnalyticsTimeRange] = useState<'all' | 'week' | 'today'>('all');
  const [analyticsCategory, setAnalyticsCategory] = useState<string>('All');

  // Schedule planner states
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [is24HourFormat, setIs24HourFormat] = useState(false);

  // Finance state (commented out due to unused)
  // const [financeType, setFinanceType] = useState<'income' | 'expense' | 'savings' | 'debt'>('income');
  // const [financeTitle, setFinanceTitle] = useState('');
  // const [financeAmount, setFinanceAmount] = useState('');
  // const [financeCategory, setFinanceCategory] = useState('');
  // const [financeTargetAmount, setFinanceTargetAmount] = useState('');
  // const [financeTargetMonth, setFinanceTargetMonth] = useState<Month>('June'); if (false) console.log(setFinanceTargetMonth);
  // const [financeNote, setFinanceNote] = useState('');
  // const [financeColor, setFinanceColor] = useState('#8b5cf6');
  // const [financeDate, setFinanceDate] = useState('');
  // const [financeSubTab, setFinanceSubTab] = useState<'transactions' | 'subscriptions' | 'analytics'>('transactions');

  // Subscriptions state (commented out due to unused)
  // const [subName, setSubName] = useState('');
  // const [subAmount, setSubAmount] = useState('');
  // const [subCycle, setSubCycle] = useState<'monthly' | 'yearly'>('monthly');
  // const [subCategory, setSubCategory] = useState('Entertainment');
  // const [subRenewal, setSubRenewal] = useState('');
  // const [subColor, setSubColor] = useState('#ec4899');

  // Notes Search & Filters state
  const [noteSearch, setNoteSearch] = useState('');
  const [noteFolderFilter, setNoteFolderFilter] = useState('All');
  const [noteBookmarkFilter, setNoteBookmarkFilter] = useState(false);

  // Reminders Pop-up modal state
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [remFormMessage, setRemFormMessage] = useState('');
  const [remFormType, setRemFormType] = useState<'daily' | 'weekly' | 'one-time' | 'interval' | 'countdown'>('daily');
  const [remFormTime, setRemFormTime] = useState('10:00');
  const [remFormCategory, setRemFormCategory] = useState('General');
  const [remFormSound, setRemFormSound] = useState('chime');
  const [remFormCountdownMins, setRemFormCountdownMins] = useState(10);
  const [remFormIntervalMins, setRemFormIntervalMins] = useState(30);
  const [remFormDaysOfWeek, setRemFormDaysOfWeek] = useState<string[]>([]);
  const [remFormLoopAlert, setRemFormLoopAlert] = useState(false);

  // Sound testing, loop alerts, and tooltip states
  const [activeLoopingReminder, setActiveLoopingReminder] = useState<VoiceReminder | null>(null);
  const [isSoundTesting, setIsSoundTesting] = useState(false);
  const [testAudioObj, setTestAudioObj] = useState<HTMLAudioElement | null>(null);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  const formatTimerTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const colonClass = timerStatus === 'running' ? 'timer-colon-blink' : '';

    if (h > 0) {
      return (
        <>
          {h}<span className={colonClass}>:</span>
          {String(m).padStart(2, '0')}<span className={colonClass}>:</span>
          {String(s).padStart(2, '0')}
        </>
      );
    }
    return (
      <>
        {m}<span className={colonClass}>:</span>
        {String(s).padStart(2, '0')}
      </>
    );
  };

  // Rebuilt Schedule grid form states
  const [schedStartTime, setSchedStartTime] = useState('09:00');
  const [schedEndTime, setSchedEndTime] = useState('10:00');
  const [schedTask, setSchedTask] = useState('');
  const [schedColor, setSchedColor] = useState('#8b5cf6');
  const [schedCategory, setSchedCategory] = useState('Work');

  // -------------------------------------------------------------
  // Initial Boot
  // -------------------------------------------------------------
  useEffect(() => {
    async function boot() {
      const loadedState = await loadState();

      // Sanitize and de-duplicate dashboardLayout on boot to prevent double widgets
      if (loadedState.settings) {
        const layout = loadedState.settings.dashboardLayout || { col1: ['tasks', 'goals'], col2: ['focusTimer', 'breakTimer'], col3: ['schedule', 'stats'] };
        
        // 1. Convert old 'timer' references
        const migrateTimer = (arr: string[]) => {
          const result: string[] = [];
          (arr || []).forEach(id => {
            if (id === 'timer') result.push('focusTimer', 'breakTimer');
            else result.push(id);
          });
          return result;
        };

        const rawCol1 = migrateTimer(layout.col1 || []);
        const rawCol2 = migrateTimer(layout.col2 || []);
        const rawCol3 = migrateTimer(layout.col3 || []);

        // 2. Deduplicate
        const seen = new Set<string>();
        const sanitize = (arr: string[]) => {
          return arr.filter(id => {
            if (!id || seen.has(id)) return false;
            seen.add(id);
            return true;
          });
        };

        const c1 = sanitize(rawCol1);
        const c2 = sanitize(rawCol2);
        const c3 = sanitize(rawCol3);

        // 3. Ensure all default panels exist exactly once
        const allPossiblePanels = ['tasks', 'goals', 'focusTimer', 'breakTimer', 'schedule', 'stats'];
        allPossiblePanels.forEach(panelId => {
          if (!seen.has(panelId)) {
            // Append missing panel to the shortest column
            const lengths = [c1.length, c2.length, c3.length];
            const minIndex = lengths.indexOf(Math.min(...lengths));
            if (minIndex === 0) c1.push(panelId);
            else if (minIndex === 1) c2.push(panelId);
            else c3.push(panelId);
            seen.add(panelId);
          }
        });

        loadedState.settings.dashboardLayout = { col1: c1, col2: c2, col3: c3 };
      }

      // Auto-cleanup deleted tasks and goals older than 15 days
      const autoClean = loadedState.settings.autoDeleteAfter15Days !== false;
      if (autoClean) {
        const fifteenDaysAgo = new Date();
        fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
        const limitStr = fifteenDaysAgo.toISOString();

        let changed = false;
        const cleanTasks = loadedState.tasks.filter(t => {
          if (t.isDeleted && t.deletedAt && t.deletedAt < limitStr) {
            changed = true;
            return false;
          }
          return true;
        });
        const cleanGoals = loadedState.goals.filter(g => {
          if (g.isDeleted && g.deletedAt && g.deletedAt < limitStr) {
            changed = true;
            return false;
          }
          return true;
        });

        if (changed) {
          loadedState.tasks = cleanTasks;
          loadedState.goals = cleanGoals;
        }
      }

      setState(loadedState);

      // Load speech voices
      const fetchedVoices = await getAvailableVoices();
      setVoices(fetchedVoices);

      // Select default voice if not set
      if (loadedState.settings.ttsVoice === '' && fetchedVoices.length > 0) {
        const defaultVoice = fetchedVoices.find(v => v.lang.includes('en')) || fetchedVoices[0];
        loadedState.settings.ttsVoice = defaultVoice.name;
        saveState(loadedState);
      }

      setIsAuraActive(loadedState.settings.isAuraActive);
      // setSelectedFocusModeId(loadedState.settings.currentFocusMode);
      const limitMins = loadedState.settings.breakAllowanceMinutes || 60;
      const todayStr = new Date().toISOString().split('T')[0];
      const todayStats = loadedState.activityLog.find(l => l.date === todayStr) || { breakSeconds: 0 };
      const remainingSecs = Math.max(0, (limitMins * 60) - todayStats.breakSeconds);
      setBreakTimeLeft(remainingSecs);
      setBreakTimerDuration(limitMins);
      setIsLoaded(true);

      // Set initial notes edit values
      if (loadedState.notes.length > 0) {
        const note = loadedState.notes[0];
        setSelectedNoteId(note.id);
        setNoteEditTitle(note.title);
        setNoteEditContent(note.content);
        setNoteEditFolder(note.folder);
        setNoteEditCategory(note.category);
      }
    }
    boot();
  }, []);

  // Splash screen auto-dismiss
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // -------------------------------------------------------------
  // Dynamic State Sync with Overlay Window via IPC
  // -------------------------------------------------------------
  useEffect(() => {
    if (isLoaded && state) {
      window.electronAPI?.send('overlay:update', {
        isAuraActive,
        auraConfig: state.settings.auraConfig,
        strictLevel: strictEscalationLevel,
        activeAlertMessage
      });
    }
  }, [isAuraActive, state?.settings?.auraConfig, strictEscalationLevel, activeAlertMessage, isLoaded]);

  // -------------------------------------------------------------
  // IPC listeners (for Main/Overlay sync & Hotkeys)
  // -------------------------------------------------------------
  useEffect(() => {
    const handleTrayCommand = (command: string) => {
      if (command === 'start-focus') {
        startFocusSession();
      } else if (command === 'reminder-acknowledged') {
        dismissStrictAlert();
      }
    };

    const handleHotkey = (hotkeyAction: string) => {
      if (hotkeyAction === 'toggle-aura') {
        setIsAuraActive(prev => !prev);
      } else if (hotkeyAction === 'enable-aura') {
        setIsAuraActive(true);
      } else if (hotkeyAction === 'snooze-reminder') {
        snoozeStrictAlert();
      } else if (hotkeyAction === 'dismiss-reminder') {
        dismissStrictAlert();
      } else if (hotkeyAction === 'start-focus') {
        startFocusSession();
      } else if (hotkeyAction === 'start-break') {
        startBreakTracking();
      } else if (hotkeyAction === 'quick-note') {
        setActiveTab('notes');
        setIsWritingFullscreen(true);
      }
    };

    window.electronAPI?.on('system-tray-command', handleTrayCommand);
    window.electronAPI?.on('global-hotkey-triggered', handleHotkey);
    window.electronAPI?.on('note:quick-open', () => {
      setActiveTab('notes');
      setIsWritingFullscreen(true);
    });

    return () => {
      window.electronAPI?.off('system-tray-command', handleTrayCommand);
      window.electronAPI?.off('global-hotkey-triggered', handleHotkey);
    };
  }, [isLoaded, timerStatus, timeLeft, state, isAuraActive, strictEscalationLevel]);

  // State auto-saver
  const updateState = (updater: (prev: AppState) => AppState) => {
    setState((prev) => {
      if (!prev) return null;
      const newState = updater(prev);
      saveState(newState);
      return newState;
    });
  };

  const updateSettings = (updates: Partial<AppSettings>) => {
    updateState((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...updates }
    }));
  };

  const handleLayoutDragStart = (panelId: string) => {
    setDraggedPanelId(panelId);
  };

  const handleLayoutDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleLayoutDrop = (targetCol: 'col1' | 'col2' | 'col3') => {
    if (!draggedPanelId || !state) return;
    const currentLayout = state.settings.dashboardLayout || { col1: ['tasks', 'goals'], col2: ['focusTimer', 'breakTimer'], col3: ['schedule', 'stats'] };
    
    const seen = new Set<string>();
    const cleanFilter = (arr: string[]) => {
      return (arr || []).filter(id => {
        if (id === draggedPanelId || !id || seen.has(id)) return false;
        seen.add(id);
        return true;
      });
    };

    const col1 = cleanFilter(currentLayout.col1 || []);
    const col2 = cleanFilter(currentLayout.col2 || []);
    const col3 = cleanFilter(currentLayout.col3 || []);
    
    if (targetCol === 'col1') col1.push(draggedPanelId);
    else if (targetCol === 'col2') col2.push(draggedPanelId);
    else if (targetCol === 'col3') col3.push(draggedPanelId);
    
    updateSettings({
      dashboardLayout: { col1, col2, col3 }
    });
    setDraggedPanelId(null);
  };

  const toggleDemoData = (checked: boolean) => {
    updateState((prev) => {
      if (checked) {
        const note = INITIAL_NOTES[0];
        if (note) {
          setSelectedNoteId(note.id);
          setNoteEditTitle(note.title);
          setNoteEditContent(note.content);
          setNoteEditFolder(note.folder);
          setNoteEditCategory(note.category);
        }
        return {
          ...prev,
          goals: INITIAL_GOALS,
          tasks: INITIAL_TASKS,
          reminders: INITIAL_REMINDERS,
          notes: INITIAL_NOTES,
          scheduleBlocks: INITIAL_SCHEDULE_BLOCKS,
          activityLog: generateActivityLogs(),
          settings: {
            ...prev.settings,
            useDemoData: true
          }
        };
      } else {
        setSelectedNoteId(null);
        setNoteEditTitle('');
        setNoteEditContent('');
        setNoteEditFolder('Drafts');
        setNoteEditCategory('Inbox');
        if (noteRichEditorRef.current) {
          noteRichEditorRef.current.innerHTML = '';
        }
        return {
          ...prev,
          goals: [],
          tasks: [],
          reminders: [],
          notes: [],
          scheduleBlocks: [],
          activityLog: [],
          settings: {
            ...prev.settings,
            useDemoData: false
          }
        };
      }
    });
  };

  // -------------------------------------------------------------
  // Focus Timer Logic
  // -------------------------------------------------------------
  useEffect(() => {
    if (timerStatus === 'running') {
      const id = setInterval(() => {
        if (timerType === 'stopwatch') {
          setTimeLeft((prev) => prev + 1);
        } else {
          setTimeLeft((prev) => {
            if (prev <= 1) {
              clearInterval(id);
              setTimerStatus('idle');
              handleFocusSessionCompleted();
              return 0;
            }
            return prev - 1;
          });
        }
      }, 1000);
      return () => clearInterval(id);
    }
  }, [timerStatus, timerType]);

  // Check reminder intervals during focus session
  useEffect(() => {
    if (timerStatus === 'running' && state) {
      const intervalMinutes = state.settings.focusInterval;
      const secondsPassed = timerType === 'stopwatch' ? timeLeft : timerDuration * 60 - timeLeft;

      if (secondsPassed > 0 && secondsPassed % (intervalMinutes * 60) === 0) {
        triggerFocusReminderAlert();
      }
    }
  }, [timeLeft, timerStatus, state, timerType, timerDuration]);

  const startFocusSession = () => {
    if (breakStatus === 'running') {
      stopBreakTracking();
    }
    setTimerStatus('running');
    setIsAuraActive(true); // Automatically activate the gorgeous Aura border during focus sprints!
  };

  const pauseFocusSession = () => {
    setTimerStatus('paused');
  };

  const resetFocusSession = () => {
    setTimerStatus('idle');
    setTimeLeft(timerType === 'stopwatch' ? 0 : timerDuration * 60);
    dismissStrictAlert();
  };

  const handleFocusSessionCompleted = () => {
    if (!state) return;

    speakText("Great job, Sai. Focus session completed. Take a break.", state.settings);
    setTimerStreak(prev => prev + 1);

    const now = new Date().toISOString();
    const duration = timerType === 'stopwatch' ? timeLeft : timerDuration * 60;
    const newSession: FocusSession = {
      id: Math.random().toString(),
      type: timerType,
      startTime: new Date(Date.now() - duration * 1000).toISOString(),
      endTime: now,
      durationSeconds: duration,
      mode: state.settings.currentFocusMode,
      completed: true
    };

    updateState((prev) => {
      const sessions = [...prev.focusSessions, newSession];
      const todayStr = new Date().toISOString().split('T')[0];
      const activityLog = prev.activityLog.map((log) => {
        if (log.date === todayStr) {
          const focusSeconds = log.focusSeconds + duration;
          return {
            ...log,
            focusSeconds,
            productivityScore: Math.min(100, log.productivityScore + 10)
          };
        }
        return log;
      });

      return { ...prev, focusSessions: sessions, activityLog };
    });
  };

  // -------------------------------------------------------------
  // Break Tracking Logic
  // -------------------------------------------------------------
  useEffect(() => {
    if (breakStatus === 'running') {
      const id = setInterval(() => {
        let currentTotalBreakSecs = 0;
        setBreakTimeToday((prev) => {
          const nextVal = prev + 1;
          if (state) {
            const todayStr = new Date().toISOString().split('T')[0];
            const todayBreakSeconds = (state.activityLog?.find(l => l.date === todayStr)?.breakSeconds || 0);
            currentTotalBreakSecs = todayBreakSeconds + nextVal;
          }
          return nextVal;
        });

        if (breakTimerMode !== 'stopwatch') {
          setBreakTimeLeft((prev) => {
            if (prev <= 1) {
              clearInterval(id);
              setBreakStatus('idle');
              if (state) speakText("Sai, your break has completed. Get back to focus.", state.settings, 1);
              return 0;
            }
            return prev - 1;
          });
        } else {
          if (currentTotalBreakSecs > 0 && currentTotalBreakSecs % 600 === 0 && state) {
            speakText("Sai, your break has exceeded ten minutes. Please return to work.", state.settings, 3);
          }
        }
      }, 1000);
      return () => clearInterval(id);
    }
  }, [breakStatus, breakTimerMode, state]);

  const startBreakTracking = () => {
    if (timerStatus === 'running') {
      pauseFocusSession();
    }

    if (breakTimerMode !== 'stopwatch' && breakTimeLeft <= 0) {
      if (breakTimerMode === 'preset-5') {
        setBreakTimeLeft(5 * 60);
      } else if (breakTimerMode === 'preset-15') {
        setBreakTimeLeft(15 * 60);
      } else if (breakTimerMode === 'allowance') {
        const limitMins = state?.settings?.breakAllowanceMinutes || 60;
        const todayStr = new Date().toISOString().split('T')[0];
        const todayBreakSeconds = (state?.activityLog?.find(l => l.date === todayStr)?.breakSeconds || 0);
        const remainingSecs = Math.max(0, (limitMins * 60) - todayBreakSeconds);
        setBreakTimeLeft(remainingSecs);
      }
    }
    setBreakStatus('running');
  };

  const pauseBreakTracking = () => {
    setBreakStatus('paused');
  };

  const stopBreakTracking = () => {
    setBreakStatus('idle');
    if (state) {
      updateState((prev) => {
        const todayStr = new Date().toISOString().split('T')[0];
        const activityLog = prev.activityLog.map((log) => {
          if (log.date === todayStr) {
            return {
              ...log,
              breakSeconds: log.breakSeconds + breakTimeToday
            };
          }
          return log;
        });
        return { ...prev, activityLog };
      });
    }
    setBreakTimeToday(0);
  };

  const selectBreakMode = (mode: 'preset-5' | 'preset-15' | 'allowance' | 'stopwatch') => {
    setBreakTimerMode(mode);
    setBreakStatus('idle');
    if (mode === 'preset-5') {
      setBreakTimeLeft(5 * 60);
      setBreakTimerDuration(5);
    } else if (mode === 'preset-15') {
      setBreakTimeLeft(15 * 60);
      setBreakTimerDuration(15);
    } else if (mode === 'allowance') {
      const limitMins = state?.settings?.breakAllowanceMinutes || 60;
      const todayStr = new Date().toISOString().split('T')[0];
      const todayBreakSeconds = (state?.activityLog?.find(l => l.date === todayStr)?.breakSeconds || 0);
      const remainingSecs = Math.max(0, (limitMins * 60) - todayBreakSeconds);
      setBreakTimeLeft(remainingSecs);
      setBreakTimerDuration(limitMins);
    } else {
      setBreakTimeLeft(0);
      setBreakTimerDuration(0);
    }
  };

  // -------------------------------------------------------------
  // Kanban Task Stopwatch tracking
  // -------------------------------------------------------------
  const toggleTaskTimeTracking = (taskId: string) => {
    if (trackingTaskId === taskId) {
      if (trackingIntervalId) clearInterval(trackingIntervalId);
      setTrackingTaskId(null);
      setTrackingIntervalId(null);
      setTrackingSeconds(0);
    } else {
      if (trackingIntervalId) clearInterval(trackingIntervalId);

      setTrackingTaskId(taskId);
      setTrackingSeconds(0);

      // Auto move task to in-progress if it's currently in todo
      updateState((prev) => {
        const tasks = prev.tasks.map((t) => {
          if (t.id === taskId && t.column === 'todo') {
            return { ...t, column: 'in-progress' as TaskColumn };
          }
          return t;
        });
        return { ...prev, tasks };
      });

      const id = setInterval(() => {
        setTrackingSeconds(s => {
          const nextSec = s + 1;
          if (nextSec % 60 === 0) {
            updateState((prev) => {
              const tasks = prev.tasks.map((t) => {
                if (t.id === taskId) {
                  return { ...t, spentTime: t.spentTime + 1 };
                }
                return t;
              });
              return { ...prev, tasks };
            });
          }
          return nextSec;
        });
      }, 1000); // Ticks every 1s
      setTrackingIntervalId(id);
    }
  };

  // Clean active timers on unmount
  useEffect(() => {
    return () => {
      if (trackingIntervalId) clearInterval(trackingIntervalId);
      if (strictIntervalId) clearInterval(strictIntervalId);
    };
  }, [trackingIntervalId, strictIntervalId]);

  // const selectFocusMode = (modeId: string) => {
  //   if (!state) return;
  //   const mode = state.settings.focusModes.find(m => m.id === modeId);
  //   if (!mode) return;
  //   
  //   setSelectedFocusModeId(modeId);
  //   updateState((prev) => {
  //     const newSettings = {
  //       ...prev.settings,
  //       currentFocusMode: modeId,
  //       focusInterval: mode.reminderInterval,
  //       customFocusMessages: mode.voiceReminders,
  //       auraConfig: {
  //         ...prev.settings.auraConfig,
  //         colors: mode.colors,
  //         mode: (mode.borderStyle === 'flowing' ? 'normal' : mode.borderStyle === 'pulse' ? 'subtle' : 'aggressive') as 'subtle' | 'normal' | 'aggressive'
  //       }
  //     };
  //     return { ...prev, settings: newSettings };
  //   });
  // };

  // -------------------------------------------------------------
  // Voice Reminder Alert Schedulers (Strict Mode & Escalations)
  // -------------------------------------------------------------
  const getCustomSoundData = (soundEffect: string) => {
    if (!state) return undefined;
    if (soundEffect.startsWith('custom-')) {
      const id = soundEffect.replace('custom-', '');
      return state.settings.customReminderSounds?.find(cs => cs.id === id)?.dataUrl;
    }
    if (soundEffect === 'custom') {
      return state.settings.customReminderSound;
    }
    return undefined;
  };

  const formatTime = (timeString: string, is24h: boolean) => {
    if (!timeString) return '';
    if (is24h) return timeString;
    const [hStr, mStr] = timeString.split(':');
    const h = parseInt(hStr, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    return `${String(displayH).padStart(2, '0')}:${mStr} ${ampm}`;
  };

  const playAlertAndSpeak = (message: string, soundType: string = 'chime') => {
    if (!state) return;
    const soundData = getCustomSoundData(soundType);
    playSynthSound(soundType, soundData);

    setTimeout(() => {
      speakText(message, state.settings, 1);
    }, 800);
  };

  const triggerFocusReminderAlert = () => {
    if (!state) return;

    const mode = state.settings.currentFocusMode;
    let message = "Sai, get back to work.";

    if (mode === 'auradev') {
      message = "Time to work on Aura.";
    } else if (mode === 'jobsearch') {
      message = "Send job applications.";
    } else if (mode === 'learning') {
      message = "Practice French.";
    } else {
      const prompts = state.settings.customFocusMessages;
      message = prompts[Math.floor(Math.random() * prompts.length)];
    }

    setActiveAlertMessage(message);
    setStrictEscalationLevel(1);
    playAlertAndSpeak(message, 'chime');

    // If Strict Focus Enforcement is enabled, handle escalation timers
    if (state.settings.strictModeEnabled) {
      if (strictIntervalId) clearInterval(strictIntervalId);

      let level = 1;
      const intervalId = setInterval(() => {
        level = Math.min(4, level + 1);
        setStrictEscalationLevel(level);
        playAlertAndSpeak(message, 'chime');
      }, 15000); // Escalates level every 15 seconds for testing/speed.

      setStrictIntervalId(intervalId);
    }
  };

  const dismissStrictAlert = () => {
    stopSpeaking();
    if (strictIntervalId) clearInterval(strictIntervalId);
    setStrictIntervalId(null);
    setStrictEscalationLevel(0);
    setActiveAlertMessage('');
  };

  const snoozeStrictAlert = () => {
    stopSpeaking();
    if (strictIntervalId) clearInterval(strictIntervalId);
    setStrictEscalationLevel(0);

    // Snooze for 3 minutes
    setTimeout(() => {
      triggerFocusReminderAlert();
    }, 180000);
  };

  // Looping Voice Reminder action triggers
  const triggerReminderAlert = (r: any) => {
    if (r.isLoopingAlert) {
      setActiveLoopingReminder(r);
    } else {
      playAlertAndSpeak(r.message, r.soundEffect || 'chime');
      setActiveAlertMessage(r.message);
      setStrictEscalationLevel(1);
    }
  };

  const dismissLoopingReminder = () => {
    setActiveLoopingReminder(null);
    stopSpeaking();
  };

  const handleOpenReminderAddModal = () => {
    setEditingReminderId(null);
    setRemFormMessage('');
    setRemFormType('daily');
    setRemFormTime('10:00');
    setRemFormCategory('General');
    setRemFormSound('chime');
    setRemFormCountdownMins(10);
    setRemFormIntervalMins(30);
    setRemFormDaysOfWeek([]);
    setRemFormLoopAlert(false);
    setRemFormDismissKey('D');
    setIsReminderModalOpen(true);
  };

  const handleOpenReminderEditModal = (r: VoiceReminder) => {
    setEditingReminderId(r.id);
    setRemFormMessage(r.message);
    setRemFormType(r.type);
    setRemFormTime(r.time);
    setRemFormCategory(r.category || 'General');
    setRemFormSound(r.soundEffect || 'chime');
    setRemFormCountdownMins(r.countdownMinutes || 10);
    setRemFormIntervalMins(r.intervalMinutes || 30);
    setRemFormDaysOfWeek(r.daysOfWeek || []);
    setRemFormLoopAlert(!!r.isLoopingAlert);
    setRemFormDismissKey(r.dismissKey || 'D');
    setIsReminderModalOpen(true);
  };

  // Repeating synthesized audio loop for strict alerts
  useEffect(() => {
    if (!activeLoopingReminder) return;

    const playLoop = () => {
      const soundType = activeLoopingReminder.soundEffect || 'chime';
      const soundData = getCustomSoundData(soundType);
      playSynthSound(soundType, soundData);
      setTimeout(() => {
        if (state) {
          speakText(activeLoopingReminder.message, state.settings);
        }
      }, 800);
    };

    playLoop();
    const loopId = setInterval(playLoop, 6000); // repeat every 6 seconds

    return () => {
      clearInterval(loopId);
      stopSpeaking();
    };
  }, [activeLoopingReminder, state?.settings]);

  // Global keyboard shortcuts listeners (Ctrl+Shift+<CustomKey> to dismiss looping reminders and strict alerts)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const dismissKey = (activeLoopingReminder?.dismissKey || state?.settings.loopDismissKey || 'D').toUpperCase();
      if (e.ctrlKey && e.shiftKey && e.key.toUpperCase() === dismissKey) {
        e.preventDefault();
        dismissLoopingReminder();
        dismissStrictAlert();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeLoopingReminder, state?.settings.loopDismissKey]);

  // Advanced scheduling and background counting engine for voice reminders
  useEffect(() => {
    const timerId = setInterval(() => {
      if (!state) return;
      const now = new Date();
      const HH = String(now.getHours()).padStart(2, '0');
      const MM = String(now.getMinutes()).padStart(2, '0');
      const currentTime = `${HH}:${MM}`;
      const currentDayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()];

      let stateChanged = false;
      const updatedReminders = state.reminders.map((r: any) => {
        if (!r.isActive) return r;

        // 1. Time / Day Schedule
        if (r.type === 'daily' || r.type === 'weekly' || r.type === 'one-time' || !r.type) {
          if (r.time === currentTime) {
            // Check day constraint if week constraints apply
            if (r.daysOfWeek && r.daysOfWeek.length > 0 && !r.daysOfWeek.includes(currentDayName)) {
              return r;
            }
            const lastAlertKey = `alert_${r.id}_${currentTime}`;
            if (localStorage.getItem(lastAlertKey) !== 'true') {
              localStorage.setItem(lastAlertKey, 'true');
              triggerReminderAlert(r);

              if (r.type === 'one-time') {
                stateChanged = true;
                return { ...r, isActive: false };
              }
            }
          }
        }

        // 2. Countdown Schedule
        if (r.type === 'countdown') {
          if (r.countdownMinutes && r.countdownMinutes > 0) {
            const elapsedSeconds = r.elapsedSeconds ? r.elapsedSeconds + 15 : 15;
            if (elapsedSeconds >= r.countdownMinutes * 60) {
              triggerReminderAlert(r);
              stateChanged = true;
              return { ...r, isActive: false, elapsedSeconds: 0 };
            } else {
              stateChanged = true;
              return { ...r, elapsedSeconds };
            }
          }
        }

        // 3. Repeating Interval Schedule
        if (r.type === 'interval') {
          if (r.intervalMinutes && r.intervalMinutes > 0) {
            const elapsedSeconds = r.elapsedSeconds ? r.elapsedSeconds + 15 : 15;
            if (elapsedSeconds >= r.intervalMinutes * 60) {
              triggerReminderAlert(r);
              stateChanged = true;
              return { ...r, elapsedSeconds: 0 };
            } else {
              stateChanged = true;
              return { ...r, elapsedSeconds };
            }
          }
        }

        return r;
      });

      if (stateChanged) {
        updateState((prev) => ({ ...prev, reminders: updatedReminders }));
      }
    }, 15000);

    return () => clearInterval(timerId);
  }, [state]);

  // -------------------------------------------------------------
  // HTML5 Kanban Drag-and-Drop
  // -------------------------------------------------------------
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedTaskId(id);
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, column: TaskColumn) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (!id) return;

    updateState((prev) => {
      const tasks = prev.tasks.map((t) => {
        if (t.id === id) {
          const completedAt = column === 'completed' ? new Date().toISOString() : undefined;
          return { ...t, column, completedAt };
        }
        return t;
      });

      if (column === 'completed') {
        const todayStr = new Date().toISOString().split('T')[0];
        const activityLog = prev.activityLog.map((log) => {
          if (log.date === todayStr) {
            return {
              ...log,
              tasksCompletedCount: log.tasksCompletedCount + 1,
              productivityScore: Math.min(100, log.productivityScore + 5)
            };
          }
          return log;
        });
        return { ...prev, tasks, activityLog };
      }

      return { ...prev, tasks };
    });
    setDraggedTaskId(null);
  };

  // Helper to retrieve custom color for task category
  const getCategoryColor = (cat: string) => {
    if (state?.settings.categoryColors && state.settings.categoryColors[cat]) {
      return state.settings.categoryColors[cat];
    }
    // Default fallback colors for categories
    const defaults: Record<string, string> = {
      'Work': '#3b82f6',     // Blue
      'Personal': '#10b981', // Green
      'Learning': '#f59e0b', // Orange/Yellow
      'Health': '#ef4444',   // Red
      'Finance': '#14b8a6'   // Teal
    };
    return defaults[cat] || '#8b5cf6'; // Default Purple
  };

  // Kanban tasks filtering and sorting
  const filteredTasks = state?.tasks.filter(t => {
    // 1. Soft-delete filter
    if (t.isDeleted) return false;

    // 2. Archive filter
    if (t.isArchived) return false;

    // 3. Search query filter
    const query = taskSearch.toLowerCase();
    const matchesSearch = !query ||
      t.title.toLowerCase().includes(query) ||
      (t.label || '').toLowerCase().includes(query) ||
      t.tags.some(tag => tag.toLowerCase().includes(query));
    if (!matchesSearch) return false;

    // 4. Priority filter
    if (taskFilterPriority !== 'All' && t.priority !== taskFilterPriority) return false;

    // 5. Category filter
    if (taskFilterCategory !== 'All' && t.label !== taskFilterCategory) return false;

    // 6. Due Date filter
    if (taskFilterDueDate !== 'All') {
      const todayStr = new Date().toISOString().split('T')[0];
      const dueDateStr = t.dueDate;
      if (taskFilterDueDate === 'today') {
        if (dueDateStr !== todayStr) return false;
      } else if (taskFilterDueDate === 'overdue') {
        if (dueDateStr >= todayStr || t.column === 'completed') return false;
      } else if (taskFilterDueDate === 'week') {
        const today = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 7);
        const due = new Date(dueDateStr);
        const todayStart = new Date(today.setHours(0, 0, 0, 0));
        const nextWeekEnd = new Date(nextWeek.setHours(23, 59, 59, 999));
        if (due < todayStart || due > nextWeekEnd) return false;
      }
    }

    return true;
  }).sort((a, b) => {
    // Pinned tasks always stay at the top
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;

    if (taskSortOption === 'due-date') {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      const dateCompare = a.dueDate.localeCompare(b.dueDate);
      if (dateCompare !== 0) return dateCompare;
      const weight: Record<string, number> = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
      return (weight[b.priority] || 0) - (weight[a.priority] || 0);
    }
    if (taskSortOption === 'priority') {
      const weight: Record<string, number> = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
      const weightCompare = (weight[b.priority] || 0) - (weight[a.priority] || 0);
      if (weightCompare !== 0) return weightCompare;
      return (a.dueDate || '').localeCompare(b.dueDate || '');
    }
    if (taskSortOption === 'est-time') {
      return b.estTime - a.estTime;
    }
    if (taskSortOption === 'spent-time') {
      return b.spentTime - a.spentTime;
    }
    if (taskSortOption === 'milestones') {
      const getProgress = (t: Task) => {
        if (!t.subtasks || t.subtasks.length === 0) return 0;
        return t.subtasks.filter(s => s.completed).length / t.subtasks.length;
      };
      return getProgress(b) - getProgress(a);
    }
    // Default: 'recently-added'
    return b.createdAt.localeCompare(a.createdAt);
  }) || [];



  // Helper to generate styled borders and shadows based on task priority and state
  const getTaskCardStyles = (task: Task) => {
    let borderColor = 'var(--border-glass)';
    let shadowColor = 'rgba(0,0,0,0)';
    let priorityLeftBorderColor = 'rgba(255, 255, 255, 0.1)';

    if (task.priority === 'Critical') {
      borderColor = 'rgba(239, 68, 68, 0.4)';
      shadowColor = 'rgba(239, 68, 68, 0.08)';
      priorityLeftBorderColor = '#ef4444';
    } else if (task.priority === 'High') {
      borderColor = 'rgba(245, 158, 11, 0.4)';
      shadowColor = 'rgba(245, 158, 11, 0.08)';
      priorityLeftBorderColor = '#f59e0b';
    } else if (task.priority === 'Medium') {
      borderColor = 'rgba(234, 179, 8, 0.4)';
      shadowColor = 'rgba(234, 179, 8, 0.08)';
      priorityLeftBorderColor = '#eab308';
    } else if (task.priority === 'Low') {
      borderColor = 'rgba(16, 185, 129, 0.4)';
      shadowColor = 'rgba(16, 185, 129, 0.08)';
      priorityLeftBorderColor = '#10b981';
    }

    const isTracking = trackingTaskId === task.id;

    return {
      padding: '10px',
      margin: '0 0 6px 0',
      cursor: 'grab',
      border: isTracking ? '1px solid rgba(234, 179, 8, 0.6)' : `1px solid ${borderColor}`,
      boxShadow: isTracking
        ? '0 0 15px rgba(234, 179, 8, 0.5)'
        : `0 4px 12px 0 rgba(0,0,0,0.3), 0 0 10px ${shadowColor}`,
      borderLeft: `4px solid ${priorityLeftBorderColor}`,
      borderTop: task.isPinned ? '3px solid #d946ef' : undefined,
      backgroundColor: isTracking ? 'rgba(234, 179, 8, 0.04)' : undefined,
    };
  };

  const getPriorityBadgeStyles = (priority: TaskPriority) => {
    const config = {
      'Critical': { bg: 'rgba(239, 68, 68, 0.2)', text: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.4)' },
      'High': { bg: 'rgba(245, 158, 11, 0.2)', text: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.4)' },
      'Medium': { bg: 'rgba(234, 179, 8, 0.2)', text: '#eab308', border: '1px solid rgba(234, 179, 8, 0.4)' },
      'Low': { bg: 'rgba(16, 185, 129, 0.2)', text: '#10b981', border: '1px solid rgba(16, 185, 129, 0.4)' }
    };
    return config[priority] || config['Medium'];
  };

  // Task details modal handlers
  const handleOpenTaskModal = (task?: Task) => {
    if (task) {
      setEditingTaskId(task.id);
      setTaskFormTitle(task.title);
      setTaskFormColumn(task.column);
      setTaskFormPriority(task.priority);
      setTaskFormDueDate(task.dueDate || new Date().toISOString().split('T')[0]);
      setTaskFormLabel(task.label || 'Task');
      setTaskFormTags(task.tags || []);
      setTaskFormEstTime(task.estTime || 30);
      setTaskFormSpentTime(task.spentTime || 0);
      setTaskFormNotes(task.notes || '');
      setTaskFormIsPinned(!!task.isPinned);
      setTaskFormSubtasks(task.subtasks || []);
      setTaskFormLinks(task.links || []);
      setTaskFormAttachments(task.attachments || []);

      const defaultCats = ['Work', 'Personal', 'Learning', 'Health', 'Finance'];
      const isCustom = task.label ? !defaultCats.includes(task.label) : false;
      setIsTaskCustomCategory(isCustom);
      setTaskCustomCategoryInput(isCustom ? task.label : '');
    } else {
      setEditingTaskId(null);
      setTaskFormTitle('');
      setTaskFormColumn('todo');
      setTaskFormPriority('Medium');
      setTaskFormDueDate(new Date().toISOString().split('T')[0]);
      setTaskFormLabel('Work'); // Default to Work
      setTaskFormTags([]);
      setTaskFormEstTime(30);
      setTaskFormSpentTime(0);
      setTaskFormNotes('');
      setTaskFormIsPinned(false);
      setTaskFormSubtasks([]);
      setTaskFormLinks([]);
      setTaskFormAttachments([]);
      setIsTaskCustomCategory(false);
      setTaskCustomCategoryInput('');
    }
    setNewSubtaskTitleText('');
    setNewLinkNameText('');
    setNewLinkUrlText('');
    setManualTimeToAddText('');
    setTaskFormTagInput('');
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskFormTitle.trim()) return;

    let additionalMinutes = 0;
    if (manualTimeToAddText.trim()) {
      const parsed = parseInt(manualTimeToAddText);
      if (!isNaN(parsed) && parsed > 0) {
        additionalMinutes = parsed;
      }
    }

    const finalLabel = isTaskCustomCategory
      ? (taskCustomCategoryInput.trim() || 'Task')
      : (taskFormLabel || 'Task');

    const updatedTaskFields = {
      title: taskFormTitle,
      column: taskFormColumn,
      priority: taskFormPriority,
      dueDate: taskFormDueDate,
      label: finalLabel,
      tags: taskFormTags,
      estTime: Number(taskFormEstTime) || 30,
      spentTime: (Number(taskFormSpentTime) || 0) + additionalMinutes,
      notes: taskFormNotes,
      isPinned: taskFormIsPinned,
      subtasks: taskFormSubtasks,
      links: taskFormLinks,
      attachments: taskFormAttachments,
    };

    updateState((prev) => {
      let tasks;
      if (editingTaskId) {
        tasks = prev.tasks.map((t) => {
          if (t.id === editingTaskId) {
            const completedAt = taskFormColumn === 'completed' && t.column !== 'completed' ? new Date().toISOString() : t.completedAt;
            return { ...t, ...updatedTaskFields, completedAt };
          }
          return t;
        });
      } else {
        const newTask: Task = {
          id: Math.random().toString(),
          ...updatedTaskFields,
          isRecurring: false,
          isArchived: false,
          createdAt: new Date().toISOString()
        };
        tasks = [newTask, ...prev.tasks];
      }

      if (taskFormColumn === 'completed') {
        const todayStr = new Date().toISOString().split('T')[0];
        const activityLog = prev.activityLog.map((log) => {
          if (log.date === todayStr) {
            return {
              ...log,
              tasksCompletedCount: log.tasksCompletedCount + 1,
              productivityScore: Math.min(100, log.productivityScore + 5)
            };
          }
          return log;
        });
        return { ...prev, tasks, activityLog };
      }

      return { ...prev, tasks };
    });

    setIsTaskModalOpen(false);
  };

  const handleDeleteTask = (taskId: string) => {
    if (window.confirm("Are you sure you want to delete this task? You can recover it from Deleted History.")) {
      updateState((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) => {
          if (t.id === taskId) {
            return { ...t, isDeleted: true, deletedAt: new Date().toISOString() };
          }
          return t;
        })
      }));
      setIsTaskModalOpen(false);
    }
  };

  const handleTaskAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Data = reader.result as string;
        setTaskFormAttachments((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            name: file.name,
            type: file.type,
            dataUrl: base64Data,
            size: file.size
          }
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  // Notes actions
  const selectNote = (noteId: string) => {
    const note = state?.notes.find((n) => n.id === noteId);
    if (!note) return;
    setSelectedNoteId(noteId);
    setNoteEditTitle(note.title);
    setNoteEditContent(note.content);
    setNoteEditFolder(note.folder);
    setNoteEditCategory(note.category);
    setTimeout(() => {
      if (noteRichEditorRef.current) {
        noteRichEditorRef.current.innerHTML = note.content || '';
      }
    }, 50);
  };

  const saveActiveNote = () => {
    if (!selectedNoteId) return;
    updateState((prev) => {
      const notes = prev.notes.map((n) => {
        if (n.id === selectedNoteId) {
          return {
            ...n,
            title: noteEditTitle,
            content: noteEditContent,
            folder: noteEditFolder,
            category: noteEditCategory,
            lastModified: new Date().toISOString()
          };
        }
        return n;
      });
      return { ...prev, notes };
    });
  };

  const createNewNote = () => {
    const newNote: Note = {
      id: Math.random().toString(),
      title: 'Untitled Note',
      content: '',
      category: 'General',
      tags: [],
      folder: 'Drafts',
      isPinned: false,
      lastModified: new Date().toISOString(),
      type: 'quick'
    };

    updateState((prev) => ({
      ...prev,
      notes: [newNote, ...prev.notes]
    }));
    setSelectedNoteId(newNote.id);
    setNoteEditTitle(newNote.title);
    setNoteEditContent('');
    setNoteEditFolder(newNote.folder);
    setNoteEditCategory(newNote.category);
    setTimeout(() => {
      if (noteRichEditorRef.current) {
        noteRichEditorRef.current.innerHTML = '';
      }
    }, 50);
  };

  const handleNoteRichChange = () => {
    if (noteRichEditorRef.current && selectedNoteId) {
      const html = noteRichEditorRef.current.innerHTML;
      setNoteEditContent(html);
      updateState((prev) => {
        const notes = prev.notes.map((n) => {
          if (n.id === selectedNoteId) {
            return {
              ...n,
              content: html,
              lastModified: new Date().toISOString()
            };
          }
          return n;
        });
        return { ...prev, notes };
      });
    }
  };

  // Goal actions
  const toggleGoalStatus = (goalId: string) => {
    updateState((prev) => {
      const goals = prev.goals.map((g) => {
        if (g.id === goalId) {
          const nextStatus: GoalStatus = g.status === 'Completed' ? 'In Progress' : 'Completed';
          const progress = nextStatus === 'Completed' ? 100 : 50;
          return { ...g, status: nextStatus, progress, achievementUnlocked: nextStatus === 'Completed' };
        }
        return g;
      });
      return { ...prev, goals };
    });
  };

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const category = isCustomCategoryActive ? customCategoryInput : newGoalCategory;

    if (!newGoalTitle || !category) return;

    if (editingGoalId) {
      updateState((prev) => {
        const goals = prev.goals.map((g) => {
          if (g.id === editingGoalId) {
            const milestones = newGoalMilestones.map((m, idx) => {
              const existing = g.milestones.find(em => em.title === m);
              return existing || { id: `${Math.random()}_${idx}`, title: m, completed: false };
            });
            const compCount = milestones.filter(ms => ms.completed).length;
            const progress = milestones.length > 0 ? Math.round((compCount / milestones.length) * 100) : g.progress;
            const status = (progress === 100 ? 'Completed' : progress > 0 ? 'In Progress' : 'Not Started') as GoalStatus;

            return {
              ...g,
              title: newGoalTitle,
              category,
              categoryColor: newGoalCategoryColor,
              deadline: newGoalDeadline || new Date().toISOString().split('T')[0],
              notes: newGoalNotes,
              milestones,
              progress,
              status
            };
          }
          return g;
        });
        return { ...prev, goals };
      });
    } else {
      const newGoal: Goal = {
        id: Math.random().toString(),
        title: newGoalTitle,
        month: 'June',
        status: 'Not Started',
        progress: 0,
        isPinned: false,
        deadline: newGoalDeadline || new Date().toISOString().split('T')[0],
        category,
        categoryColor: newGoalCategoryColor,
        notes: newGoalNotes,
        milestones: newGoalMilestones.map((m, idx) => ({ id: `${Math.random()}_${idx}`, title: m, completed: false })),
        createdAt: new Date().toISOString()
      };

      updateState((prev) => ({
        ...prev,
        goals: [newGoal, ...prev.goals]
      }));
    }

    setIsAddGoalModalOpen(false);
    setEditingGoalId(null);
    setNewGoalTitle('');
    setNewGoalDeadline('');
    setNewGoalNotes('');
    setNewGoalMilestones([]);
    setNewMilestoneText('');
    setCustomCategoryInput('');
    setIsCustomCategoryActive(false);
    setNewGoalCategoryColor('#8b5cf6');
  };

  // Rebuilt Schedule activity blocker actions
  const handleAddScheduleBlock = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!schedTask) return;

    const newBlock = {
      id: Math.random().toString(),
      startTime: schedStartTime,
      endTime: schedEndTime,
      task: schedTask,
      color: schedColor,
      category: schedCategory || 'Work'
    };

    updateState((prev) => ({
      ...prev,
      scheduleBlocks: [...(prev.scheduleBlocks || []), newBlock]
    }));

    setSchedTask('');
    setIsScheduleModalOpen(false);
  };

  const handleDragStartPanel = (e: React.DragEvent, panelId: string) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('select') || target.closest('textarea')) {
      e.preventDefault();
      return;
    }
    handleLayoutDragStart(panelId);
  };

  const renderPanel = (panelId: string) => {
    if (!state) return null;
    switch (panelId) {
      case 'tasks': {
        const activeTasks = state.tasks.filter(t => !t.isArchived && t.column !== 'completed');
        const sortedTasks = [...activeTasks].sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return 0;
        });

        return (
          <div
            key="tasks"
            draggable
            onDragStart={(e) => handleDragStartPanel(e, 'tasks')}
            className="glass-panel"
            style={{ padding: '24px', cursor: 'grab' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Move size={14} style={{ color: 'var(--text-muted)', cursor: 'grab' }} />
                <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Today's Tasks</h3>
              </div>
              <button 
                onClick={() => setActiveTab('tasks')} 
                style={{ background: 'none', border: 'none', color: 'var(--color-purple-light)', cursor: 'pointer', fontSize: '13px' }}
                onDragStart={(e) => e.stopPropagation()}
                draggable={false}
              >
                View Board
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {sortedTasks.slice(0, 5).map((task) => (
                <div
                  key={task.id}
                  className="glass-card animate-slide-up"
                  style={{
                    padding: '14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderLeft: task.isPinned ? '3px solid var(--color-purple)' : undefined,
                    cursor: 'pointer'
                  }}
                  onClick={() => handleOpenTaskModal(task)}
                >
                  <div style={{ minWidth: 0, flex: 1, marginRight: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {task.isPinned && <Pin size={12} style={{ color: 'var(--color-purple-light)', transform: 'rotate(45deg)', flexShrink: 0 }} />}
                      <span style={{
                        width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                        background: task.column === 'completed' ? 'var(--color-completed)' : (task.priority === 'Critical' ? '#ef4444' : task.priority === 'High' ? '#f59e0b' : task.priority === 'Medium' ? '#eab308' : '#10b981')
                      }}></span>
                      <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: task.column === 'completed' ? 'var(--text-secondary)' : undefined }}>{task.title}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px', marginLeft: '16px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '11px',
                        fontWeight: 500,
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#e5e7eb',
                        padding: '2px 6px',
                        borderRadius: '4px'
                      }}>
                        <Calendar size={11} style={{ color: 'var(--color-purple-light)' }} />
                        <span>Due: {task.dueDate}</span>
                      </span>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '11px',
                        fontWeight: 500,
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#e5e7eb',
                        padding: '2px 6px',
                        borderRadius: '4px'
                      }}>
                        <Clock size={11} style={{ color: 'var(--color-purple-light)' }} />
                        <span>Est: {task.estTime}m</span>
                      </span>
                    </div>
                  </div>
                  <button
                    className="glass-button"
                    style={{ padding: '6px 12px', fontSize: '12px', flexShrink: 0 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleTaskTimeTracking(task.id);
                    }}
                    onDragStart={(e) => e.stopPropagation()}
                    draggable={false}
                  >
                    {trackingTaskId === task.id ? <Pause size={12} /> : <Play size={12} />}
                    <span>{trackingTaskId === task.id ? 'Tracking' : 'Track'}</span>
                  </button>
                </div>
              ))}
              {sortedTasks.length === 0 && (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '13px' }}>No active tasks for today. Awesome!</div>
              )}
            </div>
          </div>
        );
      }
      case 'goals': {
        const activeGoals = state.goals.filter(g => !g.isDeleted && g.status !== 'Completed');
        return (
          <div
            key="goals"
            draggable
            onDragStart={(e) => handleDragStartPanel(e, 'goals')}
            className="glass-panel"
            style={{ padding: '24px', cursor: 'grab' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Move size={14} style={{ color: 'var(--text-muted)', cursor: 'grab' }} />
                <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Active Goals</h3>
              </div>
              <button 
                onClick={() => setActiveTab('goals')} 
                style={{ background: 'none', border: 'none', color: 'var(--color-purple-light)', cursor: 'pointer', fontSize: '13px' }}
                onDragStart={(e) => e.stopPropagation()}
                draggable={false}
              >
                View Goals
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {activeGoals.slice(0, 4).map((goal) => (
                <div key={goal.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 500 }}>{goal.title}</span>
                    <span style={{ color: 'var(--color-purple-light)' }}>{goal.progress}%</span>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${goal.progress}%`, background: 'linear-gradient(90deg, var(--color-purple), var(--color-pink))', borderRadius: '4px' }}></div>
                  </div>
                </div>
              ))}
              {activeGoals.length === 0 && (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '13px' }}>No active goals. Add some to get started!</div>
              )}
            </div>
          </div>
        );
      }
      case 'focusTimer': {
        return (
          <div
            key="focusTimer"
            draggable
            onDragStart={(e) => handleDragStartPanel(e, 'focusTimer')}
            className="glass-panel"
            style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', cursor: 'grab', minHeight: '410px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Move size={14} style={{ color: 'var(--text-muted)', cursor: 'grab' }} />
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Focus Tracker</h3>
              </div>
              <Clock size={16} style={{ color: 'var(--color-purple-light)' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              {/* Mode Selector */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', width: '100%' }}>
                {['pomodoro', 'deepwork', 'custom', 'stopwatch'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={`glass-button ${timerType === type ? 'active' : ''}`}
                    style={{ flex: '1 1 22%', padding: '6px 4px', fontSize: '10px', textTransform: 'capitalize' }}
                    onDragStart={(e) => e.stopPropagation()}
                    draggable={false}
                    onClick={() => {
                      setTimerType(type as FocusSessionType);
                      if (type === 'pomodoro') {
                        setTimerDuration(25);
                        setTimeLeft(25 * 60);
                      } else if (type === 'deepwork') {
                        setTimerDuration(50);
                        setTimeLeft(50 * 60);
                      } else if (type === 'custom') {
                        setTimerDuration(customFocusMins);
                        setTimeLeft(customFocusMins * 60);
                      } else {
                        setTimerDuration(0);
                        setTimeLeft(0);
                      }
                      setTimerStatus('idle');
                    }}
                  >
                    {type === 'deepwork' ? 'Deep Work' : type}
                  </button>
                ))}
              </div>

              {/* Custom Focus Mins Input */}
              {timerType === 'custom' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.02)', padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', width: '100%', justifyContent: 'center' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Mins:</span>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={customFocusMins}
                    onDragStart={(e) => e.stopPropagation()}
                    draggable={false}
                    onChange={(e) => {
                      const val = Math.max(1, Math.min(180, parseInt(e.target.value) || 25));
                      setCustomFocusMins(val);
                      setTimerDuration(val);
                      setTimeLeft(val * 60);
                      setTimerStatus('idle');
                    }}
                    className="glass-input"
                    style={{ width: '50px', padding: '2px 4px', fontSize: '11px', color: '#fff', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)', height: '22px' }}
                  />
                </div>
              )}

              {/* Circle display */}
              <div style={{
                position: 'relative',
                width: '140px',
                height: '140px',
                background: 'rgba(255,255,255,0.01)',
                borderRadius: '50%',
                boxShadow: 'inset 0 0 20px rgba(0,0,0,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg viewBox="0 0 36 36" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', transform: 'rotate(-90deg)' }} className={timerStatus === 'running' ? 'timer-circle-running' : ''}>
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="2.5" />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="var(--color-purple)"
                    strokeWidth="2.5"
                    strokeDasharray={`${timerType === 'stopwatch' ? ((timeLeft % 60) / 60) * 100 : (timerDuration > 0 ? (timeLeft / (timerDuration * 60)) * 100 : 100)}, 100`}
                    style={{ transition: 'stroke-dasharray 0.3s ease' }}
                  />
                </svg>
                <div style={{ textAlign: 'center', zIndex: 10 }}>
                  <div style={{ fontSize: '24px', fontWeight: 800, fontFamily: 'monospace', color: '#fff', lineHeight: 1.1 }}>
                    {formatTimerTime(timeLeft)}
                  </div>
                  <div style={{ marginTop: '6px' }}>
                    <span style={{ fontSize: '9px', fontWeight: 600, color: 'var(--color-purple-light)', background: 'var(--color-purple-glow)', padding: '2px 8px', borderRadius: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {timerType === 'deepwork' ? 'Deep Work' : timerType}
                    </span>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div style={{ display: 'flex', gap: '6px', width: '100%' }}>
                <button
                  className="glass-button active"
                  style={{ flex: 1, padding: '8px 12px', fontSize: '11px' }}
                  onClick={timerStatus === 'running' ? pauseFocusSession : startFocusSession}
                  onDragStart={(e) => e.stopPropagation()}
                  draggable={false}
                >
                  {timerStatus === 'running' ? <Pause size={12} /> : <Play size={12} />}
                  <span>{timerStatus === 'running' ? 'Pause' : 'Start'}</span>
                </button>
                <button 
                  className="glass-button" 
                  style={{ padding: '8px' }} 
                  onClick={resetFocusSession}
                  onDragStart={(e) => e.stopPropagation()}
                  draggable={false}
                >
                  <RotateCcw size={12} />
                </button>
              </div>

              {/* Symmetrical Today's Focus Badge */}
              <div style={{ display: 'flex', justifyContent: 'center', width: '100%', marginTop: '4px' }}>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#fff',
                  background: 'var(--color-purple)',
                  border: '1px solid var(--color-purple-light)',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px var(--color-purple-glow)'
                }}>
                  <Clock size={12} /> Today's Focus: <strong>{totalFocusHoursToday}h</strong>
                </span>
              </div>
            </div>
          </div>
        );
      }
      case 'breakTimer': {
        const limitMins = state.settings.breakAllowanceMinutes || 60;

        let displayMins = 0;
        let displaySecs = 0;
        let breakPct = 0;

        displayMins = Math.floor(breakTimeLeft / 60);
        displaySecs = breakTimeLeft % 60;

        const totalDurationSecs = breakTimerDuration * 60;

        breakPct = totalDurationSecs > 0
          ? Math.round(((totalDurationSecs - breakTimeLeft) / totalDurationSecs) * 100)
          : 0;

        const colonClassBreak = breakStatus === 'running' ? 'timer-colon-blink' : '';

        return (
          <div
            key="breakTimer"
            draggable
            onDragStart={(e) => handleDragStartPanel(e, 'breakTimer')}
            className="glass-panel"
            style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', cursor: 'grab', minHeight: '410px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Move size={14} style={{ color: 'var(--text-muted)', cursor: 'grab' }} />
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Break Tracker</h3>
              </div>
              <Coffee size={16} style={{ color: 'var(--color-purple-light)' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              {/* Mode Selector */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', width: '100%' }}>
                {[
                  { id: 'allowance', label: 'Allowance' },
                  { id: 'preset-5', label: '5m Break' },
                  { id: 'preset-15', label: '15m Break' }
                ].map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    className={`glass-button ${breakTimerMode === mode.id ? 'active' : ''}`}
                    style={{ flex: '1 1 30%', padding: '6px 4px', fontSize: '10px' }}
                    onDragStart={(e) => e.stopPropagation()}
                    draggable={false}
                    onClick={() => selectBreakMode(mode.id as any)}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>

              {/* Break Limit Input Settings */}
              {breakTimerMode === 'allowance' && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'rgba(255,255,255,0.02)', padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', width: '100%' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Limit:</span>
                  <input
                    type="number"
                    min="1"
                    max="480"
                    value={state.settings.breakAllowanceMinutes || 60}
                    onDragStart={(e) => e.stopPropagation()}
                    draggable={false}
                    onChange={(e) => {
                      const val = Math.max(1, Math.min(480, parseInt(e.target.value) || 60));
                      updateSettings({ breakAllowanceMinutes: val });
                      if (breakStatus === 'idle') {
                        const todayStr = new Date().toISOString().split('T')[0];
                        const todayBreakSeconds = (state.activityLog?.find(l => l.date === todayStr)?.breakSeconds || 0);
                        const remainingSecs = Math.max(0, (val * 60) - todayBreakSeconds);
                        setBreakTimeLeft(remainingSecs);
                        setBreakTimerDuration(val);
                      }
                    }}
                    className="glass-input"
                    style={{ width: '45px', padding: '2px 4px', fontSize: '11px', color: '#fff', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)', height: '22px' }}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>min</span>
                </div>
              )}

              {/* Break Progress Circle */}
              <div style={{
                position: 'relative',
                width: '140px',
                height: '140px',
                background: 'rgba(255,255,255,0.01)',
                borderRadius: '50%',
                boxShadow: 'inset 0 0 20px rgba(0,0,0,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg viewBox="0 0 36 36" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', transform: 'rotate(-90deg)' }} className={breakStatus === 'running' ? 'break-circle-running' : ''}>
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="2.5" />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="var(--color-purple)"
                    strokeWidth="2.5"
                    strokeDasharray={`${breakPct}, 100`}
                    style={{ transition: 'stroke-dasharray 0.3s ease' }}
                  />
                </svg>
                <div style={{ textAlign: 'center', zIndex: 10 }}>
                  <div style={{ fontSize: '24px', fontWeight: 800, fontFamily: 'monospace', color: '#fff', lineHeight: 1.1 }}>
                    {displayMins}<span className={colonClassBreak}>:</span>{String(displaySecs).padStart(2, '0')}
                  </div>
                  <div style={{ marginTop: '6px' }}>
                    <span style={{ fontSize: '9px', fontWeight: 600, color: 'var(--color-purple-light)', background: 'var(--color-purple-glow)', padding: '2px 8px', borderRadius: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Break Left
                    </span>
                  </div>
                </div>
              </div>

              {/* Symmetrical Break Tracker Actions */}
              <div style={{ display: 'flex', gap: '6px', width: '100%' }}>
                <button
                  type="button"
                  className="glass-button active"
                  style={{ flex: 1, padding: '8px 12px', fontSize: '11px' }}
                  onClick={breakStatus === 'running' ? pauseBreakTracking : startBreakTracking}
                  onDragStart={(e) => e.stopPropagation()}
                  draggable={false}
                >
                  {breakStatus === 'running' ? <Pause size={12} /> : <Play size={12} />}
                  <span>{breakStatus === 'running' ? 'Pause' : 'Start Break'}</span>
                </button>
                <button 
                  type="button" 
                  className="glass-button" 
                  style={{ padding: '8px' }} 
                  onClick={stopBreakTracking}
                  onDragStart={(e) => e.stopPropagation()}
                  draggable={false}
                >
                  <RotateCcw size={12} />
                </button>
              </div>

              {/* Improved highly visible Allowance indicator */}
              <div style={{ display: 'flex', justifyContent: 'center', width: '100%', marginTop: '4px' }}>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#fff',
                  background: 'var(--color-purple)',
                  border: '1px solid var(--color-purple-light)',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px var(--color-purple-glow)'
                }}>
                  <Coffee size={12} /> Daily Allowance: <strong>{limitMins}m</strong>
                </span>
              </div>
            </div>
          </div>
        );
      }
      case 'schedule': {
        const sortedBlocks = [...(state.scheduleBlocks || [])].sort((a, b) => a.startTime.localeCompare(b.startTime));
        
        return (
          <div
            key="schedule"
            draggable
            onDragStart={(e) => handleDragStartPanel(e, 'schedule')}
            className="glass-panel"
            style={{ padding: '24px', cursor: 'grab' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Move size={14} style={{ color: 'var(--text-muted)', cursor: 'grab' }} />
                <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Upcoming Schedule</h3>
              </div>
              <button 
                onClick={() => setActiveTab('schedule')} 
                style={{ background: 'none', border: 'none', color: 'var(--color-purple-light)', cursor: 'pointer', fontSize: '13px' }}
                onDragStart={(e) => e.stopPropagation()}
                draggable={false}
              >
                View Planner
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto' }} className="scroll-y">
              {sortedBlocks.map((block) => (
                <div
                  key={block.id}
                  className="glass-card animate-slide-up"
                  style={{
                    padding: '12px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    borderLeft: `4px solid ${block.color || 'var(--color-purple)'}`,
                    background: `${block.color || 'var(--color-purple)'}05`
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                      ⏰ {formatTime(block.startTime, is24HourFormat)} - {formatTime(block.endTime, is24HourFormat)}
                    </span>
                    {block.category && (
                      <span style={{
                        fontSize: '9px',
                        fontWeight: 600,
                        color: block.color || 'var(--color-purple)',
                        background: `${block.color || 'var(--color-purple)'}15`,
                        border: `1px solid ${block.color || 'var(--color-purple)'}30`,
                        padding: '1px 6px',
                        borderRadius: '4px'
                      }}>
                        {block.category}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{block.task}</span>
                </div>
              ))}
              {sortedBlocks.length === 0 && (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '13px' }}>
                  No schedule blocks planned for today.
                </div>
              )}
            </div>
          </div>
        );
      }
      default:
        return null;
    }
  };

  // Loading Screen
  if (!isLoaded || !state) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000000' }}>
        <Sparkles size={48} className="gradient-glow-purple" style={{ color: '#8b5cf6', animation: 'pulse-glow 2s infinite' }} />
        <h2 className="gradient-text" style={{ marginTop: '24px' }}>Orb OS Booting...</h2>
      </div>
    );
  }

  // Dashboard Calculations
  const todayStr = new Date().toISOString().split('T')[0];
  const todayStats = state.activityLog.find(l => l.date === todayStr) || {
    tasksCompletedCount: 0,
    goalsCompletedCount: 0,
    focusSeconds: 0,
    breakSeconds: 0,
    productivityScore: 78
  };

  const totalFocusHoursToday = (todayStats.focusSeconds / 3600).toFixed(1);
  const totalBreakMinutesToday = Math.round(todayStats.breakSeconds / 60);



  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href={(() => {
          const fontName = state.settings.appFontFamily || 'Outfit';
          const cleanName = fontName.replace(/\s+/g, '+');
          if (fontName === 'Pacifico' || fontName === 'Sacramento') {
            return `https://fonts.googleapis.com/css2?family=${cleanName}&display=swap`;
          }
          return `https://fonts.googleapis.com/css2?family=${cleanName}:wght@300;400;500;600;700;800&display=swap`;
        })()}
        rel="stylesheet"
      />
      <style>{`
        :root {
          font-size: ${state.settings.fontSizeZoom || 100}% !important;
          --color-purple: ${state.settings.themeAccentColor || '#8b5cf6'} !important;
          --color-purple-hover: ${state.settings.themeAccentColor ? state.settings.themeAccentColor + 'ee' : '#7c3aed'} !important;
          --color-purple-light: ${state.settings.themeAccentColor ? state.settings.themeAccentColor + 'cc' : '#a78bfa'} !important;
          --color-purple-glow: ${state.settings.themeAccentColor ? state.settings.themeAccentColor + '33' : 'rgba(139, 92, 246, 0.3)'} !important;
          --border-glass-purple: ${state.settings.themeAccentColor ? state.settings.themeAccentColor + '26' : 'rgba(139, 92, 246, 0.15)'} !important;
          --border-glass-focus: ${state.settings.themeAccentColor ? state.settings.themeAccentColor + '66' : 'rgba(139, 92, 246, 0.4)'} !important;
        }

        body, html, #root, input, select, textarea, button, p, span, div, h1, h2, h3, h4, h5, h6 {
          font-family: '${state.settings.appFontFamily || 'Outfit'}', sans-serif !important;
        }
        
        /* Typography Levels Zoom Sliders */
        h1, h2, h3, .dashboard-title {
          font-size: calc(100% * ${(state.settings.titleSizeZoom || 100) / 100}) !important;
        }
        
        nav button, .sidebar-link, .nav-text {
          font-size: calc(100% * ${(state.settings.sidebarSizeZoom || 100) / 100}) !important;
        }
        
        body, p, span, label, input, textarea, select, .glass-card, .table-row, td, th {
          font-size: calc(100% * ${(state.settings.bodySizeZoom || 100) / 100}) !important;
        }

        @keyframes pulse-bg-red-purple {
          0% { background-color: rgba(5, 2, 10, 0.96); }
          50% { background-color: rgba(30, 2, 20, 0.97); }
          100% { background-color: rgba(5, 2, 10, 0.96); }
        }
        @keyframes border-flash-flow {
          0% { border-color: rgba(239, 68, 68, 0.1); }
          50% { border-color: rgba(236, 72, 153, 0.8); }
          100% { border-color: rgba(239, 68, 68, 0.1); }
        }

        /* Blinking animation for clock colon */
        @keyframes blink {
          50% { opacity: 0.15; }
        }
        .timer-colon-blink {
          animation: blink 1s step-end infinite;
        }
        
        /* Pulsing animation for running timers */
        @keyframes pulse-timer-circle {
          0% { filter: drop-shadow(0 0 2px var(--color-purple)); }
          100% { filter: drop-shadow(0 0 8px var(--color-purple)); }
        }
        .timer-circle-running {
          animation: pulse-timer-circle 2s infinite alternate;
        }
        
        @keyframes pulse-break-circle {
          0% { filter: drop-shadow(0 0 2px var(--color-purple)); }
          100% { filter: drop-shadow(0 0 8px var(--color-purple)); }
        }
        .break-circle-running {
          animation: pulse-break-circle 2s infinite alternate;
        }
        
        /* Unified sizing and style for target buttons */
        .system-action-btn {
          height: 38px !important;
          padding: 8px 18px !important;
          font-size: 13px !important;
          font-weight: 600 !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 6px !important;
          border-radius: 8px !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
          border: none !important;
          color: #fff !important;
          background: ${state.settings.themeAccentColor || 'var(--color-purple)'} !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2) !important;
        }
        .system-action-btn:hover {
          transform: translateY(-1px) !important;
          box-shadow: 0 6px 16px rgba(0,0,0,0.3), 0 0 8px ${state.settings.themeAccentColor || 'var(--color-purple)'}4d !important;
        }
        .system-action-btn:active {
          transform: translateY(0) !important;
        }
      `}</style>
      <div style={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: state?.settings?.themeBgColor || '#030303',
        backgroundImage: state?.settings?.themeBgImage ? `url(${state.settings.themeBgImage})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        position: 'relative'
      }}>

        {/* Orb OS Splash Screen */}
        {showSplash && (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: '#07070e',
            zIndex: 1000000,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '24px'
          }}>
            {/* Pulsing rotating glowing orb */}
            <div style={{
              position: 'relative',
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, var(--color-purple) 0%, rgba(0,0,0,0) 70%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 50px rgba(139, 92, 246, 0.4)',
              animation: 'pulse-glow 2s infinite alternate'
            }}>
              <Sparkles size={48} style={{ color: '#ffffff', animation: 'spin 4s linear infinite' }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <h1 style={{ fontSize: '36px', fontWeight: 800, letterSpacing: '0.15em', background: 'linear-gradient(135deg, #ffffff 30%, var(--color-purple-light) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
                ORB OS
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '8px', letterSpacing: '0.08em' }}>
                V1.0
              </p>
            </div>
          </div>
        )}

        {/* Looping Reminder Flashing Warning Box Overlay */}
        {activeLoopingReminder && (
          <div className="strict-overlay" style={{
            zIndex: 99999,
            background: 'rgba(5, 2, 10, 0.96)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'pulse-bg-red-purple 4s infinite'
          }}>
            <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              border: '20px solid transparent',
              animation: 'border-flash-flow 2s infinite',
              pointerEvents: 'none',
              boxSizing: 'border-box'
            }} />
            <div className="glass-panel" style={{
              padding: '40px',
              maxWidth: '550px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '24px',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              boxShadow: '0 0 40px rgba(239, 68, 68, 0.25)',
              backdropFilter: 'blur(20px)'
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '2px solid #ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 20px rgba(239, 68, 68, 0.4)',
                animation: 'pulse 1.5s infinite'
              }}>
                <Volume2 size={40} style={{ color: '#ef4444' }} />
              </div>

              <div>
                <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#fff', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>⚠️ LOOPING REMINDER</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>This voice notification loops recursively until you press the safety hotkey.</p>
              </div>

              <div style={{
                fontSize: '22px',
                fontWeight: 700,
                color: '#fff',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '20px 30px',
                borderRadius: '12px',
                width: '100%',
                lineHeight: 1.4,
                boxShadow: 'inset 0 0 10px rgba(255,255,255,0.02)'
              }}>
                "{activeLoopingReminder.message}"
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                <button
                  type="button"
                  className="glass-button active"
                  style={{
                    background: 'linear-gradient(135deg, #ef4444 0%, #ec4899 100%)',
                    border: 'none',
                    color: '#fff',
                    padding: '14px 28px',
                    fontWeight: 600,
                    fontSize: '14px',
                    boxShadow: '0 5px 15px rgba(239, 68, 68, 0.4)',
                    width: '100%'
                  }}
                  onClick={dismissLoopingReminder}
                >
                  Acknowledge Alert
                </button>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Or press safety shortcut: <strong style={{ color: '#fff', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>Ctrl + Shift + {(activeLoopingReminder?.dismissKey || state?.settings.loopDismissKey || 'D').toUpperCase()}</strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Strict Blocker Blocker Level 4 dialog (Dashboard Window mirror) */}
        {strictEscalationLevel >= 4 && (
          <div className="strict-overlay">
            <div className="strict-overlay-content">
              <ShieldAlert size={64} className="priority-high gradient-glow-purple" style={{ color: '#ef4444', margin: '0 auto 20px' }} />
              <h2 className="gradient-text" style={{ fontSize: '32px', marginBottom: '16px' }}>FOCUS CRITICAL</h2>
              <p style={{ fontSize: '18px', color: '#f3f4f6', marginBottom: '24px' }}>
                "{activeAlertMessage}"
              </p>
              <div style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '32px' }}>
                Strict mode has locked your interface to prevent procrastination. Acknowledge this alert on the overlay to resume work.
              </div>
              <button
                className="glass-button active"
                style={{ background: '#ef4444', borderColor: '#f87171', fontSize: '16px', padding: '12px 30px' }}
                onClick={dismissStrictAlert}
              >
                <ShieldCheck size={20} />
                Acknowledge Alert
              </button>
            </div>
          </div>
        )}

        {/* Strict Escalation warning alerts (Levels 1-3) */}
        {strictEscalationLevel > 0 && strictEscalationLevel < 4 && (
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            zIndex: 5000, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
            background: 'rgba(18, 18, 26, 0.95)', padding: '24px 32px', borderRadius: '16px',
            boxShadow: '0 15px 45px rgba(0, 0, 0, 0.6)', border: '2px solid rgba(239, 68, 68, 0.5)',
            animation: 'border-flash-flow 2s infinite',
            maxWidth: '450px', width: '90%', textAlign: 'center'
          }} className="animate-slide-up">
            <ShieldAlert size={32} style={{ color: '#ef4444', animation: 'pulse 1.2s infinite' }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '18px', color: '#fff', marginBottom: '6px' }}>FOCUS REMINDER ALERT</div>
              <div style={{ fontSize: '15px', color: '#f3f4f6', lineHeight: 1.4, margin: '8px 0' }}>"{activeAlertMessage}"</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Escalation warning level {strictEscalationLevel}/4</div>
            </div>
            <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '8px' }}>
              <button className="glass-button" style={{ flex: 1, padding: '10px 16px', background: 'rgba(255, 255, 255, 0.05)' }} onClick={snoozeStrictAlert}>Snooze</button>
              <button className="glass-button active" style={{ flex: 1, padding: '10px 16px', background: '#ef4444', borderColor: '#f87171' }} onClick={dismissStrictAlert}>Acknowledge</button>
            </div>
          </div>
        )}

        {/* LEFT SIDEBAR (Glassmorphic) */}
        {!isWritingFullscreen && (
          <div style={{ width: '270px', borderRight: '1px solid var(--border-glass-purple)', display: 'flex', flexDirection: 'column', background: 'rgba(8, 8, 12, 0.85)', backdropFilter: 'blur(20px)' }}>
            <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border-glass)' }}>
              <div>
                <h1 className="gradient-text" style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.03em', margin: 0 }}>Orb OS</h1>
                <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em', display: 'block', marginTop: '2px' }}>Premium v1.0.0</span>
              </div>
            </div>

            {/* Navigation spaces */}
            <div className="scroll-y" style={{ flex: 1, padding: '16px 12px' }}>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', paddingLeft: '12px', marginBottom: '8px', letterSpacing: '0.05em' }}>Spaces</div>
              <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <button onClick={() => setActiveTab('home')} className={`glass-button ${activeTab === 'home' ? 'active' : ''}`} style={{ justifyContent: 'flex-start', border: 'none', background: activeTab === 'home' ? undefined : 'transparent' }}>
                  <Home size={18} /> Dashboard Home
                </button>
                <button onClick={() => setActiveTab('goals')} className={`glass-button ${activeTab === 'goals' ? 'active' : ''}`} style={{ justifyContent: 'flex-start', border: 'none', background: activeTab === 'goals' ? undefined : 'transparent' }}>
                  <Award size={18} /> Goals Dashboard
                </button>
                <button onClick={() => setActiveTab('tasks')} className={`glass-button ${activeTab === 'tasks' ? 'active' : ''}`} style={{ justifyContent: 'flex-start', border: 'none', background: activeTab === 'tasks' ? undefined : 'transparent' }}>
                  <CheckSquare size={18} /> Kanban Board
                </button>
                <button onClick={() => setActiveTab('schedule')} className={`glass-button ${activeTab === 'schedule' ? 'active' : ''}`} style={{ justifyContent: 'flex-start', border: 'none', background: activeTab === 'schedule' ? undefined : 'transparent' }}>
                  <Calendar size={18} /> Schedule Planner
                </button>
                <button onClick={() => setActiveTab('voice')} className={`glass-button ${activeTab === 'voice' ? 'active' : ''}`} style={{ justifyContent: 'flex-start', border: 'none', background: activeTab === 'voice' ? undefined : 'transparent' }}>
                  <Volume2 size={18} /> Voice Reminders
                </button>
                <button onClick={() => setActiveTab('notes')} className={`glass-button ${activeTab === 'notes' ? 'active' : ''}`} style={{ justifyContent: 'flex-start', border: 'none', background: activeTab === 'notes' ? undefined : 'transparent' }}>
                  <BookOpen size={18} /> Notes Workspace
                </button>
                <button onClick={() => setActiveTab('analytics')} className={`glass-button ${activeTab === 'analytics' ? 'active' : ''}`} style={{ justifyContent: 'flex-start', border: 'none', background: activeTab === 'analytics' ? undefined : 'transparent' }}>
                  <Activity size={18} /> Analytics Center
                </button>
                <button onClick={() => setActiveTab('settings')} className={`glass-button ${activeTab === 'settings' ? 'active' : ''}`} style={{ justifyContent: 'flex-start', border: 'none', background: activeTab === 'settings' ? undefined : 'transparent' }}>
                  <Settings size={18} /> OS Settings
                </button>
              </nav>
            </div>

            {/* Active Timer status box */}
            {timerStatus === 'running' && (
              <div style={{ margin: '16px', padding: '16px', background: 'rgba(139, 92, 246, 0.1)', border: '1px solid var(--border-glass-purple)', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: 'var(--color-purple-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Focus Active</div>
                <div style={{ fontSize: '20px', fontWeight: 700, margin: '4px 0', fontFamily: 'monospace' }}>
                  {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Streak: {timerStreak} sessions</div>
              </div>
            )}

          </div>
        )}

        {/* MAIN VIEW PANEL */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Custom Header bar */}
          {!isWritingFullscreen && (
            <header style={{ height: '64px', borderBottom: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', background: 'rgba(8, 8, 12, 0.4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Orb Workspace</span>
                <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                <span style={{ fontSize: '14px', fontWeight: 500, textTransform: 'capitalize' }}>{activeTab}</span>
              </div>

              {/* Middle top: running task stopwatch timer */}
              {trackingTaskId ? (() => {
                const activeTask = state.tasks.find(t => t.id === trackingTaskId);
                if (!activeTask) return null;

                const minutes = Math.floor(trackingSeconds / 60);
                const seconds = trackingSeconds % 60;
                const formattedTime = `${String(activeTask.spentTime + minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

                return (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: 'rgba(234, 179, 8, 0.1)',
                    border: '1px solid rgba(234, 179, 8, 0.35)',
                    padding: '6px 16px',
                    borderRadius: '20px',
                    boxShadow: '0 0 15px rgba(234, 179, 8, 0.15)',
                  }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#eab308', display: 'inline-block', animation: 'pulse-glow 1.2s infinite' }}></span>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Active Task:</span>
                    <strong style={{ fontSize: '13px', color: '#fff', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeTask.title}</strong>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      padding: '3px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#eab308',
                      fontFamily: 'monospace'
                    }}>
                      <Clock size={12} />
                      <span>{formattedTime}</span>
                    </div>
                  </div>
                );
              })() : null}

              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              </div>
            </header>
          )}

          <main style={{ flex: 1, overflow: 'auto', padding: isWritingFullscreen ? '0' : '32px' }}>

            {/* =======================================================
              1. DASHBOARD HOME VIEW
              ======================================================= */}
            {activeTab === 'home' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <h2 style={{ fontSize: '32px', fontWeight: 700, margin: 0 }}>Welcome Back, Sai</h2>
                    <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '14px' }}>Here is your Orb productivity report for today, {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}.</p>
                  </div>
                  {/* Preset layout selector */}
                  {(() => {
                    const currentLayout = state.settings.dashboardLayout || { col1: ['tasks', 'goals'], col2: ['focusTimer', 'breakTimer'], col3: ['schedule', 'stats'] };
                    const isSplitPreset = (currentLayout.col3 || []).length === 0;
                    const isBalancedPreset = (currentLayout.col1 || []).includes('tasks') && (currentLayout.col3 || []).includes('schedule');
                    const isTimerFirstPreset = (currentLayout.col1 || []).includes('focusTimer') && (currentLayout.col2 || []).includes('tasks');
                    const layoutPresetClass = (active: boolean) => active ? 'glass-button active' : 'glass-button';

                    return (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'rgba(255, 255, 255, 0.02)', padding: '6px 12px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500, marginRight: '4px' }}>Layout Presets:</span>
                        <button
                          className={layoutPresetClass(isSplitPreset)}
                          style={{ padding: '6px 12px', fontSize: '11px', height: '28px' }}
                          onClick={() => {
                            updateSettings({
                              dashboardLayout: {
                                col1: ['tasks', 'goals', 'schedule', 'stats'],
                                col2: ['focusTimer', 'breakTimer'],
                                col3: []
                              }
                            });
                          }}
                        >
                          Split Focus (2-Col)
                        </button>
                        <button
                          className={layoutPresetClass(isBalancedPreset && !isSplitPreset)}
                          style={{ padding: '6px 12px', fontSize: '11px', height: '28px' }}
                          onClick={() => {
                            updateSettings({
                              dashboardLayout: {
                                col1: ['tasks', 'goals'],
                                col2: ['focusTimer', 'breakTimer'],
                                col3: ['schedule', 'stats']
                              }
                            });
                          }}
                        >
                          Balanced (3-Col)
                        </button>
                        <button
                          className={layoutPresetClass(isTimerFirstPreset && !isSplitPreset)}
                          style={{ padding: '6px 12px', fontSize: '11px', height: '28px' }}
                          onClick={() => {
                            updateSettings({
                              dashboardLayout: {
                                col1: ['focusTimer', 'breakTimer'],
                                col2: ['tasks', 'goals', 'schedule'],
                                col3: ['stats']
                              }
                            });
                          }}
                        >
                          Timer First
                        </button>
                      </div>
                    );
                  })()}
                </div>

                {/* Main dashboard content layout - Columns with Drag and Drop support */}
                {(() => {
                  let layout = state.settings.dashboardLayout || { col1: ['tasks', 'goals'], col2: ['focusTimer', 'breakTimer'], col3: ['schedule', 'stats'] };
                  
                  // De-duplicate layout filters to ensure double break trackers (or other widgets) never display
                  const seen = new Set<string>();
                  const cleanLayoutCol = (arr: string[]) => {
                    return (arr || []).filter(id => {
                      if (!id || seen.has(id)) return false;
                      seen.add(id);
                      return true;
                    });
                  };

                  let rawCol1 = [...(layout.col1 || [])];
                  let rawCol2 = [...(layout.col2 || [])];
                  let rawCol3 = [...(layout.col3 || [])];

                  // Migration logic if they have the old layout
                  const hasTimer = rawCol1.includes('timer') || rawCol2.includes('timer') || rawCol3.includes('timer');
                  if (hasTimer) {
                    const replaceTimer = (arr: string[]) => {
                      const idx = arr.indexOf('timer');
                      if (idx !== -1) {
                        const copy = [...arr];
                        copy.splice(idx, 1, 'focusTimer', 'breakTimer');
                        return copy;
                      }
                      return arr;
                    };
                    rawCol1 = replaceTimer(rawCol1);
                    rawCol2 = replaceTimer(rawCol2);
                    rawCol3 = replaceTimer(rawCol3);
                  }

                  let c1 = cleanLayoutCol(rawCol1);
                  let c2 = cleanLayoutCol(rawCol2);
                  let c3 = cleanLayoutCol(rawCol3);

                  // Ensure all default panels exist exactly once
                  const allPossiblePanels = ['tasks', 'goals', 'focusTimer', 'breakTimer', 'schedule', 'stats'];
                  allPossiblePanels.forEach(panelId => {
                    if (!seen.has(panelId)) {
                      const lengths = [c1.length, c2.length, c3.length];
                      const minIndex = lengths.indexOf(Math.min(...lengths));
                      if (minIndex === 0) c1.push(panelId);
                      else if (minIndex === 1) c2.push(panelId);
                      else c3.push(panelId);
                      seen.add(panelId);
                    }
                  });

                  layout = { col1: c1, col2: c2, col3: c3 };
                  
                  const hasCol3 = (layout.col3 || []).length > 0 || draggedPanelId !== null;
                  const gridColumns = hasCol3 ? '1.2fr 1.8fr 1.2fr' : '1.6fr 1fr';
                  
                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: gridColumns, gap: '20px', alignItems: 'start' }}>
                      {/* COLUMN 1 */}
                      <div
                        onDragOver={handleLayoutDragOver}
                        onDrop={() => handleLayoutDrop('col1')}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '20px',
                          minHeight: '400px',
                          borderRadius: '12px',
                          padding: '8px',
                          background: draggedPanelId ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
                          border: draggedPanelId ? '2px dashed var(--color-purple)' : '2px dashed transparent',
                          transition: 'all 0.3s ease'
                        }}
                      >
                        {(layout.col1 || []).map((panelId) => renderPanel(panelId))}
                      </div>

                      {/* COLUMN 2 */}
                      <div
                        onDragOver={handleLayoutDragOver}
                        onDrop={() => handleLayoutDrop('col2')}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '20px',
                          minHeight: '400px',
                          borderRadius: '12px',
                          padding: '8px',
                          background: draggedPanelId ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
                          border: draggedPanelId ? '2px dashed var(--color-purple)' : '2px dashed transparent',
                          transition: 'all 0.3s ease'
                        }}
                      >
                        {(layout.col2 || []).map((panelId) => renderPanel(panelId))}
                      </div>

                      {/* COLUMN 3 */}
                      {hasCol3 && (
                        <div
                          onDragOver={handleLayoutDragOver}
                          onDrop={() => handleLayoutDrop('col3')}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '20px',
                            minHeight: '400px',
                            borderRadius: '12px',
                            padding: '8px',
                            background: draggedPanelId ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
                            border: draggedPanelId ? '2px dashed var(--color-purple)' : '2px dashed transparent',
                            transition: 'all 0.3s ease'
                          }}
                        >
                          {(layout.col3 || []).map((panelId) => renderPanel(panelId))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* =======================================================
              2. GOALS VIEW
              ======================================================= */}
            {activeTab === 'goals' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h2 style={{ fontSize: '32px', fontWeight: 700 }}>Goals</h2>
                    <p>Create and align your life-long goals to maximize your daily potential.</p>
                  </div>
                  <button
                    className="system-action-btn"
                    onClick={() => setIsAddGoalModalOpen(true)}
                  >
                    <Plus size={16} /> Add a Goal
                  </button>
                </div>

                {/* Controls bar: Filtering & Sorting */}
                <div className="glass-panel" style={{ padding: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Sort by:</span>
                    <select
                      value={goalSortOption}
                      onChange={(e) => setGoalSortOption(e.target.value as any)}
                      className="glass-input"
                      style={{ color: '#fff', padding: '6px 12px' }}
                    >
                      <option value="recently-added">Recently Added</option>
                      <option value="deadline">Date (Deadline)</option>
                      <option value="status">Status</option>
                      <option value="category">Category</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Filter Category:</span>
                    <select
                      value={goalFilterCategory}
                      onChange={(e) => setGoalFilterCategory(e.target.value)}
                      className="glass-input"
                      style={{ color: '#fff', padding: '6px 12px' }}
                    >
                      <option value="All">All Categories</option>
                      {Array.from(new Set(state.goals.filter(g => !g.isDeleted).map(g => g.category))).map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    {goalFilterCategory !== 'All' && !['Career', 'Health', 'Finance', 'Business', 'Learning', 'Personal'].includes(goalFilterCategory) && (
                      <button
                        type="button"
                        className="glass-button"
                        style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete category "${goalFilterCategory}"? All goals under this category will be reset to "Career".`)) {
                            updateState((prev) => {
                              const goals = prev.goals.map((g) => {
                                if (g.category === goalFilterCategory) {
                                  return { ...g, category: 'Career' };
                                }
                                return g;
                              });
                              return { ...prev, goals };
                            });
                            setGoalFilterCategory('All');
                          }
                        }}
                        title="Delete this custom category"
                      >
                        <Trash size={14} style={{ color: '#ef4444' }} />
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Filter Status:</span>
                    <select
                      value={goalFilterStatus}
                      onChange={(e) => setGoalFilterStatus(e.target.value)}
                      className="glass-input"
                      style={{ color: '#fff', padding: '6px 12px' }}
                    >
                      <option value="All">All Statuses</option>
                      <option value="Not Started">Not Started</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>

                  {/* Goals lists */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {(() => {
                      const filtered = state.goals.filter(goal => {
                        if (goal.isDeleted) return false;
                        const categoryMatch = goalFilterCategory === 'All' || goal.category === goalFilterCategory;
                        const statusMatch = goalFilterStatus === 'All' || goal.status === goalFilterStatus;
                        return categoryMatch && statusMatch;
                      });

                      const sorted = [...filtered].sort((a, b) => {
                        if (goalSortOption === 'recently-added') {
                          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                          return timeB - timeA;
                        } else if (goalSortOption === 'deadline') {
                          return a.deadline.localeCompare(b.deadline);
                        } else if (goalSortOption === 'status') {
                          return a.status.localeCompare(b.status);
                        } else if (goalSortOption === 'category') {
                          return a.category.localeCompare(b.category);
                        }
                        return 0;
                      });
                      return sorted.map((goal) => (
                        <div key={goal.id} className="glass-panel animate-slide-up" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', background: 'rgba(10, 10, 15, 0.8)', border: '1px solid var(--border-glass-purple)', borderRadius: '16px', boxShadow: 'var(--shadow-premium), 0 0 25px rgba(139, 92, 246, 0.05)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1 }}>
                              <input
                                type="checkbox"
                                checked={goal.status === 'Completed'}
                                onChange={() => toggleGoalStatus(goal.id)}
                                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--color-purple)' }}
                              />
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                                <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, textDecoration: goal.status === 'Completed' ? 'line-through' : 'none', color: goal.status === 'Completed' ? 'var(--text-secondary)' : '#fff' }}>
                                  {goal.title}
                                </h3>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginTop: '2px' }}>
                                  {(() => {
                                    const cStyles = getCategoryColorStyles(goal.categoryColor, goal.category);
                                    return (
                                      <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        fontSize: '10px',
                                        fontWeight: 600,
                                        background: cStyles.background,
                                        border: cStyles.border,
                                        color: cStyles.color,
                                        padding: '2px 8px',
                                        borderRadius: '4px'
                                      }}>
                                        <Award size={10} />
                                        <span>{goal.category}</span>
                                      </span>
                                    );
                                  })()}
                                  <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '10px',
                                    fontWeight: 500,
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    color: '#d1d5db',
                                    padding: '2px 8px',
                                    borderRadius: '4px'
                                  }}>
                                    <Calendar size={10} style={{ color: 'var(--color-purple-light)' }} />
                                    <span>Deadline: {goal.deadline}</span>
                                  </span>
                                  {goal.achievementUnlocked && (
                                    <span style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      fontSize: '10px',
                                      fontWeight: 500,
                                      background: 'rgba(16, 185, 129, 0.12)',
                                      border: '1px solid rgba(16, 185, 129, 0.25)',
                                      color: '#10b981',
                                      padding: '2px 8px',
                                      borderRadius: '4px'
                                    }}>
                                      <span>🏆 Achieved</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <button
                                className="glass-button"
                                style={{ padding: '8px 14px', fontSize: '12px', height: '34px', gap: '6px' }}
                                onClick={() => {
                                  setEditingGoalId(goal.id);
                                  setNewGoalTitle(goal.title);
                                  setNewGoalCategory(goal.category);
                                  setNewGoalCategoryColor(goal.categoryColor || '#8b5cf6');
                                  setNewGoalDeadline(goal.deadline);
                                  setNewGoalNotes(goal.notes);
                                  setNewGoalMilestones(goal.milestones.map(m => m.title));

                                  const presets = ['Career', 'Health', 'Finance', 'Business', 'Learning', 'Personal'];
                                  if (!presets.includes(goal.category)) {
                                    setIsCustomCategoryActive(true);
                                    setCustomCategoryInput(goal.category);
                                  } else {
                                    setIsCustomCategoryActive(false);
                                  }
                                  setIsAddGoalModalOpen(true);
                                }}
                              >
                                <Edit size={12} />
                                <span>Edit</span>
                              </button>
                              <button
                                className={`glass-button ${goal.isPinned ? 'active' : ''}`}
                                style={{ padding: '8px 14px', fontSize: '12px', height: '34px', gap: '6px' }}
                                onClick={() => {
                                  updateState((prev) => {
                                    const goals = prev.goals.map((g) => {
                                      if (g.id === goal.id) return { ...g, isPinned: !g.isPinned };
                                      return g;
                                    });
                                    return { ...prev, goals };
                                  });
                                }}
                              >
                                <Pin size={12} style={{ transform: goal.isPinned ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }} />
                                <span>{goal.isPinned ? 'Pinned' : 'Pin'}</span>
                              </button>
                              <button
                                className="glass-button"
                                style={{ padding: '6px', background: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.2)', height: '34px', width: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                onClick={() => {
                                  updateState((prev) => ({
                                    ...prev,
                                    goals: prev.goals.map((g) => {
                                      if (g.id === goal.id) {
                                        return { ...g, isDeleted: true, deletedAt: new Date().toISOString() };
                                      }
                                      return g;
                                    })
                                  }));
                                }}
                                title="Delete Goal"
                              >
                                <Trash size={14} style={{ color: '#ef4444' }} />
                              </button>
                            </div>
                          </div>

                          {/* Milestones */}
                          {goal.milestones.length > 0 && (
                            <div style={{ marginTop: '4px', background: 'rgba(0,0,0,0.1)', padding: '6px 10px', borderRadius: '5px', border: '1px solid rgba(255,255,255,0.03)' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                {goal.milestones.map((m) => (
                                  <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', cursor: 'pointer' }}>
                                    <input
                                      type="checkbox"
                                      checked={m.completed}
                                      onChange={() => {
                                        updateState((prev) => {
                                          const goals = prev.goals.map((g) => {
                                            if (g.id === goal.id) {
                                              const milestones = g.milestones.map((ms) => {
                                                if (ms.id === m.id) return { ...ms, completed: !ms.completed };
                                                return ms;
                                              });
                                              const compCount = milestones.filter(ms => ms.completed).length;
                                              const progress = Math.round((compCount / milestones.length) * 100);
                                              const status = (progress === 100 ? 'Completed' : 'In Progress') as GoalStatus;
                                              return { ...g, milestones, progress, status };
                                            }
                                            return g;
                                          });
                                          return { ...prev, goals };
                                        });
                                      }}
                                      style={{ width: '12px', height: '12px', cursor: 'pointer' }}
                                    />
                                    <span style={{ textDecoration: m.completed ? 'line-through' : 'none', color: m.completed ? 'var(--text-muted)' : 'var(--text-primary)' }}>{m.title}</span>
                                  </label>
                                ))}
                                <form onSubmit={(e) => {
                                  e.preventDefault();
                                  const input = e.currentTarget.elements.namedItem('milestone') as HTMLInputElement;
                                  if (!input.value.trim()) return;
                                  const title = input.value;
                                  updateState((prev) => {
                                    const goals = prev.goals.map((g) => {
                                      if (g.id === goal.id) {
                                        const milestones = [...g.milestones, { id: Math.random().toString(), title, completed: false }];
                                        const progress = Math.round((milestones.filter(ms => ms.completed).length / milestones.length) * 100);
                                        return { ...g, milestones, progress };
                                      }
                                      return g;
                                    });
                                    return { ...prev, goals };
                                  });
                                  input.value = '';
                                }} style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                                  <input name="milestone" type="text" placeholder="Add milestone..." className="glass-input" style={{ flex: 1, padding: '2px 6px', fontSize: '10px', height: '20px' }} />
                                  <button type="submit" className="glass-button" style={{ padding: '2px 6px', fontSize: '10px', height: '20px' }}>+</button>
                                </form>
                              </div>
                            </div>
                          )}

                          {/* Thin Integrated Progress Bar */}
                          <div style={{
                            marginTop: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px'
                          }}>
                            <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', minWidth: '75px' }}>Progress</span>
                            <div style={{ flex: 1, height: '5px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${goal.progress}%`, background: 'linear-gradient(90deg, var(--color-purple), var(--color-pink))', borderRadius: '3px' }}></div>
                            </div>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-purple-light)', minWidth: '30px', textAlign: 'right' }}>{goal.progress}%</span>
                          </div>
                        </div>
                      ));
                    })()}

                    {state.goals.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }} className="glass-panel">
                        No goals created yet. Use the "Add a Goal" button above to get started!
                      </div>
                    )}
                  </div>

                  {/* Sidebar Info/Milestone reviews */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="glass-panel" style={{ padding: '24px' }}>
                      <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Life Goals Review</h3>
                      <p style={{ fontSize: '13px', marginBottom: '16px' }}>Assess your progression, write down reflections, and set new expectations for your life milestones.</p>
                      <textarea
                        className="glass-input"
                        placeholder="Write your general life goals review and reflections here..."
                        style={{ height: '140px', width: '100%', resize: 'none', fontSize: '13px' }}
                        value={state.goals.find(g => !g.isDeleted)?.monthlyReview || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateState((prev) => {
                            const firstActive = prev.goals.find(g => !g.isDeleted);
                            const goals = prev.goals.map((g) => {
                              if (firstActive && g.id === firstActive.id) {
                                return { ...g, monthlyReview: val };
                              }
                              return g;
                            });
                            return { ...prev, goals };
                          });
                        }}
                      />
                    </div>

                    <div className="glass-panel" style={{ padding: '24px' }}>
                      <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Achieved Goals History</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {state.goals.filter(g => g.status === 'Completed' && !g.isDeleted).map((goal) => (
                          <div key={goal.id} style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'rgba(16, 185, 129, 0.1)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                            <Award size={20} style={{ color: 'var(--color-completed)' }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '13px', fontWeight: 500 }}>{goal.title}</div>
                              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Category: {goal.category}</div>
                            </div>
                          </div>
                        ))}
                        {state.goals.filter(g => g.status === 'Completed' && !g.isDeleted).length === 0 && (
                          <div style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>No achieved goals yet. Finish a goal to populate your achievements!</div>
                        )}
                      </div>
                    </div>

                    {/* Deleted Goals History */}
                    <div className="glass-panel" style={{ padding: '24px', marginTop: '20px' }}>
                      <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '10px', marginBottom: '12px' }}>
                        <h3 style={{ fontSize: '18px', marginBottom: '6px' }}>Deleted Goals History</h3>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={state.settings.autoDeleteAfter15Days !== false}
                            onChange={(e) => {
                              const val = e.target.checked;
                              updateState((prev) => ({
                                ...prev,
                                settings: { ...prev.settings, autoDeleteAfter15Days: val }
                              }));
                            }}
                            style={{ width: '13px', height: '13px', cursor: 'pointer' }}
                          />
                          <span>Auto-delete items after 15 days</span>
                        </label>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {state.goals.filter(g => g.isDeleted).map((goal) => (
                          <div key={goal.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(255, 255, 255, 0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: 500, color: '#fff' }}>{goal.title}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Category: {goal.category}</div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              <button
                                className="glass-button"
                                style={{ padding: '4px 8px', fontSize: '11px', background: 'rgba(139, 92, 246, 0.1)', borderColor: 'rgba(139, 92, 246, 0.2)' }}
                                onClick={() => {
                                  updateState((prev) => ({
                                    ...prev,
                                    goals: prev.goals.map((g) => {
                                      if (g.id === goal.id) return { ...g, isDeleted: false };
                                      return g;
                                    })
                                  }));
                                }}
                              >
                                Restore
                              </button>
                              <button
                                className="glass-button"
                                style={{ padding: '4px 8px', fontSize: '11px', background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                                onClick={() => {
                                  updateState((prev) => ({
                                    ...prev,
                                    goals: prev.goals.filter((g) => g.id !== goal.id)
                                  }));
                                }}
                              >
                                Delete Permanently
                              </button>
                            </div>
                          </div>
                        ))}
                        {state.goals.filter(g => g.isDeleted).length === 0 && (
                          <div style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>No deleted goals.</div>
                        )}
                      </div>
                    </div>
                  </div>

                </div>

                {/* Add Goal Modal */}
                {isAddGoalModalOpen && (
                  <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(10px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 2000, pointerEvents: 'auto'
                  }}>
                    <div className="glass-panel animate-slide-up" style={{ padding: '32px', width: '500px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '22px', fontWeight: 700 }}>Add a Goal</h3>
                        <button className="glass-button" style={{ padding: '4px', border: 'none', background: 'transparent' }} onClick={() => {
                          setIsAddGoalModalOpen(false);
                          setNewGoalMilestones([]);
                          setNewMilestoneText('');
                          setIsCustomCategoryActive(false);
                          setCustomCategoryInput('');
                          setNewGoalCategoryColor('#8b5cf6');
                        }}>
                          <X size={18} />
                        </button>
                      </div>

                      <form onSubmit={handleCreateGoal} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div>
                          <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Goal Title</label>
                          <input name="title" type="text" placeholder="Goal Title..." required className="glass-input" style={{ width: '100%' }} value={newGoalTitle} onChange={(e) => setNewGoalTitle(e.target.value)} />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <div>
                            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Category</label>
                            <select
                              name="category"
                              className="glass-input"
                              style={{ color: '#ffffff', width: '100%' }}
                              value={isCustomCategoryActive ? 'custom' : newGoalCategory}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === 'custom') {
                                  setIsCustomCategoryActive(true);
                                } else {
                                  setIsCustomCategoryActive(false);
                                  setNewGoalCategory(val);
                                }
                              }}
                            >
                              <option value="Career">Career</option>
                              <option value="Health">Health</option>
                              <option value="Finance">Finance</option>
                              <option value="Business">Business</option>
                              <option value="Learning">Learning</option>
                              <option value="Personal">Personal</option>
                              <option value="custom">+ Custom Category</option>
                            </select>
                          </div>
                          <div>
                            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Deadline</label>
                            <input name="deadline" type="date" className="glass-input" style={{ color: '#ffffff', width: '100%' }} required value={newGoalDeadline} onChange={(e) => setNewGoalDeadline(e.target.value)} />
                          </div>
                        </div>

                        <div>
                          <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Category Color</label>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {[
                              { name: 'Purple', hex: '#8b5cf6' },
                              { name: 'Cyan', hex: '#06b6d4' },
                              { name: 'Magenta', hex: '#d946ef' },
                              { name: 'Green', hex: '#10b981' },
                              { name: 'Red', hex: '#ef4444' },
                              { name: 'Orange', hex: '#f97316' },
                              { name: 'Yellow', hex: '#eab308' },
                              { name: 'Blue', hex: '#3b82f6' }
                            ].map((c) => (
                              <button
                                key={c.hex}
                                type="button"
                                onClick={() => setNewGoalCategoryColor(c.hex)}
                                style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '50%',
                                  background: c.hex,
                                  border: newGoalCategoryColor === c.hex ? '2px solid #ffffff' : '2px solid transparent',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                  boxShadow: newGoalCategoryColor === c.hex ? '0 0 10px ' + c.hex : 'none'
                                }}
                                title={c.name}
                              />
                            ))}
                          </div>
                        </div>

                        {isCustomCategoryActive && (
                          <div>
                            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Custom Category Name</label>
                            <input
                              type="text"
                              placeholder="Enter custom category name..."
                              required
                              value={customCategoryInput}
                              onChange={(e) => setCustomCategoryInput(e.target.value)}
                              className="glass-input"
                              style={{ width: '100%' }}
                            />
                          </div>
                        )}

                        <div>
                          <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Description / Notes</label>
                          <textarea name="notes" placeholder="Goal notes / description..." className="glass-input" style={{ height: '70px', resize: 'none', width: '100%' }} value={newGoalNotes} onChange={(e) => setNewGoalNotes(e.target.value)}></textarea>
                        </div>

                        {/* Staging Milestones */}
                        <div>
                          <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Milestones</label>
                          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                            <input
                              type="text"
                              placeholder="Add milestone title..."
                              value={newMilestoneText}
                              onChange={(e) => setNewMilestoneText(e.target.value)}
                              className="glass-input"
                              style={{ flex: 1, padding: '6px 12px', fontSize: '13px' }}
                            />
                            <button
                              type="button"
                              className="glass-button"
                              onClick={() => {
                                if (!newMilestoneText.trim()) return;
                                setNewGoalMilestones([...newGoalMilestones, newMilestoneText]);
                                setNewMilestoneText('');
                              }}
                            >
                              Add
                            </button>
                          </div>

                          {newGoalMilestones.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '6px', maxHeight: '100px', overflowY: 'auto' }}>
                              {newGoalMilestones.map((m, idx) => (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                                  <span>• {m}</span>
                                  <button type="button" style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }} onClick={() => {
                                    setNewGoalMilestones(newGoalMilestones.filter((_, i) => i !== idx));
                                  }}>
                                    Remove
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '12px', justifyContent: 'flex-end' }}>
                          <button type="button" className="glass-button" onClick={() => {
                            setIsAddGoalModalOpen(false);
                            setEditingGoalId(null);
                            setNewGoalTitle('');
                            setNewGoalDeadline('');
                            setNewGoalNotes('');
                            setNewGoalMilestones([]);
                            setNewMilestoneText('');
                            setIsCustomCategoryActive(false);
                            setCustomCategoryInput('');
                            setNewGoalCategoryColor('#8b5cf6');
                          }}>Cancel</button>
                          <button type="submit" className="glass-button active">{editingGoalId ? 'Save Changes' : 'Create Goal'}</button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* =======================================================
              3. KANBAN BOARD VIEW
              ======================================================= */}
            {activeTab === 'tasks' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h2 style={{ fontSize: '32px', fontWeight: 700 }}>Kanban Task Board</h2>
                    <p>Drag and drop tasks across columns. Track time spent, priority, and subtasks.</p>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {/* Search filter input */}
                    <div style={{ position: 'relative' }}>
                      <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        placeholder="Search tasks instantly..."
                        value={taskSearch}
                        onChange={(e) => setTaskSearch(e.target.value)}
                        className="glass-input"
                        style={{ paddingLeft: '36px', width: '240px' }}
                      />
                    </div>

                    {/* Toggle Kanban History Button */}
                    <button
                      onClick={() => setIsKanbanHistoryOpen(prev => !prev)}
                      className={`glass-button ${isKanbanHistoryOpen ? 'active' : ''}`}
                      style={{ padding: '10px 18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      <Trash size={16} /> <span>{isKanbanHistoryOpen ? 'Hide History' : 'Deleted History'}</span>
                    </button>

                    {/* Improved Add Task button */}
                    <button
                      onClick={() => handleOpenTaskModal()}
                      className="system-action-btn"
                    >
                      <Plus size={16} /> Create New Task
                    </button>
                  </div>
                </div>

                {/* Kanban Filters Panel */}
                <div className="glass-panel" style={{ padding: '12px 20px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', background: 'rgba(18, 18, 26, 0.4)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Priority:</span>
                    <select
                      value={taskFilterPriority}
                      onChange={(e) => setTaskFilterPriority(e.target.value)}
                      className="glass-input"
                      style={{ color: '#fff', padding: '6px 12px', fontSize: '13px' }}
                    >
                      <option value="All">All Priorities</option>
                      <option value="Critical">Critical</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Category:</span>
                    <select
                      value={taskFilterCategory}
                      onChange={(e) => setTaskFilterCategory(e.target.value)}
                      className="glass-input"
                      style={{ color: '#fff', padding: '6px 12px', fontSize: '13px' }}
                    >
                      <option value="All">All Categories</option>
                      {Array.from(new Set(state?.tasks.map(t => t.label).filter(Boolean))).map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    {taskFilterCategory !== 'All' && !['Work', 'Personal', 'Learning', 'Health', 'Finance'].includes(taskFilterCategory) && (
                      <button
                        type="button"
                        className="glass-button"
                        style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete category "${taskFilterCategory}"? All tasks under this category will be reset to "Work".`)) {
                            updateState((prev) => {
                              const tasks = prev.tasks.map((t) => {
                                if (t.label === taskFilterCategory) {
                                  return { ...t, label: 'Work' };
                                }
                                return t;
                              });
                              const categoryColors = { ...(prev.settings.categoryColors || {}) };
                              delete categoryColors[taskFilterCategory];
                              return {
                                ...prev,
                                tasks,
                                settings: {
                                  ...prev.settings,
                                  categoryColors
                                }
                              };
                            });
                            setTaskFilterCategory('All');
                          }
                        }}
                        title="Delete this custom category"
                      >
                        <Trash size={14} style={{ color: '#ef4444' }} />
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Due Date:</span>
                    <select
                      value={taskFilterDueDate}
                      onChange={(e) => setTaskFilterDueDate(e.target.value)}
                      className="glass-input"
                      style={{ color: '#fff', padding: '6px 12px', fontSize: '13px' }}
                    >
                      <option value="All">All Deadlines</option>
                      <option value="overdue">Overdue</option>
                      <option value="today">Due Today</option>
                      <option value="week">Due This Week</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Sort By:</span>
                    <select
                      value={taskSortOption}
                      onChange={(e) => setTaskSortOption(e.target.value)}
                      className="glass-input"
                      style={{ color: '#fff', padding: '6px 12px', fontSize: '13px' }}
                    >
                      <option value="recently-added">Recently Added</option>
                      <option value="due-date">Due Date</option>
                      <option value="priority">Priority Weight</option>
                      <option value="est-time">Estimated Time</option>
                      <option value="spent-time">Spent Time Tracked</option>
                      <option value="milestones">Milestone Progress</option>
                    </select>
                  </div>
                </div>

                {/* Kanban columns */}
                <div style={{ display: 'grid', gridTemplateColumns: isKanbanHistoryOpen ? '1fr 1fr 1fr 300px' : '1fr 1fr 1fr', gap: '20px', flex: 1, minHeight: '400px' }}>

                  {/* To Do Column */}
                  <div
                    className="glass-panel"
                    style={{
                      padding: '18px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px',
                      background: 'rgba(30, 41, 59, 0.15)',
                      border: '1px solid rgba(96, 165, 250, 0.25)',
                      boxShadow: '0 0 20px rgba(96, 165, 250, 0.06), inset 0 0 15px rgba(96, 165, 250, 0.03)'
                    }}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, 'todo')}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(96, 165, 250, 0.2)', paddingBottom: '10px' }}>
                      <h3 style={{ fontSize: '16px', color: '#60a5fa', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>To Do</h3>
                      <span style={{ background: 'rgba(96, 165, 250, 0.15)', color: '#60a5fa', border: '1px solid rgba(96, 165, 250, 0.3)', padding: '2px 8px', borderRadius: '10px', fontSize: '12px', fontWeight: 600 }}>
                        {filteredTasks.filter(t => t.column === 'todo').length}
                      </span>
                    </div>

                    <div className="scroll-y" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {filteredTasks.filter(t => t.column === 'todo').map((task) => (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          className="glass-card animate-slide-up"
                          style={getTaskCardStyles(task)}
                          onClick={() => handleOpenTaskModal(task)}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <span style={{
                                fontSize: '11px', padding: '3px 6px', borderRadius: '4px',
                                background: getPriorityBadgeStyles(task.priority).bg,
                                color: getPriorityBadgeStyles(task.priority).text,
                                border: getPriorityBadgeStyles(task.priority).border,
                                fontWeight: 600
                              }}>
                                {task.priority}
                              </span>
                              {task.label && (
                                <span style={{
                                  fontSize: '11px', padding: '3px 6px', borderRadius: '4px',
                                  background: `${getCategoryColor(task.label)}15`,
                                  color: getCategoryColor(task.label),
                                  border: `1px solid ${getCategoryColor(task.label)}40`,
                                  fontWeight: 600
                                }}>
                                  {task.label}
                                </span>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {task.isPinned && <Pin size={11} style={{ color: 'var(--color-purple-light)', transform: 'rotate(45deg)' }} />}
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '11px',
                                fontWeight: 500,
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: '#e5e7eb',
                                padding: '2px 5px',
                                borderRadius: '4px'
                              }}>
                                <Clock size={10} style={{ color: 'var(--color-purple-light)' }} />
                                <span>{task.spentTime}m/{task.estTime}m</span>
                              </span>
                            </div>
                          </div>

                          <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#fff' }}>{task.title}</h4>

                          {trackingTaskId === task.id && (
                            <div style={{
                              background: 'rgba(234, 179, 8, 0.15)',
                              border: '1px solid rgba(234, 179, 8, 0.4)',
                              borderRadius: '6px',
                              padding: '4px 8px',
                              marginTop: '6px',
                              marginBottom: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              boxShadow: '0 0 10px rgba(234, 179, 8, 0.2)',
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#eab308', display: 'inline-block', animation: 'pulse-glow 1.2s infinite' }}></span>
                                <span style={{ fontSize: '10px', color: '#eab308', fontWeight: 600 }}>Tracking Live</span>
                              </div>
                              <span style={{ fontSize: '11px', fontWeight: 700, color: '#fff', fontFamily: 'monospace' }}>
                                {(() => {
                                  const minutes = Math.floor(trackingSeconds / 60);
                                  const seconds = trackingSeconds % 60;
                                  return `${String(task.spentTime + minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                                })()}
                              </span>
                            </div>
                          )}

                          {task.notes && (
                            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: '6px' }}>
                              {task.notes}
                            </p>
                          )}

                          {task.subtasks && task.subtasks.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                              <CheckSquare size={11} style={{ color: '#60a5fa' }} />
                              <span>{task.subtasks.filter(s => s.completed).length}/{task.subtasks.length} milestones</span>
                            </div>
                          )}

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px', marginTop: '8px' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11px',
                              color: '#e5e7eb',
                              background: 'rgba(255,255,255,0.03)',
                              border: '1px solid rgba(255,255,255,0.08)',
                              padding: '3px 8px',
                              borderRadius: '6px'
                            }}>
                              <Calendar size={11} style={{ color: '#60a5fa' }} />
                              <span>Due: {task.dueDate}</span>
                            </span>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              {task.attachments && task.attachments.length > 0 && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '11px', color: 'var(--text-muted)' }} title={`${task.attachments.length} attachments`}>
                                  <Paperclip size={11} /> {task.attachments.length}
                                </span>
                              )}
                              {task.links && task.links.length > 0 && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '11px', color: 'var(--text-muted)' }} title={`${task.links.length} links`}>
                                  <Link size={11} /> {task.links.length}
                                </span>
                              )}

                              <button
                                className="glass-button"
                                style={{ padding: '4px 8px', fontSize: '11px', height: '24px' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleTaskTimeTracking(task.id);
                                }}
                              >
                                {trackingTaskId === task.id ? <Pause size={10} /> : <Play size={10} />}
                                <span style={{ marginLeft: '3px' }}>{trackingTaskId === task.id ? 'Stop' : 'Track'}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* In Progress Column */}
                  <div
                    className="glass-panel"
                    style={{
                      padding: '18px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px',
                      background: 'rgba(88, 28, 135, 0.05)',
                      border: '1px solid rgba(167, 139, 250, 0.25)',
                      boxShadow: '0 0 20px rgba(167, 139, 250, 0.06), inset 0 0 15px rgba(167, 139, 250, 0.03)'
                    }}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, 'in-progress')}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(167, 139, 250, 0.2)', paddingBottom: '10px' }}>
                      <h3 style={{ fontSize: '16px', color: '#a78bfa', fontWeight: 600 }}>In Progress</h3>
                      <span style={{ background: 'rgba(167, 139, 250, 0.15)', color: '#a78bfa', border: '1px solid rgba(167, 139, 250, 0.3)', padding: '2px 8px', borderRadius: '10px', fontSize: '12px', fontWeight: 600 }}>
                        {filteredTasks.filter(t => t.column === 'in-progress').length}
                      </span>
                    </div>

                    <div className="scroll-y" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {filteredTasks.filter(t => t.column === 'in-progress').map((task) => (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          className="glass-card animate-slide-up"
                          style={getTaskCardStyles(task)}
                          onClick={() => handleOpenTaskModal(task)}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <span style={{
                                fontSize: '11px', padding: '3px 6px', borderRadius: '4px',
                                background: getPriorityBadgeStyles(task.priority).bg,
                                color: getPriorityBadgeStyles(task.priority).text,
                                border: getPriorityBadgeStyles(task.priority).border,
                                fontWeight: 600
                              }}>
                                {task.priority}
                              </span>
                              {task.label && (
                                <span style={{
                                  fontSize: '11px', padding: '3px 6px', borderRadius: '4px',
                                  background: `${getCategoryColor(task.label)}15`,
                                  color: getCategoryColor(task.label),
                                  border: `1px solid ${getCategoryColor(task.label)}40`,
                                  fontWeight: 600
                                }}>
                                  {task.label}
                                </span>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {task.isPinned && <Pin size={11} style={{ color: 'var(--color-purple-light)', transform: 'rotate(45deg)' }} />}
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '11px',
                                fontWeight: 500,
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: '#e5e7eb',
                                padding: '2px 5px',
                                borderRadius: '4px'
                              }}>
                                <Clock size={10} style={{ color: 'var(--color-purple-light)' }} />
                                <span>{task.spentTime}m/{task.estTime}m</span>
                              </span>
                            </div>
                          </div>

                          <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#fff' }}>{task.title}</h4>

                          {trackingTaskId === task.id && (
                            <div style={{
                              background: 'rgba(234, 179, 8, 0.15)',
                              border: '1px solid rgba(234, 179, 8, 0.4)',
                              borderRadius: '6px',
                              padding: '4px 8px',
                              marginTop: '6px',
                              marginBottom: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              boxShadow: '0 0 10px rgba(234, 179, 8, 0.2)',
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#eab308', display: 'inline-block', animation: 'pulse-glow 1.2s infinite' }}></span>
                                <span style={{ fontSize: '10px', color: '#eab308', fontWeight: 600 }}>Tracking Live</span>
                              </div>
                              <span style={{ fontSize: '11px', fontWeight: 700, color: '#fff', fontFamily: 'monospace' }}>
                                {(() => {
                                  const minutes = Math.floor(trackingSeconds / 60);
                                  const seconds = trackingSeconds % 60;
                                  return `${String(task.spentTime + minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                                })()}
                              </span>
                            </div>
                          )}

                          {task.notes && (
                            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: '6px' }}>
                              {task.notes}
                            </p>
                          )}
                          {task.subtasks && task.subtasks.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                              <CheckSquare size={11} style={{ color: '#a78bfa' }} />
                              <span>{task.subtasks.filter(s => s.completed).length}/{task.subtasks.length} milestones</span>
                            </div>
                          )}

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px', marginTop: '8px' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11px',
                              color: '#e5e7eb',
                              background: 'rgba(255,255,255,0.03)',
                              border: '1px solid rgba(255,255,255,0.08)',
                              padding: '3px 8px',
                              borderRadius: '6px'
                            }}>
                              <Calendar size={11} style={{ color: '#a78bfa' }} />
                              <span>Due: {task.dueDate}</span>
                            </span>

                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              {task.attachments && task.attachments.length > 0 && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '11px', color: 'var(--text-muted)' }} title={`${task.attachments.length} attachments`}>
                                  <Paperclip size={11} /> {task.attachments.length}
                                </span>
                              )}
                              {task.links && task.links.length > 0 && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '11px', color: 'var(--text-muted)' }} title={`${task.links.length} links`}>
                                  <Link size={11} /> {task.links.length}
                                </span>
                              )}

                              <button
                                className="glass-button"
                                style={{ padding: '4px 8px', fontSize: '11px', height: '24px' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleTaskTimeTracking(task.id);
                                }}
                              >
                                {trackingTaskId === task.id ? <Pause size={10} /> : <Play size={10} />}
                                <span style={{ marginLeft: '3px' }}>{trackingTaskId === task.id ? 'Stop' : 'Track'}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Completed Column */}
                  <div
                    className="glass-panel"
                    style={{
                      padding: '18px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px',
                      background: 'rgba(16, 185, 129, 0.02)',
                      border: '1px solid rgba(52, 211, 153, 0.25)',
                      boxShadow: '0 0 20px rgba(52, 211, 153, 0.06), inset 0 0 15px rgba(52, 211, 153, 0.03)'
                    }}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, 'completed')}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(52, 211, 153, 0.2)', paddingBottom: '10px' }}>
                      <h3 style={{ fontSize: '16px', color: '#34d399', fontWeight: 600 }}>Completed</h3>
                      <span style={{ background: 'rgba(52, 211, 153, 0.15)', color: '#34d399', border: '1px solid rgba(52, 211, 153, 0.3)', padding: '2px 8px', borderRadius: '10px', fontSize: '12px', fontWeight: 600 }}>
                        {filteredTasks.filter(t => t.column === 'completed').length}
                      </span>
                    </div>

                    <div className="scroll-y" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {filteredTasks.filter(t => t.column === 'completed').map((task) => (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          className="glass-card animate-slide-up"
                          style={getTaskCardStyles(task)}
                          onClick={() => handleOpenTaskModal(task)}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <span style={{
                                fontSize: '11px', padding: '3px 6px', borderRadius: '4px',
                                background: 'rgba(16,185,129,0.15)',
                                color: '#10b981',
                                border: '1px solid rgba(16,185,129,0.3)',
                                fontWeight: 600
                              }}>
                                Completed
                              </span>
                              {task.label && (
                                <span style={{
                                  fontSize: '11px', padding: '3px 6px', borderRadius: '4px',
                                  background: `${getCategoryColor(task.label)}15`,
                                  color: getCategoryColor(task.label),
                                  border: `1px solid ${getCategoryColor(task.label)}40`,
                                  fontWeight: 600
                                }}>
                                  {task.label}
                                </span>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {task.isPinned && <Pin size={11} style={{ color: 'var(--color-purple-light)', transform: 'rotate(45deg)' }} />}
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '11px',
                                fontWeight: 500,
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: '#e5e7eb',
                                padding: '2px 5px',
                                borderRadius: '4px'
                              }}>
                                <Clock size={10} style={{ color: 'var(--color-purple-light)' }} />
                                <span>Total: {task.spentTime}m</span>
                              </span>
                            </div>
                          </div>
                          <h4 style={{ fontSize: '13px', fontWeight: 500, textDecoration: 'line-through', marginBottom: '6px', color: 'var(--text-secondary)' }}>{task.title}</h4>
                          {task.notes && (
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: '6px' }}>
                              {task.notes}
                            </p>
                          )}
                          {task.subtasks && task.subtasks.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                              <CheckSquare size={11} style={{ color: '#10b981' }} />
                              <span>{task.subtasks.filter(s => s.completed).length}/{task.subtasks.length} milestones</span>
                            </div>
                          )}

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11px',
                              color: 'var(--text-muted)',
                              background: 'rgba(255,255,255,0.03)',
                              border: '1px solid rgba(255,255,255,0.08)',
                              padding: '3px 8px',
                              borderRadius: '6px'
                            }}>
                              <Calendar size={11} style={{ color: '#10b981' }} />
                              <span>Done: {task.completedAt ? task.completedAt.split('T')[0] : task.dueDate}</span>
                            </span>

                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              {task.attachments && task.attachments.length > 0 && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '11px', color: 'var(--text-muted)' }} title={`${task.attachments.length} attachments`}>
                                  <Paperclip size={11} /> {task.attachments.length}
                                </span>
                              )}
                              {task.links && task.links.length > 0 && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '11px', color: 'var(--text-muted)' }} title={`${task.links.length} links`}>
                                  <Link size={11} /> {task.links.length}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Deleted Kanban History Panel */}
                  {isKanbanHistoryOpen && (
                    <div
                      className="glass-panel animate-slide-up"
                      style={{
                        padding: '18px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '14px',
                        background: 'rgba(239, 68, 68, 0.02)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        boxShadow: '0 0 20px rgba(239, 68, 68, 0.06), inset 0 0 15px rgba(239, 68, 68, 0.03)'
                      }}
                    >
                      <div style={{ borderBottom: '1px solid rgba(239, 68, 68, 0.2)', paddingBottom: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <h3 style={{ fontSize: '16px', color: '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Trash size={16} /> Deleted History
                          </h3>
                          <span style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '2px 8px', borderRadius: '10px', fontSize: '12px', fontWeight: 600 }}>
                            {state?.tasks.filter(t => t.isDeleted).length || 0}
                          </span>
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)', cursor: 'pointer', marginTop: '6px' }}>
                          <input
                            type="checkbox"
                            checked={state.settings.autoDeleteAfter15Days !== false}
                            onChange={(e) => {
                              const val = e.target.checked;
                              updateState((prev) => ({
                                ...prev,
                                settings: { ...prev.settings, autoDeleteAfter15Days: val }
                              }));
                            }}
                            style={{ width: '13px', height: '13px', cursor: 'pointer' }}
                          />
                          <span>Auto-delete items after 15 days</span>
                        </label>
                      </div>

                      <div className="scroll-y" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {(state?.tasks.filter(t => t.isDeleted) || []).map((task) => (
                          <div
                            key={task.id}
                            className="glass-card animate-slide-up"
                            style={{ padding: '14px', border: '1px solid rgba(239, 68, 68, 0.15)' }}
                          >
                            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '6px', color: '#fff' }}>{task.title}</h4>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                              Column: <span style={{ textTransform: 'capitalize' }}>{task.column}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              <button
                                className="glass-button"
                                style={{ padding: '4px 8px', fontSize: '11px', background: 'rgba(139, 92, 246, 0.1)', borderColor: 'rgba(139, 92, 246, 0.2)' }}
                                onClick={() => {
                                  updateState((prev) => ({
                                    ...prev,
                                    tasks: prev.tasks.map((t) => {
                                      if (t.id === task.id) return { ...t, isDeleted: false };
                                      return t;
                                    })
                                  }));
                                }}
                              >
                                Restore
                              </button>
                              <button
                                className="glass-button"
                                style={{ padding: '4px 8px', fontSize: '11px', background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}
                                onClick={() => {
                                  if (window.confirm("Are you sure you want to permanently delete this task? This cannot be undone.")) {
                                    updateState((prev) => ({
                                      ...prev,
                                      tasks: prev.tasks.filter((t) => t.id !== task.id)
                                    }));
                                  }
                                }}
                              >
                                Delete Permanently
                              </button>
                            </div>
                          </div>
                        ))}
                        {(!state?.tasks.filter(t => t.isDeleted).length) && (
                          <div style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>No deleted tasks.</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* =======================================================
              4. SCHEDULE PLANNER VIEW
              ======================================================= */}
            {activeTab === 'schedule' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <h2 style={{ fontSize: '32px', fontWeight: 700 }}>Schedule Planner & Time Blocker</h2>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>Plan out activities and deep focus sprints. Review work hour splits.</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* 12h/24h Selector Toggle */}
                    <div style={{ display: 'flex', gap: '2px', background: 'rgba(255,255,255,0.03)', padding: '3px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <button
                        type="button"
                        onClick={() => setIs24HourFormat(false)}
                        className={`glass-button ${!is24HourFormat ? 'active' : ''}`}
                        style={{ padding: '6px 12px', fontSize: '12px', border: 'none', background: !is24HourFormat ? undefined : 'transparent' }}
                      >
                        12-Hour
                      </button>
                      <button
                        type="button"
                        onClick={() => setIs24HourFormat(true)}
                        className={`glass-button ${is24HourFormat ? 'active' : ''}`}
                        style={{ padding: '6px 12px', fontSize: '12px', border: 'none', background: is24HourFormat ? undefined : 'transparent' }}
                      >
                        24-Hour
                      </button>
                    </div>

                    {/* Add Task Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenTaskModal()}
                      className="glass-button"
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '13px' }}
                    >
                      <Plus size={16} /> Add Task
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsScheduleModalOpen(true)}
                      className="system-action-btn"
                    >
                      <Plus size={16} /> Add Event
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>

                  {/* Visual Daily Timeline Grid */}
                  <div className="glass-panel" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: 600 }}>Daily Time-Blocking Grid</h3>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {is24HourFormat ? '08:00 - 22:00' : '08:00 AM - 10:00 PM'}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px', maxHeight: '480px', overflowY: 'auto' }} className="scroll-y">
                      {(() => {
                        const hoursArray = [];
                        for (let h = 8; h <= 22; h++) {
                          const hh = String(h).padStart(2, '0');
                          hoursArray.push(`${hh}:00`);
                        }

                        const isHourCovered = (hour: string) => {
                          const [targetH, targetM] = hour.split(':').map(Number);
                          const targetMin = targetH * 60 + targetM;

                          return (state.scheduleBlocks || []).some(b => {
                            const [startH, startM] = b.startTime.split(':').map(Number);
                            const [endH, endM] = b.endTime.split(':').map(Number);
                            const startMin = startH * 60 + startM;
                            const endMin = endH * 60 + endM;
                            return targetMin >= startMin && targetMin < endMin && b.startTime !== hour;
                          });
                        };

                        return hoursArray.map((hour) => {
                          // Check if a block starts at this hour
                          const activeBlock = (state.scheduleBlocks || []).find(b => b.startTime === hour);

                          if (activeBlock) {
                            return (
                              <div
                                key={activeBlock.id}
                                className="glass-card"
                                style={{
                                  padding: '14px 16px',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  borderLeft: `4px solid ${activeBlock.color}`,
                                  background: `${activeBlock.color}08`,
                                  borderTop: '1px solid rgba(255,255,255,0.05)',
                                  borderRight: '1px solid rgba(255,255,255,0.05)',
                                  borderBottom: '1px solid rgba(255,255,255,0.05)'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', width: '130px', fontFamily: 'monospace' }}>
                                    ⏰ {formatTime(activeBlock.startTime, is24HourFormat)} - {formatTime(activeBlock.endTime, is24HourFormat)}
                                  </span>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>{activeBlock.task}</span>
                                    {activeBlock.category && (
                                      <span style={{ fontSize: '10px', color: activeBlock.color, background: `${activeBlock.color}15`, border: `1px solid ${activeBlock.color}30`, padding: '1px 6px', borderRadius: '4px', alignSelf: 'flex-start' }}>
                                        {activeBlock.category}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  className="glass-button"
                                  style={{ padding: '6px', borderColor: 'transparent', background: 'transparent' }}
                                  onClick={() => {
                                    updateState((prev) => ({
                                      ...prev,
                                      scheduleBlocks: (prev.scheduleBlocks || []).filter(item => item.id !== activeBlock.id)
                                    }));
                                  }}
                                >
                                  <Trash size={12} style={{ color: 'var(--text-muted)' }} />
                                </button>
                              </div>
                            );
                          }

                          // If covered by a multi-hour block spanning this hour, skip rendering
                          if (isHourCovered(hour)) {
                            return null;
                          }

                          // Otherwise render Empty Gap Slot prompt
                          return (
                            <div
                              key={hour}
                              onClick={() => {
                                setSchedStartTime(hour);
                                const [hh, mm] = hour.split(':').map(Number);
                                const nextH = String(Math.min(23, hh + 1)).padStart(2, '0');
                                setSchedEndTime(`${nextH}:${String(mm).padStart(2, '0')}`);
                                setIsScheduleModalOpen(true);
                              }}
                              className="glass-card"
                              style={{
                                border: '1px dashed rgba(255, 255, 255, 0.08)',
                                padding: '12px 16px',
                                color: 'var(--text-muted)',
                                fontSize: '13px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                background: 'transparent',
                                transition: 'all 0.2s',
                                borderRadius: '8px'
                              }}
                              title="Click to schedule a task at this hour"
                            >
                              <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.15)', width: '90px', fontFamily: 'monospace' }}>{formatTime(hour, is24HourFormat)}</span>
                              <Plus size={12} style={{ opacity: 0.3 }} />
                              <span style={{ fontStyle: 'italic', opacity: 0.5 }}>+ Empty Slot (click to block time)</span>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  {/* Rebuilt Statistics & Events panel */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="glass-panel" style={{ padding: '24px' }}>
                      <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Block Breakdown</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                          <span>Target Work Hours</span>
                          <span style={{ fontWeight: 600 }}>
                            {(() => {
                              const hours = (state.scheduleBlocks || []).reduce((sum, b) => {
                                const [startH, startM] = b.startTime.split(':').map(Number);
                                const [endH, endM] = b.endTime.split(':').map(Number);
                                const diff = (endH * 60 + endM) - (startH * 60 + startM);
                                return sum + (diff / 60);
                              }, 0);
                              return hours.toFixed(1);
                            })()}h
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                          <span>Focus Session Velocity</span>
                          <span style={{ color: 'var(--color-purple-light)', fontWeight: 600 }}>{totalFocusHoursToday}h</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                          <span>Break Logged Today</span>
                          <span>{totalBreakMinutesToday} mins</span>
                        </div>
                      </div>
                    </div>

                    <div className="glass-panel" style={{ padding: '24px' }}>
                      <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Upcoming Milestones</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
                        <div style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', borderLeft: '3px solid var(--color-purple)' }}>
                          <div style={{ fontWeight: 600 }}>French B2 Prep Review</div>
                          <div style={{ color: 'var(--text-secondary)' }}>Tomorrow at 18:00</div>
                        </div>
                        <div style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', borderLeft: '3px solid var(--color-blue)' }}>
                          <div style={{ fontWeight: 600 }}>Orb Desktop Release</div>
                          <div style={{ color: 'var(--text-secondary)' }}>Wednesday at 15:00</div>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            )}



            {/* =======================================================
              6. VOICE REMINDERS VIEW
              ======================================================= */}
            {activeTab === 'voice' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h2 style={{ fontSize: '32px', fontWeight: 700 }}>Voice Reminders System</h2>
                    <p>Configure Text-To-Speech settings, sound triggers, and manage customized timing alerts.</p>
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      type="button"
                      className="glass-button"
                      onClick={triggerFocusReminderAlert}
                    >
                      Trigger Focus Alert
                    </button>
                    <button
                      type="button"
                      className="system-action-btn"
                      onClick={handleOpenReminderAddModal}
                    >
                      <Plus size={16} /> Add Voice Reminder
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>

                  {/* Reminders List */}
                  <div className="glass-panel" style={{ padding: '24px' }}>
                    <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Active Scheduled Voice Alerts</h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {state.reminders.map((r: any) => (
                        <div key={r.id} className="glass-card" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,0.08)' }}>
                          <div style={{ flex: 1, marginRight: '16px' }}>
                            <div style={{ fontWeight: 500, fontSize: '15px', color: '#fff' }}>"{r.message}"</div>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '11px',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: '#d1d5db',
                                padding: '2px 6px',
                                borderRadius: '4px'
                              }}>
                                <Clock size={10} style={{ color: 'var(--color-purple-light)' }} />
                                <span>
                                  {r.type === 'countdown' ? `In ${r.countdownMinutes}m` : r.type === 'interval' ? `Every ${r.intervalMinutes}m` : `At ${r.time}`}
                                </span>
                              </span>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '11px',
                                background: 'rgba(139,92,246,0.12)',
                                border: '1px solid rgba(139,92,246,0.25)',
                                color: 'var(--color-purple-light)',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                textTransform: 'capitalize'
                              }}>
                                <span>Schedule: {r.type || 'Daily'}</span>
                              </span>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '11px',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                color: '#d1d5db',
                                padding: '2px 6px',
                                borderRadius: '4px'
                              }}>
                                <span>Sound: {r.soundEffect || 'Chime'}</span>
                              </span>
                              {r.daysOfWeek && r.daysOfWeek.length > 0 && (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '11px',
                                  background: 'rgba(255, 255, 255, 0.03)',
                                  border: '1px solid rgba(255, 255, 255, 0.08)',
                                  color: '#a78bfa',
                                  padding: '2px 6px',
                                  borderRadius: '4px'
                                }}>
                                  <span>Days: {r.daysOfWeek.join(', ')}</span>
                                </span>
                              )}
                              {r.isLoopingAlert && (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '11px',
                                  background: 'rgba(239, 68, 68, 0.12)',
                                  border: '1px solid rgba(239, 68, 68, 0.25)',
                                  color: '#f87171',
                                  padding: '2px 6px',
                                  borderRadius: '4px'
                                }}>
                                  <span>Dismiss: Ctrl+Shift+{r.dismissKey || 'D'}</span>
                                </span>
                              )}
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button
                              className="glass-button"
                              style={{ padding: '4px 8px', fontSize: '11px' }}
                              onClick={() => playSynthSound(r.soundEffect || 'chime', getCustomSoundData(r.soundEffect || 'chime'))}
                            >
                              Play Sound
                            </button>

                            <button
                              className="glass-button"
                              style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '2px' }}
                              onClick={() => handleOpenReminderEditModal(r)}
                            >
                              <Edit size={10} /> Edit
                            </button>

                            <button className={`glass-button ${r.isActive ? 'active' : ''}`} style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => {
                              updateState((prev) => {
                                const reminders = prev.reminders.map((item) => {
                                  if (item.id === r.id) return { ...item, isActive: !item.isActive, elapsedSeconds: 0 };
                                  return item;
                                });
                                return { ...prev, reminders };
                              });
                            }}>
                              {r.isActive ? 'Active' : 'Muted'}
                            </button>

                            <button className="glass-button" style={{ padding: '6px' }} onClick={() => {
                              updateState((prev) => ({
                                ...prev,
                                reminders: prev.reminders.filter(item => item.id !== r.id)
                              }));
                            }}>
                              <Trash size={12} style={{ color: 'var(--text-muted)' }} />
                            </button>
                          </div>
                        </div>
                      ))}
                      {state.reminders.length === 0 && (
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '40px' }} className="glass-card">
                          No scheduled reminders created yet. Click "+ Add Voice Reminder" to set clean text-to-speech sound prompts.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Voice Settings side panel */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="glass-panel" style={{ padding: '24px' }}>
                      <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Speech Synthesis Engine</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                        <div>
                          <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Speech Voice Model</label>
                          <select
                            className="glass-input"
                            style={{ width: '100%', color: '#ffffff' }}
                            value={state.settings.ttsVoice}
                            onChange={(e) => updateSettings({ ttsVoice: e.target.value })}
                          >
                            {voices.map((v, i) => (
                              <option key={i} value={v.name}>{v.name} ({v.lang})</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span>Announce Volume</span>
                            <span>{Math.round(state.settings.ttsVolume * 100)}%</span>
                          </label>
                          <input
                            type="range" min="0" max="1" step="0.1"
                            value={state.settings.ttsVolume}
                            onChange={(e) => updateSettings({ ttsVolume: parseFloat(e.target.value) })}
                            style={{ width: '100%' }}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span>Voice Speech Speed</span>
                            <span>{state.settings.ttsSpeed}x</span>
                          </label>
                          <input
                            type="range" min="0.5" max="2" step="0.1"
                            value={state.settings.ttsSpeed}
                            onChange={(e) => updateSettings({ ttsSpeed: parseFloat(e.target.value) })}
                            style={{ width: '100%' }}
                          />
                        </div>

                        <button
                          className="glass-button active"
                          onClick={() => playAlertAndSpeak("Sai, keep up the focus!", 'chime')}
                        >
                          Test Audio & Voice
                        </button>

                      </div>
                    </div>

                    {/* Safety loopDismissKey global selector card */}
                    <div className="glass-panel" style={{ padding: '24px' }}>
                      <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>Global Safety Hotkey</h3>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                        Configure the default safety hotkey shortcut to terminate repeating voice loops.
                      </p>
                      <div>
                        <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                          Safety Dismiss Shortcut (Ctrl + Shift + Key)
                        </label>
                        <select
                          value={state.settings.loopDismissKey || 'D'}
                          onChange={(e) => updateSettings({ loopDismissKey: e.target.value.toUpperCase() })}
                          className="glass-input"
                          style={{ width: '100%', color: '#fff', padding: '10px 14px', fontSize: '14px' }}
                        >
                          {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'].map(char => (
                            <option key={char} value={char}>{char}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Custom Voice Alert Slots */}
                    <div className="glass-panel" style={{ padding: '24px' }}>
                      <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>Custom Voice Alerts Slots</h3>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                        Upload multiple custom audio warning sweeps and sound effect alerts.
                      </p>

                      {/* Add new custom alert form */}
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center' }}>
                        <input
                          type="text"
                          placeholder="Alert Name (e.g. Siren, Chime)"
                          id="new-alert-name"
                          className="glass-input"
                          style={{ flex: 1, padding: '6px 12px', fontSize: '12px', color: '#fff' }}
                        />
                        <input
                          type="file"
                          accept="audio/*"
                          id="custom-sound-slot-upload"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            const nameInput = document.getElementById('new-alert-name') as HTMLInputElement;
                            if (!file) return;
                            const name = nameInput?.value.trim() || file.name.replace(/\.[^/.]+$/, "");
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const dataUrl = event.target?.result as string;
                              updateState((prev) => {
                                const slots = prev.settings.customReminderSounds || [];
                                const newSlot = {
                                  id: Math.random().toString(36).substr(2, 9),
                                  name,
                                  dataUrl
                                };
                                return {
                                  ...prev,
                                  settings: {
                                    ...prev.settings,
                                    customReminderSounds: [...slots, newSlot]
                                  }
                                };
                              });
                              if (nameInput) nameInput.value = '';
                              e.target.value = '';
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                        <label
                          htmlFor="custom-sound-slot-upload"
                          className="glass-button"
                          style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '8px 12px', fontSize: '12px', height: '32px' }}
                        >
                          <Volume2 size={12} /> Upload
                        </label>
                      </div>

                      {/* Listing of slots */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {(state.settings.customReminderSounds || []).map((sound) => (
                          <div key={sound.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', padding: '8px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <span style={{ fontSize: '13px', color: '#fff', fontWeight: 500 }}>{sound.name}</span>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                type="button"
                                className="glass-button"
                                style={{ padding: '4px 8px', fontSize: '11px' }}
                                onClick={() => {
                                  const audio = new Audio(sound.dataUrl);
                                  audio.play().catch(e => console.error("Preview failed:", e));
                                }}
                              >
                                <Play size={10} /> Preview
                              </button>
                              <button
                                type="button"
                                className="glass-button"
                                style={{ padding: '4px 8px', fontSize: '11px', color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)' }}
                                onClick={() => {
                                  updateState((prev) => ({
                                    ...prev,
                                    settings: {
                                      ...prev.settings,
                                      customReminderSounds: (prev.settings.customReminderSounds || []).filter(cs => cs.id !== sound.id)
                                    }
                                  }));
                                }}
                              >
                                <Trash2 size={10} /> Delete
                              </button>
                            </div>
                          </div>
                        ))}
                        {(state.settings.customReminderSounds || []).length === 0 && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '6px 0' }}>
                            No custom alert slots uploaded yet.
                          </div>
                        )}
                      </div>
                    </div>

                  </div>

                </div>
              </div>
            )}



            {/* =======================================================
              8. NOTES WORKSPACE VIEW
              ======================================================= */}
            {activeTab === 'notes' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>

                {!isWritingFullscreen && (
                  <div>
                    <h2 style={{ fontSize: '32px', fontWeight: 700 }}>Notes Workspace</h2>
                    <p>Distraction-free typing space, folder categories, and visual format selection editing.</p>
                  </div>
                )}

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isWritingFullscreen ? '1fr' : '180px 250px 1fr',
                  gap: '20px',
                  flex: 1,
                  minHeight: '400px',
                  height: isWritingFullscreen ? 'calc(100vh - 40px)' : 'auto'
                }}>

                  {/* 1. Folders/Categories Sidebar Panel */}
                  {!isWritingFullscreen && (
                    <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '6px' }}>
                        Notebooks
                      </div>

                      <div className="scroll-y" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {/* All notes folder selector */}
                        <button
                          type="button"
                          className={`glass-button ${noteFolderFilter === 'All' ? 'active' : ''}`}
                          style={{ justifyContent: 'space-between', padding: '8px 12px', fontSize: '12px', background: noteFolderFilter === 'All' ? undefined : 'transparent', border: 'none' }}
                          onClick={() => setNoteFolderFilter('All')}
                        >
                          <span>📁 All Notes</span>
                          <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.1)', padding: '1px 5px', borderRadius: '8px', color: '#fff' }}>
                            {state?.notes.length || 0}
                          </span>
                        </button>

                        {/* Dynamic lists of folders */}
                        {Array.from(new Set([
                          'Work', 'Personal', 'Journal', 'Drafts',
                          ...(state?.settings.customFolders || [])
                        ])).map(folder => {
                          const count = state?.notes.filter(n => n.folder === folder).length || 0;
                          return (
                            <button
                              key={folder}
                              type="button"
                              className={`glass-button ${noteFolderFilter === folder ? 'active' : ''}`}
                              style={{ justifyContent: 'space-between', padding: '8px 12px', fontSize: '12px', background: noteFolderFilter === folder ? undefined : 'transparent', border: 'none' }}
                              onClick={() => setNoteFolderFilter(folder)}
                            >
                              <span>📁 {folder}</span>
                              <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.1)', padding: '1px 5px', borderRadius: '8px', color: '#fff' }}>
                                {count}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        className="glass-button"
                        style={{ padding: '6px 12px', fontSize: '11px', borderStyle: 'dashed' }}
                        onClick={() => {
                          const name = prompt("Enter new folder name:");
                          if (name && name.trim()) {
                            updateSettings({
                              customFolders: Array.from(new Set([
                                ...(state?.settings.customFolders || ['Work', 'Personal', 'Journal', 'Drafts']),
                                name.trim()
                              ]))
                            });
                          }
                        }}
                      >
                        <Plus size={12} /> Add Folder
                      </button>
                    </div>
                  )}

                  {/* 2. Notes sidebar list in chosen folder */}
                  {!isWritingFullscreen && (
                    <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600 }}>Notes List</span>
                        <button className="glass-button" style={{ padding: '4px 8px' }} onClick={createNewNote}><Plus size={14} /></button>
                      </div>

                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <input
                          type="text"
                          placeholder="Search notes..."
                          value={noteSearch}
                          onChange={(e) => setNoteSearch(e.target.value)}
                          className="glass-input"
                          style={{ padding: '4px 8px', fontSize: '12px', flex: 1 }}
                        />
                        <button
                          className={`glass-button ${noteBookmarkFilter ? 'active' : ''}`}
                          style={{ padding: '6px 8px', fontSize: '12px', color: noteBookmarkFilter ? '#eab308' : '#d1d5db' }}
                          onClick={() => setNoteBookmarkFilter(!noteBookmarkFilter)}
                          title="Filter Bookmarked Notes"
                        >
                          ★
                        </button>
                      </div>

                      <div className="scroll-y" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {state?.notes
                          .filter((note) => {
                            const matchesSearch = note.title.toLowerCase().includes(noteSearch.toLowerCase()) || note.content.toLowerCase().includes(noteSearch.toLowerCase());
                            const matchesFolder = noteFolderFilter === 'All' || note.folder === noteFolderFilter;
                            const matchesBookmark = !noteBookmarkFilter || note.isBookmarked === true;
                            return matchesSearch && matchesFolder && matchesBookmark;
                          })
                          .map((note) => (
                            <div
                              key={note.id}
                              className={`glass-card ${selectedNoteId === note.id ? 'active' : ''}`}
                              style={{ padding: '12px', cursor: 'pointer', background: selectedNoteId === note.id ? 'rgba(139,92,246,0.15)' : undefined }}
                              onClick={() => selectNote(note.id)}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontWeight: 600, fontSize: '13px', color: '#fff' }}>{note.title || 'Untitled'}</div>
                                {note.isBookmarked && <span style={{ color: '#eab308', fontSize: '12px' }}>★</span>}
                              </div>
                              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                {new Date(note.lastModified).toLocaleDateString()} | {note.folder}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* 3. Rich Text Formatting Editor Canvas */}
                  <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                    {/* Notes Header options panel */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                        <input
                          type="text"
                          placeholder="Note Title..."
                          value={noteEditTitle}
                          onChange={(e) => {
                            setNoteEditTitle(e.target.value);
                            saveActiveNote();
                          }}
                          className="glass-input"
                          style={{ fontSize: '20px', fontWeight: 600, border: 'none', background: 'transparent', flex: 1 }}
                        />

                        {selectedNoteId && (
                          <button
                            className="glass-button"
                            style={{
                              padding: '4px 10px',
                              fontSize: '13px',
                              color: state.notes.find(n => n.id === selectedNoteId)?.isBookmarked ? '#eab308' : '#d1d5db',
                              background: state.notes.find(n => n.id === selectedNoteId)?.isBookmarked ? 'rgba(234,179,8,0.12)' : undefined,
                              borderColor: state.notes.find(n => n.id === selectedNoteId)?.isBookmarked ? '#eab308' : undefined
                            }}
                            onClick={() => {
                              if (selectedNoteId) {
                                updateState((prev) => ({
                                  ...prev,
                                  notes: prev.notes.map(n => n.id === selectedNoteId ? { ...n, isBookmarked: !n.isBookmarked } : n)
                                }));
                              }
                            }}
                            title="Bookmark Note"
                          >
                            ★ Bookmark
                          </button>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: '12px' }}>
                        {selectedNoteId && (
                          <select
                            className="glass-input"
                            style={{ padding: '6px 12px', fontSize: '12px', color: '#ffffff' }}
                            value={noteEditFolder}
                            onChange={(e) => {
                              setNoteEditFolder(e.target.value);
                              saveActiveNote();
                            }}
                          >
                            {Array.from(new Set([
                              'Work', 'Personal', 'Journal', 'Drafts',
                              ...(state?.settings.customFolders || [])
                            ])).map(f => (
                              <option key={f} value={f}>{f}</option>
                            ))}
                          </select>
                        )}

                        <button className="glass-button" style={{ padding: '8px 12px' }} onClick={() => setIsWritingFullscreen(!isWritingFullscreen)}>
                          {isWritingFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                          {isWritingFullscreen ? 'Standard' : 'Fullscreen'}
                        </button>

                        <button className="glass-button active" style={{ padding: '8px 12px' }} onClick={saveActiveNote}>
                          <Save size={14} /> Save
                        </button>
                      </div>
                    </div>

                    {/* WYSIWYG selection toolbar and dynamic editor */}
                    {selectedNoteId ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                        {/* Selection Toolbar */}
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>

                          {/* Bold / Italic */}
                          <button
                            type="button" className="glass-button" style={{ fontWeight: 'bold', padding: '4px 10px', fontSize: '12px' }}
                            onClick={() => document.execCommand('bold', false)}
                          >
                            Bold
                          </button>
                          <button
                            type="button" className="glass-button" style={{ fontStyle: 'italic', padding: '4px 10px', fontSize: '12px' }}
                            onClick={() => document.execCommand('italic', false)}
                          >
                            Italic
                          </button>
                          <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }}></div>

                          {/* Font Selector */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Font:</span>
                            <select
                              className="glass-input"
                              style={{ padding: '2px 6px', fontSize: '11px', color: '#fff', width: '110px' }}
                              onChange={(e) => document.execCommand('fontName', false, e.target.value)}
                              defaultValue="Outfit"
                            >
                              <option value="Outfit">Outfit</option>
                              <option value="Inter">Inter</option>
                              <option value="Poppins">Poppins</option>
                              <option value="Montserrat">Montserrat</option>
                              <option value="JetBrains Mono">JetBrains Mono</option>
                              <option value="Playfair Display">Playfair Display</option>
                              <option value="Pacifico">Pacifico</option>
                              <option value="Sacramento">Sacramento</option>
                              <option value="Quicksand">Quicksand</option>
                            </select>
                          </div>
                          <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }}></div>

                          {/* Color Picker */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Color:</span>
                            <input
                              type="color"
                              style={{ border: 'none', background: 'transparent', width: '22px', height: '22px', cursor: 'pointer', padding: 0 }}
                              onChange={(e) => document.execCommand('foreColor', false, e.target.value)}
                              defaultValue="#ffffff"
                            />
                          </div>

                          {/* Highlight background Picker */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Highlight:</span>
                            <input
                              type="color"
                              style={{ border: 'none', background: 'transparent', width: '22px', height: '22px', cursor: 'pointer', padding: 0 }}
                              onChange={(e) => document.execCommand('hiliteColor', false, e.target.value)}
                              defaultValue="#8b5cf6"
                            />
                          </div>

                          {/* Clear formatting controls */}
                          <button
                            type="button" className="glass-button" style={{ padding: '4px 8px', fontSize: '11px', height: '26px' }}
                            onClick={() => document.execCommand('foreColor', false, '#ffffff')}
                            title="Reset color to default"
                          >
                            Reset Color
                          </button>
                          <button
                            type="button" className="glass-button" style={{ padding: '4px 8px', fontSize: '11px', height: '26px' }}
                            onClick={() => document.execCommand('hiliteColor', false, 'transparent')}
                            title="Remove highlight color"
                          >
                            No Highlight
                          </button>
                          <button
                            type="button" className="glass-button" style={{ padding: '4px 8px', fontSize: '11px', height: '26px' }}
                            onClick={() => document.execCommand('removeFormat', false)}
                            title="Clear all formatting"
                          >
                            Remove Format
                          </button>

                          <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }}></div>

                          {/* Bullet / Numbered Lists */}
                          <button
                            type="button" className="glass-button" style={{ padding: '4px 10px', fontSize: '12px' }}
                            onClick={() => document.execCommand('insertUnorderedList', false)}
                          >
                            • Bullet
                          </button>
                          <button
                            type="button" className="glass-button" style={{ padding: '4px 10px', fontSize: '12px' }}
                            onClick={() => document.execCommand('insertOrderedList', false)}
                          >
                            1. Numbered
                          </button>
                          <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }}></div>

                          {/* Direct Link inputs in toolbar */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <input
                              type="text"
                              placeholder="Link URL..."
                              id="note-link-url-direct"
                              className="glass-input"
                              style={{ width: '110px', padding: '4px 8px', fontSize: '11px', height: '26px' }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const url = e.currentTarget.value.trim();
                                  if (url) {
                                    document.execCommand('createLink', false, url);
                                    e.currentTarget.value = '';
                                  }
                                }
                              }}
                            />
                            <button
                              type="button"
                              className="glass-button"
                              style={{ padding: '4px 8px', fontSize: '11px', height: '26px' }}
                              onClick={() => {
                                const input = document.getElementById('note-link-url-direct') as HTMLInputElement;
                                const url = input?.value.trim() || '';
                                if (url) {
                                  document.execCommand('createLink', false, url);
                                  if (input) input.value = '';
                                }
                              }}
                            >
                              Add Link
                            </button>
                          </div>

                          {/* Direct Image inputs & upload in toolbar */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <input
                              type="text"
                              placeholder="Image URL..."
                              id="note-img-url-direct"
                              className="glass-input"
                              style={{ width: '110px', padding: '4px 8px', fontSize: '11px', height: '26px' }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const url = e.currentTarget.value.trim();
                                  if (url) {
                                    document.execCommand('insertImage', false, url);
                                    e.currentTarget.value = '';
                                  }
                                }
                              }}
                            />
                            <button
                              type="button"
                              className="glass-button"
                              style={{ padding: '4px 8px', fontSize: '11px', height: '26px' }}
                              onClick={() => {
                                const input = document.getElementById('note-img-url-direct') as HTMLInputElement;
                                const url = input?.value.trim() || '';
                                if (url) {
                                  document.execCommand('insertImage', false, url);
                                  if (input) input.value = '';
                                }
                              }}
                            >
                              Add Image
                            </button>

                            <input
                              type="file"
                              accept="image/*"
                              id="note-file-img-upload-direct"
                              style={{ display: 'none' }}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = (event) => {
                                    const dataUrl = event.target?.result as string;
                                    if (dataUrl) {
                                      document.execCommand('insertImage', false, dataUrl);
                                    }
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                            <label
                              htmlFor="note-file-img-upload-direct"
                              className="glass-button"
                              style={{ padding: '4px 8px', fontSize: '11px', height: '26px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Paperclip size={11} />
                              <span>Upload</span>
                            </label>
                          </div>

                          <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }}></div>

                          {/* Alignment buttons */}
                          <div style={{ display: 'flex', gap: '2px' }}>
                            <button
                              type="button" className="glass-button" style={{ padding: '4px 6px', height: '26px' }}
                              onClick={() => document.execCommand('justifyLeft', false)}
                              title="Align Left"
                            >
                              <AlignLeft size={12} />
                            </button>
                            <button
                              type="button" className="glass-button" style={{ padding: '4px 6px', height: '26px' }}
                              onClick={() => document.execCommand('justifyCenter', false)}
                              title="Align Center"
                            >
                              <AlignCenter size={12} />
                            </button>
                            <button
                              type="button" className="glass-button" style={{ padding: '4px 6px', height: '26px' }}
                              onClick={() => document.execCommand('justifyRight', false)}
                              title="Align Right"
                            >
                              <AlignRight size={12} />
                            </button>
                          </div>
                        </div>

                        {/* ContentEditable visual rich-editor */}
                        <div
                          ref={noteRichEditorRef}
                          contentEditable={true}
                          id="note-editor-rich"
                          onInput={handleNoteRichChange}
                          {...{ placeholder: "Type premium bold, italic notes here, style fonts, background highlights, insert lists and links..." }}
                          style={{
                            flex: 1,
                            width: '100%',
                            overflowY: 'auto',
                            fontSize: '15px',
                            padding: '16px',
                            lineHeight: 1.6,
                            color: '#ffffff',
                            backgroundColor: 'rgba(0,0,0,0.15)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            borderRadius: '8px',
                            outline: 'none',
                            minHeight: '300px'
                          }}
                        />
                      </div>
                    ) : (
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '14px', fontStyle: 'italic' }}>
                        Select a note from the notebook sidebar folder, or click '+' to create a new rich-text format note!
                      </div>
                    )}

                  </div>

                </div>
              </div>
            )}

            {/* =======================================================
              9. ANALYTICS CENTER VIEW
              ======================================================= */}
            {activeTab === 'analytics' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div>
                  <h2 style={{ fontSize: '32px', fontWeight: 700 }}>Analytics</h2>
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Review real-time database metric audits, priority completion graphs, and upcoming milestones forecast.</p>
                </div>

                {/* Filters Panel */}
                <div className="glass-panel" style={{ padding: '16px 24px', display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center', background: 'rgba(18, 18, 26, 0.4)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Time Range:</span>
                    <select
                      value={analyticsTimeRange}
                      onChange={(e) => setAnalyticsTimeRange(e.target.value as any)}
                      className="glass-input"
                      style={{ color: '#fff', padding: '6px 12px', fontSize: '13px' }}
                    >
                      <option value="all">All Time</option>
                      <option value="week">Last 7 Days</option>
                      <option value="today">Today</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Category:</span>
                    <select
                      value={analyticsCategory}
                      onChange={(e) => setAnalyticsCategory(e.target.value)}
                      className="glass-input"
                      style={{ color: '#fff', padding: '6px 12px', fontSize: '13px' }}
                    >
                      <option value="All">All Categories</option>
                      {Array.from(new Set([
                        ...(state?.tasks.map(t => t.label) || []),
                        ...(state?.goals.map(g => g.category) || [])
                      ].filter(Boolean))).map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Metric Ribbon */}
                {(() => {
                  const filteredTasksForAnalytics = state.tasks.filter(t => {
                    if (t.isDeleted) return false;
                    if (analyticsCategory !== 'All' && t.label !== analyticsCategory) return false;

                    const taskTime = t.createdAt ? new Date(t.createdAt).getTime() : 0;
                    const now = new Date();
                    if (analyticsTimeRange === 'week') {
                      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                      if (taskTime < sevenDaysAgo.getTime()) return false;
                    } else if (analyticsTimeRange === 'today') {
                      const todayStart = new Date();
                      todayStart.setHours(0, 0, 0, 0);
                      if (taskTime < todayStart.getTime()) return false;
                    }
                    return true;
                  });

                  const completedTasks = filteredTasksForAnalytics.filter(t => t.column === 'completed');
                  const totalEstTime = completedTasks.reduce((sum, t) => sum + (t.estTime || 0), 0);
                  const totalSpentTime = completedTasks.reduce((sum, t) => sum + (t.spentTime || 0), 0);
                  const focusComplianceRate = totalEstTime > 0 ? Math.min(130, Math.round((totalSpentTime / totalEstTime) * 100)) : (state.settings.useDemoData ? 94 : 0);

                  const filteredGoalsForAnalytics = state.goals.filter(g => {
                    if (g.isDeleted) return false;
                    if (analyticsCategory !== 'All' && g.category !== analyticsCategory) return false;
                    return true;
                  });

                  const completedGoalsCount = filteredGoalsForAnalytics.filter(g => g.status === 'Completed').length;
                  const activeGoalsCount = filteredGoalsForAnalytics.filter(g => g.status !== 'Completed').length;
                  const goalsCompletedRatio = (completedGoalsCount + activeGoalsCount) > 0
                    ? Math.round((completedGoalsCount / (completedGoalsCount + activeGoalsCount)) * 100)
                    : (state.settings.useDemoData ? 60 : 0);

                  const pinnedCompletedCount = filteredTasksForAnalytics.filter(t => t.isPinned && t.column === 'completed').length;
                  const pinnedPendingCount = filteredTasksForAnalytics.filter(t => t.isPinned && t.column !== 'completed').length;

                  let focusStreak = 0;
                  const sortedLogs = [...state.activityLog].sort((a, b) => b.date.localeCompare(a.date));
                  for (const log of sortedLogs) {
                    if (log.focusSeconds > 0) {
                      focusStreak++;
                    } else {
                      break;
                    }
                  }
                  if (focusStreak === 0 && state.settings.useDemoData) focusStreak = 3; // realistic baseline if starting fresh with demo data

                  // Priority stats
                  const priorityKeys: TaskPriority[] = ['Critical', 'High', 'Medium', 'Low'];
                  const priorityColors: Record<TaskPriority, string> = {
                    Critical: '#ef4444',
                    High: '#f97316',
                    Medium: '#8b5cf6',
                    Low: '#3b82f6'
                  };
                  const priorityStats = priorityKeys.map(p => {
                    const list = filteredTasksForAnalytics.filter(t => t.priority === p);
                    const total = list.length;
                    const done = list.filter(t => t.column === 'completed').length;
                    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                    return { priority: p, total, done, pct };
                  });

                  // Category stats
                  const catTimeRecord: Record<string, number> = {};
                  filteredTasksForAnalytics.forEach(t => {
                    const cat = t.label || 'General';
                    catTimeRecord[cat] = (catTimeRecord[cat] || 0) + (t.spentTime || 0);
                  });
                  const catTimeList = Object.entries(catTimeRecord)
                    .map(([name, mins]) => ({ name, hours: parseFloat((mins / 60).toFixed(1)) }))
                    .filter(item => item.hours > 0)
                    .sort((a, b) => b.hours - a.hours);
                  const totalHoursSpent = catTimeList.reduce((sum, item) => sum + item.hours, 0) || (state.settings.useDemoData ? 12.5 : 0);
                  return (
                    <>
                      {/* Metrics grid with ? Help Bubbles */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>

                        {/* Card 1: Focus Compliance */}
                        <div className="glass-panel" style={{ padding: '20px', position: 'relative' }}>
                          <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 10 }}>
                            <button
                              type="button"
                              onClick={() => setActiveTooltip(activeTooltip === 'focus_compliance' ? null : 'focus_compliance')}
                              onMouseEnter={() => setActiveTooltip('focus_compliance')}
                              onMouseLeave={() => setActiveTooltip(null)}
                              style={{
                                width: '18px', height: '18px', borderRadius: '50%',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                color: 'var(--text-secondary)',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', transition: 'all 0.2s'
                              }}
                            >
                              ?
                            </button>
                            {activeTooltip === 'focus_compliance' && (
                              <div className="glass-panel" style={{ position: 'absolute', top: '24px', right: 0, width: '220px', padding: '12px', zIndex: 100, fontSize: '11.5px', background: 'rgba(12, 10, 20, 0.95)', border: '1px solid var(--border-glass-purple)', borderRadius: '8px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', pointerEvents: 'none', textAlign: 'left', lineHeight: 1.4 }}>
                                <strong style={{ color: '#fff', display: 'block', marginBottom: '4px' }}>Focus Compliance</strong>
                                Compares estimated task time against actual spent deep work sprint time. Helps optimize realistic time schedules.
                              </div>
                            )}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Focus Compliance Rate</div>
                          <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '4px', color: 'var(--color-purple-light)' }}>
                            {focusComplianceRate}%
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Actual vs Estimated Time</div>
                        </div>

                        {/* Card 2: Goal Forecast */}
                        <div className="glass-panel" style={{ padding: '20px', position: 'relative' }}>
                          <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 10 }}>
                            <button
                              type="button"
                              onClick={() => setActiveTooltip(activeTooltip === 'goal_completion' ? null : 'goal_completion')}
                              onMouseEnter={() => setActiveTooltip('goal_completion')}
                              onMouseLeave={() => setActiveTooltip(null)}
                              style={{
                                width: '18px', height: '18px', borderRadius: '50%',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                color: 'var(--text-secondary)',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', transition: 'all 0.2s'
                              }}
                            >
                              ?
                            </button>
                            {activeTooltip === 'goal_completion' && (
                              <div className="glass-panel" style={{ position: 'absolute', top: '24px', right: 0, width: '220px', padding: '12px', zIndex: 100, fontSize: '11.5px', background: 'rgba(12, 10, 20, 0.95)', border: '1px solid var(--border-glass-purple)', borderRadius: '8px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', pointerEvents: 'none', textAlign: 'left', lineHeight: 1.4 }}>
                                <strong style={{ color: '#fff', display: 'block', marginBottom: '4px' }}>Goal Completion</strong>
                                Tracks completed vs active goals. Displays long-term developmental milestones completion ratio.
                              </div>
                            )}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Goal Completion Forecast</div>
                          <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '4px', color: '#10b981' }}>
                            {goalsCompletedRatio}%
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Completed / Active Goals</div>
                        </div>

                        {/* Card 3: Pinned Tasks */}
                        <div className="glass-panel" style={{ padding: '20px', position: 'relative' }}>
                          <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 10 }}>
                            <button
                              type="button"
                              onClick={() => setActiveTooltip(activeTooltip === 'pinned_tasks' ? null : 'pinned_tasks')}
                              onMouseEnter={() => setActiveTooltip('pinned_tasks')}
                              onMouseLeave={() => setActiveTooltip(null)}
                              style={{
                                width: '18px', height: '18px', borderRadius: '50%',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                color: 'var(--text-secondary)',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', transition: 'all 0.2s'
                              }}
                            >
                              ?
                            </button>
                            {activeTooltip === 'pinned_tasks' && (
                              <div className="glass-panel" style={{ position: 'absolute', top: '24px', right: 0, width: '220px', padding: '12px', zIndex: 100, fontSize: '11.5px', background: 'rgba(12, 10, 20, 0.95)', border: '1px solid var(--border-glass-purple)', borderRadius: '8px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', pointerEvents: 'none', textAlign: 'left', lineHeight: 1.4 }}>
                                <strong style={{ color: '#fff', display: 'block', marginBottom: '4px' }}>Pinned Tasks</strong>
                                Focuses on high-priority task completions. Tracks items explicitly pinned on the Kanban Board.
                              </div>
                            )}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Pinned Tasks Ratio</div>
                          <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '4px', color: '#ec4899' }}>
                            {pinnedCompletedCount}/{pinnedCompletedCount + pinnedPendingCount}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Completed Pinned items</div>
                        </div>

                        {/* Card 4: Focus Streak */}
                        <div className="glass-panel" style={{ padding: '20px', position: 'relative' }}>
                          <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 10 }}>
                            <button
                              type="button"
                              onClick={() => setActiveTooltip(activeTooltip === 'focus_streak' ? null : 'focus_streak')}
                              onMouseEnter={() => setActiveTooltip('focus_streak')}
                              onMouseLeave={() => setActiveTooltip(null)}
                              style={{
                                width: '18px', height: '18px', borderRadius: '50%',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                color: 'var(--text-secondary)',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', transition: 'all 0.2s'
                              }}
                            >
                              ?
                            </button>
                            {activeTooltip === 'focus_streak' && (
                              <div className="glass-panel" style={{ position: 'absolute', top: '24px', right: 0, width: '220px', padding: '12px', zIndex: 100, fontSize: '11.5px', background: 'rgba(12, 10, 20, 0.95)', border: '1px solid var(--border-glass-purple)', borderRadius: '8px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', pointerEvents: 'none', textAlign: 'left', lineHeight: 1.4 }}>
                                <strong style={{ color: '#fff', display: 'block', marginBottom: '4px' }}>Focus Streak</strong>
                                Records consecutive daily logs with active work timers, celebrating consistent deep work velocity.
                              </div>
                            )}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Focus Hours Streak</div>
                          <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '4px', color: '#eab308' }}>
                            ⚡ {focusStreak} days
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Consecutive productive days</div>
                        </div>

                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '16px' }}>

                        {/* Priority Completion rate */}
                        <div className="glass-panel" style={{ padding: '24px', position: 'relative' }}>
                          <div style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 10 }}>
                            <button
                              type="button"
                              onClick={() => setActiveTooltip(activeTooltip === 'priority_completion' ? null : 'priority_completion')}
                              onMouseEnter={() => setActiveTooltip('priority_completion')}
                              onMouseLeave={() => setActiveTooltip(null)}
                              style={{
                                width: '18px', height: '18px', borderRadius: '50%',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                color: 'var(--text-secondary)',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', transition: 'all 0.2s'
                              }}
                            >
                              ?
                            </button>
                            {activeTooltip === 'priority_completion' && (
                              <div className="glass-panel" style={{ position: 'absolute', top: '24px', right: 0, width: '220px', padding: '12px', zIndex: 100, fontSize: '11.5px', background: 'rgba(12, 10, 20, 0.95)', border: '1px solid var(--border-glass-purple)', borderRadius: '8px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', pointerEvents: 'none', textAlign: 'left', lineHeight: 1.4 }}>
                                <strong style={{ color: '#fff', display: 'block', marginBottom: '4px' }}>Priority Breakdown</strong>
                                Audits velocity across low/medium/high/critical tasks, ensuring critical bottlenecks are prioritized.
                              </div>
                            )}
                          </div>
                          <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Task Priority Completion Rate</h3>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {priorityStats.map(stat => (
                              <div key={stat.priority} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                  <span style={{ fontWeight: 600, color: priorityColors[stat.priority] }}>{stat.priority} Priority</span>
                                  <span style={{ color: 'var(--text-secondary)' }}>{stat.done}/{stat.total} Tasks ({stat.pct}%)</span>
                                </div>
                                <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                                  <div style={{ height: '100%', width: `${stat.pct}%`, background: priorityColors[stat.priority], borderRadius: '4px' }}></div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Category Time Allocation */}
                        <div className="glass-panel" style={{ padding: '24px', position: 'relative' }}>
                          <div style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 10 }}>
                            <button
                              type="button"
                              onClick={() => setActiveTooltip(activeTooltip === 'category_allocation' ? null : 'category_allocation')}
                              onMouseEnter={() => setActiveTooltip('category_allocation')}
                              onMouseLeave={() => setActiveTooltip(null)}
                              style={{
                                width: '18px', height: '18px', borderRadius: '50%',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                color: 'var(--text-secondary)',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', transition: 'all 0.2s'
                              }}
                            >
                              ?
                            </button>
                            {activeTooltip === 'category_allocation' && (
                              <div className="glass-panel" style={{ position: 'absolute', top: '24px', right: 0, width: '220px', padding: '12px', zIndex: 100, fontSize: '11.5px', background: 'rgba(12, 10, 20, 0.95)', border: '1px solid var(--border-glass-purple)', borderRadius: '8px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', pointerEvents: 'none', textAlign: 'left', lineHeight: 1.4 }}>
                                <strong style={{ color: '#fff', display: 'block', marginBottom: '4px' }}>Time Allocation</strong>
                                Displays total hours logged across labels like Work, Health, etc. Ensures balanced time distribution.
                              </div>
                            )}
                          </div>
                          <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Category Time Allocation</h3>
                          {(() => {
                            const getCategoryColor = (catName: string) => {
                              if (state?.settings.categoryColors && state.settings.categoryColors[catName]) {
                                return state.settings.categoryColors[catName];
                              }
                              const defaultColors: Record<string, string> = {
                                'Career': '#8b5cf6',
                                'Health': '#10b981',
                                'Finance': '#3b82f6',
                                'Business': '#6366f1',
                                'Learning': '#f97316',
                                'Personal': '#ec4899'
                              };
                              return defaultColors[catName] || '#8b5cf6';
                            };

                            let cumulativePercent = 0;
                            const gradientSlices = catTimeList.map(item => {
                              const pct = totalHoursSpent > 0 ? (item.hours / totalHoursSpent) * 100 : 0;
                              const start = cumulativePercent;
                              const end = cumulativePercent + pct;
                              cumulativePercent = end;
                              const color = getCategoryColor(item.name);
                              return `${color} ${start.toFixed(1)}% ${end.toFixed(1)}%`;
                            });

                            const conicGradientStyle = gradientSlices.length > 0
                              ? `conic-gradient(${gradientSlices.join(', ')})`
                              : 'conic-gradient(rgba(255,255,255,0.05) 0% 100%)';

                            return (
                              <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', marginTop: '8px' }}>
                                {/* Donut Chart (Left Column) */}
                                <div style={{ display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
                                  <div style={{
                                    position: 'relative',
                                    width: '160px',
                                    height: '160px',
                                    borderRadius: '50%',
                                    background: conicGradientStyle,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
                                  }}>
                                    <div style={{
                                      width: '110px',
                                      height: '110px',
                                      borderRadius: '50%',
                                      background: '#12121a', // standard panel dark backdrop
                                      display: 'flex',
                                      flexDirection: 'column',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.6)'
                                    }}>
                                      <div style={{ fontSize: '22px', fontWeight: 700, color: '#fff', lineHeight: 1 }}>{totalHoursSpent.toFixed(1)}h</div>
                                      <div style={{ fontSize: '9.5px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px', textAlign: 'center', whiteSpace: 'nowrap' }}>Total Spent</div>
                                    </div>
                                  </div>
                                </div>

                                {/* Legend (Right Column) */}
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '180px' }}>
                                  {catTimeList.map(item => {
                                    const pct = totalHoursSpent > 0 ? Math.round((item.hours / totalHoursSpent) * 100) : 0;
                                    const color = getCategoryColor(item.name);
                                    return (
                                      <div key={item.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
                                          <span style={{ fontWeight: 500, color: '#fff' }}>{item.name}</span>
                                        </div>
                                        <span style={{ color: 'var(--text-secondary)' }}>{item.hours}h ({pct}%)</span>
                                      </div>
                                    );
                                  })}
                                  {catTimeList.length === 0 && (
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '10px' }}>
                                      No task hours logged for this selection.
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* =======================================================
              10. SYSTEM & FOCUS SETTINGS VIEW
              ======================================================= */}
            {activeTab === 'settings' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div>
                  <h2 style={{ fontSize: '32px', fontWeight: 700 }}>System Settings & Customization</h2>
                  <p>Configure global keyboard shortcut hotkeys, screen overlay aura designs, and focus mode goals.</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

                  {/* Left Side: Theme background color and custom image upload */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                    {/* App UI & Theme Customization */}
                    <div className="glass-panel" style={{ padding: '24px' }}>
                      <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>App Theme & Background</h3>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>Customize the color palette and background image of your Orb workspace.</p>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                        {/* Background Color Picker */}
                        <div>
                          <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Solid Background Color</label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <input
                              type="color"
                              value={state.settings.themeBgColor || '#030303'}
                              onChange={(e) => {
                                const val = e.target.value;
                                updateState((prev) => ({
                                  ...prev,
                                  settings: { ...prev.settings, themeBgColor: val }
                                }));
                              }}
                              style={{ width: '42px', height: '42px', border: 'none', borderRadius: '8px', cursor: 'pointer', background: 'transparent' }}
                            />
                            <div>
                              <code style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>
                                {state.settings.themeBgColor || '#030303'}
                              </code>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>Click color block to customize</span>
                            </div>
                          </div>
                        </div>

                        {/* Theme Background Color Presets */}
                        <div>
                          <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Harmonious Theme Presets</label>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {[
                              { name: 'Midnight', color: '#030303' },
                              { name: 'Deep Sea', color: '#0b0f19' },
                              { name: 'Obsidian', color: '#0f172a' },
                              { name: 'Forest', color: '#061c15' },
                              { name: 'Plum', color: '#16081c' },
                              { name: 'Rust', color: '#1a0d0a' },
                              { name: 'Sakura Pink', color: '#2b1b22' },
                              { name: 'Lavender Breeze', color: '#171224' },
                              { name: 'Cyberpunk Neon', color: '#1a052e' },
                              { name: 'Matcha Green', color: '#0f1711' }
                            ].map((preset) => (
                              <button
                                key={preset.color}
                                type="button"
                                className="glass-button"
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '11px',
                                  background: state.settings.themeBgColor === preset.color ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.03)',
                                  borderColor: state.settings.themeBgColor === preset.color ? '#8b5cf6' : 'rgba(255,255,255,0.1)'
                                }}
                                onClick={() => {
                                  updateState((prev) => ({
                                    ...prev,
                                    settings: { ...prev.settings, themeBgColor: preset.color }
                                  }));
                                }}
                              >
                                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: preset.color, marginRight: '6px' }}></span>
                                {preset.name}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Buttons & OS Accent Color */}
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
                          <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Buttons & OS Accent Color</label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                            <input
                              type="color"
                              value={state.settings.themeAccentColor || '#8b5cf6'}
                              onChange={(e) => {
                                const val = e.target.value;
                                updateSettings({ themeAccentColor: val });
                              }}
                              style={{ width: '42px', height: '42px', border: 'none', borderRadius: '8px', cursor: 'pointer', background: 'transparent' }}
                            />
                            <div>
                              <code style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>
                                {state.settings.themeAccentColor || '#8b5cf6'}
                              </code>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>Click color block to customize</span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {[
                              { name: 'Violet', color: '#8b5cf6' },
                              { name: 'Royal Blue', color: '#3b82f6' },
                              { name: 'Emerald', color: '#10b981' },
                              { name: 'Rose', color: '#f43f5e' },
                              { name: 'Amber', color: '#f59e0b' },
                              { name: 'Teal', color: '#14b8a6' },
                              { name: 'Sky', color: '#0ea5e9' }
                            ].map((preset) => (
                              <button
                                key={preset.color}
                                type="button"
                                className="glass-button"
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '11px',
                                  background: state.settings.themeAccentColor === preset.color ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)',
                                  borderColor: state.settings.themeAccentColor === preset.color ? preset.color : 'rgba(255,255,255,0.1)'
                                }}
                                onClick={() => {
                                  updateSettings({ themeAccentColor: preset.color });
                                }}
                              >
                                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: preset.color, marginRight: '6px' }}></span>
                                {preset.name}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Background Image Upload */}
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
                          <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Custom UI Background Image</label>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <input
                              type="file"
                              accept="image/*"
                              id="theme-bg-image-upload"
                              style={{ display: 'none' }}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  const dataUrl = event.target?.result as string;
                                  updateState((prev) => ({
                                    ...prev,
                                    settings: { ...prev.settings, themeBgImage: dataUrl }
                                  }));
                                };
                                reader.readAsDataURL(file);
                              }}
                            />

                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                              <label
                                htmlFor="theme-bg-image-upload"
                                className="glass-button"
                                style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 16px', fontSize: '12px' }}
                              >
                                <Image size={14} /> Upload Custom Image
                              </label>

                              {state.settings.themeBgImage && (
                                <button
                                  type="button"
                                  className="glass-button"
                                  style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)', padding: '10px 16px', fontSize: '12px' }}
                                  onClick={() => {
                                    updateState((prev) => ({
                                      ...prev,
                                      settings: { ...prev.settings, themeBgImage: undefined }
                                    }));
                                  }}
                                >
                                  <Trash2 size={14} /> Remove Image
                                </button>
                              )}
                            </div>

                            {state.settings.themeBgImage ? (
                              <div style={{ position: 'relative', width: '100%', height: '120px', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', marginTop: '6px' }}>
                                <img
                                  src={state.settings.themeBgImage}
                                  alt="Custom theme background preview"
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                                <div style={{ position: 'absolute', bottom: '6px', right: '6px', background: 'rgba(0,0,0,0.6)', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', color: '#fff' }}>
                                  Preview Active
                                </div>
                              </div>
                            ) : (
                              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '10px', background: 'rgba(255,255,255,0.01)', borderRadius: '6px', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.05)' }}>
                                No background image active. Solid color is currently shown.
                              </div>
                            )}
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* System Automation & Testing */}
                    <div className="glass-panel" style={{ padding: '24px', marginTop: '24px' }}>
                      <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>System Automation & Testing</h3>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>Manage mock dataset toggle for workspace evaluation.</p>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* Demo Data Toggle */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <label style={{ fontSize: '14px', fontWeight: 600, color: '#fff', display: 'block' }}>Use Demo Data</label>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>
                              Pre-populate lists with sample goals, tasks, notes, and activity logs.
                            </span>
                          </div>
                          <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '40px', height: '20px' }}>
                            <input
                              type="checkbox"
                              checked={state.settings.useDemoData || false}
                              onChange={(e) => toggleDemoData(e.target.checked)}
                              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: 2 }}
                            />
                            <span className="slider round" style={{
                              position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                              backgroundColor: state.settings.useDemoData ? 'var(--color-purple)' : 'rgba(255,255,255,0.1)',
                              transition: '.3s', borderRadius: '20px'
                            }}>
                              <span style={{
                                position: 'absolute', content: '""', height: '14px', width: '14px', left: state.settings.useDemoData ? '22px' : '3px', bottom: '3px',
                                backgroundColor: 'white', transition: '.3s', borderRadius: '50%'
                              }}></span>
                            </span>
                          </label>
                        </div>

                      </div>
                    </div>

                  </div>

                  {/* Right Side: OS Interface, Zoom & Typography */}
                  <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                      <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>OS Interface, Zoom & Typography</h3>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>Customize typography, adjust levels scaling, and zoom limits across the system.</p>
                    </div>

                    {/* Select Font Family */}
                    <div>
                      <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Interface Font Style</label>
                      <select
                        className="glass-input"
                        style={{ color: '#fff', width: '100%', padding: '10px 14px', fontSize: '14px' }}
                        value={state.settings.appFontFamily || 'Outfit'}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateState((prev) => ({
                            ...prev,
                            settings: { ...prev.settings, appFontFamily: val }
                          }));
                        }}
                      >
                        <option value="Outfit">Outfit (Default)</option>
                        <option value="Inter">Inter (Sleek sans-serif)</option>
                        <option value="Poppins">Poppins (Modern geometric)</option>
                        <option value="Montserrat">Montserrat (Classic & strong)</option>
                        <option value="JetBrains Mono">JetBrains Mono (Developer console style)</option>
                        <option value="Playfair Display">Playfair Display (Elegant serif)</option>
                        <option value="Pacifico">🌸 Pacifico (Playful Girly)</option>
                        <option value="Sacramento">✨ Sacramento (Elegant Handwriting)</option>
                        <option value="Quicksand">🧸 Quicksand (Soft Rounded)</option>
                      </select>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', fontStyle: 'italic' }}>
                        Typography font will load dynamically and apply globally.
                      </div>
                    </div>

                    {/* Header & Title Scale Slider */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Header & Title Zoom</label>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-purple-light)', background: 'rgba(139,92,246,0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                          {state.settings.titleSizeZoom || 100}%
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>90%</span>
                        <input
                          type="range" min="90" max="130" step="5"
                          value={state.settings.titleSizeZoom || 100}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            updateState((prev) => ({
                              ...prev,
                              settings: { ...prev.settings, titleSizeZoom: val }
                            }));
                          }}
                          style={{ flex: 1, cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>130%</span>
                      </div>
                    </div>

                    {/* Sidebar Scale Slider */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Sidebar & Menu Zoom</label>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-purple-light)', background: 'rgba(139,92,246,0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                          {state.settings.sidebarSizeZoom || 100}%
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>90%</span>
                        <input
                          type="range" min="90" max="130" step="5"
                          value={state.settings.sidebarSizeZoom || 100}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            updateState((prev) => ({
                              ...prev,
                              settings: { ...prev.settings, sidebarSizeZoom: val }
                            }));
                          }}
                          style={{ flex: 1, cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>130%</span>
                      </div>
                    </div>

                    {/* Body Scale Slider */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Content & Body Zoom</label>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-purple-light)', background: 'rgba(139,92,246,0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                          {state.settings.bodySizeZoom || 100}%
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>90%</span>
                        <input
                          type="range" min="90" max="130" step="5"
                          value={state.settings.bodySizeZoom || 100}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            updateState((prev) => ({
                              ...prev,
                              settings: { ...prev.settings, bodySizeZoom: val }
                            }));
                          }}
                          style={{ flex: 1, cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>130%</span>
                      </div>
                    </div>

                    {/* Custom Voice Alert Slots moved to Voice Reminders tab */}

                    {/* Live Preview Text Block */}
                    <div style={{
                      marginTop: '10px',
                      padding: '16px',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px dashed rgba(255,255,255,0.1)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Live Preview (Zoom & Style)</span>
                      <div style={{ fontSize: '15px', fontWeight: 600, color: '#fff' }}>The quick brown fox jumps over the lazy dog.</div>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                        Orb OS offers responsive grid layouts configured in rems and HSL scales.
                      </p>
                    </div>
                  </div>

                </div>
              </div>
            )}

          </main>
        </div>

        {/* Task Editor Modal */}
        {isTaskModalOpen && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 2000, pointerEvents: 'auto'
          }}>
            <div className="glass-panel animate-slide-up" style={{
              padding: '24px',
              width: '950px',
              maxWidth: '90%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}>
              <form onSubmit={handleSaveTask} style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px', flex: 1, overflow: 'hidden' }}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ fontSize: '22px', fontWeight: 700 }}>
                      {editingTaskId ? 'Edit Task Details' : 'Create New Task'}
                    </h3>
                    {taskFormIsPinned && <Pin size={16} style={{ color: 'var(--color-purple-light)', transform: 'rotate(45deg)' }} />}
                  </div>
                  <button type="button" className="glass-button" style={{ padding: '4px', border: 'none', background: 'transparent' }} onClick={() => setIsTaskModalOpen(false)}>
                    <X size={18} />
                  </button>
                </div>

                {/* Scrollable content body */}
                <div className="scroll-y" style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', flex: 1, paddingRight: '8px' }}>

                  {/* Split layout: Details vs Config */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>

                    {/* Left Column: Title, Notes, Milestones */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {/* Task Title */}
                      <div>
                        <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Task Title</label>
                        <input
                          type="text"
                          placeholder="Enter task title..."
                          required
                          value={taskFormTitle}
                          onChange={(e) => setTaskFormTitle(e.target.value)}
                          className="glass-input"
                          style={{ width: '100%', fontSize: '16px', fontWeight: 500 }}
                        />
                      </div>

                      {/* Notes / Description */}
                      <div>
                        <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Notes / Description</label>
                        <textarea
                          placeholder="Enter detailed notes, instructions, or descriptions for this task..."
                          value={taskFormNotes}
                          onChange={(e) => setTaskFormNotes(e.target.value)}
                          className="glass-input"
                          style={{ width: '100%', height: '120px', resize: 'none', fontSize: '13px', lineHeight: '1.5' }}
                        />
                      </div>

                      {/* Milestones / Subtasks */}
                      <div>
                        <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>Milestones / Subtasks</label>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                          <input
                            type="text"
                            placeholder="Add new milestone..."
                            value={newSubtaskTitleText}
                            onChange={(e) => setNewSubtaskTitleText(e.target.value)}
                            className="glass-input"
                            style={{ flex: 1, padding: '6px 12px', fontSize: '13px' }}
                          />
                          <button
                            type="button"
                            className="glass-button"
                            style={{ padding: '6px 14px' }}
                            onClick={() => {
                              if (!newSubtaskTitleText.trim()) return;
                              setTaskFormSubtasks((prev) => [
                                ...prev,
                                { id: Math.random().toString(), title: newSubtaskTitleText, completed: false }
                              ]);
                              setNewSubtaskTitleText('');
                            }}
                          >
                            Add
                          </button>
                        </div>

                        {taskFormSubtasks.length > 0 ? (
                          <div className="scroll-y" style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', maxHeight: '140px' }}>
                            {taskFormSubtasks.map((st) => (
                              <div key={st.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                  <input
                                    type="checkbox"
                                    checked={st.completed}
                                    onChange={(e) => {
                                      setTaskFormSubtasks((prev) =>
                                        prev.map(item => item.id === st.id ? { ...item, completed: e.target.checked } : item)
                                      );
                                    }}
                                    style={{ accentColor: 'var(--color-purple)' }}
                                  />
                                  <span style={{ textDecoration: st.completed ? 'line-through' : 'none', color: st.completed ? 'var(--text-muted)' : undefined }}>
                                    {st.title}
                                  </span>
                                </label>
                                <button
                                  type="button"
                                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '11px' }}
                                  onClick={() => {
                                    setTaskFormSubtasks((prev) => prev.filter(item => item.id !== st.id));
                                  }}
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                            No milestones added yet.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Column: Settings, Time tracking, Links, Attachments */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderLeft: '1px solid rgba(255,255,255,0.05)', paddingLeft: '32px' }}>

                      {/* Status, Priority, and Due Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div>
                          <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Status</label>
                          <select
                            value={taskFormColumn}
                            onChange={(e) => setTaskFormColumn(e.target.value as TaskColumn)}
                            className="glass-input"
                            style={{ color: '#fff', width: '100%', padding: '8px 12px' }}
                          >
                            <option value="todo">To Do</option>
                            <option value="in-progress">In Progress</option>
                            <option value="completed">Completed</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Priority</label>
                          <select
                            value={taskFormPriority}
                            onChange={(e) => setTaskFormPriority(e.target.value as TaskPriority)}
                            className="glass-input"
                            style={{ color: '#fff', width: '100%', padding: '8px 12px' }}
                          >
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                            <option value="Critical">Critical</option>
                          </select>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
                        <div>
                          <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Due Date</label>
                          <input
                            type="date"
                            value={taskFormDueDate}
                            onChange={(e) => setTaskFormDueDate(e.target.value)}
                            className="glass-input"
                            style={{ color: '#fff', width: '100%', padding: '8px 12px' }}
                          />
                        </div>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Category Label</label>
                            <button
                              type="button"
                              onClick={() => {
                                const nextCustom = !isTaskCustomCategory;
                                setIsTaskCustomCategory(nextCustom);
                                if (nextCustom) {
                                  setTaskCustomCategoryInput(taskFormLabel || '');
                                } else {
                                  setTaskFormLabel('Work');
                                }
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--color-purple-light)',
                                fontSize: '11px',
                                cursor: 'pointer',
                                padding: 0
                              }}
                            >
                              {isTaskCustomCategory ? 'Select Existing' : '+ Create Custom'}
                            </button>
                          </div>

                          {isTaskCustomCategory ? (
                            <input
                              type="text"
                              placeholder="Enter custom category..."
                              value={taskCustomCategoryInput}
                              onChange={(e) => setTaskCustomCategoryInput(e.target.value)}
                              className="glass-input"
                              style={{ color: '#fff', width: '100%', padding: '8px 12px' }}
                              required
                            />
                          ) : (
                            <select
                              value={taskFormLabel}
                              onChange={(e) => {
                                if (e.target.value === '__new__') {
                                  setIsTaskCustomCategory(true);
                                  setTaskCustomCategoryInput('');
                                } else {
                                  setTaskFormLabel(e.target.value);
                                }
                              }}
                              className="glass-input"
                              style={{ color: '#fff', width: '100%', padding: '8px 12px' }}
                            >
                              {Array.from(new Set([
                                'Work', 'Personal', 'Learning', 'Health', 'Finance',
                                ...(state?.tasks.map(t => t.label).filter(Boolean) || [])
                              ])).map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                              <option value="__new__">+ Create Custom Category...</option>
                            </select>
                          )}

                          {/* Category Color Picker */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Category Color:</span>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                              {(() => {
                                const catName = isTaskCustomCategory ? (taskCustomCategoryInput || 'Task') : (taskFormLabel || 'Work');
                                const activeColor = state?.settings.categoryColors?.[catName] || '#8b5cf6';
                                const presetColors = ['#8b5cf6', '#06b6d4', '#d946ef', '#10b981', '#ef4444', '#f97316', '#eab308', '#3b82f6'];

                                return (
                                  <>
                                    {presetColors.map(c => (
                                      <button
                                        key={c}
                                        type="button"
                                        onClick={() => {
                                          updateState(prev => {
                                            const categoryColors = {
                                              ...(prev.settings.categoryColors || {}),
                                              [catName]: c
                                            };
                                            return {
                                              ...prev,
                                              settings: {
                                                ...prev.settings,
                                                categoryColors
                                              }
                                            };
                                          });
                                        }}
                                        style={{
                                          width: '20px',
                                          height: '20px',
                                          borderRadius: '50%',
                                          background: c,
                                          border: activeColor === c ? '2px solid #ffffff' : '2px solid transparent',
                                          cursor: 'pointer',
                                          transition: 'all 0.2s',
                                          boxShadow: activeColor === c ? '0 0 8px ' + c : 'none'
                                        }}
                                      />
                                    ))}
                                    {/* Custom Color Input Picker circle */}
                                    <div style={{
                                      width: '20px',
                                      height: '20px',
                                      borderRadius: '50%',
                                      position: 'relative',
                                      background: 'conic-gradient(red, yellow, green, cyan, blue, magenta, red)',
                                      border: !presetColors.includes(activeColor) ? '2px solid #ffffff' : '2px solid transparent',
                                      boxShadow: !presetColors.includes(activeColor) ? '0 0 8px ' + activeColor : 'none',
                                      cursor: 'pointer',
                                      overflow: 'hidden'
                                    }} title="Custom Color">
                                      <input
                                        type="color"
                                        value={activeColor}
                                        onChange={(e) => {
                                          const newColor = e.target.value;
                                          updateState(prev => {
                                            const categoryColors = {
                                              ...(prev.settings.categoryColors || {}),
                                              [catName]: newColor
                                            };
                                            return {
                                              ...prev,
                                              settings: {
                                                ...prev.settings,
                                                categoryColors
                                              }
                                            };
                                          });
                                        }}
                                        style={{
                                          position: 'absolute',
                                          top: 0,
                                          left: 0,
                                          width: '100%',
                                          height: '100%',
                                          opacity: 0,
                                          cursor: 'pointer',
                                          padding: 0,
                                          border: 'none'
                                        }}
                                      />
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Time Logging */}
                      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>Time Allocation (Minutes)</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '8px' }}>
                          <div>
                            <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Estimate</label>
                            <input
                              type="number"
                              value={taskFormEstTime}
                              onChange={(e) => setTaskFormEstTime(Math.max(0, parseInt(e.target.value) || 0))}
                              className="glass-input"
                              style={{ width: '100%', padding: '6px 10px', fontSize: '13px' }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Logged</label>
                            <input
                              type="number"
                              value={taskFormSpentTime}
                              onChange={(e) => setTaskFormSpentTime(Math.max(0, parseInt(e.target.value) || 0))}
                              className="glass-input"
                              style={{ width: '100%', padding: '6px 10px', fontSize: '13px' }}
                            />
                          </div>
                        </div>
                        <div>
                          <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>Add Spent Time Manually</label>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                              type="number"
                              placeholder="e.g. 15 mins"
                              value={manualTimeToAddText}
                              onChange={(e) => setManualTimeToAddText(e.target.value)}
                              className="glass-input"
                              style={{ flex: 1, padding: '6px 10px', fontSize: '13px' }}
                            />
                            <button
                              type="button"
                              className="glass-button"
                              style={{ padding: '6px 12px', fontSize: '12px' }}
                              onClick={() => {
                                const val = parseInt(manualTimeToAddText);
                                if (!isNaN(val) && val > 0) {
                                  setTaskFormSpentTime((prev) => prev + val);
                                  setManualTimeToAddText('');
                                }
                              }}
                            >
                              Add Time
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Pin Option & Tags */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(139, 92, 246, 0.05)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(139, 92, 246, 0.15)' }}>
                        <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-purple-light)' }}>Pin to Dashboard Widget</span>
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={taskFormIsPinned}
                            onChange={(e) => setTaskFormIsPinned(e.target.checked)}
                            style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--color-purple)' }}
                          />
                        </label>
                      </div>

                      {/* Links Section */}
                      <div>
                        <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>Web Links</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <input
                              type="text"
                              placeholder="Link Name (e.g. Doc)"
                              value={newLinkNameText}
                              onChange={(e) => setNewLinkNameText(e.target.value)}
                              className="glass-input"
                              style={{ flex: 0.8, padding: '6px 10px', fontSize: '12px' }}
                            />
                            <input
                              type="text"
                              placeholder="URL (https://...)"
                              value={newLinkUrlText}
                              onChange={(e) => setNewLinkUrlText(e.target.value)}
                              className="glass-input"
                              style={{ flex: 1.2, padding: '6px 10px', fontSize: '12px' }}
                            />
                            <button
                              type="button"
                              className="glass-button"
                              style={{ padding: '6px 10px' }}
                              onClick={() => {
                                if (!newLinkNameText.trim() || !newLinkUrlText.trim()) return;
                                let formattedUrl = newLinkUrlText.trim();
                                if (!/^https?:\/\//i.test(formattedUrl)) {
                                  formattedUrl = 'https://' + formattedUrl;
                                }
                                setTaskFormLinks((prev) => [
                                  ...prev,
                                  { name: newLinkNameText.trim(), url: formattedUrl }
                                ]);
                                setNewLinkNameText('');
                                setNewLinkUrlText('');
                              }}
                            >
                              Link
                            </button>
                          </div>
                        </div>

                        {taskFormLinks.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {taskFormLinks.map((lnk, idx) => (
                              <div key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '3px 8px', fontSize: '11px' }}>
                                <a href={lnk.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-purple-light)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                  <Link size={10} />
                                  <span>{lnk.name}</span>
                                </a>
                                <button
                                  type="button"
                                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px', padding: 0, display: 'flex', alignItems: 'center' }}
                                  onClick={() => setTaskFormLinks((prev) => prev.filter((_, i) => i !== idx))}
                                >
                                  <X size={10} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Attachments Section */}
                      <div>
                        <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>Attachments (Images & Files)</label>
                        <div style={{ position: 'relative', width: '100%', marginBottom: '8px' }}>
                          <input
                            type="file"
                            multiple
                            onChange={handleTaskAttachmentUpload}
                            style={{ display: 'none' }}
                            id="task-file-upload-input"
                          />
                          <label
                            htmlFor="task-file-upload-input"
                            className="glass-button"
                            style={{ width: '100%', cursor: 'pointer', borderStyle: 'dashed', padding: '8px 14px', fontSize: '12px' }}
                          >
                            <Paperclip size={14} /> Upload Images or Files
                          </label>
                        </div>

                        {taskFormAttachments.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '160px', overflowY: 'auto' }}>
                            {taskFormAttachments.map((att) => (
                              <div
                                key={att.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  background: 'rgba(255,255,255,0.03)',
                                  border: '1px solid rgba(255,255,255,0.06)',
                                  borderRadius: '8px',
                                  padding: '6px 10px'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                                  {att.type.startsWith('image/') ? (
                                    <img src={att.dataUrl} alt={att.name} style={{ width: '32px', height: '32px', borderRadius: '4px', objectFit: 'cover' }} />
                                  ) : (
                                    <div style={{ width: '32px', height: '32px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      <Paperclip size={14} style={{ color: 'var(--text-secondary)' }} />
                                    </div>
                                  )}
                                  <div style={{ minWidth: 0, flex: 1 }}>
                                    <div style={{ fontSize: '12px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</div>
                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{(att.size / 1024).toFixed(0)} KB</div>
                                  </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '8px' }}>
                                  <a href={att.dataUrl} download={att.name} className="glass-button" style={{ padding: '4px 8px', fontSize: '11px', background: 'rgba(255,255,255,0.05)' }}>
                                    Download
                                  </a>
                                  <button
                                    type="button"
                                    className="glass-button"
                                    style={{ padding: '4px 8px', fontSize: '11px', background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}
                                    onClick={() => setTaskFormAttachments((prev) => prev.filter(item => item.id !== att.id))}
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                    </div>

                  </div>

                  {/* Tags Section */}
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Tags (Press space or click Add)</label>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                      <input
                        type="text"
                        placeholder="Enter tags..."
                        value={taskFormTagInput}
                        onChange={(e) => setTaskFormTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === ' ' || e.key === 'Enter') {
                            e.preventDefault();
                            const tag = taskFormTagInput.trim();
                            if (tag && !taskFormTags.includes(tag)) {
                              setTaskFormTags([...taskFormTags, tag]);
                              setTaskFormTagInput('');
                            }
                          }
                        }}
                        className="glass-input"
                        style={{ flex: 1, padding: '6px 12px', fontSize: '13px' }}
                      />
                      <button
                        type="button"
                        className="glass-button"
                        onClick={() => {
                          const tag = taskFormTagInput.trim();
                          if (tag && !taskFormTags.includes(tag)) {
                            setTaskFormTags([...taskFormTags, tag]);
                            setTaskFormTagInput('');
                          }
                        }}
                      >
                        Add Tag
                      </button>
                    </div>
                    {taskFormTags.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {taskFormTags.map((tag) => (
                          <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', color: 'var(--color-purple-light)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 500 }}>
                            <span>{tag}</span>
                            <button type="button" style={{ background: 'none', border: 'none', color: 'var(--color-purple-light)', cursor: 'pointer', padding: 0 }} onClick={() => setTaskFormTags(taskFormTags.filter(t => t !== tag))}>
                              <X size={10} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                </div>

                {/* Form Footer Action Buttons */}
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px', flexShrink: 0 }}>
                  <div>
                    {editingTaskId && (
                      <button
                        type="button"
                        className="glass-button"
                        style={{ background: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#ef4444' }}
                        onClick={() => handleDeleteTask(editingTaskId)}
                      >
                        Delete Task
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button type="button" className="glass-button" onClick={() => setIsTaskModalOpen(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="glass-button active">
                      {editingTaskId ? 'Save Changes' : 'Create Task'}
                    </button>
                  </div>
                </div>

              </form>
            </div>
          </div>
        )}

        {/* Voice Reminder Pop-up Modal */}
        {isReminderModalOpen && (
          <div className="strict-overlay" style={{ zIndex: 100 }}>
            <div className="glass-panel" style={{ width: '460px', padding: '28px', display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>
              <button
                type="button"
                className="glass-button"
                style={{ position: 'absolute', top: '16px', right: '16px', padding: '4px', border: 'none', background: 'transparent' }}
                onClick={() => setIsReminderModalOpen(false)}
              >
                <X size={16} />
              </button>

              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>
                  {editingReminderId ? 'Edit Voice Reminder' : 'Schedule Voice Reminder'}
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Configure instant synthesized sound sweeps and custom interval countdown timing alerts.</p>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                if (!remFormMessage) return;

                updateState((prev) => {
                  if (editingReminderId) {
                    const reminders = prev.reminders.map((r) => {
                      if (r.id === editingReminderId) {
                        return {
                          ...r,
                          message: remFormMessage,
                          type: remFormType,
                          time: remFormTime,
                          category: remFormCategory || 'General',
                          soundEffect: remFormSound,
                          countdownMinutes: remFormCountdownMins,
                          intervalMinutes: remFormIntervalMins,
                          daysOfWeek: remFormDaysOfWeek,
                          isLoopingAlert: remFormLoopAlert,
                          dismissKey: remFormDismissKey
                        };
                      }
                      return r;
                    });
                    return { ...prev, reminders };
                  } else {
                    const newReminder: VoiceReminder = {
                      id: Math.random().toString(),
                      message: remFormMessage,
                      type: remFormType,
                      time: remFormTime,
                      isCompleted: false,
                      category: remFormCategory || 'General',
                      isActive: true,
                      soundEffect: remFormSound,
                      countdownMinutes: remFormCountdownMins,
                      intervalMinutes: remFormIntervalMins,
                      daysOfWeek: remFormDaysOfWeek,
                      elapsedSeconds: 0,
                      isLoopingAlert: remFormLoopAlert,
                      dismissKey: remFormDismissKey
                    };
                    return {
                      ...prev,
                      reminders: [...prev.reminders, newReminder]
                    };
                  }
                });

                // Reset fields
                setRemFormMessage('');
                setRemFormType('daily');
                setRemFormTime('10:00');
                setRemFormCategory('General');
                setRemFormSound('chime');
                setRemFormCountdownMins(10);
                setRemFormIntervalMins(30);
                setRemFormDaysOfWeek([]);
                setRemFormLoopAlert(false);
                setRemFormDismissKey('D');
                setEditingReminderId(null);
                setIsReminderModalOpen(false);
              }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* Message */}
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Speech Message Text</label>
                  <input
                    type="text"
                    placeholder="Sai, it is time to work..."
                    required
                    value={remFormMessage}
                    onChange={(e) => setRemFormMessage(e.target.value)}
                    className="glass-input"
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Category & Sound */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Category Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Work, Health..."
                      value={remFormCategory}
                      onChange={(e) => setRemFormCategory(e.target.value)}
                      className="glass-input"
                      style={{ width: '100%' }}
                    />
                  </div>

                  {/* Flex row for Sound Sweeper selector and test button */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Sound Sweep Tone</label>
                      <select
                        value={remFormSound}
                        onChange={(e) => setRemFormSound(e.target.value)}
                        className="glass-input"
                        style={{ width: '100%', color: '#fff' }}
                      >
                        <option value="beep">Digital Beep</option>
                        <option value="chime">Chime Chord</option>
                        <option value="bell">Soft Bell Resonator</option>
                        <option value="breeze">Aura Breeze Sweep</option>
                        <option value="custom">Custom Default Sound</option>
                        {(state.settings.customReminderSounds || []).map((cs) => (
                          <option key={cs.id} value={`custom-${cs.id}`}>{cs.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Immediate Test play-pause button */}
                    <button
                      type="button"
                      onClick={() => {
                        if (isSoundTesting) {
                          if (testAudioObj) {
                            testAudioObj.pause();
                            setTestAudioObj(null);
                          }
                          setIsSoundTesting(false);
                        } else {
                          setIsSoundTesting(true);
                          if (remFormSound === 'custom' && state?.settings.customReminderSound) {
                            const audio = new Audio(state.settings.customReminderSound);
                            audio.onended = () => setIsSoundTesting(false);
                            audio.play().catch(e => console.error("Test sound failed:", e));
                            setTestAudioObj(audio);
                          } else if (remFormSound.startsWith('custom-')) {
                            const soundData = getCustomSoundData(remFormSound);
                            if (soundData) {
                              const audio = new Audio(soundData);
                              audio.onended = () => setIsSoundTesting(false);
                              audio.play().catch(e => console.error("Test sound failed:", e));
                              setTestAudioObj(audio);
                            } else {
                              setIsSoundTesting(false);
                            }
                          } else {
                            playSynthSound(remFormSound);
                            setTimeout(() => setIsSoundTesting(false), 1500);
                          }
                        }
                      }}
                      className={`glass-button ${isSoundTesting ? 'active' : ''}`}
                      style={{ padding: '8px 12px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Test selected sound effect"
                    >
                      {isSoundTesting ? <Pause size={14} /> : <Play size={14} />}
                    </button>
                  </div>
                </div>

                {/* In-Modal Custom Sound Direct Uploader */}
                {remFormSound === 'custom' && (
                  <div style={{ border: '1px dashed rgba(255, 255, 255, 0.1)', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.01)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Direct Custom Sound Uploader</label>
                    <input
                      type="file"
                      accept="audio/*"
                      id="modal-sound-upload"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const dataUrl = event.target?.result as string;
                          updateSettings({ customReminderSound: dataUrl });
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <label htmlFor="modal-sound-upload" className="glass-button" style={{ cursor: 'pointer', fontSize: '11px', padding: '6px 12px' }}>
                        Choose Audio File
                      </label>
                      {state?.settings.customReminderSound ? (
                        <span style={{ fontSize: '11px', color: '#10b981' }}>✔️ Audio loaded & tested</span>
                      ) : (
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No file loaded</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Schedule Type */}
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Scheduling Trigger Mode</label>
                  <select
                    value={remFormType}
                    onChange={(e) => setRemFormType(e.target.value as any)}
                    className="glass-input"
                    style={{ width: '100%', color: '#fff' }}
                  >
                    <option value="daily">Daily Repeating Time</option>
                    <option value="weekly">Weekly Days of Week</option>
                    <option value="one-time">One-Time Specific Time</option>
                    <option value="countdown">Countdown Timer (Minutes delay)</option>
                    <option value="interval">Repeating Loop (Every X minutes)</option>
                  </select>
                </div>

                {/* Conditional Scheduling Inputs */}
                {(remFormType === 'daily' || remFormType === 'weekly' || remFormType === 'one-time') && (
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Alert Trigger Time (HH:MM)</label>
                    <input
                      type="time"
                      value={remFormTime}
                      onChange={(e) => setRemFormTime(e.target.value)}
                      className="glass-input"
                      style={{ width: '100%', color: '#fff' }}
                    />
                  </div>
                )}

                {remFormType === 'weekly' && (
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Days of Week Schedule</label>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                        const isSel = remFormDaysOfWeek.includes(day);
                        return (
                          <button
                            key={day}
                            type="button"
                            className={`glass-button ${isSel ? 'active' : ''}`}
                            style={{ padding: '4px 8px', fontSize: '10px' }}
                            onClick={() => {
                              if (isSel) {
                                setRemFormDaysOfWeek(remFormDaysOfWeek.filter(d => d !== day));
                              } else {
                                setRemFormDaysOfWeek([...remFormDaysOfWeek, day]);
                              }
                            }}
                          >
                            {day.substring(0, 3)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {remFormType === 'countdown' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Countdown Minutes Delay</label>
                      <input
                        type="number" min="1" max="180"
                        value={remFormCountdownMins}
                        onChange={(e) => setRemFormCountdownMins(parseInt(e.target.value) || 10)}
                        className="glass-input"
                        style={{ width: '60px', padding: '4px 6px', fontSize: '11px', color: '#fff', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)' }}
                      />
                    </div>
                    <input
                      type="range" min="1" max="180" step="1"
                      value={remFormCountdownMins}
                      onChange={(e) => setRemFormCountdownMins(parseInt(e.target.value))}
                      style={{ width: '100%' }}
                    />
                    <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                      {[5, 10, 30, 60].map((mins) => (
                        <button
                          type="button" key={mins}
                          onClick={() => setRemFormCountdownMins(prev => Math.min(180, prev + mins))}
                          className="glass-button" style={{ padding: '2px 8px', fontSize: '10px' }}
                        >
                          +{mins}m
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {remFormType === 'interval' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Repeat Interval Loop</label>
                      <input
                        type="number" min="1" max="180"
                        value={remFormIntervalMins}
                        onChange={(e) => setRemFormIntervalMins(parseInt(e.target.value) || 30)}
                        className="glass-input"
                        style={{ width: '60px', padding: '4px 6px', fontSize: '11px', color: '#fff', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)' }}
                      />
                    </div>
                    <input
                      type="range" min="1" max="180" step="5"
                      value={remFormIntervalMins}
                      onChange={(e) => setRemFormIntervalMins(parseInt(e.target.value))}
                      style={{ width: '100%' }}
                    />
                    <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                      {[5, 10, 30, 60].map((mins) => (
                        <button
                          type="button" key={mins}
                          onClick={() => setRemFormIntervalMins(prev => Math.min(180, prev + mins))}
                          className="glass-button" style={{ padding: '2px 8px', fontSize: '10px' }}
                        >
                          +{mins}m
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Loop Alert Toggle Checkbox */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <input
                    type="checkbox"
                    id="modal-loop-alert"
                    checked={remFormLoopAlert}
                    onChange={(e) => setRemFormLoopAlert(e.target.checked)}
                    style={{ width: '14px', height: '14px', cursor: 'pointer' }}
                  />
                  <label htmlFor="modal-loop-alert" style={{ fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    Loop alert warning overlay recursively until safety hotkey
                  </label>
                </div>

                {/* Loop Dismiss Key (Only visible when looping is enabled) */}
                {remFormLoopAlert && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }} className="animate-slide-up">
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Safety Dismiss Key (Ctrl + Shift + Key)</label>
                    <select
                      value={remFormDismissKey}
                      onChange={(e) => setRemFormDismissKey(e.target.value.toUpperCase())}
                      className="glass-input"
                      style={{ width: '100%', color: '#fff', padding: '8px 12px' }}
                    >
                      {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'].map(char => (
                        <option key={char} value={char}>{char}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: '10px', marginTop: '12px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="glass-button"
                    onClick={() => setIsReminderModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="glass-button active"
                    style={{ background: 'linear-gradient(135deg, var(--color-purple) 0%, var(--color-pink) 100%)', border: 'none' }}
                  >
                    Schedule Alert
                  </button>
                </div>

              </form>
            </div>
          </div>
        )}

        {/* Schedule Event Creator Pop-up Modal */}
        {isScheduleModalOpen && (
          <div className="strict-overlay" style={{ zIndex: 100 }}>
            <div className="glass-panel animate-slide-up" style={{ width: '460px', padding: '28px', display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>
              <button
                type="button"
                className="glass-button"
                style={{ position: 'absolute', top: '16px', right: '16px', padding: '4px', border: 'none', background: 'transparent' }}
                onClick={() => setIsScheduleModalOpen(false)}
              >
                <X size={16} />
              </button>

              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>Add Timeline Block</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Schedule a new task or activity slot on your daily timeline blocker.</p>
              </div>

              <form onSubmit={handleAddScheduleBlock} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* Start & End Times */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Start Time</label>
                    <select
                      value={schedStartTime}
                      onChange={(e) => setSchedStartTime(e.target.value)}
                      className="glass-input"
                      style={{ width: '100%', color: '#fff', padding: '8px 12px' }}
                    >
                      {(() => {
                        const opts = [];
                        for (let h = 8; h <= 22; h++) {
                          const hh = String(h).padStart(2, '0');
                          opts.push(`${hh}:00`);
                          opts.push(`${hh}:30`);
                        }
                        return opts.map(o => <option key={o} value={o}>{formatTime(o, is24HourFormat)}</option>);
                      })()}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>End Time</label>
                    <select
                      value={schedEndTime}
                      onChange={(e) => setSchedEndTime(e.target.value)}
                      className="glass-input"
                      style={{ width: '100%', color: '#fff', padding: '8px 12px' }}
                    >
                      {(() => {
                        const opts = [];
                        for (let h = 8; h <= 23; h++) {
                          const hh = String(h).padStart(2, '0');
                          opts.push(`${hh}:00`);
                          if (h < 23) opts.push(`${hh}:30`);
                        }
                        return opts.map(o => <option key={o} value={o}>{formatTime(o, is24HourFormat)}</option>);
                      })()}
                    </select>
                  </div>
                </div>

                {/* Task/Activity Name */}
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Task/Activity Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Code Electron Aura overlay, Gym Sprints..."
                    value={schedTask}
                    onChange={(e) => setSchedTask(e.target.value)}
                    required
                    className="glass-input"
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Category Selector */}
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Category</label>
                  <select
                    value={schedCategory}
                    onChange={(e) => setSchedCategory(e.target.value)}
                    className="glass-input"
                    style={{ width: '100%', color: '#fff', padding: '8px 12px' }}
                  >
                    <option value="Work">Work</option>
                    <option value="Personal">Personal</option>
                    <option value="Learning">Learning</option>
                    <option value="Health">Health</option>
                    <option value="General">General</option>
                  </select>
                </div>

                {/* Theme Color Picker */}
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Choose Theme Color</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {[
                      { name: 'Purple', hex: '#8b5cf6' },
                      { name: 'Cyan', hex: '#06b6d4' },
                      { name: 'Magenta', hex: '#d946ef' },
                      { name: 'Green', hex: '#10b981' },
                      { name: 'Red', hex: '#ef4444' },
                      { name: 'Orange', hex: '#f97316' },
                      { name: 'Yellow', hex: '#eab308' },
                      { name: 'Blue', hex: '#3b82f6' }
                    ].map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setSchedColor(c.hex)}
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: c.hex,
                          border: schedColor === c.hex ? '2px solid #ffffff' : '2px solid transparent',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          boxShadow: schedColor === c.hex ? '0 0 10px ' + c.hex : 'none'
                        }}
                        title={c.name}
                      />
                    ))}

                    {/* Custom Color Input Picker */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '6px' }}>
                      <input
                        type="color"
                        value={schedColor}
                        onChange={(e) => setSchedColor(e.target.value)}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', width: '24px', height: '24px', padding: 0 }}
                        title="Custom Color Picker"
                      />
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Custom</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '10px', marginTop: '12px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="glass-button"
                    onClick={() => setIsScheduleModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="glass-button active"
                    style={{ background: 'linear-gradient(135deg, var(--color-purple) 0%, var(--color-pink) 100%)', border: 'none' }}
                  >
                    Add Block
                  </button>
                </div>

              </form>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
