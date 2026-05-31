# Implementation Plan - Orb OS Refactoring

This plan outlines the design and styling updates requested for Orb OS, aiming to resolve congestion in panels, combine related widgets, add customization, and clean up the overall presentation.

## Proposed Changes

### Component 1: State Initialization & Settings (`src/utils/storage.ts`)

- **[MODIFY]** [storage.ts](file:///d:/Project Gulabi/src/utils/storage.ts)
  - Define `EMPTY_STATE` containing empty arrays for user data (`goals: []`, `tasks: []`, `reminders: []`, `notes: []`, `scheduleBlocks: []`, `activityLog: []`) and default settings.
  - Set the default state of `DEFAULT_STATE` to `EMPTY_STATE`. This ensures that, by default, no pre-populated mock data is added, allowing users to start with a clean slate.
  - In `INITIAL_SETTINGS`, add a new boolean setting `useDemoData: false` and a string setting `loopDismissKey: 'D'`.
  - Add `customReminderSounds?: Array<{ id: string; name: string; dataUrl: string }>` to `AppSettings` type and initialize it to `[]`.

### Component 2: Types definition (`src/types.ts`)

- **[MODIFY]** [types.ts](file:///d:/Project Gulabi/src/types.ts)
  - Add `useDemoData: boolean;`, `loopDismissKey: string;`, and `customReminderSounds?: Array<{ id: string; name: string; dataUrl: string }>` to the `AppSettings` interface.

### Component 3: Styling & Animations (`src/index.css`)

- **[MODIFY]** [index.css](file:///d:/Project Gulabi/src/index.css)
  - Add keyframe animations for `@keyframes pulse-bg-red-purple` and `@keyframes border-flash-flow` to fix the non-functional warning overlay animations.
  - Add helper styles for alignment of content within `.content-editable` if required (e.g., standard styles for image alignment).

### Component 4: Main UI Dashboard & Features (`src/App.tsx`)

- **[MODIFY]** [App.tsx](file:///d:/Project Gulabi/src/App.tsx)

  #### 1. Connection Footers (Sidebar)
  - Remove the system status footer containing "Focus Aura Engine Connected" and "Local Storage: Connected" from the bottom-left sidebar.

  #### 2. Consolidated Timer Widget
  - Rename "Focus Sprint Timer" to just **Timer**.
  - Merge the "Break Allowance" widget into the Timer widget.
  - Implement a modern tabbed layout inside the Timer card:
    - **Focus Timer**: Displays circular countdown timer (Pomodoro, Deep Work, Stopwatch).
    - **Break Tracker**: Displays daily break limit input, today's accumulated break time, and allowance status.
  - Ensure circular progress is calculated correctly for countdown visual feedback.

  #### 3. Dashboard Layout
  - Change the dashboard main grid: put "Today's Tasks" and "Active Goals" side-by-side using a grid column template like `1.2fr 1fr 1fr` (along with the Timer).
  - Remove the display of month name (e.g., "June") from the dashboard widgets.
  - Exclude completed tasks from the dashboard "Today's Tasks" list entirely.
  - Do not render the "Track" button for completed tasks.

  #### 4. Goals Grid UI
  - Improve goals card spacing (increase padding to `20px` and gap to `12px` or `16px`).
  - Upgrade edit/pin/delete buttons with cleaner styles, explicit icons, and standard pill sizes.
  - Show a progress bar on active goal cards in the goals list tab just like the dashboard.

  #### 5. Kanban Details Modal UI
  - Increase task details modal width to `950px` to give fields breathing room.
  - Balance column widths (`gridTemplateColumns: '1fr 1fr'`) and increase grid gap to `32px` to clean up congestion.
  - Replace the custom category text field/color input with:
    - Curved circles showing preset colors.
    - A custom color picker circle.
  - Add a trash/delete icon next to the "Filter Category" select in the Kanban Board and Goals tab headers. Selecting a category and clicking this button will prompt the user to delete it, resetting those tasks/goals to default values.

  #### 6. Voice Reminders Tab
  - Remove the "Strict Mode" panel card from the Voice Reminders sidebar.
  - Move the "Trigger Focus Alert" button from the main dashboard header to the Voice Reminders tab header.
  - Register a listener for `Ctrl+Shift+<CustomKey>` (key is loaded from `state.settings.loopDismissKey`) to dismiss looping reminders.

  #### 7. Notes Workspace
  - Add "Clear Style" / "Reset Color" & "Clear Highlight" buttons in the selection toolbar.
  - Add a text input box for URLs in the toolbar so users can add hyperlinks and images by entering the URL and clicking the command button directly (avoiding the browser `prompt` popups).
  - Add a "File Upload" button for local images which converts files to base64 DataURLs and embeds them inside the `contentEditable` area.
  - Add alignment buttons (`Left`, `Center`, `Right`) to format selected images or text blocks.

  #### 8. Analytics Tab
  - Rename header to just **Analytics**.
  - Add a CSS `conic-gradient` circular Donut Chart showing the breakdown of time spent across categories.
  - Add filters at the top of the Analytics tab:
    - **Time Range**: "All Time", "Last 7 Days", "Today".
    - **Category**: "All Categories" or specific labels.
  - Ensure stats update dynamically based on the active filters.

  #### 9. Settings Tab
  - Add a list UI for custom voice alerts under settings, allowing users to upload and manage multiple alert files.
  - Add an input to configure the `loopDismissKey` (e.g. `K`).
  - Add a toggle switch `state.settings.useDemoData` in the Settings tab:
    - When turned ON, populate state with mock data.
    - When turned OFF, clear all data lists to return to a clean slate.
    - Set default to OFF.

  #### 10. Schedule Planner
  - Add a toggle selector `is24HourFormat` (12-Hour vs 24-Hour).
  - Format times (e.g., `13:00` vs `1:00 PM`) in both the grid timeline and select options based on this format.
  - Remove the inline schedule block creator from the bottom of the grid card.
  - Add a "+ Add Event" button to the grid header which opens a beautiful modal to configure and add a schedule block.

## Verification Plan

### Automated Build Checks
- Run `npm run build` to ensure all TypeScript typings, properties, and CSS imports are valid.

### Manual Verification
- Launch the Electron app locally and walk through each tab:
  - Verify that the bottom-left connection text is removed.
  - Verify the consolidated Timer and Break allowance cards.
  - Check the side-by-side dashboard tasks and goals (no month displayed).
  - Open a Kanban card details modal and inspect the improved spacing, color circles, and category deletion.
  - Test setting custom highlight colors and links in Notes.
  - Test the filters and donut chart in Analytics.
  - Toggle "Load Demo Data" in Settings to verify it correctly populates and clears the data arrays.
  - Toggle 12/24 hour display and add events using the schedule planner modal.
