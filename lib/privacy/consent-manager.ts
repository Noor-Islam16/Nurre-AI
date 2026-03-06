// Consent management system for GDPR/CCPA compliance

import { ConsentPreferences, ConsentRecord, PRIVACY_POLICY_VERSION } from '@/types/privacy';

const CONSENT_STORAGE_KEY = 'nureeai_consent';
const CONSENT_VERSION_KEY = 'nureeai_consent_version';

export class ConsentManager {
  private static instance: ConsentManager;
  private consent: ConsentPreferences | null = null;
  private version: string | null = null;
  private pendingEvents: Array<() => void> = [];

  private constructor() {
    this.loadConsent();
  }

  static getInstance(): ConsentManager {
    if (!ConsentManager.instance) {
      ConsentManager.instance = new ConsentManager();
    }
    return ConsentManager.instance;
  }

  private loadConsent(): void {
    if (typeof window === 'undefined') return;

    try {
      const storedConsent = localStorage.getItem(CONSENT_STORAGE_KEY);
      const storedVersion = localStorage.getItem(CONSENT_VERSION_KEY);

      if (storedConsent && storedVersion === PRIVACY_POLICY_VERSION) {
        this.consent = JSON.parse(storedConsent);
        this.version = storedVersion;
      }
    } catch (error) {
      console.error('Failed to load consent from localStorage:', error);
      // Try sessionStorage as fallback
      try {
        const sessionConsent = sessionStorage.getItem(CONSENT_STORAGE_KEY);
        if (sessionConsent) {
          this.consent = JSON.parse(sessionConsent);
        }
      } catch (e) {
        console.error('Failed to load consent from sessionStorage:', e);
      }
    }
  }

  hasConsent(): boolean {
    return this.consent !== null && this.version === PRIVACY_POLICY_VERSION;
  }

  getConsent(): ConsentPreferences | null {
    return this.consent;
  }

  hasConsentFor(category: keyof ConsentPreferences): boolean {
    if (!this.consent) return false;
    return this.consent[category];
  }

  async updateConsent(preferences: ConsentPreferences, userId?: string): Promise<void> {
    this.consent = preferences;
    this.version = PRIVACY_POLICY_VERSION;

    // Save to localStorage
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(preferences));
      localStorage.setItem(CONSENT_VERSION_KEY, PRIVACY_POLICY_VERSION);
    } catch (error) {
      console.error('Failed to save consent to localStorage:', error);
      // Fallback to sessionStorage
      try {
        sessionStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(preferences));
        sessionStorage.setItem(CONSENT_VERSION_KEY, PRIVACY_POLICY_VERSION);
      } catch (e) {
        console.error('Failed to save consent to sessionStorage:', e);
      }
    }

    // Save to database if user is authenticated
    if (userId) {
      try {
        await this.saveConsentToDatabase(preferences, userId);
      } catch (error) {
        console.error('Failed to save consent to database:', error);
      }
    }

    // Process any pending events if analytics consent was granted
    if (preferences.analytics && this.pendingEvents.length > 0) {
      this.processPendingEvents();
    } else if (!preferences.analytics) {
      // Clear pending events if consent denied
      this.pendingEvents = [];
    }
  }

  private async saveConsentToDatabase(
    preferences: ConsentPreferences,
    userId: string
  ): Promise<void> {
    const response = await fetch('/api/user/consent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        version: PRIVACY_POLICY_VERSION,
        preferences,
        userAgent: navigator.userAgent,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to save consent to database');
    }
  }

  queueEvent(eventCallback: () => void): void {
    // If we have consent for analytics, execute immediately
    if (this.hasConsentFor('analytics')) {
      eventCallback();
      return;
    }

    // If consent hasn't been determined yet, queue the event
    if (!this.hasConsent()) {
      this.pendingEvents.push(eventCallback);
      
      // Limit queue size to prevent memory issues
      if (this.pendingEvents.length > 50) {
        this.pendingEvents = this.pendingEvents.slice(-50);
      }
    }
    // If consent was explicitly denied, don't queue or execute
  }

  private processPendingEvents(): void {
    const events = [...this.pendingEvents];
    this.pendingEvents = [];
    
    // Execute all pending events
    events.forEach(event => {
      try {
        event();
      } catch (error) {
        console.error('Failed to process pending event:', error);
      }
    });
  }

  clearConsent(): void {
    this.consent = null;
    this.version = null;
    this.pendingEvents = [];

    try {
      localStorage.removeItem(CONSENT_STORAGE_KEY);
      localStorage.removeItem(CONSENT_VERSION_KEY);
      sessionStorage.removeItem(CONSENT_STORAGE_KEY);
      sessionStorage.removeItem(CONSENT_VERSION_KEY);
    } catch (error) {
      console.error('Failed to clear consent:', error);
    }
  }

  shouldShowBanner(): boolean {
    return !this.hasConsent();
  }

  shouldShowBannerForUser(userId?: string | null): boolean {
    // Don't show banner if no user is logged in
    if (!userId) {
      return false;
    }
    // Show banner if user is logged in but hasn't given consent
    return !this.hasConsent();
  }

  getDefaultPreferences(): ConsentPreferences {
    return {
      necessary: true, // Always required
      functional: false,
      analytics: false,
      marketing: false,
    };
  }

  getAllowAllPreferences(): ConsentPreferences {
    return {
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true,
    };
  }

  getEssentialOnlyPreferences(): ConsentPreferences {
    return {
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false,
    };
  }
}

// Export singleton instance
export const consentManager = ConsentManager.getInstance();