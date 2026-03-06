/**
 * Audio Manager for lazy loading and caching audio files
 * Singleton pattern to manage all audio resources efficiently
 */

export type SoundType = 'rain' | 'forest' | 'ocean' | 'cafe' | 'whitenoise' | 'timer-start' | 'timer-end';

interface AudioEntry {
  audio: HTMLAudioElement;
  loaded: boolean;
  loading: boolean;
  error: Error | null;
  lastUsed: number;
}

interface AudioManagerOptions {
  preload?: boolean;
  cacheSize?: number;
  autoCleanup?: boolean;
}

class AudioManager {
  private static instance: AudioManager;
  private audioCache: Map<SoundType, AudioEntry> = new Map();
  private loadingPromises: Map<SoundType, Promise<HTMLAudioElement>> = new Map();
  private readonly maxCacheSize: number = 10;
  private readonly cleanupThreshold: number = 5 * 60 * 1000; // 5 minutes
  private cleanupTimer: NodeJS.Timeout | null = null;
  
  private constructor(options: AudioManagerOptions = {}) {
    this.maxCacheSize = options.cacheSize || 10;
    
    if (options.autoCleanup !== false) {
      this.startAutoCleanup();
    }
    
    // Check localStorage for previous audio usage
    if (options.preload && typeof window !== 'undefined') {
      this.preloadFromHistory();
    }
  }
  
  public static getInstance(options?: AudioManagerOptions): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager(options);
    }
    return AudioManager.instance;
  }
  
  /**
   * Load and return an audio element, using cache if available
   */
  public async loadAudio(soundType: SoundType): Promise<HTMLAudioElement> {
    // Check if already cached
    const cached = this.audioCache.get(soundType);
    if (cached?.loaded && cached.audio) {
      cached.lastUsed = Date.now();
      return cached.audio;
    }
    
    // Check if already loading
    const loadingPromise = this.loadingPromises.get(soundType);
    if (loadingPromise) {
      return loadingPromise;
    }
    
    // Start loading
    const promise = this.loadAudioFile(soundType);
    this.loadingPromises.set(soundType, promise);
    
    try {
      const audio = await promise;
      this.loadingPromises.delete(soundType);
      return audio;
    } catch (error) {
      this.loadingPromises.delete(soundType);
      throw error;
    }
  }
  
  /**
   * Load and immediately play audio
   */
  public async loadAndPlay(
    soundType: SoundType,
    options: { volume?: number; loop?: boolean } = {}
  ): Promise<HTMLAudioElement> {
    const audio = await this.loadAudio(soundType);
    
    if (options.volume !== undefined) {
      audio.volume = Math.max(0, Math.min(1, options.volume));
    }
    
    if (options.loop !== undefined) {
      audio.loop = options.loop;
    }
    
    try {
      await audio.play();
      this.recordUsage(soundType);
    } catch (error) {
      console.error(`Failed to play ${soundType}:`, error);
      throw error;
    }
    
    return audio;
  }
  
  /**
   * Preload audio without playing
   */
  public async preload(soundType: SoundType): Promise<void> {
    await this.loadAudio(soundType);
  }
  
  /**
   * Preload multiple audio files
   */
  public async preloadMultiple(soundTypes: SoundType[]): Promise<void> {
    await Promise.all(soundTypes.map(type => this.preload(type)));
  }
  
  /**
   * Stop and cleanup a specific audio
   */
  public stop(soundType: SoundType): void {
    const entry = this.audioCache.get(soundType);
    if (entry?.audio) {
      entry.audio.pause();
      entry.audio.currentTime = 0;
    }
  }
  
  /**
   * Stop all playing audio
   */
  public stopAll(): void {
    this.audioCache.forEach((entry) => {
      if (entry.audio) {
        entry.audio.pause();
        entry.audio.currentTime = 0;
      }
    });
  }
  
  /**
   * Clear cache for memory management
   */
  public clearCache(force: boolean = false): void {
    if (force) {
      this.stopAll();
      this.audioCache.clear();
    } else {
      // Only clear entries older than threshold
      const now = Date.now();
      const entriesToRemove: SoundType[] = [];
      
      this.audioCache.forEach((entry, soundType) => {
        if (now - entry.lastUsed > this.cleanupThreshold) {
          if (entry.audio) {
            entry.audio.pause();
            entry.audio.src = '';
          }
          entriesToRemove.push(soundType);
        }
      });
      
      entriesToRemove.forEach(type => this.audioCache.delete(type));
    }
  }
  
  /**
   * Get cache statistics
   */
  public getCacheStats(): {
    size: number;
    loaded: number;
    loading: number;
    errors: number;
  } {
    let loaded = 0;
    let loading = 0;
    let errors = 0;
    
    this.audioCache.forEach((entry) => {
      if (entry.loaded) loaded++;
      if (entry.loading) loading++;
      if (entry.error) errors++;
    });
    
    return {
      size: this.audioCache.size,
      loaded,
      loading,
      errors
    };
  }
  
  /**
   * Private: Actually load the audio file
   */
  private async loadAudioFile(soundType: SoundType): Promise<HTMLAudioElement> {
    return new Promise((resolve, reject) => {
      const audio = new Audio(`/sounds/${soundType}.mp3`);
      
      const entry: AudioEntry = {
        audio,
        loaded: false,
        loading: true,
        error: null,
        lastUsed: Date.now()
      };
      
      this.audioCache.set(soundType, entry);
      
      // Handle successful load
      audio.addEventListener('canplaythrough', () => {
        entry.loaded = true;
        entry.loading = false;
        resolve(audio);
      }, { once: true });
      
      // Handle loading error
      audio.addEventListener('error', (e) => {
        const error = new Error(`Failed to load audio: ${soundType}`);
        entry.error = error;
        entry.loading = false;
        reject(error);
      }, { once: true });
      
      // Start loading
      audio.load();
      
      // Enforce cache size limit
      if (this.audioCache.size > this.maxCacheSize) {
        this.evictOldest();
      }
    });
  }
  
  /**
   * Private: Record usage for preloading hints
   */
  private recordUsage(soundType: SoundType): void {
    if (typeof window === 'undefined') return;
    
    try {
      const history = localStorage.getItem('audioHistory');
      const data = history ? JSON.parse(history) : {};
      
      data[soundType] = {
        lastUsed: Date.now(),
        useCount: (data[soundType]?.useCount || 0) + 1
      };
      
      localStorage.setItem('audioHistory', JSON.stringify(data));
    } catch (error) {
      // Ignore localStorage errors
    }
  }
  
  /**
   * Private: Preload based on usage history
   */
  private preloadFromHistory(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const history = localStorage.getItem('audioHistory');
      if (!history) return;
      
      const data = JSON.parse(history);
      const soundsToPreload: SoundType[] = [];
      
      // Get top 3 most used sounds
      Object.entries(data)
        .sort((a, b) => (b[1] as any).useCount - (a[1] as any).useCount)
        .slice(0, 3)
        .forEach(([soundType]) => {
          soundsToPreload.push(soundType as SoundType);
        });
      
      // Preload in background after main content loads
      if (soundsToPreload.length > 0) {
        setTimeout(() => {
          this.preloadMultiple(soundsToPreload).catch(() => {
            // Ignore preload errors
          });
        }, 2000);
      }
    } catch (error) {
      // Ignore localStorage errors
    }
  }
  
  /**
   * Private: Evict oldest cached entry
   */
  private evictOldest(): void {
    let oldestTime = Date.now();
    let oldestType: SoundType | null = null;
    
    this.audioCache.forEach((entry, soundType) => {
      if (entry.lastUsed < oldestTime && !entry.audio?.paused) {
        oldestTime = entry.lastUsed;
        oldestType = soundType;
      }
    });
    
    if (oldestType) {
      const entry = this.audioCache.get(oldestType);
      if (entry?.audio) {
        entry.audio.pause();
        entry.audio.src = '';
      }
      this.audioCache.delete(oldestType);
    }
  }
  
  /**
   * Private: Start automatic cleanup timer
   */
  private startAutoCleanup(): void {
    if (this.cleanupTimer) return;
    
    this.cleanupTimer = setInterval(() => {
      this.clearCache(false);
    }, this.cleanupThreshold);
  }
  
  /**
   * Cleanup on destroy
   */
  public destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    
    this.clearCache(true);
    this.loadingPromises.clear();
  }
}

// Export singleton instance
export const audioManager = AudioManager.getInstance({
  preload: true,
  cacheSize: 10,
  autoCleanup: true
});

// Export for testing or multiple instances
export { AudioManager };