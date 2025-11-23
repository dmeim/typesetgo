# Feature: Plan Mode (Test Playlist)

## 1. Overview
"Plan Mode" is a meta-mode that allows users to construct a sequenced "playlist" of different typing test configurations. It is designed to support structured practice sessions in Single Player and structured lessons or competitions in Connect (Multiplayer) mode.

## 2. User Experience (Single Player & General)

### 2.1 Plan Builder Interface
When "Plan" is selected from the mode menu, a configuration modal appears with the following features:

*   **List Management**:
    *   **Add Step**: Button to add a new test mode to the list. Supports all existing modes (Time, Words, Quote, Zen, etc.).
    *   **Remove Step**: Option to delete an item from the list.
    *   **Re-order**: Drag-and-drop functionality to arrange the sequence of tests.
*   **Step Configuration**:
    *   **Mode Settings**: Each item in the list allows full access to that specific mode's settings. For example, if "Time Mode" is added, the user can configure the duration (15s, 60s), punctuation, and numbers for that specific step.
    *   **Display Metadata**:
        *   **Title**: Custom text (e.g., "Part 1: Warm Up").
        *   **Subtitle**: Custom description (e.g., "Focus on accuracy, not speed").
        *   **Progress Counter**: An "Item X/Y" indicator (e.g., "1/5") is automatically generated.

### 2.2 Execution Flow & UI Layout
The user executes the plan sequentially.

*   **Intermediate Splash Screen**:
    *   Displayed between tests (and before the first one).
    *   Shows the **Title**, **Subtitle**, and **Progress Counter (X/Y)** for the upcoming step.
    *   **Action Button**: A "Begin [Section Name]" button to start the test.
*   **Test Area Layout**:
    *   **Top**: Title, Subtitle, and Progress Counter (X/Y).
    *   **Middle**: **Forward (Next)** and **Back (Previous)** navigation buttons.
    *   **Bottom**: The actual typing test area.

## 3. Connect (Multiplayer) Integration
Plan Mode is a unified feature set, functioning identically in Single Player but with added synchronization controls for the Host in Connect mode.

### 3.1 Host Configuration & Controls
The Host uses the same Builder Interface as Single Player, with additional controls for managing the group flow.

*   **Synchronization Settings (Per Item)**:
    *   **"Wait for All" Toggle**:
        *   **Enabled**: The group cannot proceed to the next item until *every* active participant has finished the current item.
        *   **Disabled**: Participants progress through the playlist at their own pace immediately after finishing the previous item.
    *   **"Allow Zen Waiting" Toggle**:
        *   *Condition*: Only available if "Wait for All" is enabled.
        *   **Function**: If enabled, users who finish early are given the option to enter a temporary "Zen Mode" to kill time while waiting for others.

*   **Host Manual Controls**:
    *   **Global Playback**: Controls to **Start**, **Pause**, and **Stop** the entire plan execution.
    *   **Step Navigation (Force Transition)**:
        *   **Next Item**: A button to manually force all users to the next item in the list. *Crucial for open-ended modes (like a Zen Mode warm-up) that don't have a natural finish condition.*
        *   **Previous Item**: A button to return the group to the previous item.

### 3.2 Host Dashboard & Monitoring
*   **User Cards**:
    *   Updated to display the **Current Plan Item** (e.g., "2/5 - Warmup") alongside standard stats.
    *   Visual distinction for user states: **Typing**, **Waiting** (Static Screen), **Zen Waiting**.
*   **Detailed User Results Modal**:
    *   **Action**: Clicking on a specific User Card opens a detailed results modal.
    *   **Content**: This modal displays a comprehensive list of results for **all test modes in the plan** that the user has completed so far (e.g., "Item 1 (Zen): N/A, Item 2 (Time): 65 WPM"). This allows a teacher to review a student's full session history.

### 3.3 Participant Transition Flow (Zen Waiting Logic)
When "Wait for All" and "Zen Waiting" are enabled, the flow is as follows:

1.  **User Finishes**: User completes Step N.
2.  **Zen Entry**: User enters the temporary Zen Waiting room.
3.  **Locked Navigation**: The **Forward (Next)** button (located between metadata and text area) becomes **Greyed Out/Disabled**.
4.  **Host Signal / Group Ready**:
    *   When everyone is finished OR the Host manually clicks "Next Item":
    *   A **Toast Notification** appears in the top-right: *"Step N+1 is ready!"*.
    *   The **Forward (Next)** button un-greys and becomes **Active**.
5.  **User Progression**: The user clicks the now-active Forward button to exit Zen mode and begin Step N+1.

## 4. Technical Requirements

### 4.1 Data Structure
```typescript
type PlanItem = {
  id: string;
  mode: 'time' | 'words' | 'quote' | 'zen' | 'custom';
  settings: ModeSettings; // Specific config for the chosen mode
  metadata: {
    title: string;
    subtitle: string;
  };
  syncSettings: {
    waitForAll: boolean;
    zenWaiting: boolean; // Only relevant if waitForAll is true
  };
};

type Plan = PlanItem[];

type UserPlanProgress = {
  userId: string;
  currentStepIndex: number;
  stepResults: Record<string, ResultData>; // Map step ID to result stats
  status: 'typing' | 'waiting' | 'zen_waiting';
};
```

### 4.2 State Management
*   **Global State**: Track `currentStepIndex`, `totalSteps`, and `plan` config.
*   **Multiplayer**:
    *   Host broadcasts `PLAN_START`, `PLAN_PAUSE`, `PLAN_STOP`, `FORCE_NEXT_STEP`, `FORCE_PREV_STEP`, and `NEXT_STEP_READY` events.
    *   Clients report `STEP_COMPLETE`, `ENTERED_ZEN_WAITING`, `EXITED_ZEN_WAITING`.

## 5. Roadmap Checklist
- [ ] Design and Implement `PlanBuilderModal` (UI).
- [ ] Implement Drag-and-Drop logic for the list.
- [ ] Implement Intermediate Splash Screen with Metadata & X/Y Counter.
- [ ] Add Forward/Back navigation buttons to the User Test Area (between metadata and text).
- [ ] Update Game Engine to handle sequential mode transitions.
- [ ] Implement Host Manual Controls (Start/Pause/Stop, Force Next/Prev).
- [ ] Implement "Wait for All" logic & Zen Waiting Room state.
- [ ] Implement Toast Notification system & Next Button unlock logic.
- [ ] Implement Host Dashboard: User Card click -> Detailed Results Modal.
