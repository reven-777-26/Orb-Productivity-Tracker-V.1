# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-05-31

### Added
- **Core Operating Environment**: Initial release of Orb OS, a premium desktop workspace and productivity tracker wrapped in Electron.
- **Offline-First Database**: Integrated a robust, lightweight JSON-based local database with automatic reading and writing.
- **Consolidated Timer**:
  - Combined Focus Sprint Timer (Pomodoro/Stopwatch) and Daily Break Tracker.
  - Added visual circular progress countdown indicators.
- **Kanban Board**:
  - Drag-and-drop task workflow with custom category coloring.
  - Spacing-optimized task details modal with custom color pickers and filtering options.
- **Event Planner & Scheduler**:
  - Visual day-scheduler grid with configurable 12-hour/24-hour time formatting.
  - Interactive "Add Event" modal.
- **Focus Mode & Aura System**:
  - Global hotkeys (`Ctrl+Shift+F`, `Ctrl+Shift+T`, etc.) to trigger focus sessions, snooze, or dismiss reminders.
  - Click-through warning overlays that lock input on strict level-4 reminders.
- **Rich Notes Workspace**:
  - Full WYSIWYG editing, text formatting, highlights, and custom web links.
  - Native image upload support (converts to base64 DataURL for offline compatibility).
- **Interactive Analytics**:
  - Conic-gradient donut chart of time distribution across active categories.
  - Custom filters by Time Range (All Time, 7 Days, Today) and Category.
- **System Settings**:
  - UI to manage custom voice alerts, shortcut keybindings (e.g. `loopDismissKey`), and a demo data toggle.
