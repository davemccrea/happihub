
import { describe, it, expect, beforeEach } from 'vitest';
import ECGStore from './ECGStore';

describe('ECGStore', () => {
  let store;

  beforeEach(() => {
    store = new ECGStore();
  });

  it('should initialize with default values', () => {
    expect(store.isPlaying).toBe(false);
    expect(store.displayMode).toBe('single');
    expect(store.gridScale).toBe(1.0);
    expect(store.amplitudeScale).toBe(1.0);
    expect(store.heightScale).toBe(1.2);
    expect(store.ecgData).toBe(null);
  });

  it('should toggle playback', () => {
    store.togglePlayback();
    expect(store.isPlaying).toBe(true);
    store.togglePlayback();
    expect(store.isPlaying).toBe(false);
  });

  it('should set grid scale', () => {
    store.setGridScale(1.5);
    expect(store.gridScale).toBe(1.5);
  });

  it('should switch lead', () => {
    store.ecgLeadDatasets = [{}, {}, {}];
    store.switchLead(1);
    expect(store.currentLead).toBe(1);
  });
});
