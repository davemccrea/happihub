import { describe, it, expect } from 'vitest';
import { createActor } from 'xstate';
import { ecgPlayerMachine } from '../../js/hooks/ecg/ecg_player_machine.js';

describe('ECGPlayer State Machine', () => {
  describe('Display Mode States', () => {
    it('should start in single display mode state', () => {
      const actor = createActor(ecgPlayerMachine, {
        input: {
          loopEnabled: false,
          gridType: 'telemetry', 
          displayMode: 'single',
          currentLead: 0,
          gridScale: 1.0,
          amplitudeScale: 1.0,
          heightScale: 1.0,
          qrsIndicatorEnabled: false
        }
      });
      
      actor.start();
      
      expect(actor.getSnapshot().value.display).toBe('single');
    });

    it('should transition to multi mode when CHANGE_DISPLAY_MODE event is sent', () => {
      const actor = createActor(ecgPlayerMachine, {
        input: {
          loopEnabled: false,
          gridType: 'telemetry',
          displayMode: 'single', 
          currentLead: 0,
          gridScale: 1.0,
          amplitudeScale: 1.0,
          heightScale: 1.0,
          qrsIndicatorEnabled: false
        }
      });
      
      actor.start();
      
      actor.send({ 
        type: 'CHANGE_DISPLAY_MODE', 
        displayMode: 'multi' 
      });
      
      expect(actor.getSnapshot().value.display).toBe('multi');
    });

    it('should transition from multi back to single mode', () => {
      const actor = createActor(ecgPlayerMachine, {
        input: {
          loopEnabled: false,
          gridType: 'telemetry',
          displayMode: 'multi',
          currentLead: 0, 
          gridScale: 1.0,
          amplitudeScale: 1.0,
          heightScale: 1.0,
          qrsIndicatorEnabled: false
        }
      });
      
      actor.start();
      
      expect(actor.getSnapshot().value.display).toBe('multi');
      
      actor.send({
        type: 'CHANGE_DISPLAY_MODE',
        displayMode: 'single'
      });
      
      expect(actor.getSnapshot().value.display).toBe('single');
    });

    it('should not have displayMode in context when using state-based approach', () => {
      const actor = createActor(ecgPlayerMachine, {
        input: {
          loopEnabled: false,
          gridType: 'telemetry',
          displayMode: 'single',
          currentLead: 0,
          gridScale: 1.0,
          amplitudeScale: 1.0,
          heightScale: 1.0,
          qrsIndicatorEnabled: false
        }
      });
      
      actor.start();
      
      expect(actor.getSnapshot().context.display).not.toHaveProperty('displayMode');
    });
  });
});