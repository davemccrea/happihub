import { setup, assign, fromCallback } from "xstate";

// Animation actor for requestAnimationFrame loop
const animationActor = fromCallback(({ sendBack }) => {
  let animationId;

  function animate() {
    const now = performance.now();
    sendBack({ type: "TICK", timestamp: now });
    animationId = requestAnimationFrame(animate);
  }

  animationId = requestAnimationFrame(animate);

  return () => {
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
  };
});

export const ecgPlayerMachine = setup({
  events: {
    DATA_LOADED: { data: {} },
    PLAY: {},
    PAUSE: {},
    STOP: {},
    TOGGLE_LOOP: {},
    TICK: { timestamp: 0 },
    TOGGLE_CALIPERS: {},
    TOGGLE_DISPLAY_MODE: {},
    TOGGLE_FULLSCREEN: {},
    START_DRAWING: { point: {} },
    FINISH_DRAWING: { point: {} },
    CLEAR_CALIPERS: {},
    CHANGE_LEAD: { lead: 0 },
    UPDATE_GRID_SCALE: { scale: 1 },
    UPDATE_AMPLITUDE_SCALE: { scale: 1 },
    UPDATE_HEIGHT_SCALE: { scale: 1 },
    TOGGLE_QRS_INDICATOR: {},
    UPDATE_CANVAS_REFS: { canvasRefs: {} },
    ERROR: { message: "" },
    RETRY: {},
  },
  actions: {
    initializeECGData: assign({
      ecgData: ({ event }) => {
        if (event.type === "DATA_LOADED") {
          console.log(event.data);
          return event.data;
        }
        return null;
      },
    }),
    setError: assign({
      error: ({ event }) => {
        if (event.type === "ERROR") {
          return event.message;
        }
        return null;
      },
    }),
    clearError: assign({
      error: () => null,
    }),
    updateGridType: assign({
      display: ({ context, event }) => {
        if (event.type === "UPDATE_GRID_TYPE") {
          return {
            ...context.display,
            gridType: event.gridType,
          };
        }
        return context.display;
      },
    }),
    updateDisplayMode: assign({
      display: ({ context, event }) => {
        if (event.type === "UPDATE_DISPLAY_MODE") {
          return {
            ...context.display,
            displayMode: event.mode,
          };
        }
        return context.display;
      },
    }),
  },
  actors: {
    animationActor,
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5RgMZQAoBsCGBPMATgHQAOOuARtigNYDEAKgPIDiLAMgKID67TT6ANoAGALqJQJAPawAlgBdZUgHYSQAD0QB2AIwA2IgA4ArACYAzHuPDjO03q3GANCFyJDWgJxEALOePG-o6epqaeAL7hLqgY5ISk5FS0RJhS2BCyylB0ACIAggx5vEx5OZw5IuJIINJyiipqmgimOlpEwp6Ghp2BxoY+wlYubgg6g23mYT5ak2GOenqR0WhYePFkeEk0KWkZWXScAEqHTIeVarUKSqrVTS1tHV09-v2Dzq6Idj6mRMZaDoYdEFTD5+ktwCs4sQNpRqNtZBBMGA6Oh2HkAJrnaqXeo3UBNTyBIz6Ww6AJaLTCVrDT6mClELT9YyeMZecwmcExVb4aGJOFEBFIugAZWYQjEFxkVwat3cC18zP0WlMhnZnksNNGwlB7VCwhmIUshlMxk5kLWvM2-JhmWyDAAkgBhADSWMkUtxjVpPh8RABnj0IXspMMmqBemERDJ0cJKsmESiENiFoSVuSNv26DyAFVhZw3TUPdcvQhCeZiVYdGS-pTqR9RnpzJGPGMfHodJ5PD7jItE1yoanYenyLaRWKCzji7LSxGiCCyZ59cqydqw-pfeZF399DZzGStGbkzzB1tSNgAK6wSAotGYiXYosy-GIHvloHa8zmAZmFnmMPTQw-QNKxOmVMxDEPbl1j5dMLyvCAxwECdHzxDQX0bKMmz8L8bDCIEw0sYw50MYRhA8Nt-EggcYVPQgCCkAg6EOTgGEOO8qndOop2fZpOgZf5dBmYRQgpP96yrfoiH8dkST+PoVSolMaP5OiGNyAoij4UpymQrinzQhBX0wj8cJ-fDxJabwzD0HwvhZRtzEU48UGwTBZBIQhYCIDJYGwCgkQQ5g2C4bhHTydh7XQI5hV06VULuOwo2VPQuirVt+lMMMWR0IhQMDVpbL8IEnPiFy3I8ggvLAZQ-ICxhWA4HgwoiqLDhi+9OLiksWh+Vp7FSqttQysMTHLf5QX9UwyIsEriDK9zPKIarauvR0uDyQ5QvCyLotiz1pyrLRNXsKajD6P4Ix7YxQR8WaiHmiqqpq-zIAFRFkVFDaGG4HJDjyAB1e0ADkWD27iDLbHKzCpTxdC6ACA2OvRTpMEx-hsKwbruh7FuWl6IG8ghsAAd1HAAxYH7WFAAJH6-sBkGwf0ppId+KaOzh-pGUR+sLHbBkxmZWGOlhzpsdchbKqW56AtTFBr0+w5vt+gHgdBjrCz0+LEFZ6GOZ0eHub0Y7piI1t2xZV4fATZYj3iHyYToR1qbyEGeHWioNcnZntCBOdGU3Wz9H6TpNV6dpCS8SlAmmWy7od8g6GzdB8gYHgWEOe0cm4YVmvzL2UJLFKiM-VpocDa2Qk1b4ctrfoSOu1949kWBHeT1OeDyABZVF7QYbMyhzvOme1hArHLFLQWNSYyK+TUm0Aptua3K6O2b1vE-bgoeGpzh7RYanvtz8L844zWuunBwfkDGYuj+aYmx0LLfV-QlSJ7LQBn+dfHaCxruAAIptW4MDHIToCinBHkXBwvgWifgciRJkmpARs1IlSGwjIwiNh-uQIgcgshCj-iFMBwpUQYm4F3JgZQoEHUJO0MigQ6SGErC0d4IxGQ5R6roDsjwvA2yTFBYgCc8BEAALbnkwIoeqwUeAkLIeiChVDT6Si1iWDsRFSKjSYSwskmplQ-E6LDaYg0Wg+FNH2c0x4ABmEjMCwBQAQMA1UiBSCsVY6R-8ybZnYOwXOzFOBAxoTxVo5YLAUkpKqFK+ijq83VDlWGZhWHPFuhYu2xAbGYDsQ4pxygXHKA8SFLxPi-GcACUEgyIS5zmHCWRI00TjoeDGokj+nRmEcnBMoKQEA4BqH7BaFRF8eIAFo6SaiGURUWhi2yRy-O2O6ylaADP2jxMImoAyRkScJKkMwY6OVSYIk8-JUjpFtEs8GTQKRhhNG0EwCxhIzBaHYCC+zqIwXhO9M5PsECAlCXSMYdIuzfFWRZFKuUdC2Smn4TBB4XlKTeYOU5D5VEHR3FGY01tKwxhiSMcFjJfhmMCIuYSm5nm2wOQs7YJA4KQE+aPIFRg-AhE7D0KwPYww2UAlYfU7ZmH7j2WS15aZtiqQILSks2EFR0m+IyRwJofRXIwl4A27JcLdFMOLcqnkxXThaGGf4BhgzjGEPGcFKSBUphxlLHyK0IDap4sqEa-MgSBHZC6my2oNWSyejau1BlAzHSlXOQWZjCSdD3OY81zkJaPWljat6SJfVNH8DlJ5FhnV9DsAEJGOpAVjE-OqRwnqY141lhAImpMsiJsQClAwCwmysLMEqY2vNG1GFrGSPUbZeyRtKtG3GMtXobHlrapFgyDLwNyp-Y1jYIxUn6MdTctaFjIwktqZkEaBEDmESMTqyyDLApGI2IioIElWGNICcFOCRH4KgAm0de6LnYu0E2KSEZ5wgi-CEK9uAxESMUFWhAE0GQdEIlskwgw9GTCMG+iFfhrbqthdY2x9jHHVQAyCY6jIDVmAJeqYW+o7oZKyah3JrirEAYdbzVKUZQj9BPYuMJhHkPZOcfpb2dLvjtEScq+w1TKQ+AaaqP0IlrDqlMb2SIQA */
  id: "ecgPlayer",
  type: "parallel",
  context: ({ input }) => ({
    ecgData: null,
    playback: {
      startTime: null,
      pausedTime: 0,
      loopEnabled: false,
      elapsedTime: 0,
      animationCycle: 0,
      cursorPosition: 0,
      activeCursorData: null,
      allLeadsCursorData: null,
    },
    display: {
      gridType: input?.gridType || "telemetry",
      displayMode: input?.displayMode || "single",
      currentLead: input?.currentLead || 0,
      gridScale: input?.gridScale || 1,
      amplitudeScale: 1,
      heightScale: input?.heightScale || 1,
      qrsIndicatorEnabled: true,
      cursorWidth: 20,
      leadHeight: 150,
      qrsFlashActive: false,
      qrsFlashTimeout: null,
      qrsFlashDuration: 100,
    },
    calipers: {
      enabled: input?.calipersEnabled || false,
      measurements: [],
      activeCaliper: null,
      calipersType: "time",
      isDragging: false,
      dragStartPoint: null,
    },
    rendering: {
      backgroundCanvas: null,
      backgroundContext: null,
      waveformCanvas: null,
      waveformContext: null,
      qrsFlashCanvas: null,
      qrsFlashContext: null,
      calipersCanvas: null,
      calipersContext: null,
    },
    error: null,
  }),
  states: {
    playback: {
      initial: "loading",
      states: {
        loading: {
          entry: ["setupLiveViewListeners"],
          on: {
            DATA_LOADED: {
              target: "idle",
              actions: "initializeECGData",
            },
            ERROR: {
              target: "error",
              actions: "setError",
            },
          },
        },
        idle: {
          entry: "initializeCanvases",
          on: {
            PLAY: "playing",
            STOP: {
              target: "idle",
              actions: "resetPlayback",
            },
          },
        },
        playing: {
          invoke: {
            src: "animationActor",
            id: "animationActor",
          },
          on: {
            TICK: {
              actions: ["updateElapsedTime"],
            },
            PAUSE: {
              target: "paused",
              actions: "pausePlayback",
            },
            STOP: {
              target: "idle",
              actions: "resetPlayback",
            },
          },
        },
        paused: {
          on: {
            PLAY: {
              target: "playing",
              actions: "setStartTime",
            },
            STOP: {
              target: "idle",
              actions: "resetPlayback",
            },
          },
        },
        error: {
          on: {
            RETRY: "loading",
            DATA_LOADED: {
              target: "idle",
              actions: ["clearError", "initializeECGData"],
            },
          },
        },
      },
      on: {
        TOGGLE_LOOP: {
          actions: "toggleLoop",
        },
      },
    },
    calipers: {
      initial: "disabled",
      states: {
        disabled: {
          on: {
            TOGGLE_CALIPERS: "enabled",
          },
        },
        enabled: {
          initial: "idle",
          states: {
            idle: {
              on: {
                START_DRAWING: {
                  target: "drawing",
                  actions: "startDrawing",
                },
              },
            },
            drawing: {
              on: {
                FINISH_DRAWING: {
                  target: "placed",
                  actions: "finishDrawing",
                },
              },
            },
            placed: {
              on: {
                START_DRAWING: {
                  target: "drawing",
                  actions: ["clearCalipers", "startDrawing"],
                },
              },
            },
          },
          on: {
            TOGGLE_CALIPERS: "disabled",
            CLEAR_CALIPERS: {
              target: ".idle",
              actions: "clearCalipers",
            },
          },
        },
      },
    },
    display: {
      initial: "single",
      states: {
        single: {
          on: {
            TOGGLE_DISPLAY_MODE: "multi",
          },
        },
        multi: {
          on: {
            TOGGLE_DISPLAY_MODE: "single",
          },
        },
      },
      on: {
        CHANGE_LEAD: {
          actions: "changeLead",
        },
        UPDATE_GRID_SCALE: {
          actions: "updateGridScale",
        },
        UPDATE_AMPLITUDE_SCALE: {
          actions: "updateAmplitudeScale",
        },
        UPDATE_HEIGHT_SCALE: {
          actions: "updateHeightScale",
        },
        TOGGLE_QRS_INDICATOR: {
          actions: "toggleQrsIndicator",
        },
        UPDATE_CANVAS_REFS: {
          actions: "updateCanvasRefs",
        },
      },
    },
    fullscreen: {
      initial: "off",
      states: {
        off: {
          on: {
            TOGGLE_FULLSCREEN: "on",
          },
        },
        on: {
          on: {
            TOGGLE_FULLSCREEN: "off",
          },
        },
      },
    },
  },
});
