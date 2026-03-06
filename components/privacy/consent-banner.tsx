'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Cookie, Info, Check, X, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { consentManager } from '@/lib/privacy/consent-manager';
import { ConsentPreferences } from '@/types/privacy';
import { useUser } from '@/lib/auth/client';

export function ConsentBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState<ConsentPreferences>(
    consentManager.getDefaultPreferences()
  );
  const { user } = useUser();

  useEffect(() => {
    // Check if we're on an auth page
    const isAuthPage = typeof window !== 'undefined' && (
      window.location.pathname.startsWith('/login') ||
      window.location.pathname.startsWith('/signup') ||
      window.location.pathname.startsWith('/auth') ||
      window.location.pathname.startsWith('/confirm-email')
    );

    // Only show banner if user is authenticated and not on auth pages
    if (typeof window !== 'undefined' && 
        !isAuthPage && 
        user?.id &&
        consentManager.shouldShowBannerForUser(user?.id)) {
      // Small delay to avoid flash on page load
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const handleAcceptAll = async () => {
    const allPreferences = consentManager.getAllowAllPreferences();
    await consentManager.updateConsent(allPreferences, user?.id);
    setShowBanner(false);
  };

  const handleRejectAll = async () => {
    const essentialPreferences = consentManager.getEssentialOnlyPreferences();
    await consentManager.updateConsent(essentialPreferences, user?.id);
    setShowBanner(false);
  };

  const handleSavePreferences = async () => {
    await consentManager.updateConsent(preferences, user?.id);
    setShowBanner(false);
  };

  const togglePreference = (key: keyof ConsentPreferences) => {
    if (key === 'necessary') return; // Cannot toggle necessary cookies
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  if (!showBanner) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        transition={{ type: 'spring', damping: 20 }}
        className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6"
      >
        <Card className="mx-auto max-w-7xl bg-white/95 backdrop-blur-md shadow-2xl border-0">
          <div className="p-6">
            {!showDetails ? (
              // Simple consent view
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <Cookie className="w-8 h-8 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      We value your privacy
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      We use cookies and similar technologies to enhance your experience, analyze usage patterns, 
                      and provide personalized ADHD coaching. You can customize your preferences or accept our 
                      recommended settings.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <Button
                        onClick={handleAcceptAll}
                        className="bg-secondary-500 hover:bg-secondary-600 text-white transition-colors"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Accept All
                      </Button>
                      <Button
                        onClick={handleRejectAll}
                        variant="outline"
                        className="border-gray-300 hover:bg-gray-50"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Essential Only
                      </Button>
                      <Button
                        onClick={() => setShowDetails(true)}
                        variant="ghost"
                        className="text-gray-700 hover:text-secondary-500 hover:bg-secondary-50 transition-colors"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Customize
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-3">
                      By continuing, you agree to our{' '}
                      <a href="/privacy" className="underline hover:text-gray-700">
                        Privacy Policy
                      </a>{' '}
                      and{' '}
                      <a href="/terms" className="underline hover:text-gray-700">
                        Terms of Service
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              // Detailed preferences view
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Shield className="w-8 h-8 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      Privacy Preferences
                    </h3>
                  </div>
                  <Button
                    onClick={() => setShowDetails(false)}
                    variant="ghost"
                    size="sm"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {/* Necessary Cookies */}
                  <div className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Label className="text-sm font-semibold text-gray-900">
                          Essential Cookies
                        </Label>
                        <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
                          Always Active
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">
                        Required for the app to function properly. Includes authentication, 
                        security, and basic functionality.
                      </p>
                    </div>
                    <Switch
                      checked={preferences.necessary}
                      disabled
                      className="cursor-not-allowed"
                    />
                  </div>

                  {/* Functional Cookies */}
                  <div className="flex items-start justify-between p-4 bg-white border rounded-lg">
                    <div className="flex-1">
                      <Label className="text-sm font-semibold text-gray-900 mb-1 block">
                        Functional Cookies
                      </Label>
                      <p className="text-xs text-gray-600">
                        Enables enhanced features like AI coaching, personalized recommendations, 
                        and adaptive learning based on your ADHD profile.
                      </p>
                    </div>
                    <Switch
                      checked={preferences.functional}
                      onCheckedChange={() => togglePreference('functional')}
                    />
                  </div>

                  {/* Analytics Cookies */}
                  <div className="flex items-start justify-between p-4 bg-white border rounded-lg">
                    <div className="flex-1">
                      <Label className="text-sm font-semibold text-gray-900 mb-1 block">
                        Analytics Cookies
                      </Label>
                      <p className="text-xs text-gray-600">
                        Helps us understand how you use the app, track productivity patterns, 
                        and improve our ADHD support features.
                      </p>
                    </div>
                    <Switch
                      checked={preferences.analytics}
                      onCheckedChange={() => togglePreference('analytics')}
                    />
                  </div>

                  {/* Marketing Cookies */}
                  <div className="flex items-start justify-between p-4 bg-white border rounded-lg">
                    <div className="flex-1">
                      <Label className="text-sm font-semibold text-gray-900 mb-1 block">
                        Marketing Cookies
                      </Label>
                      <p className="text-xs text-gray-600">
                        Used to provide relevant content and measure the effectiveness of our 
                        communications about ADHD resources and updates.
                      </p>
                    </div>
                    <Switch
                      checked={preferences.marketing}
                      onCheckedChange={() => togglePreference('marketing')}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Info className="w-3 h-3" />
                    <span>You can change these settings anytime in your account settings</span>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={handleRejectAll}
                      variant="outline"
                      className="border-gray-300 hover:bg-gray-50"
                    >
                      Reject All
                    </Button>
                    <Button
                      onClick={handleSavePreferences}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Save Preferences
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}