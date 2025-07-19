import { setup, assign, fromCallback } from "xstate";

export const ecgPlayerMachine = setup({
  guards: {
    canGoToPrevLead: ({ context }) => {
      return context.display.currentLead > 0;
    },
    canGoToNextLead: ({ context }) => {
      return (
        context.ecgData &&
        context.ecgData.leadNames &&
        context.display.currentLead < context.ecgData.leadNames.length - 1
      );
    },
  },
  actions: {
    setEcgData: assign({
      ecgData: ({ event }) => event.data,
    }),
    setError: assign({ error: ({ event }) => event.message }),
    clearError: assign({ error: () => null }),
    setCurrentLead: assign({
      display: ({ context, event }) => ({
        ...context.display,
        index: event.index,
      }),
    }),
    setPrevLead: assign({
      display: ({ context }) => ({
        ...context.display,
        currentLead: context.display.currentLead - 1,
      }),
    }),
    setNextLead: assign({
      display: ({ context }) => ({
        ...context.display,
        currentLead: context.display.currentLead + 1,
      }),
    }),
    setDisplayMode: assign({
      display: ({ context, event }) => ({
        ...context.display,
        displayMode: event.displayMode,
      }),
    }),
    setGridType: assign({
      display: ({ context, event }) => ({
        ...context.display,
        gridType: event.gridType,
      }),
    }),
    toggleLoop: assign({
      playback: ({ context }) => ({
        ...context.playback,
        loopEnabled: !context.playback.loopEnabled,
      }),
    }),
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
          entry: ["setupLiveViewListeners", "setupEventListeners"],
          on: {
            DATA_LOADED: {
              target: "paused",
              actions: "setEcgData",
            },
            ERROR: {
              target: "error",
              actions: "setError",
            },
          },
          exit: [
            "calculateDimensions",
            "initializeCanvases",
            "initializeThemeColors",
            "renderGridBackground",
          ],
        },
        playing: {
          entry: ["setButtonToPause"],
          invoke: {
            src: "animationActor",
            id: "animationActor",
          },
          on: {
            TICK: {
              actions: [],
            },
            TOGGLE_PLAY_PAUSE: {
              target: "paused",
            },
            STOP: {
              target: "paused",
            },
          },
        },
        paused: {
          entry: ["setButtonToPlay"],
          on: {
            TOGGLE_PLAY_PAUSE: {
              target: "playing",
            },
            STOP: {
              target: "paused",
            },
          },
        },
        error: {
          on: {
            RETRY: "loading",
            DATA_LOADED: {
              target: "paused",
              actions: ["clearError"],
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
        PREV_LEAD: {
          guard: "canGoToPrevLead",
          actions: ["setPrevLead", "onLeadChanged"],
        },
        NEXT_LEAD: {
          guard: "canGoToNextLead",
          actions: ["setNextLead", "onLeadChanged"],
        },
        CHANGE_LEAD: {
          actions: ["setCurrentLead", "onLeadChanged"],
        },
        CHANGE_DISPLAY_MODE: {
          actions: "setDisplayMode",
        },
        CHANGE_GRID_TYPE: {
          actions: "setGridType",
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
