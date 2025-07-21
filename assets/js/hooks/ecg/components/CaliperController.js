
import { action } from "mobx";

class CaliperController {
  constructor(el, store, canvas) {
    this.el = el;
    this.store = store;
    this.canvas = canvas;
    this.context = canvas.getContext("2d");

    this.isDragging = false;
    this.dragStartPoint = null;
    this.eventListeners = [];

    // Button handling is now managed by UIBinder with MobX autorun
  }

  // Button handling and UI updates are now managed by UIBinder with MobX reactions

  updateCalipersInteraction() {
    if (this.canvas) {
      this.canvas.style.pointerEvents = this.store.calipersMode ? "auto" : "none";
      this.canvas.style.cursor = this.store.calipersMode ? "crosshair" : "default";

      if (this.store.calipersMode) {
        this.setupCalipersEventListeners();
      } else {
        this.removeCalipersEventListeners();
      }
    }
  }

  setupCalipersEventListeners() {
    const downHandler = (event) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      if (!this.store.activeCaliper || this.store.activeCaliper.complete) {
        this.startCaliper(x, y);
      }
    };

    const moveHandler = (event) => {
      if (this.isDragging && this.store.activeCaliper) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        this.updateCaliper(x, y);
      }
    };

    const upHandler = () => {
      if (this.isDragging) {
        this.finishCaliper();
      }
    };

    this.canvas.addEventListener("mousedown", downHandler);
    document.addEventListener("mousemove", moveHandler);
    document.addEventListener("mouseup", upHandler);

    this.eventListeners.push({ target: this.canvas, type: "mousedown", handler: downHandler });
    this.eventListeners.push({ target: document, type: "mousemove", handler: moveHandler });
    this.eventListeners.push({ target: document, type: "mouseup", handler: upHandler });
  }

  removeCalipersEventListeners() {
    this.eventListeners.forEach(({ target, type, handler }) => {
      target.removeEventListener(type, handler);
    });
    this.eventListeners = [];
  }

  startCaliper(x, y) {
    if (this.store.activeCaliper && this.store.activeCaliper.complete) {
      this.clearCalipers();
    }

    this.isDragging = true;
    this.dragStartPoint = { x, y };

    action(() => {
      this.store.activeCaliper = {
        id: Date.now(),
        type: 'time',
        startX: x,
        startY: y,
        endX: x,
        endY: y,
        complete: false
      };
      this.store.calipers = [this.store.activeCaliper];
    })();

    this.renderCalipers();
  }

  updateCaliper(x, y) {
    if (this.store.activeCaliper) {
      action(() => {
        this.store.activeCaliper.endX = x;
        this.store.activeCaliper.endY = y;
      })();
      this.renderCalipers();
    }
  }

  finishCaliper() {
    if (this.store.activeCaliper) {
      action(() => {
        this.store.activeCaliper.complete = true;
      })();
      this.isDragging = false;
      this.dragStartPoint = null;
      this.renderCalipers();
    }
  }

  clearCalipers() {
    action(() => {
      this.store.calipers = [];
      this.store.activeCaliper = null;
    })();
    this.isDragging = false;
    this.dragStartPoint = null;
    if (this.context) {
      const devicePixelRatio = window.devicePixelRatio || 1;
      const canvasHeight = this.canvas.height / devicePixelRatio;
      this.context.clearRect(0, 0, this.store.chartWidth, canvasHeight);
    }
  }

  renderCalipers() {
    if (!this.context) return;

    const devicePixelRatio = window.devicePixelRatio || 1;
    const canvasHeight = this.canvas.height / devicePixelRatio;
    this.context.clearRect(0, 0, this.store.chartWidth, canvasHeight);

    this.store.calipers.forEach(caliper => {
      this.renderSingleCaliper(caliper);
    });
  }

  renderSingleCaliper(caliper) {
    const { startX, startY, endX, endY, complete } = caliper;
    const activeColor = "#4A90E2";
    const completeColor = "#27AE60";
    const color = complete ? completeColor : activeColor;

    this.context.strokeStyle = color;
    this.context.fillStyle = color;
    this.context.lineWidth = 2;
    this.context.lineCap = "round";

    this.drawProfessionalCaliper(startX, startY, endX, endY, color);

    if (complete) {
      this.drawMeasurementText(caliper);
    }
  }

  drawProfessionalCaliper(startX, startY, endX, endY, color) {
    this.context.beginPath();
    this.context.moveTo(startX, startY);
    this.context.lineTo(endX, endY);
    this.context.stroke();

    this.drawPerpendicularMarker(startX, startY, endX, endY);
    this.drawPerpendicularMarker(endX, endY, startX, startY);

    this.drawMeasurementIndicator(startX, startY, color);
    this.drawMeasurementIndicator(endX, endY, color);
  }

  drawPerpendicularMarker(x, y, refX, refY) {
    const markerLength = 16;
    const dx = refX - x;
    const dy = refY - y;
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length > 0) {
      const perpX = -dy / length;
      const perpY = dx / length;
      this.context.beginPath();
      this.context.moveTo(x + perpX * markerLength / 2, y + perpY * markerLength / 2);
      this.context.lineTo(x - perpX * markerLength / 2, y - perpY * markerLength / 2);
      this.context.stroke();
    } else {
      this.context.beginPath();
      this.context.moveTo(x, y - markerLength / 2);
      this.context.lineTo(x, y + markerLength / 2);
      this.context.stroke();
    }
  }

  drawMeasurementIndicator(x, y, color) {
    const size = 4;
    this.context.fillStyle = color;
    this.context.beginPath();
    this.context.moveTo(x, y - size);
    this.context.lineTo(x - size, y + size);
    this.context.lineTo(x + size, y + size);
    this.context.closePath();
    this.context.fill();
  }

  drawMeasurementText(caliper) {
    const measurement = this.calculateTimeInterval(caliper.startX, caliper.endX);
    const midX = (caliper.startX + caliper.endX) / 2;
    const midY = (caliper.startY + caliper.endY) / 2;

    this.context.font = "bold 11px monospace";
    this.context.textAlign = "center";

    const timeText = `${measurement.milliseconds.toFixed(0)}ms`;
    const bpmText = measurement.heartRate > 0 ? `${measurement.heartRate.toFixed(0)} BPM` : "";

    const textMetrics = this.context.measureText(timeText);
    const boxWidth = Math.max(textMetrics.width, this.context.measureText(bpmText).width) + 12;
    const boxHeight = bpmText ? 30 : 18;
    const textY = midY - 30;

    this.context.fillStyle = "rgba(255, 255, 255, 0.95)";
    this.context.fillRect(midX - boxWidth / 2, textY - 14, boxWidth, boxHeight);

    this.context.strokeStyle = "rgba(0, 0, 0, 0.2)";
    this.context.lineWidth = 1;
    this.context.strokeRect(midX - boxWidth / 2, textY - 14, boxWidth, boxHeight);

    this.context.fillStyle = "#2C3E50";
    this.context.fillText(timeText, midX, textY);
    if (bpmText) {
      this.context.fillText(bpmText, midX, textY + 14);
    }
  }

  calculateTimeInterval(startX, endX) {
    const timePerPixel = this.store.widthSeconds / this.store.chartWidth;
    const interval = Math.abs(endX - startX) * timePerPixel;
    return {
      milliseconds: interval * 1000,
      heartRate: interval > 0 ? 60 / interval : 0
    };
  }

  cleanup() {
    this.removeCalipersEventListeners();
  }
}

export default CaliperController;
