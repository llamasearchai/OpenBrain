import { BRAIN_REGIONS } from '../data/brainRegions';
import type { BrainRegion } from '../data/brainRegions';

export interface NeuralActivity {
  timestamp: number;
  globalActivation: number;
  regions: Record<string, RegionActivity>;
  connections: ConnectionActivity[];
  brainWaves: BrainWaves;
}

export interface RegionActivity {
  activation: number;
  connectivity: number;
  temperature: number;
  bloodFlow: number;
}

export interface ConnectionActivity {
  source: string;
  target: string;
  strength: number;
  direction: 'forward' | 'backward' | 'bidirectional';
}

export interface BrainWaves {
  delta: number; // 0.5-4 Hz - Deep sleep
  theta: number; // 4-8 Hz - Drowsiness, meditation
  alpha: number; // 8-13 Hz - Relaxed wakefulness
  beta: number;  // 13-30 Hz - Active thinking
  gamma: number; // 30-100 Hz - High-level information processing
}

export class NeuralActivitySimulator {
  private regions: BrainRegion[];
  private activityHistory: NeuralActivity[] = [];
  private simulationSpeed: number = 1.0;
  private isRunning: boolean = false;
  private simulationInterval: number | null = null;

  constructor() {
    this.regions = BRAIN_REGIONS;
  }

  /**
   * Start the neural activity simulation
   * @param speed - Simulation speed multiplier (1.0 = real-time)
   */
  public start(speed: number = 1.0): void {
    if (this.isRunning) return;
    
    this.simulationSpeed = speed;
    this.isRunning = true;
    
    // Generate initial activity
    this.generateActivity();
    
    // Set up continuous simulation
    this.simulationInterval = window.setInterval(() => {
      this.generateActivity();
    }, 250 / this.simulationSpeed); // Update 4 times per second at normal speed
  }

  /**
   * Stop the neural activity simulation
   */
  public stop(): void {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
    this.isRunning = false;
  }

  /**
   * Generate a single frame of neural activity
   */
  public generateActivity(): NeuralActivity {
    const timestamp = Date.now();
    
    // Generate global activation with some randomness
    const globalActivation = this.generateGlobalActivation();
    
    // Generate region-specific activity
    const regions: Record<string, RegionActivity> = {};
    this.regions.forEach(region => {
      regions[region.id] = this.generateRegionActivity(region, globalActivation);
    });
    
    // Generate connection activity between regions
    const connections = this.generateConnectionActivity();
    
    // Generate brain wave patterns
    const brainWaves = this.generateBrainWaves(globalActivation);
    
    const activity: NeuralActivity = {
      timestamp,
      globalActivation,
      regions,
      connections,
      brainWaves
    };
    
    // Keep history for analysis (limit to last 100 frames)
    this.activityHistory.push(activity);
    if (this.activityHistory.length > 100) {
      this.activityHistory.shift();
    }
    
    return activity;
  }

  /**
   * Get the latest neural activity
   */
  public getLatestActivity(): NeuralActivity | null {
    if (this.activityHistory.length === 0) return null;
    return this.activityHistory[this.activityHistory.length - 1] ?? null;
  }

  /**
   * Get activity history
   */
  public getHistory(): NeuralActivity[] {
    return [...this.activityHistory];
  }

  /**
   * Generate global brain activation level
   */
  private generateGlobalActivation(): number {
    // Base activation with some randomness
    const base = 0.5;
    const random = (Math.random() - 0.5) * 0.3;
    const timeFactor = Math.sin(Date.now() / 10000) * 0.1; // Slow oscillation
    
    return Math.max(0, Math.min(1, base + random + timeFactor));
  }

  /**
   * Generate activity for a specific brain region
   */
  private generateRegionActivity(region: BrainRegion, globalActivation: number): RegionActivity {
    // Region-specific base activation
    let baseActivation = globalActivation;
    
    // Add region-specific variations
    switch (region.id) {
      case "frontal-lobe":
        baseActivation *= 1.2; // Frontal lobe is often highly active
        break;
      case "temporal-lobe":
        baseActivation *= 0.9; // Slightly less active
        break;
      case "occipital-lobe":
        baseActivation *= 0.8; // Less active when not processing visual input
        break;
      default:
        baseActivation *= (0.9 + Math.random() * 0.2); // Small variation
    }
    
    // Add temporal randomness
    const random = (Math.random() - 0.5) * 0.2;
    
    // Ensure activation is within valid range
    const activation = Math.max(0, Math.min(1, baseActivation + random));
    
    return {
      activation,
      connectivity: Math.max(0, Math.min(1, activation * (0.7 + Math.random() * 0.3))),
      temperature: 36.5 + (activation * 2), // Brain temperature variation
      bloodFlow: 0.5 + (activation * 0.5) // Blood flow as a percentage
    };
  }

  /**
   * Generate connection activity between brain regions
   */
  private generateConnectionActivity(): ConnectionActivity[] {
    const connections: ConnectionActivity[] = [];
    
    // Create connections between adjacent regions
    for (let i = 0; i < this.regions.length - 1; i++) {
      const source = this.regions[i]!;
      const target = this.regions[i + 1]!;
      
      // Connection strength based on region activity
      const sourceActivity = this.getRegionActivity(source.id);
      const targetActivity = this.getRegionActivity(target.id);
      
      if (sourceActivity && targetActivity) {
        const strength = (sourceActivity.activation + targetActivity.activation) / 2;
        
        connections.push({
          source: source.id,
          target: target.id,
          strength: Math.max(0, Math.min(1, strength + (Math.random() - 0.5) * 0.2)),
          direction: Math.random() > 0.5 ? 'forward' : 'bidirectional'
        });
      }
    }
    
    // Add some random connections
    for (let i = 0; i < 3; i++) {
      const sourceIndex = Math.floor(Math.random() * this.regions.length);
      const targetIndex = Math.floor(Math.random() * this.regions.length);
      
      if (sourceIndex !== targetIndex) {
        const source = this.regions[sourceIndex];
        const target = this.regions[targetIndex];
        if (!source || !target) continue;
        
        connections.push({
          source: source.id,
          target: target.id,
          strength: Math.random() * 0.5,
          direction: 'bidirectional'
        });
      }
    }
    
    return connections;
  }

  /**
   * Generate brain wave patterns
   */
  private generateBrainWaves(globalActivation: number): BrainWaves {
    const time = Date.now() / 1000;
    
    // Delta waves (deep sleep) - normally low when awake
    const delta = Math.max(0, Math.min(1, 0.1 + Math.sin(time * 0.5) * 0.05));
    
    // Theta waves (drowsiness) - moderate when relaxed
    const theta = Math.max(0, Math.min(1, 0.3 + Math.sin(time * 1.2) * 0.1));
    
    // Alpha waves (relaxed wakefulness) - higher when relaxed
    const alpha = Math.max(0, Math.min(1, 0.4 + Math.sin(time * 2) * 0.2 + (1 - globalActivation) * 0.3));
    
    // Beta waves (active thinking) - higher when active
    const beta = Math.max(0, Math.min(1, 0.5 + Math.sin(time * 8) * 0.3 + globalActivation * 0.4));
    
    // Gamma waves (high-level processing) - highest during complex tasks
    const gamma = Math.max(0, Math.min(1, 0.2 + Math.sin(time * 20) * 0.1 + globalActivation * 0.3));
    
    return { delta, theta, alpha, beta, gamma };
  }

  /**
   * Get activity for a specific region in the latest frame
   */
  private getRegionActivity(regionId: string): RegionActivity | null {
    const latest = this.getLatestActivity();
    if (!latest) return null;
    return latest.regions[regionId] || null;
  }

  /**
   * Set simulation speed
   */
  public setSpeed(speed: number): void {
    this.simulationSpeed = speed;
    
    // Restart simulation with new speed if running
    if (this.isRunning) {
      this.stop();
      this.start(speed);
    }
  }

  /**
   * Simulate increased activity in a specific region
   */
  public stimulateRegion(regionId: string, intensity: number = 0.5): void {
    const latest = this.getLatestActivity();
    if (!latest) return;
    
    if (latest.regions[regionId]) {
      latest.regions[regionId].activation = Math.min(1, latest.regions[regionId].activation + intensity);
    }
  }
}
