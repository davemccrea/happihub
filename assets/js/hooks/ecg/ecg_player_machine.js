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
    setEcgData: assign({
      ecgData: ({ event }) => event.data,
    }),
    setError: assign({
      error: ({ event }) => event.message,
    }),
    clearError: assign({
      error: () => null,
    }),
    updateGridType: assign({
      display: ({ context, event }) => ({
        ...context.display,
        gridType: event.gridType,
      }),
    }),
    updateDisplayMode: assign({
      display: ({ context, event }) => ({
        ...context.display,
        displayMode: event.mode,
      }),
    }),
    // Playback actions
    updateElapsedTime: assign({
      playback: ({ context, event }) => {
        if (!context.playback.startTime) return context.playback;

        const now = event.timestamp;
        const elapsedTime =
          (now - context.playback.startTime + context.playback.pausedTime) /
          1000;
        const cursorPosition = context.ecgData
          ? elapsedTime / context.ecgData.totalDuration
          : 0;

        return {
          ...context.playback,
          elapsedTime,
          cursorPosition,
          animationCycle: context.playback.animationCycle + 1,
        };
      },
    }),
    pausePlayback: assign({
      playback: ({ context }) => ({
        ...context.playback,
        pausedTime: context.playback.elapsedTime * 1000,
        startTime: null,
      }),
    }),
    resetPlayback: assign({
      playback: ({ context }) => ({
        ...context.playback,
        startTime: null,
        pausedTime: 0,
        elapsedTime: 0,
        cursorPosition: 0,
        animationCycle: 0,
        activeCursorData: null,
        allLeadsCursorData: null,
      }),
    }),
    setStartTime: assign({
      playback: ({ context }) => ({
        ...context.playback,
        startTime: performance.now() - context.playback.pausedTime,
      }),
    }),
    toggleLoop: assign({
      playback: ({ context }) => ({
        ...context.playback,
        loopEnabled: !context.playback.loopEnabled,
      }),
    }),
    // Display actions
    changeLead: assign({
      display: ({ context, event }) => ({
        ...context.display,
        currentLead: event.lead,
      }),
    }),
    updateGridScale: assign({
      display: ({ context, event }) => ({
        ...context.display,
        gridScale: event.scale,
      }),
    }),
    updateAmplitudeScale: assign({
      display: ({ context, event }) => ({
        ...context.display,
        amplitudeScale: event.scale,
      }),
    }),
    updateHeightScale: assign({
      display: ({ context, event }) => ({
        ...context.display,
        heightScale: event.scale,
      }),
    }),
    toggleQrsIndicator: assign({
      display: ({ context }) => ({
        ...context.display,
        qrsIndicatorEnabled: !context.display.qrsIndicatorEnabled,
      }),
    }),
    updateCanvasRefs: assign({
      rendering: ({ context, event }) => ({
        ...context.rendering,
        ...event.canvasRefs,
      }),
    }),
    // Calipers actions
    startDrawing: assign({
      calipers: ({ context, event }) => ({
        ...context.calipers,
        isDragging: true,
        dragStartPoint: event.point,
        activeCaliper: {
          startPoint: event.point,
          endPoint: event.point,
          type: context.calipers.calipersType,
        },
      }),
    }),
    finishDrawing: assign({
      calipers: ({ context, event }) => {
        if (!context.calipers.activeCaliper) return context.calipers;

        const newCaliper = {
          ...context.calipers.activeCaliper,
          endPoint: event.point,
          id: `caliper_${Date.now()}`,
        };

        return {
          ...context.calipers,
          isDragging: false,
          dragStartPoint: null,
          activeCaliper: null,
          measurements: [...context.calipers.measurements, newCaliper],
        };
      },
    }),
    clearCalipers: assign({
      calipers: ({ context }) => ({
        ...context.calipers,
        measurements: [],
        activeCaliper: null,
        isDragging: false,
        dragStartPoint: null,
      }),
    }),
    // Grid rendering actions (implemented in hook)
    renderGridBackground: () => {},
    initializeThemeColors: () => {},
  },
  actors: {
    animationActor,
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5RgMZQAoBsCGBPMATgHQAOOuARtigNYDEAKgPIDiLAMgKID67TT6ANoAGALqJQJAPawAlgBdZUgHYSQAD0QA2AKwAOIgCYtARgDsAZjPCThkwBYzegDQhciPWZ1FLevfa0zLWEdYQtDAF8I11QMckJScipaIkwpbAhZZSg6ABEAQQZ83iZ83M5ckXEkEGk5RRU1TQQTAE5Woh0LVpCnPWFDPUNhLVd3FuEAoi1WtuMLLXsLBbMomLQsPASyPGSaVPTM7LpOACVTplOqtTqFJVUa5raOrp6dPoGhkbHEWxmjPyGcKOCz2PStLRrcAbeLEHaUaj7WQQTBgOjodj5ACa1xqtwaD1AzXBBhMNjBjlCFn89h+LUMrW8rT0Dj04UmIxMFihsU2+DhSURRGRqLoAGVmEIxDcZHdGo9tBDOtZniMLDpFqM3L8TLqiAF-IZ7MMga1DKtotC4lsBbshfCsjkGABJADCAGlcZJZQSmjqpnYwSY9FphiYtP46bq-EYnOEdPYQg4TDoeTCbYk7SkHcd0PkAKpizhe2o++5+hAkohk1mUsI0qM6BNEYSTQaOELq0Np638zMI7PkR3iyUl-HlhUIHoWfVdSZfNpgqPPTqDcJmtk2Fk9vnbQXZ7AAV1gkHRmJx0rxZflRMQYLMRHC-T0oXsGocrSj9jJsbMZlaSwWFyIw7rC-Z7KQR4nhAI4CGO16Ehod6eI+gzCC+kzvvYn7ai0QEzkMASJt+Ayhq0oEZvCEGEAQUgEHQpycAwpwXtU3r1BOt4IIY7xEIyQEhAmrTdOYUZ2AYfQ8SMTbWECFF9lRQo0XReSFMUfBlBU8EcTeSEIPeqHPq+WE4eMuo9PqwZUsCL5DPJCQoNgmCyCQhCwEQmSwNgFCojBzBsFw3Cuvk7DOugZxitpcqIU8Zp8QyMxrssiyGFGLLCLOlifMsZiJuRlq8mBjnOa5BDuWAyjeb5jCsBwPDBaF4WnJFl7sdFFZzPFEIbssCzGlGXgdIylh2DYOj8Xo9nEMVLluUQFVVaerpcPkpxBSFYURVFvqTrqZh0kaZiGI+4ZaEBhjDCCqYFemfYzaV5WVT5kDCiiaISqtDDcLkpz5AA6s6AByLDbZxenfiY+pBBqR3hiaLi4Ydx1AVoZ22JdljXesvYOU5s1lfNT2+R5BDYAA7sOABiQPOmKAAS32-QDwOg7pzQQ1DuiBHYoafAdPHHW+ZjhtYJGEVNRD3XNC3PRAmYoKeH2nF9P3-UDIOtaWOkxXeeqOFzsO84MB2ggYsxhMMEJ2Dxk03TjxCefCdCunT+TAzwK2VJr45s9ozYhrDdhBMITg6HSGozqHZ1hEGOjmhLjvkHQ+boAUDA8CwpzOrk3Big1xbewhFZo50JIRjYwQWGEdIBA+yw8W0R0x3HCeyLATsp2nPD5AAshizoMPm5S5-nrM6wgwTeECIStiEDLCRYdJWBlngAcIPRml0f72K37dJ53hQ8HTnDOiwdNfXnIUF2xWvtZOoaQyMiw6FyoJV7qB25fqxjmhGwa6kaXeTt-J1W4AARWatwIGuQ3SFEuGPYu4ZpjCz8GCd4Zp7C0lwuYB8rRLAODfEsCM1hIR213A7NuHdU6H3WoDAAavkMU3BGKUxajfH249QyR2NMGPBqN-BHTpCyVcrZ0aJVMIsIB5AiByGyKKEBgUYFigxNibgPcmDlAQbtf8+piFgmGKCEO4Y6ShyMNSP8bINRGkcFIvARAAC2h5MCKBqgFHgSiVFYjURo6+MptYdR0QaXKXxDHCy1OMSw9gfDmPXoyNoIZIhkLAgAMycZgWAKACBgAqkQKQyTkmuNAZTfM7B2B50YpwQGWiuLhgyqEWe5gQ7MgDp-fQPgZiLGEmCF8+VsbkKIKkzA6TMnZOULk5QhTArFNKeUzglTql6VqZ0WeNhrD-j8IET+6EjAdMCF0MkwsLSWmUFICAcA1CFRtH4u+XEAC05o6S3KZP+dory3ntAtH0sCilaDXJ2lxBkdJGQdDmLPP+CZdASx+fsNIGRHR-LBs0P8UZ0KPyWKEJwotdTciSZRfcSI3oIt9hPXiPC-y6lMEQ0yvxrbxRTE4Wwb9SFfLxVmfYOYoBEvHgc7wli3jMlRomVK2DBgdHwY4YSxhgwBChfiyCx5IBcorH1aY4RMWiuWHgqMptqxBAum0cMOVPlWn6dC+aBBaIECVZOKwUTSI2FmKCNGmCxLmkfMLfQ699Co2NZcu6eMHrWoBSYKM3NMpLASWddoiSWX+pKnNTyi0IBBr0oI7BQQtAtkTLoLkvDgwxpNUVAN0siaKqvP4++1LuLhiicNdsOa4621jbjeNBMZbExFGAFNzQgLeCCPxRwbIgjCwOthPtkrzDmlGuGCWUs22lrlhAUmFNsjdu0GEXVEIhgMlBOaMOiNqQGAWJqnp411SzuLfOpN8sy1tX+XpKuM4rGhAAtYPBLrEaDEhi-awbJugwyxoWjMic8Bru4lWxYD4gSeDyoNYIBa-UJBA7gGRjpURgeRbhXKK8LroXVEGEMO9cV9mQw4pxigwPGkzcEYSZo9X0oTCYpYqFhiWII5I4jCRBnDKyRVMDRoDq83aXgl8yYf04ubcQbjGTeNjLyckjDwrxjmgcI+OOHy2SJgWBLaTIycm6Q4cqmM7x+hdPEnDT+SCXzzzjFp0hUQgA */
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
      gridType: input.gridType,
      displayMode: input.displayMode,
      currentLead: input.currentLead,
      gridScale: input.gridScale,
      amplitudeScale: 1,
      heightScale: input.heightScale,
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
          on: {
            DATA_LOADED: {
              target: "idle",
              actions: "setEcgData",
            },
            ERROR: {
              target: "error",
              actions: "setError",
            },
          },
          exit: [
            "initializeCanvases",
            "initializeThemeColors",
            "renderGridBackground",
          ],
        },
        idle: {
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
              actions: ["clearError", "setEcgData"],
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
