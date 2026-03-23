"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Heart, Phone, ExternalLink, AlertTriangle } from "lucide-react";

interface SafetyInterstitialModalProps {
  open: boolean;
  onContinue: () => void;
  onStop: () => void;
}

export function SafetyInterstitialModal({
  open,
  onContinue,
  onStop,
}: SafetyInterstitialModalProps) {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-2xl flex flex-col gap-0 p-0 max-h-[90vh]"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        {/* ── Fixed header ─────────────────────────────────────────── */}
        <div className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-red-100 rounded-lg">
              <Heart className="h-6 w-6 text-red-700" />
            </div>
            <DialogTitle className="text-xl text-gray-900">
              We&apos;re Here to Support You
            </DialogTitle>
          </div>
          <DialogDescription className="text-base text-gray-700">
            Thank you for your honesty. Your wellbeing matters — please review
            the resources below before continuing.
          </DialogDescription>
        </div>

        {/* ── Scrollable body ──────────────────────────────────────── */}
        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="px-6 py-4 space-y-4">
            {/* Supportive message */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900 leading-relaxed">
                If you&apos;re having thoughts of self-harm or suicide, please
                know that you&apos;re not alone and help is available. These
                feelings can be overwhelming, but they are often temporary and
                can improve with the right support.
              </p>
            </div>

            {/* Immediate help resources */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900 text-sm">
                Get Immediate Help
              </h4>

              <div className="grid gap-3 sm:grid-cols-2">
                {/* Samaritans */}
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h5 className="font-semibold text-gray-900 text-sm mb-1">
                        Samaritans (UK)
                      </h5>
                      <p className="text-lg font-bold text-blue-700 mb-1">
                        116 123
                      </p>
                      <p className="text-xs text-gray-600">
                        Available 24/7 for free
                      </p>
                    </div>
                    <a
                      href="tel:116123"
                      className="flex-shrink-0 p-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                    >
                      <Phone className="h-4 w-4" />
                    </a>
                  </div>
                </div>

                {/* Crisis Text Line UK */}
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <h5 className="font-semibold text-gray-900 text-sm mb-1">
                    Crisis Text Line (UK)
                  </h5>
                  <p className="text-sm font-bold text-blue-700 mb-1">
                    Text SHOUT to 85258
                  </p>
                  <p className="text-xs text-gray-600">
                    Free 24/7 text support
                  </p>
                </div>

                {/* 988 Lifeline US */}
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h5 className="font-semibold text-gray-900 text-sm mb-1">
                        988 Lifeline (US)
                      </h5>
                      <p className="text-lg font-bold text-blue-700 mb-1">
                        988
                      </p>
                      <p className="text-xs text-gray-600">
                        Suicide & Crisis Lifeline
                      </p>
                    </div>
                    <a
                      href="tel:988"
                      className="flex-shrink-0 p-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                    >
                      <Phone className="h-4 w-4" />
                    </a>
                  </div>
                </div>

                {/* Emergency */}
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-1 mb-1">
                        <h5 className="font-semibold text-red-900 text-sm">
                          Emergency
                        </h5>
                        <span className="px-1.5 py-0.5 bg-red-600 text-white text-xs rounded-full font-semibold">
                          999 / 911
                        </span>
                      </div>
                      <p className="text-xs text-red-800">
                        If in immediate danger
                      </p>
                    </div>
                    <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
                  </div>
                </div>
              </div>
            </div>

            {/* Full resources link */}
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <button
                onClick={onStop}
                className="flex items-center gap-2 text-sm text-blue-700 hover:text-blue-800 font-medium"
              >
                <ExternalLink className="h-4 w-4" />
                View complete crisis resources and support
              </button>
            </div>

            {/* Non-diagnostic note */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-900">
                <strong>Please note:</strong> This screening tool does not
                provide a diagnosis. If you&apos;re experiencing thoughts of
                self-harm, we strongly encourage you to speak with a healthcare
                professional or contact one of the helplines above.
              </p>
            </div>
          </div>
        </ScrollArea>

        {/* ── Fixed footer — always visible ────────────────────────── */}
        <div className="px-6 py-4 border-t flex-shrink-0 flex flex-col sm:flex-row gap-3 bg-white">
          <Button
            onClick={onStop}
            variant="outline"
            className="w-full sm:w-auto border-red-300 text-red-700 hover:bg-red-50"
          >
            Stop &amp; View Resources
          </Button>
          <Button
            onClick={onContinue}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 sm:ml-auto"
          >
            Continue Assessment
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
