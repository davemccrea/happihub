// @ts-check

import {
  fromEvent,
  Observable,
  BehaviorSubject,
  Subject,
  Subscription,
  debounceTime,
  filter,
  map,
  catchError,
  EMPTY,
  merge,
  switchMap,
  animationFrames,
  scan,
  pairwise,
  takeWhile,
  takeUntil,
  distinctUntilChanged,
  tap,
  take,
  // @ts-ignore
} from "rxjs";

const MM_PER_SECOND = 25;
const MM_PER_MILLIVOLT = 10;
const PIXELS_PER_MM = 6;
const HEIGHT_MILLIVOLTS = 2.5;
const CHART_HEIGHT = HEIGHT_MILLIVOLTS * MM_PER_MILLIVOLT * PIXELS_PER_MM;
const WAVEFORM_LINE_WIDTH = 1.3;
const DOT_RADIUS = 1.2;

const COLUMNS_PER_DISPLAY = 4;
const ROWS_PER_DISPLAY = 3;
const COLUMN_PADDING = 0;
const ROW_PADDING = 0;

const SINGLE_LEAD_CURSOR_WIDTH = 20;
const MULTI_LEAD_CURSOR_WIDTH = 8;
const QRS_FLASH_DURATION_MS = 100;

const MULTI_LEAD_HEIGHT_SCALE = 0.8;
const SEGMENT_DURATION_SECONDS = 0.1;

export default {
  // ==========================
  // 1. LIFECYCLE & MAIN SETUP
  // ==========================

  /**
   * Component lifecycle method called when the hook is mounted to the DOM.
   * Initializes all reactive streams, event handlers, and ECG chart setup.
   * @returns {void}
   */
  mounted() {
    this.destroy$ = new Subject();
    this.subscriptions = new Subscription();

    this.initializeState();
    this.calculateMedicallyAccurateDimensions();
    this.updateThemeColors();
    this.initializeECGChart();

    this.setupMasterEventStream();

    this.handleEvent("load_ecg_data", (payload) =>
      this.handleECGDataLoaded(payload)
    );
    this.setupStateSubscriptions();
    this.setupAnimationStream();
    this.targetComponent = this.el.getAttribute("phx-target");
  },

  /**
   * Component lifecycle method called when the hook is destroyed.
   * Cleans up all subscriptions, timeouts, and canvas elements to prevent memory leaks.
   * @returns {void}
   */
  destroyed() {
    if (this.state$) {
      const { qrsFlashTimeout } = this.state$.value;
      if (qrsFlashTimeout) clearTimeout(qrsFlashTimeout);
    }

    if (this.destroy$) {
      this.destroy$.next();
      this.destroy$.complete();
    }

    if (this.subscriptions) {
      this.subscriptions.unsubscribe();
    }

    if (this.actions$) this.actions$.complete();
    if (this.state$) this.state$.complete();

    this.cleanupCanvases();
  },

  // =======================
  // 2. STATE MANAGEMENT
  // =======================

  /**
   * Initializes the component's reactive state using BehaviorSubject and sets up the reducer pattern.
   * Creates initial state with form values, display settings, and canvas references.
   * @returns {void}
   */
  initializeState() {
    const displayMode = this.readFormValue("display_mode") || "single";
    const heightScale = parseFloat(this.readFormValue("height_scale") || "1.2");
    const initialState = {
      isPlaying: false,
      activeSegments: [],
      startTime: null,
      pausedTime: 0,
      animationCycle: 0,
      cursorPosition: 0,
      activeCursorData: null,
      allLeadsCursorData: null,
      leadHeight: CHART_HEIGHT * heightScale,
      qrsFlashActive: false,
      qrsFlashTimeout: null,
      qrsFlashDuration: QRS_FLASH_DURATION_MS,
      precomputedSegments: new Map(),
      segmentDuration: SEGMENT_DURATION_SECONDS,
      dataIndexCache: new Map(),
      backgroundCanvas: null,
      backgroundContext: null,
      waveformCanvas: null,
      waveformContext: null,
      qrsFlashCanvas: null,
      qrsFlashContext: null,
      ecgLeadDatasets: [],
      leadNames: [],
      samplingRate: 0,
      totalDuration: 0,
      qrsIndexes: [],
      qrsTimestamps: [],
      lastQrsIndex: -1,
      qrsDetectedCount: 0,
      gridType: this.readFormValue("grid_type") || "telemetry",
      displayMode: displayMode,
      currentLead: parseInt(this.readFormValue("current_lead") || "0"),
      loopEnabled: this.readFormCheckbox("loop_playback"),
      qrsIndicatorEnabled: this.readFormCheckbox("qrs_indicator"),
      gridScale: parseFloat(this.readFormValue("grid_scale") || "1.0"),
      heightScale: heightScale,
      amplitudeScale: parseFloat(
        this.readFormValue("amplitude_scale") || "1.0"
      ),
      cursorWidth:
        displayMode === "single"
          ? SINGLE_LEAD_CURSOR_WIDTH
          : MULTI_LEAD_CURSOR_WIDTH,
      // Add missing essential properties
      chartWidth: 0,
      widthSeconds: 0,
      animationId: null,
    };

    this.actions$ = new Subject();
    this.state$ = new BehaviorSubject(initialState);
    this.actionSubscription = this.actions$
      .pipe(scan(this.reducer.bind(this), initialState))
      .subscribe(this.state$);
  },

  /**
   * Reducer function that handles state transitions based on dispatched actions.
   * Implements immutable state updates for ECG player controls and display settings.
   * @param {Object} state - Current state object
   * @param {Object} action - Action object with type and payload
   * @param {string} action.type - Action type identifier
   * @param {*} action.payload - Action payload data
   * @returns {Object} New state object
   */
  reducer(state, action) {
    switch (action.type) {
      case "SET_LEAD":
        return { ...state, currentLead: action.payload };

      case "SWITCH_TO_NEXT_LEAD": {
        if (!state.ecgLeadDatasets || state.ecgLeadDatasets.length === 0)
          return state;
        const nextLead = Math.min(
          state.currentLead + 1,
          state.ecgLeadDatasets.length - 1
        );
        return { ...state, currentLead: nextLead };
      }

      case "SWITCH_TO_PREV_LEAD": {
        if (!state.ecgLeadDatasets || state.ecgLeadDatasets.length === 0)
          return state;
        const prevLead = Math.max(state.currentLead - 1, 0);
        return { ...state, currentLead: prevLead };
      }

      case "SET_DISPLAY_MODE":
        return {
          ...state,
          displayMode: action.payload,
          cursorWidth:
            action.payload === "single"
              ? SINGLE_LEAD_CURSOR_WIDTH
              : MULTI_LEAD_CURSOR_WIDTH,
        };

      case "SET_DISPLAY_MODE_AND_LEAD":
        return {
          ...state,
          displayMode: action.payload.displayMode,
          currentLead: action.payload.leadIndex,
          cursorWidth: SINGLE_LEAD_CURSOR_WIDTH,
        };

      case "SET_GRID_TYPE":
        return { ...state, gridType: action.payload };

      case "SET_LOOP":
        return { ...state, loopEnabled: action.payload };

      case "SET_QRS_INDICATOR":
        return { ...state, qrsIndicatorEnabled: action.payload };

      case "SET_GRID_SCALE":
        return { ...state, gridScale: action.payload };

      case "SET_AMPLITUDE_SCALE":
        return { ...state, amplitudeScale: action.payload };

      case "SET_HEIGHT_SCALE":
        return {
          ...state,
          heightScale: action.payload,
          leadHeight: CHART_HEIGHT * action.payload,
        };

      case "SET_PLAYBACK_STATE":
        return { ...state, ...action.payload };

      case "SET_IS_PLAYING":
        return { ...state, isPlaying: action.payload };

      case "SET_ANIMATION_CYCLE":
        return { ...state, animationCycle: action.payload };

      case "SET_QRS_FLASH":
        return { ...state, ...action.payload };

      case "RESET_PLAYBACK":
        return { ...state, ...action.payload };

      case "SET_ECG_DATA":
        return { ...state, ...action.payload };

      case "SET_DIMENSIONS":
        return { ...state, ...action.payload };

      case "SET_CANVAS_REFS":
        return { ...state, ...action.payload };

      default:
        return state;
    }
  },

  // =============================
  // 2.5. DIMENSION CALCULATION
  // =============================

  /**
   * Calculates the chart's width in pixels based on standard medical units (mm/second).
   * This ensures the visualization is medically accurate and scales correctly with the container.
   * @returns {void}
   */
  calculateMedicallyAccurateDimensions() {
    const container = this.el.querySelector("[data-ecg-chart]");
    const currentState = this.state$.value;
    const DEFAULT_WIDTH_SECONDS = 2.5;
    const CONTAINER_PADDING = 0;
    
    if (!container) {
      const chartWidth = DEFAULT_WIDTH_SECONDS * MM_PER_SECOND * PIXELS_PER_MM * currentState.gridScale;
      const widthSeconds = DEFAULT_WIDTH_SECONDS;
      this.actions$.next({
        type: "SET_DIMENSIONS",
        payload: { chartWidth, widthSeconds }
      });
      return;
    }

    const containerWidth = container.offsetWidth - CONTAINER_PADDING;
    const scaledPixelsPerMm = PIXELS_PER_MM * currentState.gridScale;
    const minWidth = DEFAULT_WIDTH_SECONDS * MM_PER_SECOND * scaledPixelsPerMm;

    let chartWidth, widthSeconds;
    if (containerWidth < minWidth) {
      chartWidth = minWidth;
      widthSeconds = DEFAULT_WIDTH_SECONDS;
    } else {
      widthSeconds = containerWidth / (MM_PER_SECOND * scaledPixelsPerMm);
      chartWidth = widthSeconds * MM_PER_SECOND * scaledPixelsPerMm;
    }
    
    this.actions$.next({
      type: "SET_DIMENSIONS",
      payload: { chartWidth, widthSeconds }
    });
  },

  // =============================
  // 3. REACTIVE STREAM SETUP
  // =============================

  /**
   * Sets up reactive streams for state changes and their corresponding side effects.
   * Creates observables for display mode, lead changes, grid changes, scale changes, and QRS indicators.
   * Uses declarative effect handlers to manage UI updates and canvas rendering.
   * @returns {void}
   */
  setupStateSubscriptions() {
    const displayModeChanges$ = this.state$.pipe(
      map((state) => state.displayMode),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    );

    const leadChanges$ = this.state$.pipe(
      map((state) => state.currentLead),
      distinctUntilChanged(),
      switchMap(() => this.state$.pipe(take(1))),
      takeUntil(this.destroy$)
    );

    const gridChanges$ = this.state$.pipe(
      map((state) => ({
        gridType: state.gridType,
        gridScale: state.gridScale,
      })),
      distinctUntilChanged(
        (prev, curr) =>
          prev.gridType === curr.gridType && prev.gridScale === curr.gridScale
      ),
      pairwise(),
      takeUntil(this.destroy$)
    );

    const scaleChanges$ = this.state$.pipe(
      map((state) => ({
        amplitudeScale: state.amplitudeScale,
        heightScale: state.heightScale,
      })),
      distinctUntilChanged(
        (prev, curr) =>
          prev.amplitudeScale === curr.amplitudeScale &&
          prev.heightScale === curr.heightScale
      ),
      pairwise(),
      takeUntil(this.destroy$)
    );

    const qrsIndicatorChanges$ = this.state$.pipe(
      map((state) => ({
        qrsIndicatorEnabled: state.qrsIndicatorEnabled,
        qrsFlashActive: state.qrsFlashActive,
        qrsFlashTimeout: state.qrsFlashTimeout,
      })),
      pairwise(),
      filter(
        ([prev, curr]) =>
          prev.qrsIndicatorEnabled !== curr.qrsIndicatorEnabled &&
          !curr.qrsIndicatorEnabled &&
          curr.qrsFlashActive
      ),
      map(([prev, curr]) => curr),
      takeUntil(this.destroy$)
    );

    const playPauseChanges$ = this.state$.pipe(
      map((state) => state.isPlaying),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    );

    const displayModeEffectHandler$ = displayModeChanges$.pipe(
      switchMap(
        (displayMode) =>
          new Observable((subscriber) => {
            this.recreateCanvasAndRestart();
            this.updateCursorStyle();
            this.updateLeadSelectorVisibility(displayMode);
            this.updateDisplayModeSelector(displayMode);
            subscriber.complete();
          })
      )
    );

    const leadChangeEffectHandler$ = leadChanges$.pipe(
      switchMap(
        (state) =>
          new Observable((subscriber) => {
            this.handleCurrentLeadChange(state);
            subscriber.complete();
          })
      )
    );

    const gridChangeEffectHandler$ = gridChanges$.pipe(
      switchMap(
        ([prev, curr]) =>
          new Observable((subscriber) => {
            if (prev.gridType !== curr.gridType) {
              this.renderGridBackground();
            }
            if (prev.gridScale !== curr.gridScale) {
              this.updateGridScaleDisplay();
              this.handleGridScaleChange();
            }
            subscriber.complete();
          })
      )
    );

    const scaleChangeEffectHandler$ = scaleChanges$.pipe(
      switchMap(
        ([prev, curr]) =>
          new Observable((subscriber) => {
            if (prev.amplitudeScale !== curr.amplitudeScale) {
              this.updateAmplitudeScaleDisplay();
              this.handleAmplitudeScaleChange();
            }
            if (prev.heightScale !== curr.heightScale) {
              this.updateHeightScaleDisplay();
              this.handleHeightScaleChange();
            }
            subscriber.complete();
          })
      )
    );

    const qrsIndicatorEffectHandler$ = qrsIndicatorChanges$.pipe(
      switchMap(
        ({ qrsFlashTimeout }) =>
          new Observable((subscriber) => {
            if (qrsFlashTimeout) clearTimeout(qrsFlashTimeout);
            this.actions$.next({
              type: "SET_QRS_FLASH",
              payload: { qrsFlashActive: false, qrsFlashTimeout: null },
            });
            this.clearQrsFlashArea();
            subscriber.complete();
          })
      )
    );

    const playPauseEffectHandler$ = playPauseChanges$.pipe(
      switchMap(
        (isPlaying) =>
          new Observable((subscriber) => {
            this.updatePlayPauseButton(isPlaying);
            subscriber.complete();
          })
      )
    );

    const allEffects$ = merge(
      displayModeEffectHandler$,
      leadChangeEffectHandler$,
      gridChangeEffectHandler$,
      scaleChangeEffectHandler$,
      qrsIndicatorEffectHandler$,
      playPauseEffectHandler$
    ).pipe(
      catchError((error) => {
        console.error("State effect error:", error);
        return EMPTY;
      })
    );

    this.subscriptions.add(allEffects$.subscribe());
  },

  /**
   * Handles side effects when the current ECG lead changes.
   * Updates UI selectors, clears waveforms, and re-renders the display.
   * @param {Object} state - Current application state
   * @param {number} state.currentLead - The newly selected lead index
   * @param {string} state.displayMode - Current display mode ('single' or 'multi')
   * @param {boolean} state.isPlaying - Whether animation is currently playing
   * @param {Array} state.ecgLeadDatasets - ECG lead datasets
   * @param {number} state.startTime - Animation start timestamp
   * @param {number} state.pausedTime - Animation pause timestamp
   * @returns {void}
   */
  handleCurrentLeadChange(state) {
    if (!state.ecgLeadDatasets) return;
    const { isPlaying, startTime, pausedTime, displayMode, currentLead } =
      state;
    if (isPlaying)
      this.actions$.next({ type: "SET_IS_PLAYING", payload: false });

    const leadSelector = this.el.querySelector("#lead-selector");
    if (leadSelector) leadSelector.value = currentLead.toString();

    if (displayMode === "single") {
      this.clearWaveform();
      this.renderGridBackground();
    }

    if (isPlaying) {
      this.actions$.next({ type: "SET_IS_PLAYING", payload: true });
    } else if (startTime && pausedTime) {
      const elapsedSeconds = (pausedTime - startTime) / 1000;
      const model = this.getRenderModelForTime(elapsedSeconds);
      this.renderFrame(model);
    } else {
      this.clearWaveform();
    }
  },

  /**
   * Sets up reactive streams for animation frame processing and playback control.
   * Creates observables for playback state changes, animation frames, and completion events.
   * Handles declarative side effects for animation rendering and state transitions.
   * @returns {void}
   */
  setupAnimationStream() {
    const playbackStateChanges$ = this.state$.pipe(
      map((state) => ({
        isPlaying: state.isPlaying,
        startTime: state.startTime,
        pausedTime: state.pausedTime,
        totalDuration: state.totalDuration,
      })),
      distinctUntilChanged(
        (prev, curr) =>
          prev.isPlaying === curr.isPlaying &&
          prev.startTime === curr.startTime &&
          prev.pausedTime === curr.pausedTime
      ),
      takeUntil(this.destroy$)
    );

    const animationFrameData$ = playbackStateChanges$.pipe(
      switchMap(({ isPlaying, totalDuration }) => {
        if (!isPlaying) return EMPTY;

        return animationFrames().pipe(
          map(() => (Date.now() - this.state$.value.startTime) / 1000),
          takeWhile((elapsedTime) => elapsedTime < totalDuration, true),
          map((elapsedTime) => this.getRenderModelForTime(elapsedTime))
        );
      })
    );

    const animationCompletionEvents$ = animationFrameData$.pipe(
      takeWhile((model) => model.elapsedTime < model.totalDuration, false),
      filter((model) => model.elapsedTime >= model.totalDuration),
      take(1)
    );

    const playbackStateEffectHandler$ = playbackStateChanges$.pipe(
      switchMap(
        ({ isPlaying, startTime, pausedTime }) =>
          new Observable((subscriber) => {
            if (!isPlaying && startTime && !pausedTime) {
              const newPausedTime = Date.now();
              this.actions$.next({
                type: "SET_PLAYBACK_STATE",
                payload: { pausedTime: newPausedTime },
              });
              const elapsedSeconds = (newPausedTime - startTime) / 1000;
              const model = this.getRenderModelForTime(elapsedSeconds);
              this.renderFrame(model);
            } else if (isPlaying) {
              let newStartTime = startTime;
              if (pausedTime) {
                newStartTime = startTime + (Date.now() - pausedTime);
              } else if (!startTime) {
                newStartTime = Date.now();
              }
              this.actions$.next({
                type: "SET_PLAYBACK_STATE",
                payload: {
                  startTime: newStartTime,
                  pausedTime: 0,
                  isPlaying: true,
                },
              });
            }
            subscriber.complete();
          })
      )
    );

    const animationFrameEffectHandler$ = animationFrameData$.pipe(
      switchMap(
        (model) =>
          new Observable((subscriber) => {
            if (model.calculatedAnimationCycle !== model.animationCycle) {
              this.actions$.next({
                type: "SET_ANIMATION_CYCLE",
                payload: model.calculatedAnimationCycle,
              });
            }

            this.checkQrsOccurrences(model.elapsedTime);
            this.renderFrame(model);
            subscriber.complete();
          })
      )
    );

    const animationCompletionEffectHandler$ = animationCompletionEvents$.pipe(
      switchMap(
        () =>
          new Observable((subscriber) => {
            this.handlePlaybackEnd();
            subscriber.complete();
          })
      )
    );

    const allAnimationEffects$ = merge(
      playbackStateEffectHandler$,
      animationFrameEffectHandler$,
      animationCompletionEffectHandler$
    ).pipe(
      catchError((error) => {
        console.error("Animation effect error:", error);
        return EMPTY;
      })
    );

    this.subscriptions.add(allAnimationEffects$.subscribe());
  },

  /**
   * Sets up the master event stream that handles all user interactions and system events.
   * Combines resize events, theme changes, keyboard shortcuts, form inputs, and canvas clicks.
   * Uses a single subscription point for optimal performance and cleanup.
   * @returns {void}
   */
  setupMasterEventStream() {
    const resizeEvents$ = fromEvent(window, "resize").pipe(
      debounceTime(100),
      tap(() => {
        this.calculateMedicallyAccurateDimensions();
        this.recreateCanvasAndRestart();
      })
    );

    const themeChangeEvents$ = new Observable((subscriber) => {
      const observer = new MutationObserver((mutations) => {
        const themeChange = mutations.find(
          (mutation) =>
            mutation.type === "attributes" &&
            mutation.attributeName === "data-theme"
        );
        if (themeChange) subscriber.next();
      });
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-theme"],
      });
      return () => observer.disconnect();
    }).pipe(tap(() => this.handleThemeChange()));

    const keyActions = {
      j: { type: "SWITCH_TO_NEXT_LEAD" },
      ArrowDown: { type: "SWITCH_TO_NEXT_LEAD" },
      k: { type: "SWITCH_TO_PREV_LEAD" },
      ArrowUp: { type: "SWITCH_TO_PREV_LEAD" },
      " ": { type: "TOGGLE_PLAYBACK" },
    };

    const keyboardEvents$ = fromEvent(document, "keydown").pipe(
      filter((event) => {
        const target = event.target;
        return !(
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable
        );
      }),
      filter((event) => keyActions.hasOwnProperty(event.key)),
      map((event) => ({ event, action: keyActions[event.key] })),
      tap(({ event, action }) => {
        event.preventDefault();
        if (action.type === "TOGGLE_PLAYBACK") {
          this.togglePlayback();
        } else {
          this.actions$.next(action);
        }
      })
    );

    const uiEventToActionMap = [
      {
        id: "lead-selector",
        event: "change",
        action: (e) => ({
          type: "SET_LEAD",
          payload: parseInt(e.target.value),
        }),
      },
      {
        id: "display-mode-selector",
        event: "change",
        action: (e) => ({ type: "SET_DISPLAY_MODE", payload: e.target.value }),
      },
      {
        id: "grid-type-selector",
        event: "change",
        action: (e) => ({ type: "SET_GRID_TYPE", payload: e.target.value }),
      },
      {
        id: "loop-checkbox",
        event: "change",
        action: (e) => ({ type: "SET_LOOP", payload: e.target.checked }),
      },
      {
        id: "qrs-indicator-checkbox",
        event: "change",
        action: (e) => ({
          type: "SET_QRS_INDICATOR",
          payload: e.target.checked,
        }),
      },
      {
        id: "grid-scale-slider",
        event: "input",
        debounce: 100,
        action: (e) => ({
          type: "SET_GRID_SCALE",
          payload: parseFloat(e.target.value),
        }),
      },
      {
        id: "amplitude-scale-slider",
        event: "input",
        debounce: 100,
        action: (e) => ({
          type: "SET_AMPLITUDE_SCALE",
          payload: parseFloat(e.target.value),
        }),
      },
      {
        id: "height-scale-slider",
        event: "input",
        debounce: 100,
        action: (e) => ({
          type: "SET_HEIGHT_SCALE",
          payload: parseFloat(e.target.value),
        }),
      },
    ];

    const formEventStreams = uiEventToActionMap.map(
      ({ id, event, debounce: db, action }) => {
        const stream = this.createElementStream(id, event);
        const mappedStream = stream.pipe(map(action));
        return db ? mappedStream.pipe(debounceTime(db)) : mappedStream;
      }
    );

    const formEvents$ = merge(...formEventStreams).pipe(
      tap((action) => this.actions$.next(action))
    );

    const canvasClickEvents$ = (() => {
      const { backgroundCanvas } = this.state$.value;
      if (!backgroundCanvas) return EMPTY;

      return fromEvent(backgroundCanvas, "click").pipe(
        map((event) => {
          const rect = backgroundCanvas.getBoundingClientRect();
          return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
            displayMode: this.state$.value.displayMode,
          };
        }),
        map(({ x, y, displayMode }) => {
          if (displayMode === "multi") {
            const clickedLeadIndex = this.getLeadIndexFromClick(x, y);
            return clickedLeadIndex !== null
              ? {
                  type: "SET_DISPLAY_MODE_AND_LEAD",
                  payload: {
                    displayMode: "single",
                    leadIndex: clickedLeadIndex,
                  },
                }
              : { type: "NO_ACTION" };
          } else {
            return { type: "SET_DISPLAY_MODE", payload: "multi" };
          }
        }),
        filter((action) => action.type !== "NO_ACTION"),
        tap((action) => this.actions$.next(action))
      );
    })();

    const playPauseButtonEvents$ = this.createElementStream(
      "play-pause-button",
      "click"
    ).pipe(tap(() => this.togglePlayback()));

    const masterEventStream$ = merge(
      resizeEvents$,
      themeChangeEvents$,
      keyboardEvents$,
      formEvents$,
      canvasClickEvents$,
      playPauseButtonEvents$
    ).pipe(
      takeUntil(this.destroy$),
      catchError((error) => {
        console.error("Master event stream error:", error);
        return EMPTY;
      })
    );

    this.subscriptions.add(masterEventStream$.subscribe());
  },

  // =======================================
  // 4. DATA HANDLING & PRE-COMPUTATION
  // =======================================

  /**
   * Processes incoming ECG data from LiveView and sets up the player state.
   * Parses signal data, calculates timing, extracts QRS annotations, and pre-computes data segments.
   * @param {Object} payload - ECG data payload from LiveView
   * @param {Object} payload.data - The ECG data object
   * @param {number} payload.data.fs - Sampling frequency in Hz
   * @param {string[]} payload.data.sig_name - Array of lead names
   * @param {number[][]} payload.data.p_signal - 2D array of signal values [samples][leads]
   * @param {number[]} [payload.data.qrs] - Optional array of QRS peak indices
   * @returns {void}
   */
  handleECGDataLoaded(payload) {
    try {
      const data = payload.data;
      if (!data.fs || !data.sig_name || !data.p_signal) return;

      this.actions$.next({ type: "SET_IS_PLAYING", payload: false });
      this.resetPlayback();

      const samplingRate = data.fs;
      const leadNames = data.sig_name;
      const totalDuration = data.p_signal.length / samplingRate;
      const qrsIndexes = data.qrs || [];
      const qrsTimestamps = qrsIndexes.map((index) => index / samplingRate);

      const ecgLeadDatasets = leadNames.map((_, leadIndex) => {
        const times = data.p_signal.map(
          (_, sampleIndex) => sampleIndex / samplingRate
        );
        const values = data.p_signal.map((sample) => sample[leadIndex]);
        return { times, values };
      });

      this.actions$.next({
        type: "SET_ECG_DATA",
        payload: {
          samplingRate,
          leadNames,
          totalDuration,
          qrsIndexes,
          qrsTimestamps,
          ecgLeadDatasets,
        },
      });

      this.yMin = -HEIGHT_MILLIVOLTS / 2;
      this.yMax = HEIGHT_MILLIVOLTS / 2;

      this.precomputeDataSegments();
      this.renderGridBackground();
      this.clearWaveform();
      this.updatePlayPauseButton(false);
      this.updateLeadSelectorVisibility(this.state$.value.displayMode);
    } catch (error) {
      console.error("Error processing ECG data:", error);
    }
  },

  /**
   * Pre-computes ECG data into small time segments for optimal rendering performance.
   * Divides each lead's data into fixed-duration segments with relative timestamps.
   * @returns {void}
   */
  precomputeDataSegments() {
    const {
      precomputedSegments,
      segmentDuration,
      dataIndexCache,
      ecgLeadDatasets,
      totalDuration,
    } = this.state$.value;
    precomputedSegments.clear();
    dataIndexCache.clear();

    if (!ecgLeadDatasets || ecgLeadDatasets.length === 0) return;

    for (let leadIndex = 0; leadIndex < ecgLeadDatasets.length; leadIndex++) {
      const leadData = ecgLeadDatasets[leadIndex];
      const leadSegments = new Map();
      for (let time = 0; time < totalDuration; time += segmentDuration) {
        const segmentKey = Math.floor(time / segmentDuration);
        const startTime = segmentKey * segmentDuration;
        const endTime = Math.min(startTime + segmentDuration, totalDuration);
        const startIndex = this.calculateDataIndexForTime(leadData, startTime);
        const endIndex = this.calculateDataIndexForTime(leadData, endTime);

        if (endIndex >= startIndex && startIndex < leadData.times.length) {
          const times = leadData.times.slice(startIndex, endIndex + 1);
          const values = leadData.values.slice(startIndex, endIndex + 1);
          leadSegments.set(segmentKey, {
            times: times.map((t) => t - startTime),
            values: values,
            originalStartTime: startTime,
          });
        }
      }
      precomputedSegments.set(leadIndex, leadSegments);
    }
  },

  /**
   * Retrieves pre-computed data segments for a specific lead within a time range.
   * Used during rendering to efficiently access only the needed data points.
   * @param {number} leadIndex - Index of the ECG lead
   * @param {number} startTime - Start time in seconds
   * @param {number} endTime - End time in seconds
   * @returns {Array<Object>} Array of data segments with times and values
   */
  getSegmentsForTimeRange(leadIndex, startTime, endTime) {
    const { precomputedSegments, segmentDuration } = this.state$.value;
    const leadSegments = precomputedSegments.get(leadIndex);
    if (!leadSegments) return [];

    const startSegment = Math.floor(startTime / segmentDuration);
    const endSegment = Math.floor(endTime / segmentDuration);
    const segments = [];
    for (let i = startSegment; i <= endSegment; i++) {
      const segment = leadSegments.get(i);
      if (segment) segments.push(segment);
    }
    return segments;
  },

  // =================================
  // 5. PLAYBACK & ANIMATION LOGIC
  // =================================

  /**
   * Toggles ECG playback between playing and paused states.
   * Dispatches state change and notifies LiveView component.
   * @returns {void}
   */
  togglePlayback() {
    const newPlayingState = !this.state$.value.isPlaying;
    this.actions$.next({ type: "SET_IS_PLAYING", payload: newPlayingState });
  },

  /**
   * Handles actions when ECG playback reaches the end.
   * Either loops back to start if loop is enabled, or resets to beginning.
   * @returns {void}
   */
  handlePlaybackEnd() {
    if (this.state$.value.loopEnabled) {
      this.resetPlayback();
      this.actions$.next({ type: "SET_IS_PLAYING", payload: true });
    } else {
      this.resetPlayback();
    }
  },

  /**
   * Resets all playback-related state to initial values.
   * Clears timers, resets counters, and stops animation.
   * @returns {void}
   */
  resetPlayback() {
    this.actions$.next({ type: "SET_IS_PLAYING", payload: false });
    const { qrsFlashTimeout } = this.state$.value;
    if (qrsFlashTimeout) clearTimeout(qrsFlashTimeout);
    this.actions$.next({
      type: "RESET_PLAYBACK",
      payload: {
        isPlaying: false,
        startTime: null,
        pausedTime: 0,
        animationCycle: 0,
        lastQrsIndex: -1,
        qrsDetectedCount: 0,
        qrsFlashTimeout: null,
        qrsFlashActive: false,
      },
    });
    this.clearWaveform();
  },

  /**
   * Creates a render model containing all data needed to draw the current animation frame.
   * Calculates cursor position, retrieves waveform data, and determines display parameters.
   * @param {number} elapsedTime - Current playback time in seconds
   * @returns {Object} Render model with cursor position, waveform data, and display settings
   */
  getRenderModelForTime(elapsedTime) {
    const {
      displayMode,
      currentLead,
      heightScale,
      widthSeconds,
      totalDuration,
      ecgLeadDatasets,
      leadHeight,
      animationCycle,
    } = this.state$.value;
    const calculatedAnimationCycle = Math.floor(elapsedTime / widthSeconds);
    const cursorPosition = ((elapsedTime % widthSeconds) / widthSeconds) * chartWidth;

    let waveformData;
    if (displayMode === "single") {
      waveformData = this.getSingleLeadRenderData(elapsedTime);
    } else {
      waveformData = this.getMultiLeadRenderData(elapsedTime);
    }

    return {
      elapsedTime,
      cursorPosition,
      waveformData,
      displayMode,
      currentLead,
      heightScale,
      widthSeconds,
      totalDuration,
      leadHeight,
      calculatedAnimationCycle,
      animationCycle,
    };
  },

  /**
   * Renders a single animation frame using the provided render model.
   * Draws waveforms and cursor for either single-lead or multi-lead display modes.
   * @param {Object} model - Render model containing frame data
   * @param {Object|Array} model.waveformData - ECG waveform data to render
   * @param {number} model.cursorPosition - Cursor X position in pixels
   * @param {string} model.displayMode - Display mode ('single' or 'multi')
   * @param {number} model.currentLead - Current lead index
   * @param {number} model.heightScale - Height scaling factor
   * @param {number} model.widthSeconds - Display width in seconds
   * @param {number} model.leadHeight - Height of each lead in pixels
   * @returns {void}
   */
  renderFrame(model) {
    const {
      waveformData,
      cursorPosition,
      displayMode,
      currentLead,
      heightScale,
      widthSeconds,
      leadHeight,
      chartWidth,
    } = model;

    if (displayMode === "single") {
      if (!waveformData || waveformData.times.length === 0) return;
      this.renderLeadWaveform({
        leadIndex: currentLead,
        bounds: {
          xOffset: 0,
          yOffset: 0,
          width: chartWidth,
          height: CHART_HEIGHT * heightScale,
        },
        timeSpan: widthSeconds,
        cursorData: {
          ...waveformData,
          cursorPosition,
          cursorWidth: SINGLE_LEAD_CURSOR_WIDTH,
        },
      });
    } else {
      if (!waveformData || waveformData.length === 0) return;
      for (const leadData of waveformData) {
        const { xOffset, yOffset, columnWidth } =
          this.calculateLeadGridCoordinates(leadData.leadIndex);
        const columnTimeSpan = widthSeconds / COLUMNS_PER_DISPLAY;
        const columnProgress =
          (cursorPosition / chartWidth) * (widthSeconds / columnTimeSpan);
        const localCursorPosition =
          xOffset + (columnProgress % 1) * columnWidth;
        this.renderLeadWaveform({
          leadIndex: leadData.leadIndex,
          bounds: { xOffset, yOffset, width: columnWidth, height: leadHeight },
          timeSpan: columnTimeSpan,
          cursorData: {
            ...leadData,
            cursorPosition: localCursorPosition,
            cursorWidth: MULTI_LEAD_CURSOR_WIDTH,
          },
        });
      }
    }

    if (this.state$.value.qrsFlashActive) this.drawQrsFlashDot();
  },

  /**
   * Extracts ECG data for a single lead within the current display window.
   * Retrieves pre-computed segments and filters data points up to the current time.
   * @param {number} elapsedTime - Current playback time in seconds
   * @returns {Object} Object with times and values arrays for the current lead
   */
  getSingleLeadRenderData(elapsedTime) {
    const { currentLead, widthSeconds } = this.state$.value;
    const currentScreenStartTime =
      Math.floor(elapsedTime / widthSeconds) * widthSeconds;
    const segments = this.getSegmentsForTimeRange(
      currentLead,
      currentScreenStartTime,
      elapsedTime
    );
    const times = [];
    const values = [];

    for (const segment of segments) {
      for (let i = 0; i < segment.times.length; i++) {
        const absoluteTime = segment.originalStartTime + segment.times[i];
        if (
          absoluteTime >= currentScreenStartTime &&
          absoluteTime <= elapsedTime
        ) {
          times.push(absoluteTime - currentScreenStartTime);
          values.push(segment.values[i]);
        }
      }
    }
    return { times, values };
  },

  /**
   * Extracts ECG data for all leads within the current column time span.
   * Used in multi-lead display mode to show multiple leads simultaneously.
   * @param {number} elapsedTime - Current playback time in seconds
   * @returns {Array<Object>} Array of objects with leadIndex, times, and values for each lead
   */
  getMultiLeadRenderData(elapsedTime) {
    const { widthSeconds, ecgLeadDatasets } = this.state$.value;
    const columnTimeSpan = widthSeconds / COLUMNS_PER_DISPLAY;
    const columnCycleStart =
      Math.floor(elapsedTime / columnTimeSpan) * columnTimeSpan;
    const allLeadsRenderData = [];

    for (let leadIndex = 0; leadIndex < ecgLeadDatasets.length; leadIndex++) {
      const segments = this.getSegmentsForTimeRange(
        leadIndex,
        columnCycleStart,
        elapsedTime
      );
      const times = [];
      const values = [];

      for (const segment of segments) {
        for (let i = 0; i < segment.times.length; i++) {
          const absoluteTime = segment.originalStartTime + segment.times[i];
          if (absoluteTime >= columnCycleStart && absoluteTime <= elapsedTime) {
            times.push(absoluteTime - columnCycleStart);
            values.push(segment.values[i]);
          }
        }
      }
      allLeadsRenderData.push({ leadIndex, times, values });
    }
    return allLeadsRenderData;
  },

  // =================================
  // 6. RENDERING - CANVAS & GRID
  // =================================

  /**
   * Initializes the ECG chart by calculating dimensions and setting up canvases.
   * Creates the initial canvas elements and renders the background grid.
   * @returns {void}
   */
  initializeECGChart() {
    const currentState = this.state$.value;
    if (!currentState.widthSeconds) {
      this.calculateMedicallyAccurateDimensions();
    }
    this.recreateCanvas();
    this.renderGridBackground();
  },

  /**
   * Recreates all canvas elements with proper dimensions and device pixel ratio scaling.
   * Sets up layered canvases for background, waveform, and QRS flash indicators.
   * @returns {void}
   */
  recreateCanvas() {
    this.cleanupCanvases();
    const { displayMode, heightScale, chartWidth } = this.state$.value;

    const canvasHeight =
      displayMode === "multi"
        ? ROWS_PER_DISPLAY *
            ((CHART_HEIGHT * heightScale) / MULTI_LEAD_HEIGHT_SCALE) +
          (ROWS_PER_DISPLAY - 1) * ROW_PADDING
        : CHART_HEIGHT * heightScale;

    this.actions$.next({ type: "SET_HEIGHT_SCALE", payload: heightScale });

    const container = this.el.querySelector("[data-ecg-chart]");
    const devicePixelRatio = window.devicePixelRatio || 1;

    const createCanvas = (zIndex, pointerEvents = "auto") => {
      const canvas = document.createElement("canvas");
      canvas.width = chartWidth * devicePixelRatio;
      canvas.height = canvasHeight * devicePixelRatio;
      canvas.style.width = `${chartWidth}px`;
      canvas.style.height = `${canvasHeight}px`;
      canvas.style.display = "block";
      canvas.style.position = "absolute";
      canvas.style.top = "0";
      canvas.style.left = "0";
      canvas.style.zIndex = zIndex;
      canvas.style.pointerEvents = pointerEvents;
      container.appendChild(canvas);
      const context = canvas.getContext("2d");
      if (context) context.scale(devicePixelRatio, devicePixelRatio);
      return { canvas, context };
    };

    const { canvas: bgCanvas, context: bgContext } = createCanvas(1);
    const { canvas: wfCanvas, context: wfContext } = createCanvas(2, "none");
    const { canvas: qrsCanvas, context: qrsContext } = createCanvas(3, "none");

    this.actions$.next({
      type: "SET_CANVAS_REFS",
      payload: {
        backgroundCanvas: bgCanvas,
        backgroundContext: bgContext,
        waveformCanvas: wfCanvas,
        waveformContext: wfContext,
        qrsFlashCanvas: qrsCanvas,
        qrsFlashContext: qrsContext,
      }
    });

    this.updateCursorStyle();
  },

  /**
   * Removes all canvas elements from the DOM to prevent memory leaks.
   * Called during component cleanup and before recreating canvases.
   * @returns {void}
   */
  cleanupCanvases() {
    const { backgroundCanvas, waveformCanvas, qrsFlashCanvas } =
      this.state$.value;
    if (backgroundCanvas) backgroundCanvas.remove();
    if (waveformCanvas) waveformCanvas.remove();
    if (qrsFlashCanvas) qrsFlashCanvas.remove();
  },

  /**
   * Renders the medical grid background for single or multi-lead display.
   * Clears the background canvas and draws grids for all visible leads.
   * @returns {void}
   */
  renderGridBackground() {
    const {
      backgroundContext,
      backgroundCanvas,
      displayMode,
      leadHeight,
      leadNames,
      chartWidth,
    } = this.state$.value;
    if (!backgroundContext || !backgroundCanvas) return;

    const devicePixelRatio = window.devicePixelRatio || 1;
    backgroundContext.clearRect(
      0,
      0,
      chartWidth,
      backgroundCanvas.height / devicePixelRatio
    );

    if (displayMode === "single") {
      this.renderLeadBackground(
        this.state$.value.currentLead,
        0,
        0,
        chartWidth,
        leadHeight,
        backgroundContext
      );
    } else {
      for (let i = 0; i < leadNames.length; i++) {
        const { xOffset, yOffset, columnWidth } =
          this.calculateLeadGridCoordinates(i);
        this.renderLeadBackground(
          i,
          xOffset,
          yOffset,
          columnWidth,
          leadHeight,
          backgroundContext
        );
      }
    }
  },

  /**
   * Renders the background grid and label for a single ECG lead.
   * @param {number} leadIndex - Index of the ECG lead
   * @param {number} xOffset - X position offset in pixels
   * @param {number} yOffset - Y position offset in pixels
   * @param {number} width - Width of the lead area in pixels
   * @param {number} height - Height of the lead area in pixels
   * @param {CanvasRenderingContext2D} context - Canvas 2D rendering context
   * @returns {void}
   */
  renderLeadBackground(leadIndex, xOffset, yOffset, width, height, context) {
    this.drawLeadGrid({ bounds: { xOffset, yOffset, width, height }, context });
    this.drawLeadLabel(leadIndex, xOffset, yOffset, context);
  },

  /**
   * Draws the appropriate grid type (medical or simple) for a lead area.
   * @param {Object} options - Grid drawing options with bounds and context
   * @returns {void}
   */
  drawLeadGrid(options) {
    const { gridType } = this.state$.value;
    if (gridType === "graph_paper") this.drawMedicalGrid(options);
    else this.drawSimpleGrid(options);
  },

  /**
   * Draws a medical-style grid with fine and bold lines resembling ECG graph paper.
   * @param {Object} params - Parameters object
   * @param {Object} params.bounds - Grid boundary dimensions
   * @param {number} params.bounds.xOffset - X offset in pixels
   * @param {number} params.bounds.yOffset - Y offset in pixels
   * @param {number} params.bounds.width - Grid width in pixels
   * @param {number} params.bounds.height - Grid height in pixels
   * @param {CanvasRenderingContext2D} params.context - Canvas rendering context
   * @returns {void}
   */
  drawMedicalGrid({ bounds: { xOffset, yOffset, width, height }, context }) {
    const { gridScale } = this.state$.value;
    const smallSquareSize = PIXELS_PER_MM * gridScale;
    const largeSquareSize = 5 * PIXELS_PER_MM * gridScale;

    context.strokeStyle = this.colors.gridFine;
    context.lineWidth = 0.5;
    context.beginPath();
    for (
      let x = xOffset + smallSquareSize;
      x < xOffset + width;
      x += smallSquareSize
    ) {
      context.moveTo(x, yOffset);
      context.lineTo(x, yOffset + height);
    }
    for (let y = smallSquareSize; y <= height; y += smallSquareSize) {
      if (yOffset + y <= yOffset + height) {
        context.moveTo(xOffset, yOffset + y);
        context.lineTo(xOffset + width, yOffset + y);
      }
    }
    context.stroke();

    context.strokeStyle = this.colors.gridBold;
    context.lineWidth = 1;
    context.beginPath();
    for (
      let x = xOffset + largeSquareSize;
      x < xOffset + width;
      x += largeSquareSize
    ) {
      context.moveTo(x, yOffset);
      context.lineTo(x, yOffset + height);
    }
    for (let y = largeSquareSize; y <= height; y += largeSquareSize) {
      if (yOffset + y <= yOffset + height) {
        context.moveTo(xOffset, yOffset + y);
        context.lineTo(xOffset + width, yOffset + y);
      }
    }
    context.stroke();
  },

  /**
   * Draws a simple dot grid pattern for telemetry-style display.
   * @param {Object} params - Parameters object
   * @param {Object} params.bounds - Grid boundary dimensions
   * @param {number} params.bounds.xOffset - X offset in pixels
   * @param {number} params.bounds.yOffset - Y offset in pixels
   * @param {number} params.bounds.width - Grid width in pixels
   * @param {number} params.bounds.height - Grid height in pixels
   * @param {CanvasRenderingContext2D} params.context - Canvas rendering context
   * @returns {void}
   */
  drawSimpleGrid({ bounds: { xOffset, yOffset, width, height }, context }) {
    const { gridScale } = this.state$.value;
    const dotSpacing = 5 * PIXELS_PER_MM * gridScale;
    context.fillStyle = this.colors.gridDots;
    for (let x = xOffset + 5; x < xOffset + width - 5; x += dotSpacing) {
      for (let y = 5; y < height - 5; y += dotSpacing) {
        context.beginPath();
        context.arc(x, yOffset + y, DOT_RADIUS, 0, 2 * Math.PI);
        context.fill();
      }
    }
  },

  /**
   * Draws the lead name label in the top-left corner of a lead area.
   * @param {number} leadIndex - Index of the ECG lead
   * @param {number} xOffset - X position offset in pixels
   * @param {number} yOffset - Y position offset in pixels
   * @param {CanvasRenderingContext2D} context - Canvas 2D rendering context
   * @returns {void}
   */
  drawLeadLabel(leadIndex, xOffset, yOffset, context) {
    const { leadNames } = this.state$.value;
    if (!leadNames || !leadNames[leadIndex]) return;
    context.fillStyle = this.colors.labels;
    context.font = "12px Arial";
    context.fillText(leadNames[leadIndex], xOffset + 5, yOffset + 15);
  },

  // =====================================
  // 7. RENDERING - WAVEFORM & CURSOR
  // =====================================

  /**
   * Clears the waveform canvas to prepare for new waveform drawing.
   * @returns {void}
   */
  clearWaveform() {
    const { waveformContext, waveformCanvas, chartWidth } = this.state$.value;
    if (!waveformContext || !waveformCanvas) return;
    const devicePixelRatio = window.devicePixelRatio || 1;
    waveformContext.clearRect(
      0,
      0,
      chartWidth,
      waveformCanvas.height / devicePixelRatio
    );
  },

  /**
   * Renders the ECG waveform for a single lead with cursor animation.
   * @param {Object} options - Rendering options
   * @param {number} options.leadIndex - Index of the ECG lead to render
   * @param {Object} options.bounds - Lead area boundaries
   * @param {number} options.timeSpan - Time span to display in seconds
   * @param {Object} [options.cursorData] - Cursor data with position and waveform data
   * @param {Object} [options.leadData] - Optional lead data for fallback rendering
   * @param {number[]} [options.leadData.times] - Array of time values
   * @param {number[]} [options.leadData.values] - Array of signal values
   * @returns {void}
   */
  renderLeadWaveform(options) {
    const { leadData, bounds, timeSpan, cursorData } = options;
    if (cursorData) {
      this.drawWaveformToCursor({
        ...cursorData,
        bounds,
        timeSpan,
        cursor: {
          position: cursorData.cursorPosition,
          width: cursorData.cursorWidth,
        },
      });
    } else if (leadData && leadData.times && leadData.values) {
      this.drawWaveformToCursor({
        times: leadData.times,
        values: leadData.values,
        bounds,
        timeSpan,
        cursor: { position: bounds.width, width: 0 },
      });
    }
  },

  /**
   * Draws ECG waveform data up to the current cursor position with smooth animation.
   * @param {Object} options - Drawing options
   * @param {number[]} options.times - Array of time values
   * @param {number[]} options.values - Array of ECG signal values
   * @param {Object} options.bounds - Drawing area boundaries
   * @param {number} options.timeSpan - Time span for scaling
   * @param {Object} options.cursor - Cursor position and width
   * @returns {void}
   */
  drawWaveformToCursor(options) {
    const { times, values, bounds, timeSpan, cursor } = options;
    if (!times || times.length === 0) return;

    const { waveformContext } = this.state$.value;
    const { clearX, clearWidth } = this.calculateClearBounds(
      bounds.xOffset,
      bounds.width,
      cursor.position,
      cursor.width
    );
    if (clearWidth > 0) this.clearCursorArea(clearX, clearWidth);

    this.setupWaveformDrawing(waveformContext);
    const coordinates = this.transformCoordinates({
      times,
      values,
      bounds,
      timeSpan,
    });

    let hasMovedTo = false;
    for (let i = 0; i < coordinates.length; i++) {
      const { x, y } = coordinates[i];
      if (x <= cursor.position) {
        if (!hasMovedTo) {
          waveformContext.moveTo(x, y);
          hasMovedTo = true;
        } else {
          waveformContext.lineTo(x, y);
        }
      }
    }
    if (hasMovedTo) waveformContext.stroke();
  },

  /**
   * Configures canvas context for high-quality waveform drawing.
   * @param {CanvasRenderingContext2D} context - Canvas 2D rendering context
   * @returns {void}
   */
  setupWaveformDrawing(context) {
    context.strokeStyle = this.colors.waveform;
    context.lineWidth = WAVEFORM_LINE_WIDTH;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.beginPath();
  },

  /**
   * Calculates the area that needs to be cleared for cursor animation.
   * @param {number} xOffset - X offset of the lead area
   * @param {number} width - Width of the lead area
   * @param {number} cursorPosition - Current cursor X position
   * @param {number} cursorWidth - Width of the cursor
   * @returns {Object} Object with clearX and clearWidth properties
   */
  calculateClearBounds(xOffset, width, cursorPosition, cursorWidth) {
    const clearX = Math.max(xOffset, cursorPosition - cursorWidth / 2);
    const clearWidth = Math.min(cursorWidth, xOffset + width - clearX);
    return { clearX, clearWidth };
  },

  /**
   * Clears a specific rectangular area on the waveform canvas.
   * @param {number} x - X position to start clearing
   * @param {number} width - Width of area to clear
   * @returns {void}
   */
  clearCursorArea(x, width) {
    const { waveformContext, waveformCanvas } = this.state$.value;
    if (!waveformContext || !waveformCanvas) return;
    const devicePixelRatio = window.devicePixelRatio || 1;
    waveformContext.clearRect(
      x,
      0,
      width,
      waveformCanvas.height / devicePixelRatio
    );
  },

  // =====================================
  // 8. QRS & VISUAL INDICATORS
  // =====================================

  /**
   * Checks for QRS complex occurrences at the current playback time.
   * Triggers visual flash indicators when QRS events are detected.
   * @param {number} elapsedTime - Current playback time in seconds
   * @returns {void}
   */
  checkQrsOccurrences(elapsedTime) {
    const { qrsTimestamps, lastQrsIndex } = this.state$.value;
    const detectedEvents = this.getQrsEventsInTimeRange(
      qrsTimestamps,
      lastQrsIndex,
      elapsedTime
    );

    detectedEvents.forEach(({ qrsIndex }) => {
      this.actions$.next({
        type: "SET_QRS_FLASH",
        payload: {
          qrsDetectedCount: this.state$.value.qrsDetectedCount + 1,
          lastQrsIndex: qrsIndex,
        },
      });

      if (this.state$.value.qrsIndicatorEnabled) {
        this.triggerQrsFlash();
      }
    });
  },

  /**
   * Finds QRS events that have occurred since the last check.
   * @param {number[]} qrsTimestamps - Array of QRS event timestamps
   * @param {number} lastQrsIndex - Index of the last processed QRS event
   * @param {number} elapsedTime - Current playback time in seconds
   * @returns {Array<Object>} Array of detected QRS events with index and timestamp
   */
  getQrsEventsInTimeRange(qrsTimestamps, lastQrsIndex, elapsedTime) {
    if (!qrsTimestamps || qrsTimestamps.length === 0) return [];

    const detectedEvents = [];
    for (let i = lastQrsIndex + 1; i < qrsTimestamps.length; i++) {
      if (qrsTimestamps[i] <= elapsedTime) {
        detectedEvents.push({ qrsIndex: i, timestamp: qrsTimestamps[i] });
      } else {
        break;
      }
    }
    return detectedEvents;
  },

  /**
   * Triggers a visual flash indicator for QRS detection.
   * Manages the flash timeout and state to ensure proper cleanup.
   * @returns {void}
   */
  triggerQrsFlash() {
    const { qrsFlashTimeout, qrsFlashDuration } = this.state$.value;
    if (qrsFlashTimeout) clearTimeout(qrsFlashTimeout);

    this.actions$.next({
      type: "SET_QRS_FLASH",
      payload: { qrsFlashActive: true },
    });

    const newTimeout = setTimeout(() => {
      this.actions$.next({
        type: "SET_QRS_FLASH",
        payload: { qrsFlashActive: false, qrsFlashTimeout: null },
      });
      this.clearQrsFlashArea();
    }, qrsFlashDuration);
    this.actions$.next({
      type: "SET_QRS_FLASH",
      payload: { qrsFlashTimeout: newTimeout },
    });
  },

  /**
   * Clears the QRS flash indicator from the flash canvas layer.
   * @returns {void}
   */
  clearQrsFlashArea() {
    const { qrsFlashContext, qrsFlashCanvas, chartWidth } = this.state$.value;
    if (!qrsFlashContext || !qrsFlashCanvas) return;
    const devicePixelRatio = window.devicePixelRatio || 1;
    qrsFlashContext.clearRect(
      0,
      0,
      chartWidth,
      qrsFlashCanvas.height / devicePixelRatio
    );
  },

  /**
   * Draws a red flash dot in the top-right corner to indicate QRS detection.
   * @returns {void}
   */
  drawQrsFlashDot() {
    const { qrsFlashContext, chartWidth } = this.state$.value;
    if (!qrsFlashContext) return;
    const dotRadius = 5,
      margin = 15;
    qrsFlashContext.fillStyle = "#ff0000";
    qrsFlashContext.beginPath();
    qrsFlashContext.arc(
      chartWidth - margin,
      margin,
      dotRadius,
      0,
      2 * Math.PI
    );
    qrsFlashContext.fill();
  },

  // =====================================
  // 9. UTILITIES & HELPERS
  // =====================================

  /**
   * Handles theme changes by updating colors and re-rendering the display.
   * @returns {void}
   */
  handleThemeChange() {
    this.updateThemeColors();
    this.renderGridBackground();
    this.clearWaveform();
    const { isPlaying, startTime, pausedTime, widthSeconds } =
      this.state$.value;
    if (!isPlaying && startTime && pausedTime) {
      const elapsedSeconds = (pausedTime - startTime) / 1000;
      const cursorProgress = (elapsedSeconds % widthSeconds) / widthSeconds;
      const animationCycle = Math.floor(elapsedSeconds / widthSeconds);
      this.processAnimationFrame(cursorProgress, animationCycle);
    }
  },

  /**
   * Processes a single animation frame with cursor progress and cycle data.
   * @param {number} cursorProgress - Progress through current cycle (0-1)
   * @param {number} animationCycle - Current animation cycle number
   * @returns {void}
   */
  processAnimationFrame(cursorProgress, animationCycle) {
    const currentState = this.state$.value;
    const elapsedTime = animationCycle * currentState.widthSeconds + cursorProgress * currentState.widthSeconds;
    
    if (elapsedTime >= currentState.totalDuration) {
      this.handlePlaybackEnd();
      return;
    }

    const model = this.getRenderModelForTime(elapsedTime);
    if (model) {
      this.renderFrame(model);
    }
  },

  /**
   * Executes an operation while preserving playback state.
   * Pauses if playing, executes operation, then resumes if was playing.
   * @param {Function} operation - The operation to execute
   * @returns {void}
   */
  withCanvasStatePreservation(operation) {
    const wasPlaying = this.state$.value.isPlaying;
    if (wasPlaying)
      this.actions$.next({ type: "SET_IS_PLAYING", payload: false });
    operation();
    if (wasPlaying)
      this.actions$.next({ type: "SET_IS_PLAYING", payload: true });
  },

  /**
   * Updates the display mode selector UI element to match current state.
   * @param {string} mode - The display mode ('single' or 'multi')
   * @returns {void}
   */
  updateDisplayModeSelector(mode) {
    const displayModeSelector = this.el.querySelector("#display-mode-selector");
    if (displayModeSelector) displayModeSelector.value = mode;
  },

  /**
   * Calculates the data array index for a given time value.
   * @param {Object} leadData - Lead data object with times array
   * @param {number} targetTime - Target time in seconds
   * @returns {number} Array index corresponding to the target time
   */
  calculateDataIndexForTime(leadData, targetTime) {
    if (!leadData || !leadData.times || leadData.times.length === 0) return 0;
    if (typeof targetTime !== "number" || targetTime < 0) return 0;
    const { samplingRate } = this.state$.value;
    if (!samplingRate || samplingRate <= 0) return 0;
    const estimatedIndex = Math.round(targetTime * samplingRate);
    return Math.min(estimatedIndex, leadData.times.length - 1);
  },

  /**
   * Transforms ECG data coordinates to canvas pixel coordinates.
   * @param {Object} options - Transform options
   * @param {number[]} options.times - Array of time values
   * @param {number[]} options.values - Array of ECG signal values
   * @param {Object} options.bounds - Drawing area boundaries
   * @param {number} options.timeSpan - Time span for X-axis scaling
   * @returns {Array<Object>} Array of {x, y} pixel coordinates
   */
  transformCoordinates(options) {
    const {
      times,
      values,
      bounds: { xOffset, yOffset, width, height },
      timeSpan,
    } = options;
    if (
      !times ||
      !values ||
      !options.bounds ||
      times.length !== values.length ||
      timeSpan <= 0 ||
      width <= 0 ||
      height <= 0
    )
      return [];
    const { amplitudeScale } = this.state$.value;
    const xScale = width / timeSpan;
    const yScale = height / (this.yMax - this.yMin);
    return times.map((time, i) => {
      const x = xOffset + time * xScale;
      const scaledValue = values[i] * amplitudeScale;
      const y = yOffset + height - (scaledValue - this.yMin) * yScale;
      return { x, y };
    });
  },

  /**
   * Handles grid scale changes by recreating canvas and re-rendering.
   * @returns {void}
   */
  handleGridScaleChange() {
    this.withCanvasStatePreservation(() => {
      this.calculateMedicallyAccurateDimensions();
      this.recreateCanvas();
      this.renderGridBackground();
      this.clearWaveform();
    });
  },

  /**
   * Handles amplitude scale changes by clearing and re-rendering waveforms.
   * @returns {void}
   */
  handleAmplitudeScaleChange() {
    this.withCanvasStatePreservation(() => this.clearWaveform());
  },

  /**
   * Handles height scale changes by recreating canvas with new dimensions.
   * @returns {void}
   */
  handleHeightScaleChange() {
    this.withCanvasStatePreservation(() => {
      this.recreateCanvas();
      this.renderGridBackground();
      this.clearWaveform();
    });
  },

  /**
   * Updates grid scale display values in the UI.
   * @returns {void}
   */
  updateGridScaleDisplay() {
    const { gridScale } = this.state$.value;
    const gridScaleValue = this.el.querySelector("#grid-scale-value");
    if (gridScaleValue) gridScaleValue.textContent = `${gridScale.toFixed(2)}x`;
    const gridScaleSpeed = this.el.querySelector("#grid-scale-speed");
    if (gridScaleSpeed)
      gridScaleSpeed.textContent = `${(MM_PER_SECOND * gridScale).toFixed(
        1
      )} mm/s`;
  },

  /**
   * Updates amplitude scale display values in the UI.
   * @returns {void}
   */
  updateAmplitudeScaleDisplay() {
    const { amplitudeScale } = this.state$.value;
    const amplitudeScaleValue = this.el.querySelector("#amplitude-scale-value");
    if (amplitudeScaleValue)
      amplitudeScaleValue.textContent = `${amplitudeScale.toFixed(2)}x`;
    const amplitudeScaleGain = this.el.querySelector("#amplitude-scale-gain");
    if (amplitudeScaleGain)
      amplitudeScaleGain.textContent = `${(
        MM_PER_MILLIVOLT * amplitudeScale
      ).toFixed(1)} mm/mV`;
  },

  /**
   * Updates height scale display values in the UI.
   * @returns {void}
   */
  updateHeightScaleDisplay() {
    const { heightScale } = this.state$.value;
    const heightScaleValue = this.el.querySelector("#height-scale-value");
    if (heightScaleValue)
      heightScaleValue.textContent = `${heightScale.toFixed(2)}x`;
    const heightScalePixels = this.el.querySelector("#height-scale-pixels");
    if (heightScalePixels)
      heightScalePixels.textContent = `${Math.round(
        CHART_HEIGHT * heightScale
      )}px`;
  },

  /**
   * Updates the canvas cursor style based on current display mode.
   * @returns {void}
   */
  updateCursorStyle() {
    const { backgroundCanvas, displayMode } = this.state$.value;
    if (backgroundCanvas) {
      backgroundCanvas.style.cursor =
        displayMode === "single" ? "zoom-out" : "zoom-in";
    }
  },

  /**
   * Determines which ECG lead was clicked based on mouse coordinates.
   * @param {number} x - Mouse X coordinate
   * @param {number} y - Mouse Y coordinate
   * @returns {number|null} Lead index or null if no lead was clicked
   */
  getLeadIndexFromClick(x, y) {
    const { displayMode, leadHeight, leadNames } = this.state$.value;
    if (!leadNames || displayMode !== "multi") return null;
    for (let leadIndex = 0; leadIndex < leadNames.length; leadIndex++) {
      const { xOffset, yOffset, columnWidth } =
        this.calculateLeadGridCoordinates(leadIndex);
      if (
        x >= xOffset &&
        x <= xOffset + columnWidth &&
        y >= yOffset &&
        y <= yOffset + leadHeight
      ) {
        return leadIndex;
      }
    }
    return null;
  },

  /**
   * Gets the grid column and row position for a lead index.
   * @param {number} leadIndex - Index of the ECG lead
   * @returns {Object} Object with column and row properties
   */
  getLeadColumnAndRow(leadIndex) {
    const leadPositions = [
      { column: 0, row: 0 },
      { column: 0, row: 1 },
      { column: 0, row: 2 },
      { column: 1, row: 0 },
      { column: 1, row: 1 },
      { column: 1, row: 2 },
      { column: 2, row: 0 },
      { column: 2, row: 1 },
      { column: 2, row: 2 },
      { column: 3, row: 0 },
      { column: 3, row: 1 },
      { column: 3, row: 2 },
    ];
    return leadPositions[leadIndex] || { column: 0, row: 0 };
  },

  /**
   * Calculates pixel coordinates and dimensions for a lead in the grid layout.
   * @param {number} leadIndex - Index of the ECG lead
   * @returns {Object} Object with xOffset, yOffset, and columnWidth properties
   */
  calculateLeadGridCoordinates(leadIndex) {
    const { leadHeight, chartWidth } = this.state$.value;
    const { column, row } = this.getLeadColumnAndRow(leadIndex);
    const totalColumnPadding = (COLUMNS_PER_DISPLAY - 1) * COLUMN_PADDING;
    const columnWidth =
      (chartWidth - totalColumnPadding) / COLUMNS_PER_DISPLAY;
    const xOffset = column * (columnWidth + COLUMN_PADDING);
    const yOffset = row * (leadHeight + ROW_PADDING);
    return { xOffset, yOffset, columnWidth };
  },

  /**
   * Updates color scheme based on current theme (light or dark).
   * @returns {void}
   */
  updateThemeColors() {
    const theme =
      document.documentElement.getAttribute("data-theme") || "light";
    const isDark = theme === "dark";
    this.colors = {
      waveform: isDark ? "#ffffff" : "#000000",
      gridFine: isDark ? "#660000" : "#ff9999",
      gridBold: isDark ? "#990000" : "#ff6666",
      gridDots: isDark ? "#666666" : "#999999",
      labels: isDark ? "#ffffff" : "#333333",
    };
  },

  /**
   * Updates the play/pause button UI based on playback state.
   * @param {boolean} isPlaying - Whether playback is currently active
   * @returns {void}
   */
  updatePlayPauseButton(isPlaying) {
    const button = this.el.querySelector("#play-pause-button");
    if (!button) return;
    const iconClass = isPlaying ? "hero-pause" : "hero-play";
    const iconPath = isPlaying
      ? '<path fill-rule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clip-rule="evenodd" />'
      : '<path fill-rule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clip-rule="evenodd" />';
    button.innerHTML = `<svg class="w-4 h-4 ${iconClass}" fill="currentColor" viewBox="0 0 24 24">${iconPath}</svg><span class="ml-1">${
      isPlaying ? "Pause" : "Play"
    }</span>`;
  },

  /**
   * Creates an RxJS observable from DOM element events.
   * @param {string} elementId - ID of the DOM element
   * @param {string} eventType - Type of event to listen for
   * @returns {Observable} RxJS observable stream
   */
  createElementStream(elementId, eventType) {
    const element = this.el.querySelector(`#${elementId}`);
    return element ? fromEvent(element, eventType) : EMPTY;
  },

  /**
   * Shows or hides the lead selector based on display mode.
   * @param {string} displayMode - Current display mode ('single' or 'multi')
   * @returns {void}
   */
  updateLeadSelectorVisibility(displayMode) {
    const leadSelectorContainer = this.el.querySelector(
      "#lead-selector-container"
    );
    if (leadSelectorContainer) {
      leadSelectorContainer.style.display =
        displayMode === "multi" ? "none" : "block";
    }
  },

  /**
   * Reads a value from a form input field.
   * @param {string} fieldName - Name of the form field
   * @returns {string|null} Field value or null if not found
   */
  readFormValue(fieldName) {
    const input = this.el.querySelector(
      `input[name="settings[${fieldName}]"], select[name="settings[${fieldName}]"]`
    );
    return input ? input.value : null;
  },

  /**
   * Reads the checked state of a form checkbox.
   * @param {string} fieldName - Name of the checkbox field
   * @returns {boolean} True if checked, false otherwise
   */
  readFormCheckbox(fieldName) {
    const input = this.el.querySelector(
      `input[name="settings[${fieldName}]"][type="checkbox"]`
    );
    return input ? input.checked : false;
  },
};
