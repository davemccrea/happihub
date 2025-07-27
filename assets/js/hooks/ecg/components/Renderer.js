/**
 * Handles all ECG canvas rendering including grids, waveforms, and animations
 * @class Renderer
 */

const MM_PER_SECOND = 25;
const MM_PER_MILLIVOLT = 10;
const PIXELS_PER_MM = 6;
const CHART_HEIGHT = 2.5 * MM_PER_MILLIVOLT * PIXELS_PER_MM;
const WAVEFORM_LINE_WIDTH = 1.3;
const DOT_RADIUS = 1.2;
const MULTI_LEAD_HEIGHT_SCALE = 0.8;

class Renderer {
  constructor(el, store) {
    this.el = el;
    this.store = store;
    this.chartContainer = this.el.querySelector("[data-ecg-chart]");
    this.multiLeadLayout = { columns: 1, rows: 1 };

    this.backgroundCanvas = null;
    this.backgroundContext = null;
    this.waveformCanvas = null;
    this.waveformContext = null;
    this.qrsFlashCanvas = null;
    this.qrsFlashContext = null;
    this.calipersCanvas = null;
    this.calipersContext = null;

    this.updateThemeColors();
    this.recreateCanvas();
    this.renderGridBackground();
  }

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
  }

  _calculateMultiLeadLayout() {
    const numLeads = this.store.leadNames?.length || 1;
    if (numLeads <= 3) this.multiLeadLayout = { columns: 1, rows: numLeads };
    else if (numLeads <= 6) this.multiLeadLayout = { columns: 2, rows: 3 };
    else if (numLeads <= 8) this.multiLeadLayout = { columns: 2, rows: 4 };
    else if (numLeads <= 12) this.multiLeadLayout = { columns: 4, rows: 3 };
    else this.multiLeadLayout = { columns: 4, rows: Math.ceil(numLeads / 4) };
  }

  recreateCanvas() {
    this.cleanupCanvases();
    this._calculateMultiLeadLayout();

    const canvasHeight =
      this.store.displayMode === "multi"
        ? this.multiLeadLayout.rows *
          ((CHART_HEIGHT * this.store.heightScale) / MULTI_LEAD_HEIGHT_SCALE)
        : CHART_HEIGHT * this.store.heightScale;

    const leadHeight =
      this.store.displayMode === "multi"
        ? (CHART_HEIGHT * this.store.heightScale) / MULTI_LEAD_HEIGHT_SCALE
        : CHART_HEIGHT * this.store.heightScale;
    this.store.updateLeadHeight(leadHeight);

    const devicePixelRatio = window.devicePixelRatio || 1;

    this.backgroundCanvas = this.createCanvas(devicePixelRatio, canvasHeight);
    this.backgroundCanvas.setAttribute('data-canvas-id', 'background');
    this.backgroundContext = this.setupCanvasContext(
      this.backgroundCanvas,
      devicePixelRatio,
    );

    this.waveformCanvas = this.createCanvas(devicePixelRatio, canvasHeight);
    this.waveformCanvas.setAttribute('data-canvas-id', 'waveform');
    this.waveformContext = this.setupCanvasContext(
      this.waveformCanvas,
      devicePixelRatio,
    );
    this.waveformCanvas.style.marginTop = `-${canvasHeight}px`;
    this.waveformCanvas.style.pointerEvents = "none";

    this.qrsFlashCanvas = this.createCanvas(devicePixelRatio, canvasHeight);
    this.qrsFlashCanvas.setAttribute('data-canvas-id', 'qrs-flash');
    this.qrsFlashContext = this.setupCanvasContext(
      this.qrsFlashCanvas,
      devicePixelRatio,
    );
    this.qrsFlashCanvas.style.marginTop = `-${canvasHeight}px`;
    this.qrsFlashCanvas.style.pointerEvents = "none";

    this.calipersCanvas = this.createCanvas(devicePixelRatio, canvasHeight);
    this.calipersCanvas.setAttribute('data-canvas-id', 'calipers');
    this.calipersContext = this.setupCanvasContext(
      this.calipersCanvas,
      devicePixelRatio,
    );
    this.calipersCanvas.style.marginTop = `-${canvasHeight}px`;
    this.calipersCanvas.style.pointerEvents = this.store.calipersMode
      ? "auto"
      : "none";
    this.calipersCanvas.style.cursor = this.store.calipersMode
      ? "crosshair"
      : "default";

    this.chartContainer.append(
      this.backgroundCanvas,
      this.waveformCanvas,
      this.qrsFlashCanvas,
      this.calipersCanvas,
    );
  }

  createCanvas(devicePixelRatio, canvasHeight) {
    const canvas = document.createElement("canvas");
    canvas.width = this.store.chartWidth * devicePixelRatio;
    canvas.height = canvasHeight * devicePixelRatio;
    canvas.style.width = `${this.store.chartWidth}px`;
    canvas.style.height = `${canvasHeight}px`;
    canvas.style.display = "block";
    return canvas;
  }

  setupCanvasContext(canvas, devicePixelRatio) {
    const context = canvas.getContext("2d");
    context.scale(devicePixelRatio, devicePixelRatio);
    return context;
  }

  cleanupCanvases() {
    if (this.backgroundCanvas) this.backgroundCanvas.remove();
    if (this.waveformCanvas) this.waveformCanvas.remove();
    if (this.qrsFlashCanvas) this.qrsFlashCanvas.remove();
    if (this.calipersCanvas) this.calipersCanvas.remove();
  }

  renderGridBackground() {
    if (!this.backgroundContext) return;
    const devicePixelRatio = window.devicePixelRatio || 1;
    const canvasHeight = this.backgroundCanvas.height / devicePixelRatio;
    this.backgroundContext.clearRect(0, 0, this.store.chartWidth, canvasHeight);

    if (this.store.displayMode === "multi" && this.store.leadNames) {
      this.drawContinuousGrid(canvasHeight);
      for (let i = 0; i < this.store.leadNames.length; i++) {
        const { xOffset, yOffset } = this.calculateLeadGridCoordinates(i);
        this.drawLeadLabel(i, xOffset, yOffset, this.backgroundContext);
      }
    } else if (this.store.leadNames) {
      this.renderLeadBackground(
        this.store.currentLead,
        0,
        0,
        this.store.chartWidth,
        CHART_HEIGHT * this.store.heightScale,
        this.backgroundContext,
      );
    }
  }

  drawContinuousGrid(canvasHeight) {
    if (this.store.gridType === "graph_paper") {
      this.drawMedicalGrid({
        bounds: {
          xOffset: 0,
          yOffset: 0,
          width: this.store.chartWidth,
          height: canvasHeight,
        },
        context: this.backgroundContext,
      });
    } else {
      this.drawSimpleGrid({
        bounds: {
          xOffset: 0,
          yOffset: 0,
          width: this.store.chartWidth,
          height: canvasHeight,
        },
        context: this.backgroundContext,
      });
    }
  }

  renderLeadBackground(leadIndex, xOffset, yOffset, width, height, context) {
    this.drawLeadGrid({ bounds: { xOffset, yOffset, width, height }, context });
    this.drawLeadLabel(leadIndex, xOffset, yOffset, context);
  }

  drawLeadGrid({ bounds, context }) {
    if (this.store.gridType === "graph_paper")
      this.drawMedicalGrid({ bounds, context });
    else this.drawSimpleGrid({ bounds, context });
  }

  drawMedicalGrid({ bounds, context }) {
    const { xOffset, yOffset, width, height } = bounds;
    const smallSquareSize = PIXELS_PER_MM * this.store.gridScale;
    const largeSquareSize = 5 * PIXELS_PER_MM * this.store.gridScale;
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
  }

  drawSimpleGrid({ bounds, context }) {
    const { xOffset, yOffset, width, height } = bounds;
    const dotSpacing = 5 * PIXELS_PER_MM * this.store.gridScale;
    context.fillStyle = this.colors.gridDots;
    for (let x = xOffset + 5; x < xOffset + width - 5; x += dotSpacing) {
      for (let y = 5; y < height - 5; y += dotSpacing) {
        context.beginPath();
        context.arc(x, yOffset + y, DOT_RADIUS, 0, 2 * Math.PI);
        context.fill();
      }
    }
  }

  drawLeadLabel(leadIndex, xOffset, yOffset, context) {
    if (!this.store.leadNames || !this.store.leadNames[leadIndex]) return;
    context.fillStyle = this.colors.labels;
    context.font = "12px Arial";
    context.fillText(
      this.store.leadNames[leadIndex],
      xOffset + 5,
      yOffset + 15,
    );
  }

  processAnimationFrame(cursorProgress, animationCycle) {
    const elapsedTime =
      animationCycle * this.store.widthSeconds +
      cursorProgress * this.store.widthSeconds;
    if (elapsedTime >= this.store.totalDuration) {
      this.store.handlePlaybackEnd();
      return;
    }
    this.store.checkQrsOccurrences(elapsedTime);
    this.calculateCursorPosition(elapsedTime);
    if (this.store.displayMode === "single")
      this.loadVisibleDataForSingleLead(elapsedTime);
    else this.loadVisibleDataForAllLeads(elapsedTime);

    if (this.store.displayMode === "single") {
      if (
        !this.store.activeCursorData ||
        this.store.activeCursorData.times.length === 0
      )
        return;
      const cursorData = {
        times: this.store.activeCursorData.times,
        values: this.store.activeCursorData.values,
        cursorPosition: this.store.cursorPosition,
        cursorWidth: 20,
      };
      this.renderLeadWaveform({
        bounds: {
          xOffset: 0,
          yOffset: 0,
          width: this.store.chartWidth,
          height: CHART_HEIGHT * this.store.heightScale,
        },
        timeSpan: this.store.widthSeconds,
        cursorData,
      });
    } else {
      if (
        !this.store.allLeadsCursorData ||
        this.store.allLeadsCursorData.length === 0
      )
        return;
      for (const leadData of this.store.allLeadsCursorData) {
        const { xOffset, yOffset, columnWidth } =
          this.calculateLeadGridCoordinates(leadData.leadIndex);
        const columnTimeSpan =
          this.store.widthSeconds / this.multiLeadLayout.columns;
        const columnProgress =
          (this.store.cursorPosition / this.store.chartWidth) *
          (this.store.widthSeconds / columnTimeSpan);
        const localCursorPosition =
          xOffset + (columnProgress % 1) * columnWidth;
        const cursorData = {
          times: leadData.times,
          values: leadData.values,
          cursorPosition: localCursorPosition,
          cursorWidth: 8,
        };
        this.renderLeadWaveform({
          bounds: {
            xOffset,
            yOffset,
            width: columnWidth,
            height: this.store.leadHeight,
          },
          timeSpan: columnTimeSpan,
          cursorData,
        });
      }
    }

    if (this.qrsFlashContext) {
      const devicePixelRatio = window.devicePixelRatio || 1;
      const canvasHeight = this.qrsFlashCanvas.height / devicePixelRatio;
      this.qrsFlashContext.clearRect(0, 0, this.store.chartWidth, canvasHeight);
      if (this.store.qrsFlashActive) {
        this.qrsFlashContext.fillStyle = "#ff0000";
        this.qrsFlashContext.beginPath();
        this.qrsFlashContext.arc(
          this.store.chartWidth - 15,
          15,
          5,
          0,
          2 * Math.PI,
        );
        this.qrsFlashContext.fill();
      }
    }
  }

  calculateCursorPosition(elapsedTime) {
    const position =
      (elapsedTime * this.store.chartWidth) / this.store.widthSeconds;
    this.store.updateCursorPosition(position);
  }

  loadVisibleDataForSingleLead(elapsedTime) {
    const currentScreenStartTime =
      Math.floor(elapsedTime / this.store.widthSeconds) *
      this.store.widthSeconds;
    const segments = this.getSegmentsForTimeRange(
      this.store.currentLead,
      currentScreenStartTime,
      elapsedTime,
    );
    this.store.setActiveSegments(segments);
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
      this.store.setActiveCursorData({ times, values });
    } else {
      this.store.setActiveCursorData({ times: [], values: [] });
    }
  }

  loadVisibleDataForAllLeads(elapsedTime) {
    const columnTimeSpan =
      this.store.widthSeconds / this.multiLeadLayout.columns;
    const columnCycleStart =
      Math.floor(elapsedTime / columnTimeSpan) * columnTimeSpan;
    this.store.setAllLeadsCursorData([]);
    this.store.setActiveSegments([]);
    for (
      let leadIndex = 0;
      leadIndex < this.store.ecgLeadDatasets.length;
      leadIndex++
    ) {
      const segments = this.getSegmentsForTimeRange(
        leadIndex,
        columnCycleStart,
        elapsedTime,
      );
      if (leadIndex === 0) this.store.setActiveSegments(segments);
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
        this.store.addToAllLeadsCursorData({ leadIndex, times, values });
      }
    }
  }

  getSegmentsForTimeRange(leadIndex, startTime, endTime) {
    const leadSegments = this.store.precomputedSegments.get(leadIndex);
    if (!leadSegments) return [];
    const startSegment = Math.floor(startTime / 0.1);
    const endSegment = Math.floor(endTime / 0.1);
    const segments = [];
    for (
      let segmentKey = startSegment;
      segmentKey <= endSegment;
      segmentKey++
    ) {
      const segment = leadSegments.get(segmentKey);
      if (segment) segments.push(segment);
    }
    return segments;
  }

  renderLeadWaveform({ bounds, timeSpan, cursorData = null }) {
    if (cursorData) {
      this.drawWaveformToCursor({
        times: cursorData.times,
        values: cursorData.values,
        bounds,
        timeSpan,
        cursor: {
          position: cursorData.cursorPosition,
          width: cursorData.cursorWidth,
        },
      });
    } else if (leadData && leadData.times && leadData.values) {
      this.drawLeadWaveformStatic({
        times: leadData.times,
        values: leadData.values,
        bounds,
        timeSpan,
      });
    }
  }

  _drawWaveformPath(coordinates, limitX = Infinity) {
    let hasMovedTo = false;
    for (let i = 0; i < coordinates.length; i++) {
      const { x, y } = coordinates[i];
      if (x <= limitX) {
        if (!hasMovedTo) {
          this.waveformContext.moveTo(x, y);
          hasMovedTo = true;
        } else {
          this.waveformContext.lineTo(x, y);
        }
      }
    }
    return hasMovedTo;
  }

  drawWaveformToCursor({ times, values, bounds, timeSpan, cursor }) {
    if (!times || times.length === 0) return;
    const { clearX, clearWidth } = this.calculateClearBounds(
      bounds.xOffset,
      bounds.width,
      cursor.position,
      cursor.width,
    );
    if (clearWidth > 0) this.clearCursorArea(clearX, clearWidth);
    this.setupWaveformDrawing();
    const coordinates = this.transformCoordinates({
      times,
      values,
      bounds,
      timeSpan,
    });
    if (this._drawWaveformPath(coordinates, cursor.position))
      this.waveformContext.stroke();
  }

  drawLeadWaveformStatic({ times, values, bounds, timeSpan }) {
    if (!times || times.length === 0) return;
    this.setupWaveformDrawing();
    const coordinates = this.transformCoordinates({
      times,
      values,
      bounds,
      timeSpan,
    });
    if (this._drawWaveformPath(coordinates)) this.waveformContext.stroke();
  }

  calculateClearBounds(xOffset, width, cursorPosition, cursorWidth) {
    const clearX = Math.max(xOffset, cursorPosition - cursorWidth / 2);
    const clearWidth = Math.min(cursorWidth, xOffset + width - clearX);
    return { clearX, clearWidth };
  }

  clearCursorArea(x, width) {
    const devicePixelRatio = window.devicePixelRatio || 1;
    const canvasHeight = this.waveformCanvas.height / devicePixelRatio;
    this.waveformContext.clearRect(x, 0, width, canvasHeight);
  }

  setupWaveformDrawing() {
    this.waveformContext.strokeStyle = this.colors.waveform;
    this.waveformContext.lineWidth = WAVEFORM_LINE_WIDTH;
    this.waveformContext.lineCap = "round";
    this.waveformContext.lineJoin = "round";
    this.waveformContext.beginPath();
  }

  transformCoordinates({ times, values, bounds, timeSpan }) {
    if (!times || !values || !bounds) return [];
    const { xOffset, yOffset, width, height } = bounds;
    if (timeSpan <= 0 || width <= 0 || height <= 0) return [];
    const xScale = width / timeSpan;
    const yScale = height / (this.store.yMax - this.store.yMin);
    const coordinates = [];
    for (let i = 0; i < times.length; i++) {
      const x = xOffset + times[i] * xScale;
      const scaledValue = values[i] * this.store.amplitudeScale;
      const y = yOffset + height - (scaledValue - this.store.yMin) * yScale;
      coordinates.push({ x, y });
    }
    return coordinates;
  }

  calculateLeadGridCoordinates(leadIndex) {
    const { columns } = this.multiLeadLayout;
    const column = leadIndex % columns;
    const row = Math.floor(leadIndex / columns);
    const columnWidth = this.store.chartWidth / columns;
    const xOffset = column * columnWidth;
    const yOffset = row * this.store.leadHeight;
    return { xOffset, yOffset, columnWidth };
  }

  clearWaveform() {
    if (this.waveformContext) {
      const devicePixelRatio = window.devicePixelRatio || 1;
      const canvasHeight = this.waveformCanvas.height / devicePixelRatio;
      this.waveformContext.clearRect(0, 0, this.store.chartWidth, canvasHeight);
    }
  }

  clearQrsFlashArea() {
    if (this.qrsFlashContext) {
      const devicePixelRatio = window.devicePixelRatio || 1;
      const canvasHeight = this.qrsFlashCanvas.height / devicePixelRatio;
      this.qrsFlashContext.clearRect(0, 0, this.store.chartWidth, canvasHeight);
    }
  }

  cleanup() {
    this.cleanupCanvases();
  }
}

export default Renderer;
