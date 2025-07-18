# ECG Player XState Refactoring Guide

XState quick start guide is available ([here](https://stately.ai/docs/quick-start#create-an-actor-and-send-events)).

## Key Files in Refactor

- `assets/js/hooks/ecg/ecg_player.js` - Original implementation (28k+ tokens)
- `assets/js/hooks/ecg/ecg_player_v2.js` - XState refactored version (partial)
- `assets/js/hooks/ecg/ecg_player_machine.js` - State machine definition
- `lib/astrup_web/components/ecg_player.ex` - Phoenix LiveView component

## Core Patterns

### State Machine Structure

```javascript
// Parallel states for different concerns
playbook: loading → idle → playing/paused → error
calipers: disabled ↔ enabled → idle/drawing/placed
display: single ↔ multi + lead navigation
fullscreen: off ↔ on
```

### Action Binding Pattern

```javascript
this.actor = createActor(
  ecgPlayerMachine.provide({
    actions: {
      setupLiveViewListeners: this.setupLiveViewListeners.bind(this),
      calculateDimensions: this.calculateDimensions.bind(this),
      // ... bind all side effects
    },
  })
);
```

### Event Communication

```javascript
// Replace direct calls with events
this.actor.send({ type: "CHANGE_LEAD", leadIndex });
this.actor.send({ type: "DATA_LOADED", data: processedData });
```

### Guard Pattern

```javascript
guards: {
  canGoToPrevLead: ({ context }) => context.display.currentLead > 0,
  canGoToNextLead: ({ context }) => /* bounds check */
}
```

## Next

1. Add coordinate transformation utilities - Convert ECG data (time/amplitude) to canvas pixels
2. Implement basic waveform rendering - Draw ECG signal lines on canvas for single lead
3. Add waveform clearing functionality - Clear canvas between renders
4. Implement cursor rendering - Show playback position indicator
5. Add basic animation loop - Real-time ECG playback with proper medical timing
6. Integrate rendering actions into state machine - Connect rendering to XState actions
7. Add play/pause functionality - Implement playback controls via state machine events
8. Test waveform rendering - Validate with sample ECG data
