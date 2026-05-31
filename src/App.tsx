import React, { useState, useEffect } from 'react';
import { 
  Activity, Award, BookOpen, Brain, Calendar, CheckSquare, 
  Clock, DollarSign, Home, Maximize2, Minimize2, Plus, Save, Settings, 
  ShieldAlert, Sparkles, TrendingUp, Volume2, X, Play, Pause,
  RotateCcw, Coffee, ShieldCheck, ChevronRight, Search, Trash,
  Pin, Paperclip, Link
} from 'lucide-react';
import type { Month, Goal, GoalStatus, Task, TaskColumn, TaskPriority, Subtask, VoiceReminder, FocusSession, FocusSessionType, Note, FinanceRecord, AppSettings, AppState } from './types';
import { loadState, saveState } from './utils/storage';
import { speakText, stopSpeaking, getAvailableVoices } from './utils/tts';

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
  // Core State
  const [state, setState] = useState<AppState | null>(null);
  const [activeTab, setActiveTab] = useState<string>('home');
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
  const [trackingTaskId, setTrackingTaskId] = useState<string | null>(null);
  const [trackingIntervalId, setTrackingIntervalId] = useState<any>(null);

  // Custom Settings UI States
  const [isAuraActive, setIsAuraActive] = useState<boolean>(false);
  const [selectedFocusModeId, setSelectedFocusModeId] = useState<string>('deepwork');

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
  const [selectedMonth] = useState<Month>('June');
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

  // Finance state
  const [financeType, setFinanceType] = useState<'income' | 'expense' | 'savings' | 'debt'>('income');
  const [financeTitle, setFinanceTitle] = useState('');
  const [financeAmount, setFinanceAmount] = useState('');
  const [financeCategory, setFinanceCategory] = useState('');
  const [financeTargetAmount, setFinanceTargetAmount] = useState('');
  const [financeTargetMonth, setFinanceTargetMonth] = useState<Month>('June');

  // Schedule activities state
  const [scheduleBlocks, setScheduleBlocks] = useState<Array<{ time: string, task: string, color: string }>>([
    { time: '09:00 - 10:00', task: 'Review email / Daily Plan', color: 'var(--color-blue)' },
    { time: '10:00 - 12:00', task: 'Work on Orb Electron desktop shell', color: 'var(--color-purple)' },
    { time: '12:00 - 13:00', task: 'Lunch break', color: 'var(--color-not-started)' },
    { time: '13:00 - 15:00', task: 'Submit Senior Dev Job Applications', color: 'var(--color-violet)' },
    { time: '15:00 - 16:30', task: 'French practice / Conversation classes', color: 'var(--color-pink)' },
    { time: '16:30 - 17:00', task: 'Exercise session', color: 'var(--color-completed)' }
  ]);
  const [newBlockTime, setNewBlockTime] = useState('');
  const [newBlockTask, setNewBlockTask] = useState('');
  const [newBlockColor, setNewBlockColor] = useState('var(--color-purple)');

  // -------------------------------------------------------------
  // Initial Boot
  // -------------------------------------------------------------
  useEffect(() => {
    async function boot() {
      const loadedState = await loadState();
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
      setSelectedFocusModeId(loadedState.settings.currentFocusMode);
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

  // -------------------------------------------------------------
  // Focus Timer Logic
  // -------------------------------------------------------------
  useEffect(() => {
    if (timerStatus === 'running' && timeLeft > 0) {
      const id = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(id);
            setTimerStatus('idle');
            handleFocusSessionCompleted();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(id);
    }
  }, [timerStatus, timeLeft]);

  // Check reminder intervals during focus session
  useEffect(() => {
    if (timerStatus === 'running' && state) {
      const intervalMinutes = state.settings.focusInterval;
      const secondsPassed = timerDuration * 60 - timeLeft;
      
      if (secondsPassed > 0 && secondsPassed % (intervalMinutes * 60) === 0) {
        triggerFocusReminderAlert();
      }
    }
  }, [timeLeft, timerStatus, state]);

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
    setTimeLeft(timerDuration * 60);
    dismissStrictAlert();
  };

  const selectTimerType = (type: FocusSessionType) => {
    setTimerType(type);
    let mins = 25;
    if (type === 'deepwork') mins = 50;
    else if (type === 'stopwatch') mins = 0;
    
    setTimerDuration(mins);
    setTimeLeft(mins * 60);
    setTimerStatus('idle');
  };

  const handleFocusSessionCompleted = () => {
    if (!state) return;
    
    speakText("Great job, Sai. Focus session completed. Take a break.", state.settings);
    setTimerStreak(prev => prev + 1);

    const now = new Date().toISOString();
    const duration = timerDuration * 60;
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
        setBreakTimeToday((prev) => prev + 1);
        
        // Alert user if break exceeds threshold (e.g. 10 minutes)
        if (breakTimeToday > 0 && breakTimeToday % 600 === 0 && state) {
          speakText("Sai, your break has exceeded ten minutes. Please return to work.", state.settings, 3);
        }
      }, 1000);
      return () => clearInterval(id);
    }
  }, [breakStatus, breakTimeToday, state]);

  const startBreakTracking = () => {
    if (timerStatus === 'running') {
      pauseFocusSession();
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

  // -------------------------------------------------------------
  // Kanban Task Stopwatch tracking
  // -------------------------------------------------------------
  const toggleTaskTimeTracking = (taskId: string) => {
    if (trackingTaskId === taskId) {
      if (trackingIntervalId) clearInterval(trackingIntervalId);
      setTrackingTaskId(null);
      setTrackingIntervalId(null);
    } else {
      if (trackingIntervalId) clearInterval(trackingIntervalId);
      
      setTrackingTaskId(taskId);
      const id = setInterval(() => {
        updateState((prev) => {
          const tasks = prev.tasks.map((t) => {
            if (t.id === taskId) {
              return { ...t, spentTime: t.spentTime + 1 };
            }
            return t;
          });
          return { ...prev, tasks };
        });
      }, 60000); // Increments spentTime minute-by-minute
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

  // -------------------------------------------------------------
  // Focus Mode configuration selector
  // -------------------------------------------------------------
  const selectFocusMode = (modeId: string) => {
    if (!state) return;
    const mode = state.settings.focusModes.find(m => m.id === modeId);
    if (!mode) return;
    
    setSelectedFocusModeId(modeId);
    updateState((prev) => {
      const newSettings = {
        ...prev.settings,
        currentFocusMode: modeId,
        focusInterval: mode.reminderInterval,
        customFocusMessages: mode.voiceReminders,
        auraConfig: {
          ...prev.settings.auraConfig,
          colors: mode.colors,
          mode: (mode.borderStyle === 'flowing' ? 'normal' : mode.borderStyle === 'pulse' ? 'subtle' : 'aggressive') as 'subtle' | 'normal' | 'aggressive'
        }
      };
      return { ...prev, settings: newSettings };
    });
  };

  // -------------------------------------------------------------
  // Voice Reminder Alert Schedulers (Strict Mode & Escalations)
  // -------------------------------------------------------------
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
    speakText(message, state.settings, 1);

    // If Strict Focus Enforcement is enabled, handle escalation timers
    if (state.settings.strictModeEnabled) {
      if (strictIntervalId) clearInterval(strictIntervalId);
      
      let level = 1;
      const intervalId = setInterval(() => {
        level = Math.min(4, level + 1);
        setStrictEscalationLevel(level);
        speakText(message, state.settings, level);
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

  // Clock checker for scheduled reminders
  useEffect(() => {
    const clockId = setInterval(() => {
      if (!state) return;
      const now = new Date();
      const HH = String(now.getHours()).padStart(2, '0');
      const MM = String(now.getMinutes()).padStart(2, '0');
      const currentTime = `${HH}:${MM}`;

      state.reminders.forEach((r) => {
        if (r.isActive && r.time === currentTime) {
          const lastAlertKey = `alert_${r.id}_${currentTime}`;
          if (localStorage.getItem(lastAlertKey) !== 'true') {
            localStorage.setItem(lastAlertKey, 'true');
            speakText(r.message, state.settings, 1);
            setActiveAlertMessage(r.message);
            setStrictEscalationLevel(1);
          }
        }
      });
    }, 15000);

    return () => clearInterval(clockId);
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

  // Kanban tasks filtering
  const filteredTasks = state?.tasks.filter(t => {
    if (t.isArchived) return false;
    const query = taskSearch.toLowerCase();
    return t.title.toLowerCase().includes(query) || 
           t.label.toLowerCase().includes(query) || 
           t.tags.some(tag => tag.toLowerCase().includes(query));
  }) || [];



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
    } else {
      setEditingTaskId(null);
      setTaskFormTitle('');
      setTaskFormColumn('todo');
      setTaskFormPriority('Medium');
      setTaskFormDueDate(new Date().toISOString().split('T')[0]);
      setTaskFormLabel('Task');
      setTaskFormTags([]);
      setTaskFormEstTime(30);
      setTaskFormSpentTime(0);
      setTaskFormNotes('');
      setTaskFormIsPinned(false);
      setTaskFormSubtasks([]);
      setTaskFormLinks([]);
      setTaskFormAttachments([]);
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

    const updatedTaskFields = {
      title: taskFormTitle,
      column: taskFormColumn,
      priority: taskFormPriority,
      dueDate: taskFormDueDate,
      label: taskFormLabel || 'Task',
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
    if (window.confirm("Are you sure you want to delete this task?")) {
      updateState((prev) => ({
        ...prev,
        tasks: prev.tasks.filter((t) => t.id !== taskId)
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

  // Finance Actions
  const handleAddFinance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!financeTitle || !financeAmount) return;

    const record: FinanceRecord = {
      id: Math.random().toString(),
      type: financeType,
      title: financeTitle,
      amount: parseFloat(financeAmount),
      category: financeCategory || 'General',
      date: new Date().toISOString().split('T')[0],
      targetAmount: (financeType === 'savings' || financeType === 'debt') ? parseFloat(financeTargetAmount) : undefined,
      progressAmount: (financeType === 'savings' || financeType === 'debt') ? 0 : undefined,
      targetMonth: (financeType === 'savings' || financeType === 'debt') ? financeTargetMonth : undefined
    };

    updateState((prev) => ({
      ...prev,
      finances: [record, ...prev.finances]
    }));

    setFinanceTitle('');
    setFinanceAmount('');
    setFinanceCategory('');
    setFinanceTargetAmount('');
  };

  // Schedule activity blocks
  const handleAddScheduleBlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlockTime || !newBlockTask) return;
    setScheduleBlocks([...scheduleBlocks, { time: newBlockTime, task: newBlockTask, color: newBlockColor }]);
    setNewBlockTime('');
    setNewBlockTask('');
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

  const totalIncome = state.finances.filter(f => f.type === 'income').reduce((sum, f) => sum + f.amount, 0);
  const totalExpense = state.finances.filter(f => f.type === 'expense').reduce((sum, f) => sum + f.amount, 0);
  const netWorth = totalIncome - totalExpense;

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', backgroundColor: '#030303', position: 'relative' }}>
      
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
          position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)',
          zIndex: 1000, display: 'flex', alignItems: 'center', gap: '16px',
          background: 'rgba(239, 68, 68, 0.95)', padding: '12px 24px', borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(239, 68, 68, 0.4)', border: '1px solid #f87171'
        }} className="animate-slide-up">
          <ShieldAlert size={20} style={{ color: '#ffffff' }} />
          <div>
            <div style={{ fontWeight: 600 }}>STRICT ALERT: {activeAlertMessage}</div>
            <div style={{ fontSize: '12px', opacity: 0.85 }}>Escalation Level {strictEscalationLevel}/4</div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="glass-button" style={{ padding: '6px 12px', background: 'rgba(255, 255, 255, 0.2)', borderColor: 'transparent' }} onClick={snoozeStrictAlert}>Snooze</button>
            <button className="glass-button" style={{ padding: '6px 12px', background: '#ffffff', color: '#ef4444', borderColor: 'transparent' }} onClick={dismissStrictAlert}>Acknowledge</button>
          </div>
        </div>
      )}

      {/* LEFT SIDEBAR (Glassmorphic) */}
      {!isWritingFullscreen && (
        <div style={{ width: '270px', borderRight: '1px solid var(--border-glass-purple)', display: 'flex', flexDirection: 'column', background: 'rgba(8, 8, 12, 0.85)', backdropFilter: 'blur(20px)' }}>
          <div style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--border-glass)' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-purple), var(--color-pink))', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-glow)' }}>
              <Sparkles size={16} style={{ color: '#fff' }} />
            </div>
            <div>
              <h1 className="gradient-text" style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-0.03em' }}>Orb OS</h1>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Premium v1.0.0</span>
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
              <button onClick={() => setActiveTab('focus')} className={`glass-button ${activeTab === 'focus' ? 'active' : ''}`} style={{ justifyContent: 'flex-start', border: 'none', background: activeTab === 'focus' ? undefined : 'transparent' }}>
                <Clock size={18} /> Focus & Breaks
              </button>
              <button onClick={() => setActiveTab('voice')} className={`glass-button ${activeTab === 'voice' ? 'active' : ''}`} style={{ justifyContent: 'flex-start', border: 'none', background: activeTab === 'voice' ? undefined : 'transparent' }}>
                <Volume2 size={18} /> Voice Reminders
              </button>
              <button onClick={() => setActiveTab('finance')} className={`glass-button ${activeTab === 'finance' ? 'active' : ''}`} style={{ justifyContent: 'flex-start', border: 'none', background: activeTab === 'finance' ? undefined : 'transparent' }}>
                <DollarSign size={18} /> Finance Tracker
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

          {/* System status footer */}
          <div style={{ padding: '16px', borderTop: '1px solid var(--border-glass)', fontSize: '11px', color: 'var(--text-muted)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></div>
              <span>Focus Aura Engine Connected</span>
            </div>
            <div style={{ marginTop: '4px' }}>Local Storage: Connected</div>
          </div>
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
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              {/* Focus mode display */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 255, 255, 0.05)', padding: '6px 12px', borderRadius: '20px', border: '1px solid var(--border-glass)' }}>
                <Brain size={14} style={{ color: 'var(--color-purple)' }} />
                <span style={{ fontSize: '12px', color: 'var(--text-primary)' }}>Focus Mode: <strong style={{ color: 'var(--color-purple-light)', textTransform: 'capitalize' }}>{selectedFocusModeId}</strong></span>
              </div>

              {/* Productivity indicator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={16} style={{ color: 'var(--color-completed)' }} />
                <span style={{ fontSize: '13px' }}>Productivity Score: <strong style={{ color: 'var(--color-completed)' }}>{todayStats.productivityScore}</strong></span>
              </div>
            </div>
          </header>
        )}

        <main style={{ flex: 1, overflow: 'auto', padding: isWritingFullscreen ? '0' : '32px' }}>
          
          {/* =======================================================
              1. DASHBOARD HOME VIEW
              ======================================================= */}
          {activeTab === 'home' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: '32px', fontWeight: 700 }}>Welcome Back, Sai</h2>
                  <p>Here is your Orb productivity report for today, {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}.</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className={`glass-button ${isAuraActive ? 'active' : ''}`} onClick={() => setIsAuraActive(!isAuraActive)}>
                    <Sparkles size={16} /> Focus Aura: {isAuraActive ? 'Active' : 'Off'}
                  </button>
                  <button className="glass-button" onClick={triggerFocusReminderAlert} style={{ background: 'linear-gradient(135deg, var(--color-purple) 0%, var(--color-pink) 100%)', color: '#fff', border: 'none' }}>
                    <Volume2 size={16} /> Trigger Focus Alert
                  </button>
                </div>
              </div>

              {/* Stat grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                <div className="glass-panel" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                    <span>Focus Hours Today</span>
                    <Clock size={20} style={{ color: 'var(--color-purple)' }} />
                  </div>
                  <div style={{ fontSize: '36px', fontWeight: 700, fontFamily: 'monospace' }}>{totalFocusHoursToday}h</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Streak: {timerStreak} completed sessions</div>
                </div>

                <div className="glass-panel" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                    <span>Break Time Today</span>
                    <Coffee size={20} style={{ color: 'var(--color-blue)' }} />
                  </div>
                  <div style={{ fontSize: '36px', fontWeight: 700, fontFamily: 'monospace' }}>{totalBreakMinutesToday}m</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Focus-to-Break ratio: 4:1</div>
                </div>

                <div className="glass-panel" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                    <span>Net Worth Tracker</span>
                    <DollarSign size={20} style={{ color: 'var(--color-completed)' }} />
                  </div>
                  <div style={{ fontSize: '36px', fontWeight: 700, fontFamily: 'monospace', color: netWorth >= 0 ? '#10b981' : '#ef4444' }}>
                    ${netWorth.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Savings progress on track</div>
                </div>

                <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ position: 'relative', width: '70px', height: '70px' }}>
                    <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%' }}>
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--color-completed)" strokeWidth="3" strokeDasharray={`${todayStats.productivityScore}, 100`} />
                    </svg>
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '16px', fontWeight: 700 }}>
                      {todayStats.productivityScore}
                    </div>
                  </div>
                  <div>
                    <h3 style={{ fontSize: '16px' }}>Productivity Score</h3>
                    <p style={{ fontSize: '12px' }}>Daily Score target: 80+</p>
                  </div>
                </div>
              </div>

              {/* Main dashboard content */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* Critical Tasks */}
                  <div className="glass-panel" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                      <h3 style={{ fontSize: '18px' }}>Today's Tasks</h3>
                      <button onClick={() => setActiveTab('tasks')} style={{ background: 'none', border: 'none', color: 'var(--color-purple-light)', cursor: 'pointer', fontSize: '13px' }}>View Board</button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {(() => {
                        const activeTasks = state.tasks.filter(t => !t.isArchived);
                        const sortedTasks = [...activeTasks].sort((a, b) => {
                          if (a.isPinned && !b.isPinned) return -1;
                          if (!a.isPinned && b.isPinned) return 1;
                          const aComp = a.column === 'completed' ? 1 : 0;
                          const bComp = b.column === 'completed' ? 1 : 0;
                          return aComp - bComp;
                        });
                        
                        return sortedTasks.slice(0, 5).map((task) => (
                          <div 
                            key={task.id} 
                            className="glass-card animate-slide-up" 
                            style={{ 
                              padding: '14px', 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center',
                              cursor: 'pointer',
                              borderLeft: task.isPinned ? '3px solid var(--color-purple)' : undefined
                            }}
                            onClick={() => handleOpenTaskModal(task)}
                          >
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {task.isPinned && <Pin size={12} style={{ color: 'var(--color-purple-light)', transform: 'rotate(45deg)' }} />}
                                <span style={{
                                  width: '8px', height: '8px', borderRadius: '50%', 
                                  background: task.column === 'completed' ? 'var(--color-completed)' : (task.priority === 'Critical' ? 'red' : task.priority === 'High' ? 'orange' : 'green')
                                }}></span>
                                <span style={{ fontWeight: 500, textDecoration: task.column === 'completed' ? 'line-through' : 'none', color: task.column === 'completed' ? 'var(--text-secondary)' : undefined }}>{task.title}</span>
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
                                {task.column === 'completed' && (
                                  <span style={{
                                    fontSize: '11px',
                                    color: 'var(--color-completed)',
                                    background: 'rgba(16, 185, 129, 0.12)',
                                    border: '1px solid rgba(16, 185, 129, 0.3)',
                                    padding: '2px 6px',
                                    borderRadius: '4px'
                                  }}>
                                    Completed
                                  </span>
                                )}
                              </div>
                            </div>
                            <button 
                              className="glass-button" 
                              style={{ padding: '6px 12px', fontSize: '12px' }} 
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleTaskTimeTracking(task.id);
                              }}
                            >
                              {trackingTaskId === task.id ? <Pause size={12} /> : <Play size={12} />}
                              <span>{trackingTaskId === task.id ? 'Tracking' : 'Track'}</span>
                            </button>
                          </div>
                        ));
                      })()}
                      {state.tasks.filter(t => !t.isArchived).length === 0 && (
                        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>No critical tasks for today. Awesome!</div>
                      )}
                    </div>
                  </div>

                  {/* Active Goals */}
                  <div className="glass-panel" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                      <h3 style={{ fontSize: '18px' }}>Active Goals - {selectedMonth}</h3>
                      <button onClick={() => setActiveTab('goals')} style={{ background: 'none', border: 'none', color: 'var(--color-purple-light)', cursor: 'pointer', fontSize: '13px' }}>View Goals</button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {state.goals.filter(g => g.month === selectedMonth && !g.isDeleted).slice(0, 3).map((goal) => (
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
                    </div>
                  </div>

                </div>

                {/* Right side widgets */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* Timer widget */}
                  <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', background: 'linear-gradient(180deg, rgba(139, 92, 246, 0.08) 0%, var(--surface-panel) 100%)' }}>
                    <h3 style={{ fontSize: '16px', color: 'var(--color-purple-light)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Active Focus Session</h3>
                    <div style={{ fontSize: '48px', fontWeight: 700, fontFamily: 'monospace', margin: '16px 0' }}>
                      {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                      <button className="glass-button" onClick={timerStatus === 'running' ? pauseFocusSession : startFocusSession}>
                        {timerStatus === 'running' ? <Pause size={14} /> : <Play size={14} />}
                        {timerStatus === 'running' ? 'Pause' : 'Start'}
                      </button>
                      <button className="glass-button" onClick={resetFocusSession}><RotateCcw size={14} /></button>
                    </div>
                  </div>

                  {/* Upcoming reminders */}
                  <div className="glass-panel" style={{ padding: '24px' }}>
                    <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Upcoming Reminders</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {state.reminders.filter(r => r.isActive).slice(0, 3).map((r) => (
                        <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
                          <Clock size={14} style={{ color: 'var(--color-purple)' }} />
                          <div style={{ flex: 1 }}>
                            <div>{r.message}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Daily at {r.time}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
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
                  className="glass-button" 
                  style={{ background: 'linear-gradient(135deg, var(--color-purple) 0%, var(--color-pink) 100%)', color: '#fff', border: 'none' }}
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
                      <div key={goal.id} className="glass-panel" style={{ padding: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <input 
                              type="checkbox" 
                              checked={goal.status === 'Completed'} 
                              onChange={() => toggleGoalStatus(goal.id)}
                              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                            <div>
                              <h3 style={{ textDecoration: goal.status === 'Completed' ? 'line-through' : 'none', color: goal.status === 'Completed' ? 'var(--text-secondary)' : '#fff' }}>
                                {goal.title}
                              </h3>
                              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                                {(() => {
                                  const cStyles = getCategoryColorStyles(goal.categoryColor, goal.category);
                                  return (
                                    <span style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      fontSize: '12px',
                                      fontWeight: 600,
                                      background: cStyles.background,
                                      border: cStyles.border,
                                      color: cStyles.color,
                                      padding: '4px 10px',
                                      borderRadius: '6px'
                                    }}>
                                      <Award size={12} />
                                      <span>{goal.category}</span>
                                    </span>
                                  );
                                })()}
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  fontSize: '12px',
                                  fontWeight: 500,
                                  background: 'rgba(255, 255, 255, 0.05)',
                                  border: '1px solid rgba(255, 255, 255, 0.1)',
                                  color: '#e5e7eb',
                                  padding: '4px 10px',
                                  borderRadius: '6px'
                                }}>
                                  <Calendar size={12} style={{ color: 'var(--color-purple-light)' }} />
                                  <span>Deadline: {goal.deadline}</span>
                                </span>
                                {goal.achievementUnlocked && (
                                  <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontSize: '12px',
                                    fontWeight: 500,
                                    background: 'rgba(16, 185, 129, 0.15)',
                                    border: '1px solid rgba(16, 185, 129, 0.3)',
                                    color: '#10b981',
                                    padding: '4px 10px',
                                    borderRadius: '6px'
                                  }}>
                                    <span>🏆 Achieved</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="glass-button" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => {
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
                            }}>
                              Edit
                            </button>
                            <button className="glass-button" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => {
                              updateState((prev) => {
                                const goals = prev.goals.map((g) => {
                                  if (g.id === goal.id) return { ...g, isPinned: !g.isPinned };
                                  return g;
                                });
                                return { ...prev, goals };
                              });
                            }}>
                              {goal.isPinned ? 'Pinned to Dashboard' : 'Pin to Dashboard'}
                            </button>
                            <button className="glass-button" style={{ padding: '6px', background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.2)' }} onClick={() => {
                              updateState((prev) => ({
                                ...prev,
                                goals: prev.goals.map((g) => {
                                  if (g.id === goal.id) {
                                    return { ...g, isDeleted: true, deletedAt: new Date().toISOString() };
                                  }
                                  return g;
                                })
                              }));
                            }} title="Delete Goal">
                              <Trash size={12} style={{ color: '#ef4444' }} />
                            </button>
                          </div>
                        </div>

                        {/* Milestones */}
                        {goal.milestones.length > 0 && (
                          <div style={{ marginTop: '16px', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Milestones</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {goal.milestones.map((m) => (
                                <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
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
                              }} style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                                <input name="milestone" type="text" placeholder="Add milestone..." className="glass-input" style={{ flex: 1, padding: '4px 8px', fontSize: '12px' }} />
                                <button type="submit" className="glass-button" style={{ padding: '4px 8px', fontSize: '12px' }}>+</button>
                              </form>
                            </div>
                          </div>
                        )}

                        <div style={{
                          marginTop: '16px',
                          padding: '12px 16px',
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                          borderRadius: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Goal Progress</span>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-purple-light)' }}>{goal.progress}%</span>
                          </div>
                          <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${goal.progress}%`, background: 'linear-gradient(90deg, var(--color-purple), var(--color-pink))', borderRadius: '4px' }}></div>
                          </div>
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
                    <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Deleted Goals History</h3>
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

                  {/* Improved Add Task button */}
                  <button 
                    onClick={() => handleOpenTaskModal()} 
                    className="glass-button active"
                    style={{ padding: '10px 18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <Plus size={16} /> Create New Task
                  </button>
                </div>
              </div>

              {/* Kanban columns */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', flex: 1, minHeight: '400px' }}>
                
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

                  <div className="scroll-y" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {filteredTasks.filter(t => t.column === 'todo').map((task) => (
                      <div 
                        key={task.id} 
                        draggable 
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        className="glass-card animate-slide-up" 
                        style={{ padding: '14px', cursor: 'grab', borderLeft: task.isPinned ? '3px solid var(--color-purple)' : undefined }}
                        onClick={() => handleOpenTaskModal(task)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <span style={{
                            fontSize: '12px', padding: '4px 8px', borderRadius: '6px',
                            background: task.priority === 'Critical' ? 'rgba(239,68,68,0.2)' : task.priority === 'High' ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)',
                            color: task.priority === 'Critical' ? '#ef4444' : task.priority === 'High' ? '#f59e0b' : '#10b981',
                            border: task.priority === 'Critical' ? '1px solid rgba(239,68,68,0.4)' : task.priority === 'High' ? '1px solid rgba(245,158,11,0.4)' : '1px solid rgba(16,185,129,0.4)',
                            fontWeight: 600
                          }}>
                            {task.priority}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {task.isPinned && <Pin size={12} style={{ color: 'var(--color-purple-light)', transform: 'rotate(45deg)' }} />}
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11px',
                              fontWeight: 500,
                              background: 'rgba(255,255,255,0.05)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              color: '#e5e7eb',
                              padding: '3px 6px',
                              borderRadius: '6px'
                            }}>
                              <Clock size={11} style={{ color: 'var(--color-purple-light)' }} />
                              <span>{task.spentTime}m/{task.estTime}m</span>
                            </span>
                          </div>
                        </div>
                        <h4 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '8px', color: '#fff' }}>{task.title}</h4>
                        {task.notes && (
                          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: '8px' }}>
                            {task.notes}
                          </p>
                        )}
                        {task.subtasks && task.subtasks.length > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                            <CheckSquare size={11} style={{ color: '#60a5fa' }} />
                            <span>{task.subtasks.filter(s => s.completed).length}/{task.subtasks.length} milestones</span>
                          </div>
                        )}
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '12px',
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
                            {task.tags && task.tags.length > 0 && (
                              <div style={{ display: 'flex', gap: '4px' }}>
                                {task.tags.slice(0, 2).map((tg, i) => (
                                  <span key={i} style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', color: 'var(--color-purple-light)', padding: '1px 5px', borderRadius: '4px', fontSize: '10px', fontWeight: 500 }}>{tg}</span>
                                ))}
                              </div>
                            )}
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

                  <div className="scroll-y" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {filteredTasks.filter(t => t.column === 'in-progress').map((task) => (
                      <div 
                        key={task.id} 
                        draggable 
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        className="glass-card animate-slide-up" 
                        style={{ 
                          padding: '14px', 
                          cursor: 'grab', 
                          borderLeft: task.isPinned ? '3px solid var(--color-purple)' : undefined
                        }}
                        onClick={() => handleOpenTaskModal(task)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <span style={{
                            fontSize: '12px', padding: '4px 8px', borderRadius: '6px',
                            background: task.priority === 'Critical' ? 'rgba(239,68,68,0.2)' : task.priority === 'High' ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)',
                            color: task.priority === 'Critical' ? '#ef4444' : task.priority === 'High' ? '#f59e0b' : '#10b981',
                            border: task.priority === 'Critical' ? '1px solid rgba(239,68,68,0.4)' : task.priority === 'High' ? '1px solid rgba(245,158,11,0.4)' : '1px solid rgba(16,185,129,0.4)',
                            fontWeight: 600
                          }}>
                            {task.priority}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {task.isPinned && <Pin size={12} style={{ color: 'var(--color-purple-light)', transform: 'rotate(45deg)' }} />}
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11px',
                              fontWeight: 500,
                              background: 'rgba(255,255,255,0.05)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              color: '#e5e7eb',
                              padding: '3px 6px',
                              borderRadius: '6px'
                            }}>
                              <Clock size={11} style={{ color: 'var(--color-purple-light)' }} />
                              <span>{task.spentTime}m/{task.estTime}m</span>
                            </span>
                          </div>
                        </div>
                        <h4 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '8px', color: '#fff' }}>{task.title}</h4>
                        {task.notes && (
                          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: '8px' }}>
                            {task.notes}
                          </p>
                        )}
                        {task.subtasks && task.subtasks.length > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                            <CheckSquare size={11} style={{ color: '#a78bfa' }} />
                            <span>{task.subtasks.filter(s => s.completed).length}/{task.subtasks.length} milestones</span>
                          </div>
                        )}
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '12px',
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

                  <div className="scroll-y" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {filteredTasks.filter(t => t.column === 'completed').map((task) => (
                      <div 
                        key={task.id} 
                        draggable 
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        className="glass-card animate-slide-up" 
                        style={{ padding: '14px', cursor: 'grab', opacity: 0.8, borderLeft: task.isPinned ? '3px solid var(--color-purple)' : undefined }}
                        onClick={() => handleOpenTaskModal(task)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <span style={{
                            fontSize: '12px', padding: '4px 8px', borderRadius: '6px',
                            background: 'rgba(16,185,129,0.15)',
                            color: '#10b981',
                            border: '1px solid rgba(16,185,129,0.3)',
                            fontWeight: 600
                          }}>
                            Completed
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {task.isPinned && <Pin size={12} style={{ color: 'var(--color-purple-light)', transform: 'rotate(45deg)' }} />}
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11px',
                              fontWeight: 500,
                              background: 'rgba(255,255,255,0.05)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              color: '#e5e7eb',
                              padding: '3px 6px',
                              borderRadius: '6px'
                            }}>
                              <Clock size={11} style={{ color: 'var(--color-purple-light)' }} />
                              <span>Total: {task.spentTime}m</span>
                            </span>
                          </div>
                        </div>
                        <h4 style={{ fontSize: '15px', fontWeight: 500, textDecoration: 'line-through', marginBottom: '8px', color: 'var(--text-secondary)' }}>{task.title}</h4>
                        {task.notes && (
                          <p style={{ fontSize: '12px', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: '8px' }}>
                            {task.notes}
                          </p>
                        )}
                        {task.subtasks && task.subtasks.length > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                            <CheckSquare size={11} style={{ color: '#10b981' }} />
                            <span>{task.subtasks.filter(s => s.completed).length}/{task.subtasks.length} milestones</span>
                          </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
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
                              style={{ padding: '4px 10px', fontSize: '11px', height: '24px' }} 
                              onClick={(e) => {
                                e.stopPropagation();
                                updateState((prev) => {
                                  const tasks = prev.tasks.map((t) => {
                                    if (t.id === task.id) return { ...t, isArchived: true };
                                    return t;
                                  });
                                  return { ...prev, tasks };
                                });
                              }}
                            >
                              Archive
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* =======================================================
              4. SCHEDULE PLANNER VIEW
              ======================================================= */}
          {activeTab === 'schedule' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <h2 style={{ fontSize: '32px', fontWeight: 700 }}>Schedule Planner & Time Blocker</h2>
                <p>Plan out activities and deep focus sprints. Review work hour splits.</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '18px' }}>Daily Schedule Grid</h3>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="glass-button active" style={{ fontSize: '12px', padding: '6px 12px' }}>Daily</button>
                      <button className="glass-button" style={{ fontSize: '12px', padding: '6px 12px', background: 'transparent' }}>Weekly</button>
                      <button className="glass-button" style={{ fontSize: '12px', padding: '6px 12px', background: 'transparent' }}>Monthly</button>
                    </div>
                  </div>

                  {/* Hourly blocks list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                    {scheduleBlocks.map((block, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', width: '100px' }}>{block.time}</span>
                        <div style={{ width: '4px', height: '24px', background: block.color, borderRadius: '2px' }}></div>
                        <span style={{ fontSize: '14px', flex: 1 }}>{block.task}</span>
                        <button className="glass-button" style={{ padding: '4px', border: 'none', background: 'transparent' }} onClick={() => {
                          setScheduleBlocks(scheduleBlocks.filter((_, i) => i !== idx));
                        }}>
                          <Trash size={12} style={{ color: 'var(--text-muted)' }} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add Block Form */}
                  <form onSubmit={handleAddScheduleBlock} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input 
                      type="text" 
                      placeholder="Time (e.g. 17:00 - 18:00)" 
                      value={newBlockTime} 
                      onChange={(e) => setNewBlockTime(e.target.value)} 
                      required 
                      className="glass-input" 
                      style={{ width: '180px' }} 
                    />
                    <input 
                      type="text" 
                      placeholder="Task/Activity..." 
                      value={newBlockTask} 
                      onChange={(e) => setNewBlockTask(e.target.value)} 
                      required 
                      className="glass-input" 
                      style={{ flex: 1 }} 
                    />
                    <select 
                      value={newBlockColor} 
                      onChange={(e) => setNewBlockColor(e.target.value)} 
                      className="glass-input" 
                      style={{ color: '#fff', width: '120px' }}
                    >
                      <option value="var(--color-purple)">Purple</option>
                      <option value="var(--color-blue)">Blue</option>
                      <option value="var(--color-pink)">Pink</option>
                      <option value="var(--color-completed)">Green</option>
                      <option value="var(--color-not-started)">Gray</option>
                    </select>
                    <button type="submit" className="glass-button active"><Plus size={14} /></button>
                  </form>
                </div>

                {/* Statistics side-panel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div className="glass-panel" style={{ padding: '24px' }}>
                    <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Hour Breakdown</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                        <span>Target Work Hours</span>
                        <span>{scheduleBlocks.length}.0h</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                        <span>Productive Focus Hours</span>
                        <span style={{ color: 'var(--color-purple-light)', fontWeight: 600 }}>{totalFocusHoursToday}h</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                        <span>Break Time Logged</span>
                        <span>{totalBreakMinutesToday} mins</span>
                      </div>
                    </div>
                  </div>

                  <div className="glass-panel" style={{ padding: '24px' }}>
                    <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Upcoming Events</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
                      <div style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                        <div style={{ fontWeight: 600 }}>French Prep Check-in</div>
                        <div style={{ color: 'var(--text-secondary)' }}>Tomorrow at 18:00</div>
                      </div>
                      <div style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                        <div style={{ fontWeight: 600 }}>Orb OS Demo Session</div>
                        <div style={{ color: 'var(--text-secondary)' }}>Wednesday at 15:00</div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* =======================================================
              5. FOCUS TIMER & BREAK TRACKING VIEW
              ======================================================= */}
          {activeTab === 'focus' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <h2 style={{ fontSize: '32px', fontWeight: 700 }}>Focus Arena & Break Tracking</h2>
                <p>Run structured work/break sprints. Configure Pomodoro settings.</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                
                {/* Timer block */}
                <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                    <button className={`glass-button ${timerType === 'pomodoro' ? 'active' : ''}`} onClick={() => selectTimerType('pomodoro')}>Pomodoro</button>
                    <button className={`glass-button ${timerType === 'deepwork' ? 'active' : ''}`} onClick={() => selectTimerType('deepwork')}>Deep Work</button>
                    <button className={`glass-button ${timerType === 'stopwatch' ? 'active' : ''}`} onClick={() => selectTimerType('stopwatch')}>Stopwatch</button>
                  </div>

                  <div style={{ position: 'relative', width: '220px', height: '220px', margin: '20px 0' }}>
                    <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="2.5" />
                      <path 
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                        fill="none" 
                        stroke="var(--color-purple)" 
                        strokeWidth="2.5" 
                        strokeDasharray={`${timerType === 'stopwatch' ? 100 : (timeLeft / (timerDuration * 60)) * 100}, 100`} 
                      />
                    </svg>
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                      <div style={{ fontSize: '44px', fontWeight: 700, fontFamily: 'monospace' }}>
                        {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{timerType}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                    <button className="glass-button active" style={{ padding: '12px 30px' }} onClick={timerStatus === 'running' ? pauseFocusSession : startFocusSession}>
                      {timerStatus === 'running' ? <Pause size={16} /> : <Play size={16} />}
                      {timerStatus === 'running' ? 'Pause Sprint' : 'Start Focus'}
                    </button>
                    <button className="glass-button" style={{ padding: '12px' }} onClick={resetFocusSession}><RotateCcw size={16} /></button>
                  </div>
                </div>

                {/* Break tracking block */}
                <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ fontSize: '20px', marginBottom: '16px' }}>Break Tracker & Ratio</h3>
                    <p style={{ fontSize: '14px', marginBottom: '24px' }}>Maintain a healthy balance. Exceeding set break limits will trigger custom voice reminders asking you to return to work.</p>

                    <div style={{ margin: '24px 0', textAlign: 'center' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Break duration (Today)</div>
                      <div style={{ fontSize: '48px', fontWeight: 700, fontFamily: 'monospace', margin: '8px 0' }}>
                        {breakStatus === 'running' ? Math.floor(breakTimeToday / 60) : Math.floor(todayStats.breakSeconds / 60)}m
                        <span style={{ fontSize: '20px', color: 'var(--text-muted)' }}> {breakStatus === 'running' ? String(breakTimeToday % 60).padStart(2, '0') : '00'}s</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                      <button className={`glass-button ${breakStatus === 'running' ? 'active' : ''}`} onClick={startBreakTracking}>
                        <Play size={14} /> Start Break
                      </button>
                      <button className="glass-button" onClick={pauseBreakTracking}><Pause size={14} /> Pause</button>
                      <button className="glass-button" onClick={stopBreakTracking}><X size={14} /> End Break</button>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '20px', marginTop: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                      <span>Focus to Break Ratio (Today)</span>
                      <span>4:1 (Balanced)</span>
                    </div>
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden', display: 'flex' }}>
                      <div style={{ width: '80%', background: 'var(--color-purple)' }}></div>
                      <div style={{ width: '20%', background: 'var(--color-blue)' }}></div>
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
              <div>
                <h2 style={{ fontSize: '32px', fontWeight: 700 }}>Voice Reminders System</h2>
                <p>Configure Text-To-Speech settings and manage customized timing alerts.</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
                
                {/* Reminders List */}
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Active Voice Alerts</h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {state.reminders.map((r) => (
                      <div key={r.id} className="glass-card" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 500, fontSize: '15px' }}>"{r.message}"</div>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '12px',
                              background: 'rgba(255,255,255,0.05)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              color: '#e5e7eb',
                              padding: '3px 8px',
                              borderRadius: '6px'
                            }}>
                              <Clock size={11} style={{ color: 'var(--color-purple-light)' }} />
                              <span>Time: {r.time}</span>
                            </span>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '12px',
                              background: 'rgba(139,92,246,0.15)',
                              border: '1px solid rgba(139,92,246,0.3)',
                              color: 'var(--color-purple-light)',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              textTransform: 'capitalize'
                            }}>
                              <span>Type: {r.type}</span>
                            </span>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '12px',
                              background: 'rgba(255,255,255,0.05)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              color: '#e5e7eb',
                              padding: '3px 8px',
                              borderRadius: '6px'
                            }}>
                              <span>Category: {r.category}</span>
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          <button className={`glass-button ${r.isActive ? 'active' : ''}`} style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => {
                            updateState((prev) => {
                              const reminders = prev.reminders.map((item) => {
                                if (item.id === r.id) return { ...item, isActive: !item.isActive };
                                return item;
                              });
                              return { ...prev, reminders };
                            });
                          }}>
                            {r.isActive ? 'Active' : 'Disabled'}
                          </button>
                          
                          <button className="glass-button" style={{ padding: '6px' }} onClick={() => {
                            updateState((prev) => ({
                              ...prev,
                              reminders: prev.reminders.filter(item => item.id !== r.id)
                            }));
                          }}>
                            <Trash size={14} style={{ color: 'var(--text-muted)' }} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Create Custom Reminder */}
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const message = (form.elements.namedItem('message') as HTMLInputElement).value;
                    const time = (form.elements.namedItem('time') as HTMLInputElement).value;
                    const type = (form.elements.namedItem('type') as HTMLSelectElement).value as any;
                    const category = (form.elements.namedItem('category') as HTMLInputElement).value;

                    if (!message || !time) return;

                    const newRem: VoiceReminder = {
                      id: Math.random().toString(),
                      message,
                      type,
                      time,
                      category: category || 'General',
                      isActive: true,
                      isCompleted: false
                    };

                    updateState((prev) => ({
                      ...prev,
                      reminders: [...prev.reminders, newRem]
                    }));

                    form.reset();
                  }} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '24px', borderTop: '1px solid var(--border-glass)', paddingTop: '24px' }}>
                    <h3 style={{ fontSize: '16px' }}>Add Custom Voice Reminder</h3>
                    <input name="message" type="text" placeholder="Reminder Message... (e.g. Sai, stop scrolling!)" required className="glass-input" />
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                      <input name="time" type="time" required className="glass-input" style={{ color: '#fff' }} />
                      <select name="type" className="glass-input" style={{ color: '#fff' }}>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="one-time">One-Time</option>
                      </select>
                      <input name="category" type="text" placeholder="Category (e.g. Health)" className="glass-input" />
                    </div>

                    <button type="submit" className="glass-button" style={{ alignSelf: 'flex-start' }}><Plus size={16} /> Add Reminder</button>
                  </form>
                </div>

                {/* Voice Settings side panel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div className="glass-panel" style={{ padding: '24px' }}>
                    <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Windows TTS Engine</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      
                      <div>
                        <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Select Voice</label>
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
                          <span>Speech Volume</span>
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
                          <span>Voice Speed (Rate)</span>
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
                        onClick={() => speakText("Sai, stop scrolling and get back to work!", state.settings, 1)}
                      >
                        Test Voice synthesis
                      </button>

                    </div>
                  </div>

                  <div className="glass-panel" style={{ padding: '24px' }}>
                    <h3 style={{ fontSize: '18px', color: 'red', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <ShieldAlert size={18} /> STRICT MODE
                    </h3>
                    <p style={{ fontSize: '13px', marginBottom: '16px' }}>When enabled, alerts loop indefinitely, flashing borders, and locks the screen under fullscreen overlay until acknowledged.</p>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={state.settings.strictModeEnabled}
                        onChange={(e) => updateSettings({ strictModeEnabled: e.target.checked })}
                        style={{ width: '16px', height: '16px' }}
                      />
                      <span>Enable strict focus lock</span>
                    </label>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* =======================================================
              7. FINANCE TRACKING VIEW
              ======================================================= */}
          {activeTab === 'finance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <h2 style={{ fontSize: '32px', fontWeight: 700 }}>Finances & Goals Dashboard</h2>
                <p>Track cash flows, savings progress, and student loan balances.</p>
              </div>

              {/* Statistics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div className="glass-panel" style={{ padding: '16px 24px' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Net Worth</div>
                  <div style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'monospace' }}>${netWorth.toLocaleString()}</div>
                </div>
                <div className="glass-panel" style={{ padding: '16px 24px' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Total Income logged</div>
                  <div style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'monospace', color: '#10b981' }}>+${totalIncome.toLocaleString()}</div>
                </div>
                <div className="glass-panel" style={{ padding: '16px 24px' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Total Expenses</div>
                  <div style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'monospace', color: '#ef4444' }}>-${totalExpense.toLocaleString()}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
                
                {/* Logs table */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div className="glass-panel" style={{ padding: '24px' }}>
                    <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Log Sheet</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {state.finances.map((rec) => (
                        <div key={rec.id} className="glass-card" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: 500 }}>{rec.title}</div>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '12px',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: '#e5e7eb',
                                padding: '3px 8px',
                                borderRadius: '6px'
                              }}>
                                <Calendar size={11} style={{ color: 'var(--color-purple-light)' }} />
                                <span>Date: {rec.date}</span>
                              </span>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '12px',
                                background: 'rgba(139,92,246,0.15)',
                                border: '1px solid rgba(139,92,246,0.3)',
                                color: 'var(--color-purple-light)',
                                padding: '3px 8px',
                                borderRadius: '6px'
                              }}>
                                <span>Category: {rec.category}</span>
                              </span>
                              {rec.targetAmount && (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '12px',
                                  background: 'rgba(96,165,250,0.15)',
                                  border: '1px solid rgba(96,165,250,0.3)',
                                  color: '#60a5fa',
                                  padding: '3px 8px',
                                  borderRadius: '6px'
                                }}>
                                  <span>Target: ${rec.targetAmount.toLocaleString()} ({rec.targetMonth})</span>
                                </span>
                              )}
                            </div>
                          </div>
                          <span style={{ 
                            fontWeight: 600, fontSize: '15px',
                            color: rec.type === 'income' ? '#10b981' : rec.type === 'expense' ? '#ef4444' : '#60a5fa' 
                          }}>
                            {rec.type === 'income' ? '+' : '-'}${rec.amount.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Add Flow Form */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <form className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }} onSubmit={handleAddFinance}>
                    <h3 style={{ fontSize: '18px' }}>Log Transaction</h3>
                    
                    <select 
                      className="glass-input" 
                      style={{ color: '#ffffff' }}
                      value={financeType}
                      onChange={(e) => setFinanceType(e.target.value as any)}
                    >
                      <option value="income">Income</option>
                      <option value="expense">Expense</option>
                      <option value="savings">Savings Goal</option>
                      <option value="debt">Debt Target</option>
                    </select>

                    <input 
                      type="text" placeholder="Title..." required 
                      value={financeTitle} onChange={(e) => setFinanceTitle(e.target.value)}
                      className="glass-input" 
                    />
                    
                    <input 
                      type="number" placeholder="Amount ($)..." required 
                      value={financeAmount} onChange={(e) => setFinanceAmount(e.target.value)}
                      className="glass-input" 
                    />

                    <input 
                      type="text" placeholder="Category..." 
                      value={financeCategory} onChange={(e) => setFinanceCategory(e.target.value)}
                      className="glass-input" 
                    />

                    {(financeType === 'savings' || financeType === 'debt') && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <input 
                          type="number" placeholder="Target ($)..." required 
                          value={financeTargetAmount} onChange={(e) => setFinanceTargetAmount(e.target.value)}
                          className="glass-input" 
                        />
                        <select 
                          className="glass-input" 
                          style={{ color: '#ffffff' }}
                          value={financeTargetMonth}
                          onChange={(e) => setFinanceTargetMonth(e.target.value as any)}
                        >
                          <option value="June">June</option>
                          <option value="July">July</option>
                          <option value="August">August</option>
                          <option value="September">September</option>
                          <option value="October">October</option>
                          <option value="November">November</option>
                          <option value="December">December</option>
                        </select>
                      </div>
                    )}

                    <button type="submit" className="glass-button active"><Plus size={16} /> Log Entry</button>
                  </form>
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
                  <p>Distraction-free markdown drafting and category notebooks.</p>
                </div>
              )}

              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: isWritingFullscreen ? '1fr' : '260px 1fr', 
                gap: '20px', 
                flex: 1, 
                minHeight: '400px',
                height: isWritingFullscreen ? 'calc(100vh - 40px)' : 'auto'
              }}>
                
                {/* Notes lists */}
                {!isWritingFullscreen && (
                  <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600 }}>Notes list</span>
                      <button className="glass-button" style={{ padding: '4px 8px' }} onClick={createNewNote}><Plus size={14} /></button>
                    </div>

                    <div className="scroll-y" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {state.notes.map((note) => (
                        <div 
                          key={note.id} 
                          className={`glass-card ${selectedNoteId === note.id ? 'active' : ''}`}
                          style={{ padding: '12px', cursor: 'pointer', background: selectedNoteId === note.id ? 'rgba(139,92,246,0.15)' : undefined }}
                          onClick={() => selectNote(note.id)}
                        >
                          <div style={{ fontWeight: 500, fontSize: '14px' }}>{note.title || 'Untitled'}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            {new Date(note.lastModified).toLocaleDateString()} | {note.folder}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Editor Box */}
                <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* Top bar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                    
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <select 
                        className="glass-input" 
                        style={{ padding: '6px 12px', fontSize: '12px', color: '#ffffff' }}
                        value={noteEditFolder}
                        onChange={(e) => {
                          setNoteEditFolder(e.target.value);
                          saveActiveNote();
                        }}
                      >
                        <option value="Work">Work</option>
                        <option value="Personal">Personal</option>
                        <option value="Drafts">Drafts</option>
                        <option value="Journal">Journal</option>
                      </select>

                      <button className="glass-button" style={{ padding: '8px 12px' }} onClick={() => setIsWritingFullscreen(!isWritingFullscreen)}>
                        {isWritingFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                        {isWritingFullscreen ? 'Standard' : 'Fullscreen'}
                      </button>

                      <button className="glass-button active" style={{ padding: '8px 12px' }} onClick={saveActiveNote}>
                        <Save size={14} /> Save
                      </button>
                    </div>
                  </div>

                  {/* Markdown Side-by-side */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', flex: 1 }}>
                    <textarea 
                      placeholder="Write your notes here in Markdown format..."
                      value={noteEditContent}
                      onChange={(e) => {
                        setNoteEditContent(e.target.value);
                        saveActiveNote();
                      }}
                      className="glass-input"
                      style={{ height: '100%', width: '100%', resize: 'none', fontSize: '14px', fontFamily: 'monospace', padding: '16px' }}
                    />
                    
                    {/* HTML live preview */}
                    <div className="scroll-y" style={{ height: '100%', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-glass)', fontSize: '14px', lineHeight: 1.6 }}>
                      <div style={{ textTransform: 'uppercase', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '12px' }}>Live Markdown Preview</div>
                      <div style={{ whiteSpace: 'pre-wrap' }}>
                        {noteEditContent || <span style={{ color: 'var(--text-muted)' }}>Draft markdown...</span>}
                      </div>
                    </div>
                  </div>

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
                <h2 style={{ fontSize: '32px', fontWeight: 700 }}>Analytics & Productivity Insights</h2>
                <p>Review historical metrics, completed goals ratio, and focus hour heatmaps.</p>
              </div>

              {/* 14 Day Productivity Score Line Chart */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>14-Day Productivity Trend</h3>
                <div style={{ height: '160px', position: 'relative', width: '100%' }}>
                  <svg viewBox="0 0 700 160" style={{ width: '100%', height: '100%' }}>
                    <defs>
                      <linearGradient id="gradient-line" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-purple)" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="var(--color-purple)" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <line x1="0" y1="40" x2="700" y2="40" stroke="rgba(255,255,255,0.03)" />
                    <line x1="0" y1="80" x2="700" y2="80" stroke="rgba(255,255,255,0.03)" />
                    <line x1="0" y1="120" x2="700" y2="120" stroke="rgba(255,255,255,0.03)" />
                    
                    <path 
                      d={`M ${state.activityLog.map((log, idx) => `${idx * 50}, ${160 - (log.productivityScore / 100) * 140}`).join(' L ')}`} 
                      fill="none" stroke="var(--color-purple)" strokeWidth="3" 
                    />
                    <path 
                      d={`M 0,160 L ${state.activityLog.map((log, idx) => `${idx * 50}, ${160 - (log.productivityScore / 100) * 140}`).join(' L ')} L ${50 * (state.activityLog.length - 1)},160 Z`} 
                      fill="url(#gradient-line)" 
                    />
                    {state.activityLog.map((log, idx) => (
                      <circle 
                        key={idx} 
                        cx={idx * 50} 
                        cy={160 - (log.productivityScore / 100) * 140} 
                        r="4" 
                        fill="var(--color-purple-light)" 
                      />
                    ))}
                  </svg>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                  <span>14 days ago</span>
                  <span>Today</span>
                </div>
              </div>

              {/* Heatmap grid */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Productivity Heatmap</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {Array.from({ length: 84 }).map((_, i) => {
                    const score = Math.floor(Math.sin(i * 0.4) * 40 + 60);
                    let color = 'rgba(255,255,255,0.02)';
                    if (score > 90) color = '#7c3aed';
                    else if (score > 80) color = '#8b5cf6';
                    else if (score > 70) color = '#a78bfa';
                    else if (score > 60) color = '#c084fc';
                    
                    return (
                      <div 
                        key={i} 
                        style={{ width: '14px', height: '14px', borderRadius: '2px', background: color }}
                        title={`Day ${i}: Score ${score}`}
                      />
                    );
                  })}
                </div>
                <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: 'var(--text-muted)', marginTop: '12px', alignItems: 'center' }}>
                  <span>Less productive</span>
                  <div style={{ width: '10px', height: '10px', background: '#c084fc', borderRadius: '2px' }}></div>
                  <div style={{ width: '10px', height: '10px', background: '#a78bfa', borderRadius: '2px' }}></div>
                  <div style={{ width: '10px', height: '10px', background: '#8b5cf6', borderRadius: '2px' }}></div>
                  <div style={{ width: '10px', height: '10px', background: '#7c3aed', borderRadius: '2px' }}></div>
                  <span>Highly productive</span>
                </div>
              </div>

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
                
                {/* Left Side: Shortcuts & Aura config */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  
                  {/* Keyboard Shortcuts */}
                  <div className="glass-panel" style={{ padding: '24px' }}>
                    <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Global Keyboard Hotkeys</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {Object.entries(state.settings.shortcuts).map(([action, keys]) => (
                        <div key={action} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
                          <span style={{ textTransform: 'capitalize' }}>{action.replace('-', ' ')}</span>
                          <code style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px' }}>{keys}</code>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Focus Aura Config */}
                  <div className="glass-panel" style={{ padding: '24px' }}>
                    <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Focus Aura Settings</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Aura Mode intensity</span>
                        <select 
                          className="glass-input" 
                          style={{ color: '#fff', padding: '6px 12px' }}
                          value={state.settings.auraConfig.mode}
                          onChange={(e) => {
                            const val = e.target.value as any;
                            updateState((prev) => {
                              const auraConfig = { ...prev.settings.auraConfig, mode: val };
                              return { ...prev, settings: { ...prev.settings, auraConfig } };
                            });
                          }}
                        >
                          <option value="subtle">Subtle (Thinner, Slow flow)</option>
                          <option value="normal">Normal (Default)</option>
                          <option value="aggressive">Aggressive (Thick flashing flow)</option>
                        </select>
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                          <span>Border thickness</span>
                          <span>{state.settings.auraConfig.thickness}px</span>
                        </div>
                        <input 
                          type="range" min="2" max="20" step="1"
                          value={state.settings.auraConfig.thickness}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            updateState((prev) => {
                              const auraConfig = { ...prev.settings.auraConfig, thickness: val };
                              return { ...prev, settings: { ...prev.settings, auraConfig } };
                            });
                          }}
                          style={{ width: '100%' }}
                        />
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                          <span>Animation speed</span>
                          <span>{state.settings.auraConfig.speed}s flow</span>
                        </div>
                        <input 
                          type="range" min="1" max="20" step="1"
                          value={state.settings.auraConfig.speed}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            updateState((prev) => {
                              const auraConfig = { ...prev.settings.auraConfig, speed: val };
                              return { ...prev, settings: { ...prev.settings, auraConfig } };
                            });
                          }}
                          style={{ width: '100%' }}
                        />
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                          <span>Glow Brightness</span>
                          <span>{state.settings.auraConfig.brightness}%</span>
                        </div>
                        <input 
                          type="range" min="10" max="100" step="5"
                          value={state.settings.auraConfig.brightness}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            updateState((prev) => {
                              const auraConfig = { ...prev.settings.auraConfig, brightness: val };
                              return { ...prev, settings: { ...prev.settings, auraConfig } };
                            });
                          }}
                          style={{ width: '100%' }}
                        />
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                          <span>Border Transparency / Opacity</span>
                          <span>{state.settings.auraConfig.transparency}%</span>
                        </div>
                        <input 
                          type="range" min="5" max="100" step="5"
                          value={state.settings.auraConfig.transparency}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            updateState((prev) => {
                              const auraConfig = { ...prev.settings.auraConfig, transparency: val };
                              return { ...prev, settings: { ...prev.settings, auraConfig } };
                            });
                          }}
                          style={{ width: '100%' }}
                        />
                      </div>

                      <div>
                        <span style={{ fontSize: '13px', display: 'block', marginBottom: '8px' }}>Active Gradient Colors</span>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {state.settings.auraConfig.colors.map((color, index) => (
                            <input 
                              key={index}
                              type="color" 
                              value={color}
                              onChange={(e) => {
                                const val = e.target.value;
                                updateState((prev) => {
                                  const colors = [...prev.settings.auraConfig.colors];
                                  colors[index] = val;
                                  const auraConfig = { ...prev.settings.auraConfig, colors };
                                  return { ...prev, settings: { ...prev.settings, auraConfig } };
                                });
                              }}
                              style={{ width: '36px', height: '36px', border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'transparent' }}
                            />
                          ))}
                          <button className="glass-button" style={{ padding: '6px 10px' }} onClick={() => {
                            updateState((prev) => {
                              const colors = [...prev.settings.auraConfig.colors, '#ffffff'];
                              const auraConfig = { ...prev.settings.auraConfig, colors };
                              return { ...prev, settings: { ...prev.settings, auraConfig } };
                            });
                          }}>+</button>
                          {state.settings.auraConfig.colors.length > 2 && (
                            <button className="glass-button" style={{ padding: '6px 10px' }} onClick={() => {
                              updateState((prev) => {
                                const colors = prev.settings.auraConfig.colors.slice(0, -1);
                                const auraConfig = { ...prev.settings.auraConfig, colors };
                                return { ...prev, settings: { ...prev.settings, auraConfig } };
                              });
                            }}>-</button>
                          )}
                        </div>
                      </div>

                    </div>
                  </div>

                </div>

                {/* Right Side: Focus Modes Configurator */}
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>Focus Modes Configurator</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>Configure custom alerts and styles for the 8 core focus spaces.</p>
                  
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                    <select 
                      className="glass-input" 
                      style={{ color: '#fff', flex: 1 }}
                      value={selectedFocusModeId}
                      onChange={(e) => selectFocusMode(e.target.value)}
                    >
                      {state.settings.focusModes.map((mode) => (
                        <option key={mode.id} value={mode.id}>{mode.name}</option>
                      ))}
                    </select>
                  </div>

                  {(() => {
                    const currentMode = state.settings.focusModes.find(m => m.id === selectedFocusModeId);
                    if (!currentMode) return null;

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                          <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Mode Name</label>
                          <input 
                            type="text" 
                            value={currentMode.name}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateState((prev) => {
                                const focusModes = prev.settings.focusModes.map(m => m.id === selectedFocusModeId ? { ...m, name: val } : m);
                                return { ...prev, settings: { ...prev.settings, focusModes } };
                              });
                            }}
                            className="glass-input" 
                            style={{ width: '100%' }}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span>Alert Interval (minutes)</span>
                            <span>Every {currentMode.reminderInterval}m</span>
                          </label>
                          <input 
                            type="range" min="1" max="60" step="1"
                            value={currentMode.reminderInterval}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              updateState((prev) => {
                                const focusModes = prev.settings.focusModes.map(m => m.id === selectedFocusModeId ? { ...m, reminderInterval: val } : m);
                                return { ...prev, settings: { ...prev.settings, focusModes } };
                              });
                            }}
                            style={{ width: '100%' }}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Border Style</label>
                          <select 
                            className="glass-input" 
                            style={{ color: '#fff', width: '100%' }}
                            value={currentMode.borderStyle}
                            onChange={(e) => {
                              const val = e.target.value as any;
                              updateState((prev) => {
                                const focusModes = prev.settings.focusModes.map(m => m.id === selectedFocusModeId ? { ...m, borderStyle: val } : m);
                                return { ...prev, settings: { ...prev.settings, focusModes } };
                              });
                            }}
                          >
                            <option value="flowing">Flowing Gradient</option>
                            <option value="pulse">Pulse Glow</option>
                            <option value="solid">Solid Border</option>
                          </select>
                        </div>

                        {/* Custom colors for this focus mode */}
                        <div>
                          <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Gradient Colors</label>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            {currentMode.colors.map((color, index) => (
                              <input 
                                key={index}
                                type="color" 
                                value={color}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  updateState((prev) => {
                                    const focusModes = prev.settings.focusModes.map(m => {
                                      if (m.id === selectedFocusModeId) {
                                        const colors = [...m.colors];
                                        colors[index] = val;
                                        return { ...m, colors };
                                      }
                                      return m;
                                    });
                                    return { ...prev, settings: { ...prev.settings, focusModes } };
                                  });
                                }}
                                style={{ width: '32px', height: '32px', border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'transparent' }}
                              />
                            ))}
                          </div>
                        </div>

                        {/* List of Custom Voice messages */}
                        <div>
                          <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Custom voice reminders messages</label>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {currentMode.voiceReminders.map((msg, index) => (
                              <div key={index} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <input 
                                  type="text" 
                                  value={msg}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    updateState((prev) => {
                                      const focusModes = prev.settings.focusModes.map(m => {
                                        if (m.id === selectedFocusModeId) {
                                          const voiceReminders = [...m.voiceReminders];
                                          voiceReminders[index] = val;
                                          return { ...m, voiceReminders };
                                        }
                                        return m;
                                      });
                                      return { ...prev, settings: { ...prev.settings, focusModes } };
                                    });
                                  }}
                                  className="glass-input" 
                                  style={{ flex: 1, padding: '6px 10px', fontSize: '13px' }}
                                />
                                <button className="glass-button" style={{ padding: '6px' }} onClick={() => {
                                  updateState((prev) => {
                                    const focusModes = prev.settings.focusModes.map(m => {
                                      if (m.id === selectedFocusModeId) {
                                        const voiceReminders = m.voiceReminders.filter((_, i) => i !== index);
                                        return { ...m, voiceReminders };
                                      }
                                      return m;
                                    });
                                    return { ...prev, settings: { ...prev.settings, focusModes } };
                                  });
                                }}>-</button>
                              </div>
                            ))}
                            <button className="glass-button" style={{ padding: '6px 12px', alignSelf: 'flex-start', fontSize: '12px' }} onClick={() => {
                              updateState((prev) => {
                                const focusModes = prev.settings.focusModes.map(m => {
                                  if (m.id === selectedFocusModeId) {
                                    const voiceReminders = [...m.voiceReminders, 'Get back to work.'];
                                    return { ...m, voiceReminders };
                                  }
                                  return m;
                                });
                                return { ...prev, settings: { ...prev.settings, focusModes } };
                              });
                            }}>+ Add reminder message</button>
                          </div>
                        </div>

                        {/* List of Custom goals */}
                        <div>
                          <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Productivity Goals</label>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {currentMode.productivityGoals.map((goalStr, index) => (
                              <div key={index} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <input 
                                  type="text" 
                                  value={goalStr}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    updateState((prev) => {
                                      const focusModes = prev.settings.focusModes.map(m => {
                                        if (m.id === selectedFocusModeId) {
                                          const productivityGoals = [...m.productivityGoals];
                                          productivityGoals[index] = val;
                                          return { ...m, productivityGoals };
                                        }
                                        return m;
                                      });
                                      return { ...prev, settings: { ...prev.settings, focusModes } };
                                    });
                                  }}
                                  className="glass-input" 
                                  style={{ flex: 1, padding: '6px 10px', fontSize: '13px' }}
                                />
                                <button className="glass-button" style={{ padding: '6px' }} onClick={() => {
                                  updateState((prev) => {
                                    const focusModes = prev.settings.focusModes.map(m => {
                                      if (m.id === selectedFocusModeId) {
                                        const productivityGoals = m.productivityGoals.filter((_, i) => i !== index);
                                        return { ...m, productivityGoals };
                                      }
                                      return m;
                                    });
                                    return { ...prev, settings: { ...prev.settings, focusModes } };
                                  });
                                }}>-</button>
                              </div>
                            ))}
                            <button className="glass-button" style={{ padding: '6px 12px', alignSelf: 'flex-start', fontSize: '12px' }} onClick={() => {
                              updateState((prev) => {
                                const focusModes = prev.settings.focusModes.map(m => {
                                  if (m.id === selectedFocusModeId) {
                                    const productivityGoals = [...m.productivityGoals, 'New goal limit'];
                                    return { ...m, productivityGoals };
                                  }
                                  return m;
                                });
                                return { ...prev, settings: { ...prev.settings, focusModes } };
                              });
                            }}>+ Add productivity goal</button>
                          </div>
                        </div>

                      </div>
                    );
                  })()}

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
            width: '800px', 
            maxWidth: '90%', 
            maxHeight: '90vh',
            display: 'flex', 
            flexDirection: 'column', 
            gap: '16px',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '22px', fontWeight: 700 }}>
                  {editingTaskId ? 'Edit Task Details' : 'Create New Task'}
                </h3>
                {taskFormIsPinned && <Pin size={16} style={{ color: 'var(--color-purple-light)', transform: 'rotate(45deg)' }} />}
              </div>
              <button className="glass-button" style={{ padding: '4px', border: 'none', background: 'transparent' }} onClick={() => setIsTaskModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            {/* Scrollable content body */}
            <form onSubmit={handleSaveTask} style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', flex: 1, paddingRight: '8px' }}>
              
              {/* Split layout: Details vs Config */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
                
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderLeft: '1px solid rgba(255,255,255,0.05)', paddingLeft: '20px' }}>
                  
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
                      <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Category Label</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Work, Health" 
                        value={taskFormLabel} 
                        onChange={(e) => setTaskFormLabel(e.target.value)} 
                        className="glass-input" 
                        style={{ color: '#fff', width: '100%', padding: '8px 12px' }} 
                      />
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

              {/* Form Footer Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '16px', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
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

    </div>
  );
}
