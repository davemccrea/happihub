# MobX Architecture in ECG Player

This document explains how MobX works within the context of the ECG player application, providing a comprehensive guide to the reactive state management architecture.

## MobX Overview in This App

MobX is a reactive state management library that automatically tracks dependencies and updates the UI when state changes. In this ECG player, it's used to manage complex animation state, user interactions, and canvas rendering.

## Core MobX Concepts Used

### 1. Observable State (`ECGStore.js`)

The `ECGStore` class contains all the observable state:

```javascript
class ECGStore {
  // These properties are automatically observable
  isPlaying = false;
  displayMode = "single";
  currentLead = 0;
  gridScale = 1.0;
  leadNames = [];
  // ... many more state properties

  constructor(renderer = null) {
    makeAutoObservable(this, {
      // Explicitly mark methods as actions
      togglePlayback: action,
      setGridScale: action,
      switchLead: action,
      // ... etc
    });
  }
}
```

### 2. Actions (State Modifiers)

Actions are methods that modify state. MobX tracks when these run:

```javascript
togglePlayback() {
  const newPlayingState = !this.isPlaying;
  this.isPlaying = newPlayingState; // MobX detects this change
  
  if (!newPlayingState) {
    this.pausedTime = Date.now(); // This change is also tracked
  } else {
    // ... more state updates
  }
}

setGridScale(newScale) {
  this.gridScale = newScale; // MobX will notify all dependent reactions
}
```

### 3. Reactions (Side Effects)

Reactions automatically run when their dependencies change. The ECG player uses them extensively:

```javascript
// In ecg_player.js - setupReactions()

// This reaction runs whenever gridScale, displayMode, or heightScale changes
reaction(
  () => ({
    gridScale: this.store.gridScale,      // Dependencies
    displayMode: this.store.displayMode,
    heightScale: this.store.heightScale,
  }),
  () => {
    // This runs automatically when any dependency changes
    this.store.withCanvasStatePreservation(() => {
      this.renderer.recreateCanvas();
      this.renderer.renderGridBackground();
    });
  }
);

// This runs when isPlaying changes
reaction(
  () => this.store.isPlaying,  // Dependency
  (isPlaying) => {
    if (isPlaying) {
      this.startAnimationLoop();  // Start animation
    } else {
      this.stopAnimation();       // Stop animation
    }
  }
);
```

### 4. Computed Values (Derived State)

Computed values are automatically recalculated when their dependencies change:

```javascript
// In ECGStore.js
get playbackProgress() {
  if (!this.startTime || !this.totalDuration) return 0;
  const elapsed = this.isPlaying 
    ? (Date.now() - this.startTime) / 1000
    : (this.pausedTime - this.startTime) / 1000;
  return Math.min(elapsed / this.totalDuration, 1);
}

get currentLeadName() {
  return this.hasValidLead ? this.leadNames[this.currentLead] : 'Unknown';
}
```

### 5. Autorun for UI Updates

In `UIBinder.js`, autorun is used to automatically update DOM elements:

```javascript
// Automatically update play/pause button when playing state changes
this.disposers.push(
  autorun(() => {
    this.updatePlayPauseButton(); // Runs whenever this.store.isPlaying changes
  })
);

// Automatically sync lead selector with current lead
this.disposers.push(
  autorun(() => {
    const leadSelector = document.getElementById("lead-selector");
    if (leadSelector && this.store.hasValidLead) {
      leadSelector.value = this.store.currentLead.toString();
    }
  })
);
```

## Real-World Example: User Changes Grid Scale

Let's trace what happens when a user moves the grid scale slider:

1. **User interaction** - Slider input event:
   ```javascript
   // In UIBinder.js
   this.setupElementListener("grid-scale-slider", "input", (e) => {
     this.store.setGridScale(parseFloat(e.target.value)); // Action called
   });
   ```

2. **Action modifies state**:
   ```javascript
   // In ECGStore.js
   setGridScale(newScale) {
     this.gridScale = newScale; // MobX detects this change
   }
   ```

3. **MobX automatically triggers reactions** that depend on `gridScale`:
   ```javascript
   // This reaction runs because gridScale changed
   reaction(
     () => ({ gridScale: this.store.gridScale, ... }),
     () => {
       // Canvas needs to be recreated with new scale
       this.store.withCanvasStatePreservation(() => {
         this.renderer.recreateCanvas();
         this.renderer.renderGridBackground();
       });
     }
   );
   ```

4. **UI updates automatically**:
   ```javascript
   // This autorun updates the scale display
   autorun(() => {
     const gridScaleValue = document.getElementById("grid-scale-value");
     if (gridScaleValue) {
       gridScaleValue.textContent = `${this.store.gridScale.toFixed(2)}x`;
     }
   });
   ```

## Key Benefits in This ECG Player

### 1. **Automatic Dependency Tracking**
MobX automatically figures out what depends on what. You don't need to manually specify that "when gridScale changes, update the canvas and the UI display".

### 2. **Efficient Updates**
Only the reactions that actually depend on changed state will run. If `gridScale` changes, reactions watching `isPlaying` won't run unnecessarily.

### 3. **Declarative Side Effects**
Instead of imperatively calling update functions everywhere, you declare what should happen when state changes:

```javascript
// Instead of calling these manually everywhere gridType changes:
// this.renderer.renderGridBackground();
// this.updateGridTypeSelector();

// You declare the relationship once:
reaction(
  () => this.store.gridType,
  () => this.renderer.renderGridBackground()
);

autorun(() => {
  const selector = document.getElementById("grid-type-selector");
  if (selector) selector.value = this.store.gridType;
});
```

### 4. **Complex State Coordination**
The ECG player has complex interdependencies (playback state, canvas rendering, UI controls, data loading). MobX coordinates all of this automatically.

For example, when `isPlaying` changes:
- Animation loop starts/stops
- Play button icon updates  
- Pause time is recorded
- Canvas rendering behavior changes

All of this happens through separate reactions, keeping the code modular.

## Architecture Flow

```
User Interaction → Action → Observable State Change → Reactions → Side Effects
                                                   → Computed Values
                                                   → Autorun (UI Updates)
```

This creates a unidirectional data flow where:
1. User actions modify state through action methods
2. MobX automatically propagates changes to all dependent reactions
3. Reactions handle side effects (canvas rendering, animation control)
4. UI automatically stays in sync through autorun

The result is that the complex ECG player state stays consistent and the UI is always up-to-date, without manual coordination between different parts of the system.

## Component Architecture

### File Structure and Responsibilities

- **`ECGStore.js`** - Central observable state container
  - Contains all state properties (isPlaying, currentLead, gridScale, etc.)
  - Defines actions for state modifications
  - Provides computed values for derived state
  
- **`ecg_player.js`** - Main coordinator and reaction setup
  - Sets up MobX reactions between store and components
  - Coordinates animation loop based on playback state
  - Handles Phoenix LiveView integration

- **`Renderer.js`** - Canvas rendering logic
  - Receives store reference for reading state
  - Called by reactions to update canvas when state changes
  - No direct state mutations (uses store actions)

- **`UIBinder.js`** - DOM interaction and UI synchronization
  - Uses autorun to keep UI elements synchronized with store state
  - Handles user input events by calling store actions
  - Manages event listeners and cleanup

- **`DataProcessor.js`** - ECG data processing
  - Processes incoming ECG data and updates store via actions
  - Handles data transformation and precomputation

- **`CaliperController.js`** - Caliper measurement functionality
  - Manages caliper state and interactions
  - Updates store through actions for caliper-related state

## Common Patterns Used

### 1. State Preservation During Canvas Operations

```javascript
withCanvasStatePreservation(operation) {
  const wasPlaying = this.isPlaying;
  if (wasPlaying) this.isPlaying = false; // Pause
  
  operation(); // Perform canvas operation
  
  if (!wasPlaying && this.startTime && this.pausedTime) {
    this.renderCurrentFrame(); // Restore paused frame
  }
  if (wasPlaying) this.isPlaying = true; // Resume
}
```

### 2. Conditional Reactions

```javascript
reaction(
  () => this.store.amplitudeScale,
  () => {
    if (!this.store.isPlaying && this.store.startTime && this.store.pausedTime) {
      this.store.renderCurrentFrame(); // Only re-render if paused
    }
  }
);
```

### 3. Cleanup Management

```javascript
// In UIBinder.js
cleanup() {
  // Dispose of MobX autorun reactions
  if (this.disposers) {
    this.disposers.forEach(dispose => dispose());
    this.disposers = [];
  }
  // Remove event listeners
  this.eventListeners.forEach(({ target, type, handler }) => {
    target.removeEventListener(type, handler);
  });
}
```

This architecture provides a scalable, maintainable solution for managing the complex state interactions required by the ECG player's real-time animation and user interface requirements.