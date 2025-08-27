import * as THREE from 'three';

export type VisualizationMode = 'structural' | 'fmri' | 'dti' | 'eeg' | 'connectivity';

export interface VisualizationSettings {
  mode: VisualizationMode;
  opacity: number;
  wireframe: boolean;
  showLabels: boolean;
  showGrid: boolean;
  showAxes: boolean;
  colorScheme: 'default' | 'viridis' | 'plasma' | 'inferno' | 'magma';
  animationSpeed: number;
}

export class VisualizationModeManager {
  private settings: VisualizationSettings;
  private onSettingsChangeCallbacks: ((settings: VisualizationSettings) => void)[] = [];

  constructor() {
    this.settings = {
      mode: 'structural',
      opacity: 1.0,
      wireframe: false,
      showLabels: true,
      showGrid: true,
      showAxes: true,
      colorScheme: 'default',
      animationSpeed: 1.0
    };
  }

  /**
   * Get current visualization settings
   */
  public getSettings(): VisualizationSettings {
    return { ...this.settings };
  }

  /**
   * Update visualization settings
   */
  public updateSettings(newSettings: Partial<VisualizationSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.notifySettingsChange();
  }

  /**
   * Set visualization mode
   */
  public setMode(mode: VisualizationMode): void {
    this.settings.mode = mode;
    this.notifySettingsChange();
  }

  /**
   * Get color for a brain region based on current color scheme
   */
  public getRegionColor(regionId: string, activationLevel: number = 0.5): THREE.Color {
    switch (this.settings.colorScheme) {
      case 'viridis':
        return this.interpolateColor(0x440154, 0x31688e, 0x35b779, 0xfde725, activationLevel);
      case 'plasma':
        return this.interpolateColor(0x0d0887, 0x6a00a8, 0xb12a90, 0xf1f1f1, activationLevel);
      case 'inferno':
        return this.interpolateColor(0x000004, 0x420a68, 0x932667, 0xfccf8c, activationLevel);
      case 'magma':
        return this.interpolateColor(0x000004, 0x3b0f70, 0x8c2981, 0xfde725, activationLevel);
      default: {
        // Default region-specific colors
        const regionColors: Record<string, number> = {
          'frontal-lobe': 0x4287f5,
          'parietal-lobe': 0x42f554,
          'temporal-lobe': 0xf542b9,
          'occipital-lobe': 0xf5c842,
          'cerebellum': 0x8a42f5,
          'brainstem': 0x42f5e0
        };
        return new THREE.Color(regionColors[regionId] || 0xffffff);
      }
    }
  }

  /**
   * Interpolate between four colors based on a value between 0 and 1
   */
  private interpolateColor(
    color1: number,
    color2: number,
    color3: number,
    color4: number,
    t: number
  ): THREE.Color {
    // Clamp t between 0 and 1
    t = Math.max(0, Math.min(1, t));
    
    // Determine which segment we're in (0-0.33, 0.33-0.66, 0.66-1)
    if (t < 0.33) {
      // Interpolate between color1 and color2
      const segmentT = t / 0.33;
      return this.blendColors(color1, color2, segmentT);
    } else if (t < 0.66) {
      // Interpolate between color2 and color3
      const segmentT = (t - 0.33) / 0.33;
      return this.blendColors(color2, color3, segmentT);
    } else {
      // Interpolate between color3 and color4
      const segmentT = (t - 0.66) / 0.34;
      return this.blendColors(color3, color4, segmentT);
    }
  }

  /**
   * Blend two colors based on a ratio
   */
  private blendColors(color1: number, color2: number, t: number): THREE.Color {
    const r1 = (color1 >> 16) & 0xff;
    const g1 = (color1 >> 8) & 0xff;
    const b1 = color1 & 0xff;
    
    const r2 = (color2 >> 16) & 0xff;
    const g2 = (color2 >> 8) & 0xff;
    const b2 = color2 & 0xff;
    
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    
    return new THREE.Color(r / 255, g / 255, b / 255);
  }

  /**
   * Get material properties based on current mode
   */
  public getMaterialProperties(regionId: string, activationLevel: number): THREE.MaterialParameters {
    const baseColor = this.getRegionColor(regionId, activationLevel);
    
    switch (this.settings.mode) {
      case 'structural':
        return {
          color: baseColor.getHex(),
          transparent: true,
          opacity: this.settings.opacity,
          wireframe: this.settings.wireframe,
          emissive: baseColor.getHex(),
          emissiveIntensity: activationLevel * 0.3
        } as THREE.MeshStandardMaterialParameters;
      
      case 'fmri':
        return {
          color: baseColor.getHex(),
          transparent: true,
          opacity: 0.7,
          wireframe: false,
          emissive: baseColor.getHex(),
          emissiveIntensity: activationLevel * 0.8
        } as THREE.MeshStandardMaterialParameters;
      
      case 'dti':
        return {
          color: baseColor.getHex(),
          transparent: true,
          opacity: 0.5,
          wireframe: true,
          emissive: 0xffffff,
          emissiveIntensity: 0.2
        } as THREE.MeshStandardMaterialParameters;
      
      case 'eeg':
        return {
          color: baseColor.getHex(),
          transparent: true,
          opacity: 0.3 + activationLevel * 0.7,
          wireframe: false,
          emissive: baseColor.getHex(),
          emissiveIntensity: activationLevel
        } as THREE.MeshStandardMaterialParameters;
      
      case 'connectivity':
        return {
          color: 0x4287f5,
          transparent: true,
          opacity: 0.4,
          wireframe: false,
          emissive: 0x42f5e0,
          emissiveIntensity: activationLevel * 0.5
        } as THREE.MeshStandardMaterialParameters;
      
      default:
        return {
          color: baseColor.getHex(),
          transparent: true,
          opacity: this.settings.opacity,
          wireframe: this.settings.wireframe
        } as THREE.MeshStandardMaterialParameters;
    }
  }

  /**
   * Register a callback for settings changes
   */
  public onSettingsChange(callback: (settings: VisualizationSettings) => void): void {
    this.onSettingsChangeCallbacks.push(callback);
  }

  /**
   * Remove a callback for settings changes
   */
  public offSettingsChange(callback: (settings: VisualizationSettings) => void): void {
    const index = this.onSettingsChangeCallbacks.indexOf(callback);
    if (index !== -1) {
      this.onSettingsChangeCallbacks.splice(index, 1);
    }
  }

  /**
   * Notify all callbacks of settings changes
   */
  private notifySettingsChange(): void {
    this.onSettingsChangeCallbacks.forEach(callback => {
      try {
        callback(this.settings);
      } catch (e) {
        console.error('Error in visualization settings change callback:', e);
      }
    });
  }

  /**
   * Get description of current visualization mode
   */
  public getModeDescription(): string {
    switch (this.settings.mode) {
      case 'structural':
        return 'Structural MRI - Shows the anatomical structure of the brain';
      case 'fmri':
        return 'Functional MRI - Visualizes brain activity through blood oxygenation';
      case 'dti':
        return 'Diffusion Tensor Imaging - Displays white matter tracts and connectivity';
      case 'eeg':
        return 'EEG Activity - Real-time electrical activity of the brain';
      case 'connectivity':
        return 'Connectivity Map - Shows connections between different brain regions';
      default:
        return 'Structural view of the brain';
    }
  }
}
