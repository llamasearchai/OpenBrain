import { describe, it, expect, beforeEach, vi } from 'vitest'
import { VisualizationModeManager } from './visualizationModes'
import * as THREE from 'three'

describe('VisualizationModeManager', () => {
  let manager: VisualizationModeManager

  beforeEach(() => {
    manager = new VisualizationModeManager()
  })

  it('should create an instance', () => {
    expect(manager).toBeInstanceOf(VisualizationModeManager)
  })

  it('should get default settings', () => {
    const settings = manager.getSettings()
    
    expect(settings).toEqual({
      mode: 'structural',
      opacity: 1.0,
      wireframe: false,
      showLabels: true,
      showGrid: true,
      showAxes: true,
      colorScheme: 'default',
      animationSpeed: 1.0
    })
  })

  it('should update settings', () => {
    manager.updateSettings({ mode: 'fmri', opacity: 0.5 })
    
    const settings = manager.getSettings()
    expect(settings.mode).toBe('fmri')
    expect(settings.opacity).toBe(0.5)
  })

  it('should set visualization mode', () => {
    manager.setMode('dti')
    
    const settings = manager.getSettings()
    expect(settings.mode).toBe('dti')
  })

  it('should get region colors', () => {
    // Test default color scheme
    const frontalColor = manager.getRegionColor('frontal-lobe')
    expect(frontalColor).toBeInstanceOf(THREE.Color)
    
    // Test other color schemes
    manager.updateSettings({ colorScheme: 'viridis' })
    const viridisColor = manager.getRegionColor('frontal-lobe', 0.5)
    expect(viridisColor).toBeInstanceOf(THREE.Color)
    
    manager.updateSettings({ colorScheme: 'plasma' })
    const plasmaColor = manager.getRegionColor('frontal-lobe', 0.5)
    expect(plasmaColor).toBeInstanceOf(THREE.Color)
  })

  it('should interpolate colors correctly', () => {
    // This tests the private interpolateColor method indirectly
    manager.updateSettings({ colorScheme: 'viridis' })
    
    const lowColor = manager.getRegionColor('frontal-lobe', 0.0)
    const midColor = manager.getRegionColor('frontal-lobe', 0.5)
    const highColor = manager.getRegionColor('frontal-lobe', 1.0)
    
    expect(lowColor).toBeInstanceOf(THREE.Color)
    expect(midColor).toBeInstanceOf(THREE.Color)
    expect(highColor).toBeInstanceOf(THREE.Color)
  })

  it('should get material properties', () => {
    // Test structural mode
    const structuralProps = manager.getMaterialProperties('frontal-lobe', 0.5)
    expect(structuralProps).toHaveProperty('color')
    expect(structuralProps).toHaveProperty('transparent')
    expect(structuralProps).toHaveProperty('opacity')
    
    // Test fMRI mode
    manager.setMode('fmri')
    const fmriProps = manager.getMaterialProperties('frontal-lobe', 0.5)
    expect(fmriProps).toHaveProperty('emissive')
    
    // Test DTI mode
    manager.setMode('dti')
    const dtiProps = manager.getMaterialProperties('frontal-lobe', 0.5)
    expect(dtiProps).toHaveProperty('wireframe')
    
    // Test EEG mode
    manager.setMode('eeg')
    const eegProps = manager.getMaterialProperties('frontal-lobe', 0.5)
    expect(eegProps).toHaveProperty('opacity')
    
    // Test connectivity mode
    manager.setMode('connectivity')
    const connectivityProps = manager.getMaterialProperties('frontal-lobe', 0.5)
    expect(connectivityProps).toHaveProperty('emissive')
  })

  it('should handle settings change callbacks', () => {
    const callback = vi.fn()
    manager.onSettingsChange(callback)
    
    manager.updateSettings({ opacity: 0.8 })
    expect(callback).toHaveBeenCalledWith(expect.objectContaining({ opacity: 0.8 }))
    
    // Remove callback
    manager.offSettingsChange(callback)
    manager.updateSettings({ opacity: 0.6 })
    // Callback should not be called again
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('should get mode descriptions', () => {
    manager.setMode('structural')
    expect(manager.getModeDescription()).toContain('Structural MRI')
    
    manager.setMode('fmri')
    expect(manager.getModeDescription()).toContain('Functional MRI')
    
    manager.setMode('dti')
    expect(manager.getModeDescription()).toContain('Diffusion Tensor Imaging')
    
    manager.setMode('eeg')
    expect(manager.getModeDescription()).toContain('EEG Activity')
    
    manager.setMode('connectivity')
    expect(manager.getModeDescription()).toContain('Connectivity Map')
  })

  it('should handle edge cases', () => {
    // Test unknown region
    const unknownColor = manager.getRegionColor('unknown-region')
    expect(unknownColor).toBeInstanceOf(THREE.Color)
    
    // Test invalid activation levels
    const lowActivation = manager.getRegionColor('frontal-lobe', -0.5)
    const highActivation = manager.getRegionColor('frontal-lobe', 1.5)
    expect(lowActivation).toBeInstanceOf(THREE.Color)
    expect(highActivation).toBeInstanceOf(THREE.Color)
  })
})