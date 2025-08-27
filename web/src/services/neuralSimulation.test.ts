import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NeuralActivitySimulator, type NeuralActivity } from './neuralSimulation'

describe('NeuralActivitySimulator', () => {
  let simulator: NeuralActivitySimulator

  beforeEach(() => {
    simulator = new NeuralActivitySimulator()
  })

  afterEach(() => {
    simulator.stop()
    vi.clearAllMocks()
  })

  it('should create an instance', () => {
    expect(simulator).toBeInstanceOf(NeuralActivitySimulator)
  })

  it('should start and stop simulation', () => {
    // Mock window.setInterval to control timing
    const setIntervalSpy = vi.spyOn(window, 'setInterval')
    const clearIntervalSpy = vi.spyOn(window, 'clearInterval')
    
    simulator.start()
    expect(setIntervalSpy).toHaveBeenCalled()
    
    simulator.stop()
    expect(clearIntervalSpy).toHaveBeenCalled()
  })

  it('should generate neural activity', () => {
    const activity = simulator.generateActivity()
    
    expect(activity).toBeDefined()
    expect(activity.timestamp).toBeGreaterThan(0)
    expect(activity.globalActivation).toBeGreaterThanOrEqual(0)
    expect(activity.globalActivation).toBeLessThanOrEqual(1)
    
    // Check regions
    expect(Object.keys(activity.regions)).toHaveLength(6) // 6 brain regions
    
    // Check brain waves
    expect(activity.brainWaves).toHaveProperty('delta')
    expect(activity.brainWaves).toHaveProperty('theta')
    expect(activity.brainWaves).toHaveProperty('alpha')
    expect(activity.brainWaves).toHaveProperty('beta')
    expect(activity.brainWaves).toHaveProperty('gamma')
    
    // Check connections
    expect(activity.connections).toBeInstanceOf(Array)
  })

  it('should maintain activity history', () => {
    // Generate multiple activities
    simulator.generateActivity()
    simulator.generateActivity()
    simulator.generateActivity()
    
    const history = simulator.getHistory()
    expect(history).toHaveLength(3)
  })

  it('should get latest activity', () => {
    simulator.generateActivity()
    const activity2 = simulator.generateActivity()
    
    const latest = simulator.getLatestActivity()
    expect(latest).toEqual(activity2)
  })

  it('should handle stimulation of regions', () => {
    // Generate initial activity
    simulator.generateActivity()
    
    // Stimulate a region
    simulator.stimulateRegion('frontal-lobe', 0.3)
    
    const latest = simulator.getLatestActivity()
    if (latest) {
      const frontalActivity = latest.regions['frontal-lobe']
      expect(frontalActivity.activation).toBeGreaterThanOrEqual(0.3)
    }
  })

  it('should set simulation speed', () => {
    const setIntervalSpy = vi.spyOn(window, 'setInterval')
    
    simulator.setSpeed(2.0) // 2x speed
    simulator.start()
    
    expect(setIntervalSpy).toHaveBeenCalled()
    // Note: We can't easily test the actual timing without more complex mocking
  })

  it('should handle edge cases', () => {
    // Test with no history
    expect(simulator.getLatestActivity()).toBeNull()
    
    // Test stimulation with no activity
    simulator.stimulateRegion('frontal-lobe', 0.5)
    // Should not throw error
  })

  it('should generate consistent activity patterns', () => {
    // Generate multiple activities and check consistency
    const activities: NeuralActivity[] = []
    for (let i = 0; i < 5; i++) {
      activities.push(simulator.generateActivity())
    }
    
    // All activities should have the same structure
    activities.forEach(activity => {
      expect(Object.keys(activity.regions)).toHaveLength(6)
      expect(Object.keys(activity.brainWaves)).toHaveLength(5)
    })
  })
})
