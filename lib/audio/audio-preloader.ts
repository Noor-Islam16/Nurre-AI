/**
 * Audio Preloader - Progressive loading based on network speed
 * Works with AudioManager to intelligently preload audio
 */

import { audioManager, SoundType } from './audio-manager';

interface PreloadConfig {
  priority: SoundType[];
  optional: SoundType[];
  networkAware: boolean;
}

class AudioPreloader {
  private isPreloading = false;
  private preloadQueue: SoundType[] = [];
  private networkSpeed: 'slow' | 'medium' | 'fast' = 'medium';
  
  constructor() {
    this.detectNetworkSpeed();
  }
  
  /**
   * Start preloading based on configuration
   */
  public async startPreloading(config: PreloadConfig): Promise<void> {
    if (this.isPreloading) return;
    
    this.isPreloading = true;
    
    // Determine what to preload based on network speed
    const toPreload = this.determinePreloadList(config);
    
    // Start progressive preloading
    await this.progressivePreload(toPreload);
    
    this.isPreloading = false;
  }
  
  /**
   * Preload on interaction (hover, focus, etc.)
   */
  public preloadOnInteraction(soundType: SoundType): void {
    // Only preload if not already loading/loaded
    const stats = audioManager.getCacheStats();
    
    // Simple check - could be enhanced
    if (stats.size < 5) {
      audioManager.preload(soundType).catch(() => {
        // Ignore preload errors
      });
    }
  }
  
  /**
   * Determine what to preload based on network conditions
   */
  private determinePreloadList(config: PreloadConfig): SoundType[] {
    if (!config.networkAware) {
      return [...config.priority, ...config.optional];
    }
    
    switch (this.networkSpeed) {
      case 'fast':
        // Preload everything
        return [...config.priority, ...config.optional];
      
      case 'medium':
        // Preload priority + some optional
        return [...config.priority, ...config.optional.slice(0, 2)];
      
      case 'slow':
        // Only preload high priority
        return config.priority.slice(0, 2);
      
      default:
        return config.priority;
    }
  }
  
  /**
   * Progressive preloading with delays
   */
  private async progressivePreload(sounds: SoundType[]): Promise<void> {
    for (let i = 0; i < sounds.length; i++) {
      try {
        await audioManager.preload(sounds[i]);
        
        // Add delay between preloads to avoid blocking
        if (i < sounds.length - 1) {
          await this.delay(this.getPreloadDelay());
        }
      } catch (error) {
        // Continue with next sound even if one fails
        console.warn(`Failed to preload ${sounds[i]}:`, error);
      }
    }
  }
  
  /**
   * Detect network speed (simplified)
   */
  private detectNetworkSpeed(): void {
    if (typeof window === 'undefined') return;
    
    // Use Navigation Timing API if available
    if ('connection' in navigator) {
      const conn = (navigator as any).connection;
      
      if (conn?.effectiveType) {
        switch (conn.effectiveType) {
          case '4g':
            this.networkSpeed = 'fast';
            break;
          case '3g':
            this.networkSpeed = 'medium';
            break;
          case '2g':
          case 'slow-2g':
            this.networkSpeed = 'slow';
            break;
          default:
            this.networkSpeed = 'medium';
        }
      }
    }
    
    // Listen for network changes
    if ('connection' in navigator) {
      const conn = (navigator as any).connection;
      conn?.addEventListener('change', () => {
        this.detectNetworkSpeed();
      });
    }
  }
  
  /**
   * Get delay based on network speed
   */
  private getPreloadDelay(): number {
    switch (this.networkSpeed) {
      case 'fast':
        return 100; // 100ms between preloads
      case 'medium':
        return 300; // 300ms between preloads
      case 'slow':
        return 1000; // 1s between preloads
      default:
        return 300;
    }
  }
  
  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Check if should preload based on data saver preference
   */
  public shouldPreload(): boolean {
    if (typeof window === 'undefined') return false;
    
    // Check for data saver preference
    if ('connection' in navigator) {
      const conn = (navigator as any).connection;
      if (conn?.saveData) {
        return false; // Don't preload if data saver is on
      }
    }
    
    // Check localStorage preference
    try {
      const prefs = localStorage.getItem('audioPreloadPreference');
      if (prefs === 'disabled') {
        return false;
      }
    } catch {
      // Ignore localStorage errors
    }
    
    return true;
  }
}

// Export singleton instance
export const audioPreloader = new AudioPreloader();

// Usage example configuration
export const defaultPreloadConfig: PreloadConfig = {
  priority: ['timer-start', 'timer-end'], // High priority - small files
  optional: ['rain', 'forest', 'ocean'], // Optional - larger files
  networkAware: true
};