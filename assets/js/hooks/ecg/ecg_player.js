import {
  fromEvent,
  Observable,
  Subject,
  Subscription,
  debounceTime,
  filter,
  map,
  catchError,
  EMPTY,
  merge,
  tap,
  takeUntil,
  animationFrames,
  switchMap,
  takeWhile,
  timer,
  startWith,
  from,
  concatMap,
  mergeMap,
  bufferCount,
  scan,
  share,
  shareReplay,
  of,
  takeLast,
  take,
  withLatestFrom,
  BehaviorSubject,
  distinctUntilChanged,
  combineLatest,
} from "rxjs";

// Medical constants
const MM_PER_SECOND = 25;
const MM_PER_MILLIVOLT = 10;
const HEIGHT_MILLIVOLTS = 2.5;

// Display constants
const PIXELS_PER_MM = 6;
const CHART_HEIGHT = HEIGHT_MILLIVOLTS * MM_PER_MILLIVOLT * PIXELS_PER_MM;
const DEFAULT_WIDTH_SECONDS = 2.5;
const WAVEFORM_LINE_WIDTH = 1.3;
const DOT_RADIUS = 1.2;

// Layout constants
const CONTAINER_PADDING = 0;
const COLUMNS_PER_DISPLAY = 4;
const ROWS_PER_DISPLAY = 3;
const COLUMN_PADDING = 0;
const ROW_PADDING = 0;

// Cursor constants
const SINGLE_LEAD_CURSOR_WIDTH = 20;
const MULTI_LEAD_CURSOR_WIDTH = 8;
const MULTI_LEAD_HEIGHT_SCALE = 0.8;

// Animation constants
const QRS_FLASH_DURATION_MS = 100;
const SEGMENT_DURATION_SECONDS = 0.1;

const ECGPlayer = {
  // =====================================
  // LIFECYCLE
  // =====================================

  mounted() {
    this.destroy$ = new Subject();
    this.subscriptions = new Subscription();
    this.initializeState();
    this.calculateMedicallyAccurateDimensions();
    this.setupEventStreams();
    this.handleEvent("load_ecg_data", (payload) => {
      this.ecgDataLoaded$.next(payload);
    });
    this.updateThemeColors();
    this.initializeECGChart();
  },

  destroyed() {
    if (this.destroy$) {
      this.destroy$.next();
      this.destroy$.complete();
    }
    if (this.subscriptions) {
      this.subscriptions.unsubscribe();
    }
    const subjects = [
      this.isPlaying$,
      this.currentLead$,
      this.displayMode$,
      this.gridType$,
      this.gridScale$,
      this.amplitudeScale$,
      this.heightScale$,
      this.loopEnabled$,
      this.qrsIndicatorEnabled$,
      this.qrsFlashActive$,
      this.canvasRecreationTrigger$,
      this.themeChange$,
      this.ecgDataLoaded$,
      this.animationTime$,
      this.animationCycle$,
      this.cursorPosition$,
      this.qrsDetectionSubject$,
    ];
    subjects.forEach((subject) => {
      if (subject) {
        subject.complete();
      }
    });
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.cleanupCanvases();
    this.ecgLeadDatasets = null;
    this.precomputedSegments = null;
    this.dataIndexCache = null;
    this.currentLeadData = null;
    this.allLeadsCursorData = null;
    this.activeCursorData = null;
  },

  // =====================================
  // REACTIVE STREAMS
  // =====================================

  setupEventStreams() {
    const streams = this.createAllReactiveStreams();
    const consolidatedStream$ = merge(...Object.values(streams)).pipe(
      takeUntil(this.destroy$),
      catchError((error) => {
        console.error("Consolidated stream error:", error);
        return EMPTY;
      })
    );
    this.subscriptions.add(consolidatedStream$.subscribe());
  },

  createAllReactiveStreams() {
    const animationStreams = this.createAnimationStreams();
    const qrsStreams = this.createQrsStreams();
    const uiStreams = this.createUIStreams();
    const formStreams = this.createFormStreams();
    const keyboardStreams = this.createKeyboardStreams();
    const systemStreams = this.createSystemEventStreams();
    const stateStreams = this.createStateEffectStreams();
    return {
      ...animationStreams,
      ...qrsStreams,
      ...uiStreams,
      ...formStreams,
      ...keyboardStreams,
      ...systemStreams,
      ...stateStreams,
    };
  },

  createFormStreams() {
    return {
      leadSelectorChange: this.createElementStream(
        "lead-selector",
        "change"
      ).pipe(
        map((e) => parseInt(e.target.value)),
        distinctUntilChanged(),
        tap((leadIndex) => {
          this.currentLead$.next(leadIndex);
          this.switchLead(leadIndex);
        })
      ),

      displayModeChange: this.createElementStream(
        "display-mode-selector",
        "change"
      ).pipe(
        map((e) => e.target.value),
        distinctUntilChanged(),
        tap((value) => {
          this.displayMode$.next(value);
          this.updateDisplayModeSelector(value);
        })
      ),

      gridTypeChange: this.createElementStream(
        "grid-type-selector",
        "change"
      ).pipe(
        map((e) => e.target.value),
        distinctUntilChanged(),
        tap((value) => this.gridType$.next(value))
      ),

      loopCheckboxChange: this.createElementStream(
        "loop-checkbox",
        "change"
      ).pipe(
        map((e) => e.target.checked),
        distinctUntilChanged(),
        tap((checked) => this.loopEnabled$.next(checked))
      ),

      qrsIndicatorChange: this.createElementStream(
        "qrs-indicator-checkbox",
        "change"
      ).pipe(
        map((e) => e.target.checked),
        distinctUntilChanged(),
        tap((checked) => this.qrsIndicatorEnabled$.next(checked))
      ),

      gridScaleSlider: this.createElementStream(
        "grid-scale-slider",
        "input"
      ).pipe(
        map((e) => parseFloat(e.target.value)),
        debounceTime(100),
        distinctUntilChanged(),
        tap((value) => this.gridScale$.next(value))
      ),

      amplitudeScaleSlider: this.createElementStream(
        "amplitude-scale-slider",
        "input"
      ).pipe(
        map((e) => parseFloat(e.target.value)),
        debounceTime(100),
        distinctUntilChanged(),
        tap((value) => this.amplitudeScale$.next(value))
      ),

      heightScaleSlider: this.createElementStream(
        "height-scale-slider",
        "input"
      ).pipe(
        map((e) => parseFloat(e.target.value)),
        debounceTime(100),
        distinctUntilChanged(),
        tap((value) => this.heightScale$.next(value))
      ),
    };
  },

  setupCanvasClickEvents() {
    if (!this.backgroundCanvas) return;

    if (this.canvasClickSubscription) {
      this.canvasClickSubscription.unsubscribe();
    }

    this.canvasClickSubscription = fromEvent(this.backgroundCanvas, "click")
      .pipe(
        map((event) => {
          const rect = this.backgroundCanvas.getBoundingClientRect();
          return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
          };
        }),
        tap(({ x, y }) => {
          if (this.displayMode$.value === "multi") {
            const clickedLeadIndex = this.getLeadIndexFromClick(x, y);
            if (clickedLeadIndex !== null) {
              this.displayMode$.next("single");
              this.currentLead$.next(clickedLeadIndex);
              this.updateDisplayModeSelector("single");
              this.switchLead(clickedLeadIndex);
            }
          } else if (this.displayMode$.value === "single") {
            this.displayMode$.next("multi");
            this.updateDisplayModeSelector("multi");
          }
        }),
        takeUntil(this.destroy$),
        catchError((error) => {
          console.error("Canvas click error:", error);
          return EMPTY;
        })
      )
      .subscribe();

    this.subscriptions.add(this.canvasClickSubscription);
  },

  createElementStream(elementId, eventType) {
    const element = document.getElementById(elementId);
    if (!element) {
      console.warn(`Element with id '${elementId}' not found`);
      return EMPTY;
    }
    return fromEvent(element, eventType);
  },

  createStateEffectStreams() {
    return {
      cursorWidthEffect: this.cursorWidth$.pipe(
        tap(() => this.updateCursorStyle())
      ),

      displayModeEffect: this.displayMode$.pipe(
        distinctUntilChanged(),
        tap((mode) => {
          this.updateLeadSelectorVisibility(mode);
          this.canvasRecreationTrigger$.next();
        })
      ),

      currentLeadEffect: this.currentLead$.pipe(
        distinctUntilChanged(),
        tap((leadIndex) => {
          if (this.ecgLeadDatasets && this.ecgLeadDatasets[leadIndex]) {
            this.currentLeadData = this.ecgLeadDatasets[leadIndex];
            this.updateLeadSelector(leadIndex);
          }
        })
      ),

      gridScaleEffect: this.gridScale$.pipe(
        distinctUntilChanged(),
        tap(() => {
          this.updateGridScaleDisplay();
          this.handleGridScaleChange();
        })
      ),

      amplitudeScaleEffect: this.amplitudeScale$.pipe(
        distinctUntilChanged(),
        tap(() => {
          this.updateAmplitudeScaleDisplay();
          this.handleAmplitudeScaleChange();
        })
      ),

      heightScaleEffect: this.heightScale$.pipe(
        distinctUntilChanged(),
        tap(() => {
          this.updateHeightScaleDisplay();
          this.handleHeightScaleChange();
        })
      ),

      gridTypeEffect: this.gridType$.pipe(
        distinctUntilChanged(),
        tap(() => this.renderGridBackground())
      ),

      qrsIndicatorEffect: this.qrsIndicatorEnabled$.pipe(
        distinctUntilChanged(),
        tap((enabled) => {
          if (!enabled && this.qrsFlashActive$.value) {
            this.qrsFlashActive$.next(false);
            this.clearQrsFlashArea();
          }
        })
      ),

      canvasRecreationEffect: this.canvasRecreationTrigger$.pipe(
        debounceTime(50),
        tap(() => this.recreateCanvasAndRestart())
      ),

      themeChangeEffect: this.themeChange$.pipe(
        debounceTime(50),
        tap(() => this.handleThemeChange())
      ),

      ecgDataEffect: this.ecgDataLoaded$.pipe(
        tap((payload) => this.processECGData(payload))
      ),
    };
  },

  createUIStreams() {
    const playPauseClickStream$ = this.createElementStream(
      "play-pause-button",
      "click"
    ).pipe(tap(() => this.togglePlayback()));

    return {
      playPauseButtonUpdate: this.isPlaying$.pipe(
        distinctUntilChanged(),
        tap(() => this.updatePlayPauseButton())
      ),

      playPauseClick: playPauseClickStream$,
    };
  },

  createKeyboardStreams() {
    return {
      keyboardNavigation: fromEvent(document, "keydown").pipe(
        filter((event) => {
          const target = event.target;
          if (!target) return false;
          return !(
            target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.isContentEditable
          );
        }),
        filter((event) => {
          return ["j", "ArrowDown", "k", "ArrowUp", " "].includes(event.key);
        }),
        tap((event) => {
          event.preventDefault();
          switch (event.key) {
            case "j":
            case "ArrowDown":
              this.switchToNextLead();
              break;
            case "k":
            case "ArrowUp":
              this.switchToPrevLead();
              break;
            case " ":
              this.togglePlayback();
              break;
          }
        })
      ),
    };
  },

  createSystemEventStreams() {
    return {
      windowResize: fromEvent(window, "resize").pipe(
        debounceTime(100),
        tap(() => {
          this.calculateMedicallyAccurateDimensions();
          this.canvasRecreationTrigger$.next();
        })
      ),

      themeChange: new Observable((subscriber) => {
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
      }).pipe(tap(() => this.themeChange$.next())),
    };
  },

  createAnimationStreams() {
    this.qrsDetectionSubject$ = new Subject();

    // Pure animation data stream
    const animationData$ = this.isPlaying$.pipe(
      distinctUntilChanged(),
      switchMap((isPlaying) => {
        if (!isPlaying || !this.totalDuration || !this.waveformCanvas) {
          return EMPTY;
        }

        return animationFrames().pipe(
          withLatestFrom(this.animationTime$),
          map(([, timing]) => {
            const currentTime = Date.now();
            const elapsedSeconds = (currentTime - timing.startTime) / 1000;
            return {
              elapsedSeconds,
              cursorProgress:
                (elapsedSeconds % this.widthSeconds) / this.widthSeconds,
              animationCycle: Math.floor(elapsedSeconds / this.widthSeconds),
              isComplete: elapsedSeconds >= this.totalDuration,
            };
          }),
          takeWhile((data) => !data.isComplete, true),
          shareReplay(1)
        );
      })
    );

    return {
      animationStateEffect: animationData$.pipe(
        filter((data) => !data.isComplete),
        tap((data) => {
          if (data.animationCycle !== this.animationCycle$.value) {
            this.animationCycle$.next(data.animationCycle);
          }
          this.cursorPosition$.next(
            (data.cursorProgress * this.chartWidth) % this.chartWidth
          );
        })
      ),

      animationRenderEffect: animationData$.pipe(
        filter((data) => !data.isComplete),
        tap((data) =>
          this.processAnimationFrame(data.cursorProgress, data.animationCycle)
        )
      ),

      animationCompletionEffect: animationData$.pipe(
        filter((data) => data.isComplete),
        tap(() => this.handlePlaybackEnd())
      ),
    };
  },

  createQrsStreams() {
    // Pure QRS flash data stream
    const qrsFlashData$ = this.qrsDetectionSubject$.pipe(
      withLatestFrom(this.qrsIndicatorEnabled$),
      filter(([, enabled]) => enabled),
      switchMap(() => {
        return timer(this.qrsFlashDuration).pipe(
          startWith(true),
          map((_, index) => index === 0)
        );
      }),
      shareReplay(1)
    );

    return {
      qrsFlashEffect: qrsFlashData$.pipe(
        tap((isFlashActive) => {
          this.qrsFlashActive$.next(isFlashActive);
          if (!isFlashActive) {
            this.clearQrsFlashArea();
          }
        })
      ),
    };
  },

  setupDataPrecomputationStream() {
    this.precomputedSegments.clear();
    this.dataIndexCache.clear();

    if (!this.ecgLeadDatasets || this.ecgLeadDatasets.length === 0) {
      return of(null);
    }

    return from(this.ecgLeadDatasets).pipe(
      mergeMap(
        (leadData, leadIndex) =>
          this.precomputeLeadSegments(leadData, leadIndex),
        2
      ),
      scan((acc, leadResult) => {
        if (leadResult) {
          this.precomputedSegments.set(
            leadResult.leadIndex,
            leadResult.segments
          );
        }
        return acc + 1;
      }, 0),
      catchError((error) => {
        console.error("Data precomputation error:", error);
        return of(null);
      }),
      share(),
      takeUntil(this.destroy$)
    );
  },

  precomputeLeadSegments(leadData, leadIndex) {
    const leadSegments = new Map();
    const timeSegments = [];

    for (
      let time = 0;
      time < this.totalDuration;
      time += this.segmentDuration
    ) {
      timeSegments.push(time);
    }

    // Process segments in batches to prevent blocking
    return from(timeSegments).pipe(
      bufferCount(10),
      concatMap((segmentBatch) =>
        timer(0).pipe(
          map(() => {
            const batchResults = [];
            for (const time of segmentBatch) {
              const segmentKey = Math.floor(time / this.segmentDuration);
              const startTime = segmentKey * this.segmentDuration;
              const endTime = Math.min(
                startTime + this.segmentDuration,
                this.totalDuration
              );

              const startIndex = this.calculateDataIndexForTime(
                leadData,
                startTime
              );
              const endIndex = this.calculateDataIndexForTime(
                leadData,
                endTime
              );

              if (
                endIndex >= startIndex &&
                startIndex < leadData.times.length
              ) {
                const times = leadData.times.slice(startIndex, endIndex + 1);
                const values = leadData.values.slice(startIndex, endIndex + 1);

                batchResults.push({
                  segmentKey,
                  segment: {
                    times: times.map((t) => t - startTime),
                    values: values,
                    originalStartTime: startTime,
                  },
                });
              }
            }
            return batchResults;
          })
        )
      ),
      mergeMap((batchResults) => from(batchResults)),
      scan((acc, segmentResult) => {
        acc.set(segmentResult.segmentKey, segmentResult.segment);
        return acc;
      }, leadSegments),
      takeLast(1),
      map(() => ({ leadIndex, segments: leadSegments }))
    );
  },

  handleThemeChange() {
    this.updateThemeColors();
    this.renderGridBackground();
    this.clearWaveform();
    if (!this.isPlaying$.value) {
      const timing = this.animationTime$.value;
      if (timing.startTime && timing.pausedTime) {
        const elapsedSeconds = (timing.pausedTime - timing.startTime) / 1000;
        const cursorProgress =
          (elapsedSeconds % this.widthSeconds) / this.widthSeconds;
        const animationCycle = Math.floor(elapsedSeconds / this.widthSeconds);
        this.processAnimationFrame(cursorProgress, animationCycle);
      }
    }
  },

  updateLeadSelector(leadIndex) {
    const leadSelector = /** @type {HTMLSelectElement} */ (
      document.getElementById("lead-selector")
    );
    if (leadSelector) {
      leadSelector.value = leadIndex.toString();
    }
  },

  // =====================================
  // STATE INITIALIZATION
  // =====================================

  initializeState() {
    const initialGridType = this.readFormValue("grid_type") || "telemetry";
    const initialDisplayMode = this.readFormValue("display_mode") || "single";
    const initialCurrentLead = parseInt(
      this.readFormValue("current_lead") || "0"
    );

    const initialLoopEnabled = this.readFormCheckbox("loop_playback");
    const initialQrsIndicatorEnabled = this.readFormCheckbox("qrs_indicator");

    const initialGridScale = parseFloat(
      this.readFormValue("grid_scale") || "1.0"
    );
    const initialAmplitudeScale = parseFloat(
      this.readFormValue("amplitude_scale") || "1.0"
    );
    const initialHeightScale = parseFloat(
      this.readFormValue("height_scale") || "1.2"
    );

    this.isPlaying$ = new BehaviorSubject(false);
    this.currentLead$ = new BehaviorSubject(initialCurrentLead);
    this.displayMode$ = new BehaviorSubject(initialDisplayMode);
    this.gridType$ = new BehaviorSubject(initialGridType);
    this.gridScale$ = new BehaviorSubject(initialGridScale);
    this.amplitudeScale$ = new BehaviorSubject(initialAmplitudeScale);
    this.heightScale$ = new BehaviorSubject(initialHeightScale);
    this.loopEnabled$ = new BehaviorSubject(initialLoopEnabled);
    this.qrsIndicatorEnabled$ = new BehaviorSubject(initialQrsIndicatorEnabled);

    this.qrsFlashActive$ = new BehaviorSubject(false);

    this.canvasRecreationTrigger$ = new Subject();

    this.themeChange$ = new Subject();

    this.ecgDataLoaded$ = new Subject();

    this.animationTime$ = new BehaviorSubject({
      startTime: null,
      pausedTime: 0,
    });
    this.animationCycle$ = new BehaviorSubject(0);
    this.cursorPosition$ = new BehaviorSubject(0);

    this.cursorWidth$ = this.displayMode$.pipe(
      map((mode) =>
        mode === "single" ? SINGLE_LEAD_CURSOR_WIDTH : MULTI_LEAD_CURSOR_WIDTH
      ),
      distinctUntilChanged(),
      shareReplay(1)
    );

    this.leadHeight$ = this.heightScale$.pipe(
      map((scale) => CHART_HEIGHT * scale),
      distinctUntilChanged(),
      shareReplay(1)
    );

    this.canvasDimensions$ = combineLatest([
      this.displayMode$,
      this.heightScale$,
      this.leadHeight$,
    ]).pipe(
      map(([displayMode, heightScale, leadHeight]) => {
        const canvasHeight =
          displayMode === "multi"
            ? ROWS_PER_DISPLAY * (leadHeight / MULTI_LEAD_HEIGHT_SCALE) +
              (ROWS_PER_DISPLAY - 1) * ROW_PADDING
            : CHART_HEIGHT * heightScale;

        const actualLeadHeight =
          displayMode === "multi"
            ? leadHeight / MULTI_LEAD_HEIGHT_SCALE
            : leadHeight;

        return { canvasHeight, leadHeight: actualLeadHeight };
      }),
      distinctUntilChanged(
        (prev, curr) =>
          prev.canvasHeight === curr.canvasHeight &&
          prev.leadHeight === curr.leadHeight
      ),
      shareReplay(1)
    );

    this.gridDimensions$ = this.gridScale$.pipe(
      map((scale) => ({
        scaledPixelsPerMm: PIXELS_PER_MM * scale,
        smallSquareSize: PIXELS_PER_MM * scale,
        largeSquareSize: 5 * PIXELS_PER_MM * scale,
        dotSpacing: 5 * PIXELS_PER_MM * scale,
      })),
      distinctUntilChanged(),
      shareReplay(1)
    );

    this.chartDimensions$ = this.gridScale$.pipe(
      map((gridScale) => {
        const container = this.el.querySelector("[data-ecg-chart]");
        const scaledPixelsPerMm = PIXELS_PER_MM * gridScale;
        const minWidth =
          DEFAULT_WIDTH_SECONDS * MM_PER_SECOND * scaledPixelsPerMm;

        if (!container) {
          return {
            chartWidth: minWidth,
            widthSeconds: DEFAULT_WIDTH_SECONDS,
          };
        }

        const containerWidth = container.offsetWidth - CONTAINER_PADDING;

        if (containerWidth < minWidth) {
          return {
            chartWidth: minWidth,
            widthSeconds: DEFAULT_WIDTH_SECONDS,
          };
        }

        const widthSeconds =
          containerWidth / (MM_PER_SECOND * scaledPixelsPerMm);
        return {
          chartWidth: widthSeconds * MM_PER_SECOND * scaledPixelsPerMm,
          widthSeconds,
        };
      }),
      distinctUntilChanged(
        (prev, curr) =>
          prev.chartWidth === curr.chartWidth &&
          prev.widthSeconds === curr.widthSeconds
      ),
      shareReplay(1)
    );

    this.activeSegments = [];
    this.animationId = null;
    this.activeCursorData = null;
    this.allLeadsCursorData = null;
    this.qrsFlashDuration = QRS_FLASH_DURATION_MS;

    this.precomputedSegments = new Map();
    this.segmentDuration = SEGMENT_DURATION_SECONDS;
    this.dataIndexCache = new Map();

    this.backgroundCanvas = null;
    this.backgroundContext = null;
    this.waveformCanvas = null;
    this.waveformContext = null;
    this.qrsFlashCanvas = null;
    this.qrsFlashContext = null;
  },

  // =====================================
  // UTILITIES
  // =====================================

  readFormValue(fieldName) {
    const input = /** @type {HTMLInputElement | HTMLSelectElement | null} */ (
      document.querySelector(
        `input[name="settings[${fieldName}]"], select[name="settings[${fieldName}]"]`
      )
    );
    return input ? input.value : null;
  },

  readFormCheckbox(fieldName) {
    const input = /** @type {HTMLInputElement | null} */ (
      document.querySelector(
        `input[name="settings[${fieldName}]"][type="checkbox"]`
      )
    );
    return input ? input.checked : false;
  },

  calculateDataIndexForTime(leadData, targetTime) {
    if (!leadData || !leadData.times || leadData.times.length === 0) {
      console.warn("Invalid lead data provided to calculateDataIndexForTime");
      return 0;
    }

    if (typeof targetTime !== "number" || targetTime < 0) {
      console.warn(`Invalid target time: ${targetTime}`);
      return 0;
    }

    if (!this.samplingRate || this.samplingRate <= 0) {
      console.warn(`Invalid sampling rate: ${this.samplingRate}`);
      return 0;
    }

    const estimatedIndex = Math.round(targetTime * this.samplingRate);
    return Math.min(estimatedIndex, leadData.times.length - 1);
  },

  transformCoordinates(options) {
    if (!options || !options.times || !options.values || !options.bounds) {
      console.warn("Invalid options provided to transformCoordinates");
      return [];
    }

    const {
      times,
      values,
      bounds: { xOffset, yOffset, width, height },
      timeSpan,
    } = options;

    if (times.length !== values.length) {
      console.warn("Times and values arrays must have the same length");
      return [];
    }

    if (timeSpan <= 0 || width <= 0 || height <= 0) {
      console.warn("Invalid dimensions provided to transformCoordinates");
      return [];
    }

    const xScale = width / timeSpan;
    const yScale = height / (this.yMax - this.yMin);

    const coordinates = [];
    for (let i = 0; i < times.length; i++) {
      const x = xOffset + times[i] * xScale;
      const scaledValue = values[i] * this.amplitudeScale$.value;
      const y = yOffset + height - (scaledValue - this.yMin) * yScale;
      coordinates.push({ x, y });
    }

    return coordinates;
  },

  withCanvasStatePreservation(operation) {
    const wasPlaying = this.isPlaying$.value;
    if (wasPlaying) this.stopAnimation();

    operation();

    const timing = this.animationTime$.value;
    if (!wasPlaying && timing.startTime && timing.pausedTime) {
      const elapsedSeconds = (timing.pausedTime - timing.startTime) / 1000;
      const cursorProgress =
        (elapsedSeconds % this.widthSeconds) / this.widthSeconds;
      const animationCycle = Math.floor(elapsedSeconds / this.widthSeconds);
      this.processAnimationFrame(cursorProgress, animationCycle);
    }

    if (wasPlaying) {
      this.isPlaying$.next(true);
    }
  },

  recreateCanvasAndRestart() {
    this.withCanvasStatePreservation(() => {
      this.recreateCanvas();
      this.renderGridBackground();
    });
  },

  updateDisplayModeSelector(mode) {
    const displayModeSelector = /** @type {HTMLSelectElement} */ (
      document.getElementById("display-mode-selector")
    );
    if (displayModeSelector) {
      displayModeSelector.value = mode;
    }
  },

  // =====================================
  // UI CONTROLS
  // =====================================

  handleGridScaleChange() {
    this.withCanvasStatePreservation(() => {
      this.calculateMedicallyAccurateDimensions();
      this.recreateCanvas();
      this.renderGridBackground();
      this.clearWaveform();
    });
  },

  handleAmplitudeScaleChange() {
    this.withCanvasStatePreservation(() => {
      this.clearWaveform();
    });
  },

  handleHeightScaleChange() {
    this.withCanvasStatePreservation(() => {
      this.recreateCanvas();
      this.renderGridBackground();
      this.clearWaveform();
    });
  },

  updateGridScaleDisplay() {
    const gridScaleValue = document.getElementById("grid-scale-value");
    const gridScaleSpeed = document.getElementById("grid-scale-speed");

    if (gridScaleValue) {
      gridScaleValue.textContent = `${this.gridScale$.value.toFixed(2)}x`;
    }

    if (gridScaleSpeed) {
      const actualSpeed = (MM_PER_SECOND * this.gridScale$.value).toFixed(1);
      gridScaleSpeed.textContent = `${actualSpeed} mm/s`;
    }
  },

  updateAmplitudeScaleDisplay() {
    const amplitudeScaleValue = document.getElementById(
      "amplitude-scale-value"
    );
    const amplitudeScaleGain = document.getElementById("amplitude-scale-gain");

    if (amplitudeScaleValue) {
      amplitudeScaleValue.textContent = `${this.amplitudeScale$.value.toFixed(
        2
      )}x`;
    }

    if (amplitudeScaleGain) {
      const actualGain = (
        MM_PER_MILLIVOLT * this.amplitudeScale$.value
      ).toFixed(1);
      amplitudeScaleGain.textContent = `${actualGain} mm/mV`;
    }
  },

  updateHeightScaleDisplay() {
    const heightScaleValue = document.getElementById("height-scale-value");
    const heightScalePixels = document.getElementById("height-scale-pixels");

    if (heightScaleValue) {
      heightScaleValue.textContent = `${this.heightScale$.value.toFixed(2)}x`;
    }

    if (heightScalePixels) {
      const actualHeight = Math.round(CHART_HEIGHT * this.heightScale$.value);
      heightScalePixels.textContent = `${actualHeight}px`;
    }
  },

  // =====================================
  // LEAD MANAGEMENT
  // =====================================

  updateCursorStyle() {
    if (this.backgroundCanvas) {
      if (this.displayMode$.value === "single") {
        // Single lead mode: show zoom-out cursor (click to show all leads)
        this.backgroundCanvas.style.cursor = "zoom-out";
      } else {
        // Multi lead mode: show zoom-in cursor (click to zoom into a specific lead)
        this.backgroundCanvas.style.cursor = "zoom-in";
      }
    }
  },

  getLeadIndexFromClick(x, y) {
    if (!this.leadNames || this.displayMode$.value !== "multi") {
      return null;
    }

    for (let leadIndex = 0; leadIndex < this.leadNames.length; leadIndex++) {
      const { xOffset, yOffset, columnWidth } =
        this.calculateLeadGridCoordinates(leadIndex);

      // Check if click is within this lead's bounds
      if (
        x >= xOffset &&
        x <= xOffset + columnWidth &&
        y >= yOffset &&
        y <= yOffset + this.leadHeight$.value
      ) {
        return leadIndex;
      }
    }

    return null;
  },

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

  calculateLeadGridCoordinates(leadIndex) {
    const { column, row } = this.getLeadColumnAndRow(leadIndex);
    const totalColumnPadding = (COLUMNS_PER_DISPLAY - 1) * COLUMN_PADDING;
    const columnWidth =
      (this.chartWidth - totalColumnPadding) / COLUMNS_PER_DISPLAY;

    const xOffset = column * (columnWidth + COLUMN_PADDING);
    const yOffset = row * (this.leadHeight$.value + ROW_PADDING);

    return { xOffset, yOffset, columnWidth };
  },

  // =====================================
  // VISUAL CONFIGURATION
  // =====================================

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

  // =====================================
  // DATA PROCESSING
  // =====================================

  initializeECGChart() {
    if (!this.widthSeconds) {
      this.calculateMedicallyAccurateDimensions();
    }
    this.recreateCanvas();
    this.renderGridBackground();
  },

  processECGData(payload) {
    try {
      const data = payload.data;

      if (!data.fs || !data.sig_name || !data.p_signal) {
        console.error("Invalid ECG data format:", data);
        return;
      }

      this.stopAnimation();

      this.resetPlayback();

      this.samplingRate = data.fs;
      this.leadNames = data.sig_name;
      this.totalDuration = data.p_signal.length / data.fs;

      this.qrsIndexes = data.qrs || [];
      this.qrsTimestamps = this.qrsIndexes.map(
        (index) => index / this.samplingRate
      );
      this.lastQrsIndex = -1;
      this.qrsDetectedCount = 0;

      this.ecgLeadDatasets = [];

      let globalMin = Infinity;
      let globalMax = -Infinity;

      for (let leadIndex = 0; leadIndex < this.leadNames.length; leadIndex++) {
        const times = [];
        const values = [];

        for (
          let sampleIndex = 0;
          sampleIndex < data.p_signal.length;
          sampleIndex++
        ) {
          const time = sampleIndex / this.samplingRate;
          const value = data.p_signal[sampleIndex][leadIndex];

          times.push(time);
          values.push(value);

          if (value < globalMin) globalMin = value;
          if (value > globalMax) globalMax = value;
        }

        this.ecgLeadDatasets.push({ times, values });
      }

      this.yMin = -HEIGHT_MILLIVOLTS / 2;
      this.yMax = HEIGHT_MILLIVOLTS / 2;
      this.currentLeadData = this.ecgLeadDatasets[this.currentLead];

      const precomputationStream$ = this.setupDataPrecomputationStream();

      this.subscriptions.add(
        precomputationStream$.subscribe({
          next: (processedCount) => {
            // Optional: Add progress feedback here
            if (processedCount === this.ecgLeadDatasets.length) {
              console.log("Data precomputation completed");
            }
          },
          error: (error) => {
            console.error("Precomputation failed:", error);
          },
        })
      );

      this.renderGridBackground();

      this.clearWaveform();

      this.updateLeadSelectorVisibility(this.displayMode$.value);

      console.log("ECG data loaded successfully:", {
        samplingRate: this.samplingRate,
        leadNames: this.leadNames,
        totalDuration: this.totalDuration,
        leadCount: this.ecgLeadDatasets.length,
        qrsCount: this.qrsIndexes.length,
      });
    } catch (error) {
      console.error("Error processing ECG data:", error);
    }
  },

  // =====================================
  // CANVAS MANAGEMENT
  // =====================================

  calculateMedicallyAccurateDimensions() {
    // Use derived stream to update dimensions reactively
    this.chartDimensions$
      .pipe(take(1))
      .subscribe(({ chartWidth, widthSeconds }) => {
        this.chartWidth = chartWidth;
        this.widthSeconds = widthSeconds;
      });
  },

  recreateCanvas() {
    this.cleanupCanvases();

    // Use derived canvas dimensions
    this.canvasDimensions$.pipe(take(1)).subscribe(({ canvasHeight }) => {
      this.createCanvasElements(canvasHeight);
    });
  },

  createCanvasElements(canvasHeight) {
    const container = this.el.querySelector("[data-ecg-chart]");
    const devicePixelRatio = window.devicePixelRatio || 1;

    this.backgroundCanvas = document.createElement("canvas");
    this.backgroundCanvas.width = this.chartWidth * devicePixelRatio;
    this.backgroundCanvas.height = canvasHeight * devicePixelRatio;
    this.backgroundCanvas.style.width = this.chartWidth + "px";
    this.backgroundCanvas.style.height = canvasHeight + "px";
    this.backgroundCanvas.style.display = "block";
    container.appendChild(this.backgroundCanvas);

    this.backgroundContext = this.backgroundCanvas.getContext("2d");
    this.backgroundContext.scale(devicePixelRatio, devicePixelRatio);

    this.setupCanvasClickEvents();

    this.updateCursorStyle();

    this.waveformCanvas = document.createElement("canvas");
    this.waveformCanvas.width = this.chartWidth * devicePixelRatio;
    this.waveformCanvas.height = canvasHeight * devicePixelRatio;
    this.waveformCanvas.style.width = this.chartWidth + "px";
    this.waveformCanvas.style.height = canvasHeight + "px";
    this.waveformCanvas.style.display = "block";
    this.waveformCanvas.style.marginTop = `-${canvasHeight}px`; // Overlap the background canvas
    this.waveformCanvas.style.pointerEvents = "none"; // Allow clicks to pass through
    container.appendChild(this.waveformCanvas);

    this.waveformContext = this.waveformCanvas.getContext("2d");
    this.waveformContext.scale(devicePixelRatio, devicePixelRatio);

    this.qrsFlashCanvas = document.createElement("canvas");
    this.qrsFlashCanvas.width = this.chartWidth * devicePixelRatio;
    this.qrsFlashCanvas.height = canvasHeight * devicePixelRatio;
    this.qrsFlashCanvas.style.width = this.chartWidth + "px";
    this.qrsFlashCanvas.style.height = canvasHeight + "px";
    this.qrsFlashCanvas.style.display = "block";
    this.qrsFlashCanvas.style.marginTop = `-${canvasHeight}px`; // Overlap the waveform canvas
    this.qrsFlashCanvas.style.pointerEvents = "none"; // Allow clicks to pass through
    container.appendChild(this.qrsFlashCanvas);

    this.qrsFlashContext = this.qrsFlashCanvas.getContext("2d");
    this.qrsFlashContext.scale(devicePixelRatio, devicePixelRatio);
  },

  cleanupCanvases() {
    if (this.backgroundCanvas) {
      this.backgroundCanvas.remove();
      this.backgroundCanvas = null;
      this.backgroundContext = null;
    }
    if (this.waveformCanvas) {
      this.waveformCanvas.remove();
      this.waveformCanvas = null;
      this.waveformContext = null;
    }
    if (this.qrsFlashCanvas) {
      this.qrsFlashCanvas.remove();
      this.qrsFlashCanvas = null;
      this.qrsFlashContext = null;
    }
  },

  /**
   * Retrieves all the pre-computed data segments that fall within a given time range.
   * This is the main function used by the animation to get the data it needs to draw.
   * @param {number} leadIndex - The index of the ECG lead.
   * @param {number} startTime - The start of the time range in seconds.
   * @param {number} endTime - The end of the time range in seconds.
   * @returns {Array<object>} A list of pre-computed data segments.
   */
  getSegmentsForTimeRange(leadIndex, startTime, endTime) {
    const leadSegments = this.precomputedSegments.get(leadIndex);
    if (!leadSegments) return [];

    const startSegment = Math.floor(startTime / this.segmentDuration);
    const endSegment = Math.floor(endTime / this.segmentDuration);

    const segments = [];
    for (
      let segmentKey = startSegment;
      segmentKey <= endSegment;
      segmentKey++
    ) {
      const segment = leadSegments.get(segmentKey);
      if (segment) {
        segments.push(segment);
      }
    }

    return segments;
  },

  /**
   * Switches the view to a different ECG lead.
   * @param {number} leadIndex - The index of the lead to switch to.
   * @returns {void}
   */
  switchLead(leadIndex) {
    if (
      !this.ecgLeadDatasets ||
      leadIndex < 0 ||
      leadIndex >= this.ecgLeadDatasets.length
    ) {
      console.warn(`Invalid lead index: ${leadIndex}`);
      return;
    }

    const wasPlaying = this.isPlaying$.value;
    if (wasPlaying) this.stopAnimation();

    this.currentLead$.next(leadIndex);

    if (this.displayMode$.value === "single") {
      this.clearWaveform();
      this.renderGridBackground();
    }

    if (wasPlaying) {
      this.isPlaying$.next(true);
    } else {
      const timing = this.animationTime$.value;
      if (timing.startTime && timing.pausedTime) {
        const elapsedSeconds = (timing.pausedTime - timing.startTime) / 1000;
        const cursorProgress =
          (elapsedSeconds % this.widthSeconds) / this.widthSeconds;
        const animationCycle = Math.floor(elapsedSeconds / this.widthSeconds);
        this.processAnimationFrame(cursorProgress, animationCycle);
      } else {
        this.clearWaveform();
      }
    }
  },

  /**
   * Switches to the next lead in the list and notifies the server.
   * @returns {void}
   */
  switchToNextLead() {
    if (!this.ecgLeadDatasets || this.ecgLeadDatasets.length === 0) return;

    const currentLead = this.currentLead$.value;
    if (currentLead < this.ecgLeadDatasets.length - 1) {
      const nextLead = currentLead + 1;
      this.switchLead(nextLead);
    }
  },

  /**
   * Switches to the previous lead in the list and notifies the server.
   * @returns {void}
   */
  switchToPrevLead() {
    if (!this.ecgLeadDatasets || this.ecgLeadDatasets.length === 0) return;

    const currentLead = this.currentLead$.value;
    if (currentLead > 0) {
      const prevLead = currentLead - 1;
      this.switchLead(prevLead);
    }
  },

  // =====================================
  // ANIMATION & PLAYBACK
  // =====================================

  /**
   * Toggles the playback state between playing and paused and notifies the server.
   * @returns {void}
   */
  togglePlayback() {
    const newPlayingState = !this.isPlaying$.value;
    this.isPlaying$.next(newPlayingState);

    if (newPlayingState) {
      this.resumeAnimation();
    } else {
      this.pauseAnimation();
    }
  },

  handlePlaybackEnd() {
    if (this.loopEnabled$.value) {
      this.resetPlayback();
      this.startAnimation();
    } else {
      this.stopAnimation();
      this.resetPlayback();
    }
  },

  processAnimationFrame(cursorProgress, animationCycle) {
    const elapsedTime =
      animationCycle * this.widthSeconds + cursorProgress * this.widthSeconds;

    // Process QRS detection
    this.checkQrsOccurrences(elapsedTime);

    // Load data based on display mode
    if (this.displayMode$.value === "single") {
      this.loadVisibleDataForSingleLead(elapsedTime);
      this.renderSingleLeadFrame();
    } else {
      this.loadVisibleDataForAllLeads(elapsedTime);
      this.renderMultiLeadFrame();
    }

    // Render QRS indicator if active
    this.renderQrsIndicator();
  },

  renderSingleLeadFrame() {
    if (!this.activeCursorData || this.activeCursorData.times.length === 0)
      return;

    const cursorData = {
      times: this.activeCursorData.times,
      values: this.activeCursorData.values,
      cursorPosition: this.cursorPosition$.value,
      cursorWidth: SINGLE_LEAD_CURSOR_WIDTH,
    };

    this.renderLeadWaveform({
      leadIndex: this.currentLead$.value,
      leadData: null,
      bounds: {
        xOffset: 0,
        yOffset: 0,
        width: this.chartWidth,
        height: CHART_HEIGHT * this.heightScale$.value,
      },
      timeSpan: this.widthSeconds,
      cursorData,
    });
  },

  renderMultiLeadFrame() {
    if (!this.allLeadsCursorData || this.allLeadsCursorData.length === 0)
      return;

    for (const leadData of this.allLeadsCursorData) {
      const { xOffset, yOffset, columnWidth } =
        this.calculateLeadGridCoordinates(leadData.leadIndex);
      const columnTimeSpan = this.widthSeconds / COLUMNS_PER_DISPLAY;
      const columnProgress =
        (this.cursorPosition$.value / this.chartWidth) *
        (this.widthSeconds / columnTimeSpan);
      const localCursorPosition = xOffset + (columnProgress % 1) * columnWidth;

      const cursorData = {
        times: leadData.times,
        values: leadData.values,
        cursorPosition: localCursorPosition,
        cursorWidth: MULTI_LEAD_CURSOR_WIDTH,
      };

      this.renderLeadWaveform({
        leadIndex: leadData.leadIndex,
        leadData: null,
        bounds: {
          xOffset,
          yOffset,
          width: columnWidth,
          height: this.leadHeight$.value,
        },
        timeSpan: columnTimeSpan,
        cursorData,
      });
    }
  },

  renderQrsIndicator() {
    if (!this.qrsFlashActive$.value || !this.qrsFlashContext) return;

    const dotRadius = 5;
    const margin = 15;
    const dotX = this.chartWidth - margin;
    const dotY = margin;

    this.qrsFlashContext.fillStyle = "#ff0000";
    this.qrsFlashContext.beginPath();
    this.qrsFlashContext.arc(dotX, dotY, dotRadius, 0, 2 * Math.PI);
    this.qrsFlashContext.fill();
  },

  /**
   * Calculates the cursor's horizontal pixel position based on the elapsed time.
   * @param {number} elapsedTime - The total time elapsed since playback started.
   * @returns {void}
   */

  /**
   * Prepares the waveform data for the single-lead view.
   * It uses `getSegmentsForTimeRange` to efficiently fetch the visible data.
   * @param {number} elapsedTime - The total time elapsed since playback started.
   * @returns {void}
   */
  loadVisibleDataForSingleLead(elapsedTime) {
    const currentScreenStartTime =
      Math.floor(elapsedTime / this.widthSeconds) * this.widthSeconds;

    const segments = this.getSegmentsForTimeRange(
      this.currentLead$.value,
      currentScreenStartTime,
      elapsedTime
    );
    this.activeSegments = segments;

    if (segments.length > 0) {
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

      this.activeCursorData = { times, values };
    } else {
      this.activeCursorData = { times: [], values: [] };
    }
  },

  /**
   * Prepares the waveform data for the multi-lead view.
   * It fetches data for all 12 leads for the current time slice.
   * @param {number} elapsedTime - The total time elapsed since playback started.
   * @returns {void}
   */
  loadVisibleDataForAllLeads(elapsedTime) {
    const columnTimeSpan = this.widthSeconds / COLUMNS_PER_DISPLAY;
    const columnCycleStart =
      Math.floor(elapsedTime / columnTimeSpan) * columnTimeSpan;

    this.allLeadsCursorData = [];
    this.activeSegments = [];

    for (
      let leadIndex = 0;
      leadIndex < this.ecgLeadDatasets.length;
      leadIndex++
    ) {
      const segments = this.getSegmentsForTimeRange(
        leadIndex,
        columnCycleStart,
        elapsedTime
      );
      if (leadIndex === 0) {
        this.activeSegments = segments;
      }

      if (segments.length > 0) {
        const times = [];
        const values = [];

        for (const segment of segments) {
          for (let i = 0; i < segment.times.length; i++) {
            const absoluteTime = segment.originalStartTime + segment.times[i];
            if (
              absoluteTime >= columnCycleStart &&
              absoluteTime <= elapsedTime
            ) {
              times.push(absoluteTime - columnCycleStart);
              values.push(segment.values[i]);
            }
          }
        }

        this.allLeadsCursorData.push({
          leadIndex,
          times,
          values,
        });
      }
    }
  },

  checkQrsOccurrences(elapsedTime) {
    if (!this.qrsTimestamps || this.qrsTimestamps.length === 0) {
      return;
    }

    for (let i = this.lastQrsIndex + 1; i < this.qrsTimestamps.length; i++) {
      const qrsTime = this.qrsTimestamps[i];

      if (qrsTime <= elapsedTime) {
        this.qrsDetectedCount++;

        if (this.qrsDetectionSubject$) {
          this.qrsDetectionSubject$.next(qrsTime);
        }

        this.lastQrsIndex = i;
      } else {
        break;
      }
    }
  },

  clearQrsFlashArea() {
    if (!this.qrsFlashContext || !this.qrsFlashCanvas) return;

    const devicePixelRatio = window.devicePixelRatio || 1;
    const canvasHeight = this.qrsFlashCanvas.height / devicePixelRatio;

    this.qrsFlashContext.clearRect(0, 0, this.chartWidth, canvasHeight);
  },

  /**
   * Starts the animation from the beginning.
   * @returns {void}
   */
  startAnimation() {
    this.isPlaying$.next(true);
    const startTime = Date.now();
    this.animationTime$.next({ startTime, pausedTime: 0 });
    this.animationCycle$.next(0);
    this.cursorPosition$.next(0);

    this.allLeadsVisibleData = null;
  },

  /**
   * Resumes the animation from a paused state.
   * @returns {void}
   */
  resumeAnimation() {
    const currentTime = this.animationTime$.value;
    if (!currentTime.startTime) {
      this.startAnimation();
    } else {
      const pauseDuration = Date.now() - currentTime.pausedTime;
      const newStartTime = currentTime.startTime + pauseDuration;
      this.animationTime$.next({ startTime: newStartTime, pausedTime: 0 });
      this.isPlaying$.next(true);
    }
  },

  /**
   * Pauses the animation, records the pause time, and renders the final frame at the current position.
   * @returns {void}
   */
  pauseAnimation() {
    const pausedTime = Date.now();
    const currentTime = this.animationTime$.value;
    this.animationTime$.next({ startTime: currentTime.startTime, pausedTime });
    this.isPlaying$.next(false);

    const elapsedSeconds = (pausedTime - currentTime.startTime) / 1000;
    const cursorProgress =
      (elapsedSeconds % this.widthSeconds) / this.widthSeconds;
    const animationCycle = Math.floor(elapsedSeconds / this.widthSeconds);
    this.processAnimationFrame(cursorProgress, animationCycle);
  },

  /**
   * Stops the animation by setting isPlaying to false.
   * @returns {void}
   */
  stopAnimation() {
    this.isPlaying$.next(false);
  },

  /**
   * Resets the entire playback state to the beginning.
   * @returns {void}
   */
  resetPlayback() {
    this.stopAnimation();
    this.animationTime$.next({ startTime: null, pausedTime: 0 });
    this.animationCycle$.next(0);
    this.cursorPosition$.next(0);
    this.allLeadsVisibleData = null;
    this.lastQrsIndex = -1;
    this.qrsDetectedCount = 0;
    this.qrsFlashActive$.next(false);
    this.clearWaveform();
  },

  /**
   * Updates the play/pause button icon and text based on current playback state.
   * @returns {void}
   */
  updatePlayPauseButton() {
    const button = document.getElementById("play-pause-button");
    if (button) {
      const isPlaying = this.isPlaying$.value;
      const iconClass = isPlaying ? "hero-pause" : "hero-play";
      const iconHtml = `<svg class="w-4 h-4 ${iconClass}" fill="currentColor" viewBox="0 0 24 24">
        ${
          isPlaying
            ? '<path fill-rule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clip-rule="evenodd" />'
            : '<path fill-rule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clip-rule="evenodd" />'
        }
      </svg>`;

      const buttonText = isPlaying ? "Pause" : "Play";
      const textHtml = `<span class="ml-1">${buttonText}</span>`;

      button.innerHTML = iconHtml + textHtml;
    }
  },

  /**
   * Sets up event handlers for the three selectors.
   * @returns {void}
   */
  // Helper to setup event listener with duplicate prevention

  /**
   * Shows or hides the lead selector based on display mode.
   * @param {string} displayMode - The display mode ("single" or "multi")
   * @returns {void}
   */
  updateLeadSelectorVisibility(displayMode) {
    const leadSelectorContainer = document.getElementById(
      "lead-selector-container"
    );
    if (leadSelectorContainer) {
      if (displayMode === "multi") {
        leadSelectorContainer.style.display = "none";
      } else {
        leadSelectorContainer.style.display = "block";
      }
    }
  },

  /**
   * Updates the lead selector value to match the current lead.
   * @returns {void}
   */

  // =====================================
  // GRID RENDERING
  // =====================================

  /**
   * Draws the grid for a single lead, dispatching to either the graph paper or telemetry grid style.
   * @param {object} options - Grid drawing options.
   * @param {object} options.bounds - The drawing bounds.
   * @param {number} options.bounds.xOffset - The horizontal starting position.
   * @param {number} options.bounds.yOffset - The vertical starting position.
   * @param {number} options.bounds.width - The width of the grid.
   * @param {number} options.bounds.height - The height of the grid.
   * @param {CanvasRenderingContext2D} options.context - The canvas context to draw on.
   * @returns {void}
   */
  drawLeadGrid(options) {
    const {
      bounds: { xOffset, yOffset, width, height },
      context = this.waveformContext,
    } = options;

    if (this.gridType === "graph_paper") {
      this.drawMedicalGrid({
        bounds: { xOffset, yOffset, width, height },
        context,
      });
    } else {
      this.drawSimpleGrid({
        bounds: { xOffset, yOffset, width, height },
        context,
      });
    }
  },

  /**
   * Draws the text label (e.g., "V1", "II") for a lead.
   * @param {number} leadIndex - The index of the lead to label.
   * @param {number} xOffset - The horizontal starting position.
   * @param {number} yOffset - The vertical starting position.
   * @param {CanvasRenderingContext2D} context - The canvas context to draw on.
   * @returns {void}
   */
  drawLeadLabel(leadIndex, xOffset, yOffset, context = this.waveformContext) {
    if (!this.leadNames || !this.leadNames[leadIndex]) return;

    context.fillStyle = this.colors.labels;
    context.font = "12px Arial";
    context.fillText(this.leadNames[leadIndex], xOffset + 5, yOffset + 15);
  },

  /**
   * Draws a standard graph paper ECG grid with major and minor lines.
   * @param {object} options - Grid drawing options.
   * @param {object} options.bounds - The drawing bounds.
   * @param {number} options.bounds.xOffset - The horizontal starting position.
   * @param {number} options.bounds.yOffset - The vertical starting position.
   * @param {number} options.bounds.width - The width of the grid.
   * @param {number} options.bounds.height - The height of the grid.
   * @param {CanvasRenderingContext2D} options.context - The canvas context to draw on.
   * @returns {void}
   */
  drawMedicalGrid(options) {
    const {
      bounds: { xOffset, yOffset, width, height },
      context = this.waveformContext,
    } = options;

    // Use derived grid dimensions
    const { smallSquareSize, largeSquareSize } = this.gridDimensions$
      .pipe(take(1))
      .subscribe((dimensions) => {
        this.renderMedicalGridLines(
          context,
          xOffset,
          yOffset,
          width,
          height,
          dimensions.smallSquareSize,
          dimensions.largeSquareSize
        );
      });
  },

  renderMedicalGridLines(
    context,
    xOffset,
    yOffset,
    width,
    height,
    smallSquareSize,
    largeSquareSize
  ) {
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
   * Draws a simplified grid using dots instead of lines.
   * @param {object} options - Grid drawing options.
   * @param {object} options.bounds - The drawing bounds.
   * @param {number} options.bounds.xOffset - The horizontal starting position.
   * @param {number} options.bounds.yOffset - The vertical starting position.
   * @param {number} options.bounds.width - The width of the grid.
   * @param {number} options.bounds.height - The height of the grid.
   * @param {CanvasRenderingContext2D} options.context - The canvas context to draw on.
   * @returns {void}
   */
  drawSimpleGrid(options) {
    const {
      bounds: { xOffset, yOffset, width, height },
      context = this.waveformContext,
    } = options;

    // Use derived grid dimensions
    this.gridDimensions$.pipe(take(1)).subscribe(({ dotSpacing }) => {
      this.renderSimpleGridDots(
        context,
        xOffset,
        yOffset,
        width,
        height,
        dotSpacing
      );
    });
  },

  renderSimpleGridDots(context, xOffset, yOffset, width, height, dotSpacing) {
    context.fillStyle = this.colors.gridDots;

    for (let x = xOffset + 5; x < xOffset + width - 5; x += dotSpacing) {
      for (let y = 5; y < height - 5; y += dotSpacing) {
        context.beginPath();
        context.arc(x, yOffset + y, DOT_RADIUS, 0, 2 * Math.PI);
        context.fill();
      }
    }
  },

  // =====================================
  // WAVEFORM RENDERING
  // =====================================

  /**
   * Clears the entire foreground (waveform) canvas.
   * @returns {void}
   */
  clearWaveform() {
    const devicePixelRatio = window.devicePixelRatio || 1;
    const canvasHeight = this.waveformCanvas.height / devicePixelRatio;
    this.waveformContext.clearRect(0, 0, this.chartWidth, canvasHeight);
  },

  /**
   * Main rendering dispatcher, called on every animation frame.
   * It dispatches to the correct drawing function based on the display mode (single vs multi-lead).
   * @returns {void}
   */

  /**
   * Sets up canvas context for waveform drawing.
   * @param {CanvasRenderingContext2D} context - The canvas context to setup.
   * @returns {void}
   */
  setupWaveformDrawing(context = this.waveformContext) {
    context.strokeStyle = this.colors.waveform;
    context.lineWidth = WAVEFORM_LINE_WIDTH;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.beginPath();
  },

  /**
   * Calculates the bounds for clearing the cursor area.
   * @param {number} xOffset - The horizontal starting position of the lead's grid.
   * @param {number} width - The total width of the lead's grid.
   * @param {number} cursorPosition - The current horizontal pixel position of the cursor.
   * @param {number} cursorWidth - The width of the area to clear ahead of the cursor.
   * @returns {{clearX: number, clearWidth: number}} The calculated clear bounds.
   */
  calculateClearBounds(xOffset, width, cursorPosition, cursorWidth) {
    const clearX = Math.max(xOffset, cursorPosition - cursorWidth / 2);
    const clearWidth = Math.min(cursorWidth, xOffset + width - clearX);
    return { clearX, clearWidth };
  },

  /**
   * Clears a small rectangular area on the waveform canvas, typically right in
   * front of the moving cursor, to prepare for the next draw cycle.
   * @param {number} x - The horizontal position to start clearing.
   * @param {number} width - The width of the area to clear.
   * @returns {void}
   */
  clearCursorArea(x, width) {
    const devicePixelRatio = window.devicePixelRatio || 1;
    const canvasHeight = this.waveformCanvas.height / devicePixelRatio;

    this.waveformContext.clearRect(x, 0, width, canvasHeight);
  },

  /**
   * Draws a segment of the waveform up to the current cursor position.
   * It clears a small area just ahead of the cursor to create the illusion of a moving line.
   * This is the lowest-level drawing function for the animated waveform.
   * @param {object} options - Drawing options.
   * @param {Array<number>} options.times - Array of time points for the waveform segment.
   * @param {Array<number>} options.values - Array of millivolt values for the waveform segment.
   * @param {object} options.bounds - The drawing bounds.
   * @param {number} options.bounds.xOffset - The horizontal starting position of the lead's grid.
   * @param {number} options.bounds.yOffset - The vertical starting position of the lead's grid.
   * @param {number} options.bounds.width - The total width of the lead's grid.
   * @param {number} options.bounds.height - The total height of the lead's grid.
   * @param {number} options.timeSpan - The total duration shown in this grid (in seconds).
   * @param {object} options.cursor - The cursor options.
   * @param {number} options.cursor.position - The current horizontal pixel position of the cursor.
   * @param {number} options.cursor.width - The width of the area to clear ahead of the cursor.
   * @returns {void}
   */
  drawWaveformToCursor(options) {
    const {
      times,
      values,
      bounds: { xOffset, yOffset, width, height },
      timeSpan,
      cursor: { position: cursorPosition, width: cursorWidth },
    } = options;

    if (!times || times.length === 0) return;

    const { clearX, clearWidth } = this.calculateClearBounds(
      xOffset,
      width,
      cursorPosition,
      cursorWidth
    );

    if (clearWidth > 0) {
      this.clearCursorArea(clearX, clearWidth);
    }

    this.setupWaveformDrawing();

    const coordinates = this.transformCoordinates({
      times,
      values,
      bounds: { xOffset, yOffset, width, height },
      timeSpan,
    });

    let hasMovedTo = false;
    let prevPoint = null;

    for (let i = 0; i < coordinates.length; i++) {
      const { x, y } = coordinates[i];
      if (x <= cursorPosition) {
        if (!hasMovedTo) {
          this.waveformContext.moveTo(x, y);
          hasMovedTo = true;
          prevPoint = { x, y };
        } else if (prevPoint && i < coordinates.length - 1) {
          // Use quadratic curves for smoother lines
          const nextPoint = coordinates[i + 1];
          if (nextPoint && nextPoint.x <= cursorPosition) {
            const cpX = (prevPoint.x + x) / 2;
            const cpY = (prevPoint.y + y) / 2;
            this.waveformContext.quadraticCurveTo(cpX, cpY, x, y);
          } else {
            this.waveformContext.lineTo(x, y);
          }
          prevPoint = { x, y };
        } else {
          this.waveformContext.lineTo(x, y);
          prevPoint = { x, y };
        }
      }
    }

    if (hasMovedTo) {
      this.waveformContext.stroke();
    }
  },

  /**
   * Orchestrates drawing the animated cursor for the single-lead view.
   * @returns {void}
   */

  /**
   * Renders the background for a single lead, including its grid and label.
   * This is drawn to the static background canvas for performance.
   * @param {number} leadIndex - The index of the lead to render.
   * @param {number} xOffset - The horizontal starting position.
   * @param {number} yOffset - The vertical starting position.
   * @param {number} width - The width of the lead's grid.
   * @param {number} height - The height of the lead's grid.
   * @param {CanvasRenderingContext2D} context - The canvas context to draw on.
   * @returns {void}
   */
  renderLeadBackground(
    leadIndex,
    xOffset,
    yOffset,
    width,
    height,
    context = this.waveformContext
  ) {
    this.drawLeadGrid({
      bounds: { xOffset, yOffset, width, height },
      context,
    });
    this.drawLeadLabel(leadIndex, xOffset, yOffset, context);
  },

  /**
   * Renders waveform data for a single lead on the foreground canvas. It handles drawing either
   * a static waveform or an animated cursor-driven waveform. The background grid is assumed to be
   * already rendered on the background canvas.
   * @param {object} options - Rendering options.
   * @param {number} options.leadIndex - The index of the lead (used for context).
   * @param {object} options.leadData - The full dataset for the lead (for static drawing).
   * @param {object} options.bounds - The drawing bounds.
   * @param {number} options.bounds.xOffset - The horizontal starting position.
   * @param {number} options.bounds.yOffset - The vertical starting position.
   * @param {number} options.bounds.width - The width of the lead's grid.
   * @param {number} options.bounds.height - The height of the lead's grid.
   * @param {number} options.timeSpan - The total duration shown in this grid (in seconds).
   * @param {object} options.cursorData - Data for drawing the animated cursor. If null, a static waveform is drawn.
   * @returns {void}
   */
  renderLeadWaveform(options) {
    const {
      leadData,
      bounds: { xOffset, yOffset, width, height },
      timeSpan,
      cursorData = null,
    } = options;

    if (cursorData) {
      this.drawWaveformToCursor({
        times: cursorData.times,
        values: cursorData.values,
        bounds: { xOffset, yOffset, width, height },
        timeSpan,
        cursor: {
          position: cursorData.cursorPosition,
          width: cursorData.cursorWidth,
        },
      });
    } else if (leadData && leadData.times && leadData.values) {
      this.drawLeadWaveform({
        times: leadData.times,
        values: leadData.values,
        bounds: { xOffset, yOffset, width, height },
        timeSpan,
      });
    }
  },

  /**
   * Renders the entire grid background for the current display mode.
   * This function draws to the background canvas only, which is a key performance
   * optimization as the grid does not need to be redrawn on every animation frame.
   * @returns {void}
   */
  renderGridBackground() {
    if (!this.backgroundCanvas || !this.backgroundContext) return;

    const devicePixelRatio = window.devicePixelRatio || 1;
    const canvasHeight = this.backgroundCanvas.height / devicePixelRatio;

    this.backgroundContext.clearRect(0, 0, this.chartWidth, canvasHeight);

    if (this.displayMode$.value === "multi" && this.leadNames) {
      for (let i = 0; i < this.leadNames.length; i++) {
        const { xOffset, yOffset, columnWidth } =
          this.calculateLeadGridCoordinates(i);
        this.renderLeadBackground(
          i,
          xOffset,
          yOffset,
          columnWidth,
          this.leadHeight$.value,
          this.backgroundContext
        );
      }
    } else if (this.leadNames) {
      this.renderLeadBackground(
        this.currentLead$.value,
        0,
        0,
        this.chartWidth,
        CHART_HEIGHT * this.heightScale$.value,
        this.backgroundContext
      );
    }
  },

  /**
   * Draws a complete, static waveform for a given lead.
   * @param {object} options - Drawing options.
   * @param {Array<number>} options.times - Array of time points.
   * @param {Array<number>} options.values - Array of millivolt values.
   * @param {object} options.bounds - The drawing bounds.
   * @param {number} options.bounds.xOffset - The horizontal starting position.
   * @param {number} options.bounds.yOffset - The vertical starting position.
   * @param {number} options.bounds.width - The width of the drawing area.
   * @param {number} options.bounds.height - The height of the drawing area.
   * @param {number} options.timeSpan - The total duration shown in this area (in seconds).
   * @returns {void}
   */
  drawLeadWaveform(options) {
    const {
      times,
      values,
      bounds: { xOffset, yOffset, width, height },
      timeSpan,
    } = options;

    if (times.length === 0) return;

    this.setupWaveformDrawing();

    const coordinates = this.transformCoordinates({
      times,
      values,
      bounds: { xOffset, yOffset, width, height },
      timeSpan,
    });

    let hasMovedTo = false;
    let prevPoint = null;

    for (let i = 0; i < coordinates.length; i++) {
      const { x, y } = coordinates[i];
      if (!hasMovedTo) {
        this.waveformContext.moveTo(x, y);
        hasMovedTo = true;
        prevPoint = { x, y };
      } else if (prevPoint && i < coordinates.length - 1) {
        // Use quadratic curves for smoother lines
        const nextPoint = coordinates[i + 1];
        if (nextPoint) {
          const cpX = (prevPoint.x + x) / 2;
          const cpY = (prevPoint.y + y) / 2;
          this.waveformContext.quadraticCurveTo(cpX, cpY, x, y);
        } else {
          this.waveformContext.lineTo(x, y);
        }
        prevPoint = { x, y };
      } else {
        this.waveformContext.lineTo(x, y);
        prevPoint = { x, y };
      }
    }

    this.waveformContext.stroke();
  },
};

export default ECGPlayer;
