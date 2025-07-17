# ECG Player State Management - XState Refined Plan

## 1. Problem

The current ECG Player (`assets/js/hooks/ecg/ecg_player.js`) utilizes approximately 30 scattered state properties. This leads to complex manual state synchronization, making the component difficult to maintain, debug, and extend.

## 2. Solution: XState State Machine

We will replace the manual state management with a single, robust XState machine. This machine will be the definitive source of truth, orchestrating all state transitions, side effects, and event handling.

## 3. State Machine Design

### 3.1. States (Parallel and Nested)

To accurately model the UI's behavior, we will use a parallel state machine. This allows us to manage orthogonal concerns (like playback and display mode) independently.

```javascript
// High-level overview of the parallel states
{
  type: 'parallel',
  states: {
    playback: { /* ... */ },
    calipers: { /* ... */ },
    display: { /* ... */ },
    fullscreen: { /* ... */ }
  }
}
```

#### a. `playback` State (Handles Playback Logic)

Manages the core media-player-like functionality.

```
loading → idle → playing ⇄ paused
```

- **loading**: Initial state. Waiting for the `DATA_LOADED` event.
- **idle**: Data is loaded, player is ready.
- **playing**: Active playback. Spawns an **animation actor** to drive the `requestAnimationFrame` loop.
- **paused**: Playback is paused. The animation actor is stopped.

#### b. `calipers` State (Nested, Handles Measurement)

Manages the state of the measurement calipers. This is a nested state machine.

```
disabled → enabled
             └── idle → drawing → placed
```

- **disabled**: Default state. Calipers are not active.
- **enabled**: User has activated calipers mode.
  - **idle**: Ready to start drawing a new caliper.
  - **drawing**: User is actively dragging to draw a caliper.
  - **placed**: A caliper measurement is complete and displayed.

#### c. `display` State (Handles View Mode)

Manages whether the user is viewing a single lead or the multi-lead view.

```
single ⇄ multi
```

#### d. `fullscreen` State (Handles Fullscreen Mode)

Manages the fullscreen state of the component.

```
off ⇄ on
```

### 3.2. State Machine `context`

The machine's `context` will be the single source of truth for all dynamic data, eliminating scattered state properties.

```javascript
// The machine's extended state (memory)
{
  // Static ECG data loaded from the server
  ecgData: {
    samplingRate: number,
    leadNames: string[],
    totalDuration: number,
    qrsTimestamps: number[],
    ecgLeadDatasets: object[],
    precomputedSegments: Map
  },
  // Real-time playback data
  playback: {
    startTime: number,
    pausedTime: number,
    loopEnabled: boolean,
    elapsedTime: number // Updated by the animation actor
  },
  // UI settings and display options
  display: {
    currentLead: number,
    gridScale: number,
    amplitudeScale: number,
    heightScale: number,
    qrsIndicatorEnabled: boolean
  },
  // Data for active caliper measurements
  calipers: {
    measurements: object[] // Array of caliper data objects
  }
}
```

### 3.3. Key Events

Events will drive all transitions within the machine.

- **Data Events**: `DATA_LOADED`
- **Playback Control**: `PLAY`, `PAUSE`, `STOP`, `TOGGLE_LOOP`
- **Animation Actor Events**: `TICK` (sent from the animation actor to the machine)
- **User Interface**: `TOGGLE_CALIPERS`, `TOGGLE_DISPLAY_MODE`, `TOGGLE_FULLSCREEN`
- **Caliper Actions**: `START_DRAWING`, `FINISH_DRAWING`, `CLEAR_CALIPERS`
- **Settings Changes**: `CHANGE_LEAD`, `UPDATE_GRID_SCALE`, etc.

## 4. Side Effects and Actors

The state machine itself will remain pure. It will not directly manipulate the DOM or canvas.

- **Side Effects**: Are handled in response to state transitions. For example, when entering the `playing` state, the machine will spawn an animation actor.
- **Rendering**: The `ecg_player_v2.js` hook will subscribe to state machine changes. It will be responsible for all canvas rendering based on the current state and context of the machine.
- **Animation Actor**: The `requestAnimationFrame` loop will be encapsulated within an XState Actor.
  - The `playing` state **spawns** this actor.
  - The actor sends `TICK` events with the `elapsedTime` back to the machine.
  - The machine updates its `context.playback.elapsedTime` on each `TICK`.
  - Exiting the `playing` state automatically **stops** the actor, ensuring perfect cleanup.

## 5. Implementation Approach

### Phase 1: Parallel Implementation

- Keep original `ecg_player.js` untouched.
- Create new `ecg_player_v2.js` (the Phoenix hook).
- Create `ecg_player_machine.js` to define the XState machine.

### Phase 2: Core States & Animation Actor

- Implement the `playback` state (`loading` → `idle` → `playing`/`paused`).
- Implement the animation actor and the `TICK` event flow.
- Get basic single-lead waveform rendering working, driven by the machine's state.

### Phase 3: Advanced Features & Parallel States

- Implement the `calipers`, `display`, and `fullscreen` parallel states.
- Implement the nested logic for caliper drawing.
- Add event handling for all UI controls (sliders, buttons, keyboard shortcuts).

### Phase 4: Migration & Cleanup

- Ensure full feature parity with the original implementation.
- Conduct thorough testing.
- Once stable, remove the feature flag and the original `ecg_player.js` file.

## 6. Benefits

- **Eliminates Impossible States**: The machine cannot be `playing` and `drawing calipers` in an invalid way.
- **Single Source of Truth**: The machine's `context` holds all state.
- **Predictable & Debuggable**: State transitions are explicit and can be visualized with XState DevTools.
- **Simplified Code**: The hook becomes a simple "renderer" of the state, while the machine handles all the logic.
- **Automatic Cleanup**: Actors and state entry/exit actions handle resource management (e.g., animation loops).

## 7. Success Criteria

- Eliminate all manual state synchronization from the hook.
- Reduce the logical complexity of `ecg_player.js` significantly.
- Achieve a fully interactive and bug-free player experience, identical to the original.
- Ensure a safe, reversible migration path via feature flagging.
