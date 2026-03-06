"use client"

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Phone, ExternalLink, AlertCircle, Heart } from 'lucide-react'

interface CrisisHelpLinkProps {
  defaultOpen?: boolean
}

export function CrisisHelpLink({ defaultOpen = false }: CrisisHelpLinkProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  // Update isOpen when defaultOpen changes
  useEffect(() => {
    if (defaultOpen) {
      setIsOpen(true)
    }
  }, [defaultOpen])

  const helplines = [
    {
      country: 'UK',
      services: [
        {
          name: 'Samaritans',
          phone: '116 123',
          description: '24/7 emotional support for anyone in distress',
          available: 'Available 24 hours, 7 days a week'
        },
        {
          name: 'Crisis Text Line',
          phone: 'Text SHOUT to 85258',
          description: 'Free, 24/7 text support for mental health crises',
          available: 'Available 24 hours, 7 days a week'
        },
        {
          name: 'NHS 111',
          phone: '111',
          description: 'Urgent medical help (non-emergency)',
          available: 'Available 24 hours, 7 days a week'
        },
        {
          name: 'Emergency Services',
          phone: '999',
          description: 'Call 999 if you or someone else is in immediate danger',
          available: 'Immediate response',
          isEmergency: true
        }
      ]
    },
    {
      country: 'US',
      services: [
        {
          name: '988 Suicide & Crisis Lifeline',
          phone: '988',
          description: '24/7 support for people in suicidal crisis or emotional distress',
          available: 'Available 24 hours, 7 days a week'
        },
        {
          name: 'Crisis Text Line',
          phone: 'Text HOME to 741741',
          description: 'Free, 24/7 text support',
          available: 'Available 24 hours, 7 days a week'
        },
        {
          name: 'Emergency Services',
          phone: '911',
          description: 'Call 911 if you or someone else is in immediate danger',
          available: 'Immediate response',
          isEmergency: true
        }
      ]
    }
  ]

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="text-sm text-red-700 hover:text-red-800 font-medium hover:underline inline-flex items-center gap-1.5 transition-colors"
      >
        <Heart className="h-4 w-4" />
        In crisis? Get help
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="h-6 w-6 text-red-700" />
              </div>
              <DialogTitle className="text-xl">
                Crisis Support Resources
              </DialogTitle>
            </div>
            <DialogDescription className="text-base text-gray-700 pt-2">
              If you&apos;re in crisis or experiencing thoughts of self-harm, please reach out for immediate help.
              You are not alone.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6">
              {/* Immediate steps */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Immediate Steps
                </h3>
                <ul className="text-sm text-blue-900 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="font-semibold mt-0.5">1.</span>
                    <span>If you&apos;re in immediate danger, call emergency services (999 in UK, 911 in US)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-semibold mt-0.5">2.</span>
                    <span>Move to a safe environment away from means of self-harm</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-semibold mt-0.5">3.</span>
                    <span>Contact a crisis helpline below - they&apos;re available 24/7</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-semibold mt-0.5">4.</span>
                    <span>Reach out to a trusted friend, family member, or healthcare provider</span>
                  </li>
                </ul>
              </div>

              {/* Helplines by country */}
              {helplines.map((country) => (
                <div key={country.country} className="space-y-3">
                  <h3 className="font-semibold text-gray-900 text-lg border-b pb-2">
                    {country.country} Helplines
                  </h3>
                  <div className="space-y-3">
                    {country.services.map((service, index) => (
                      <div
                        key={index}
                        className={`p-4 rounded-lg border ${
                          service.isEmergency
                            ? 'bg-red-50 border-red-200'
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className={`font-semibold ${
                                service.isEmergency ? 'text-red-900' : 'text-gray-900'
                              }`}>
                                {service.name}
                              </h4>
                              {service.isEmergency && (
                                <span className="px-2 py-0.5 bg-red-600 text-white text-xs rounded-full font-semibold">
                                  EMERGENCY
                                </span>
                              )}
                            </div>
                            <p className={`text-xl font-bold mb-1 ${
                              service.isEmergency ? 'text-red-700' : 'text-blue-700'
                            }`}>
                              {service.phone}
                            </p>
                            <p className="text-sm text-gray-700 mb-1">
                              {service.description}
                            </p>
                            <p className="text-xs text-gray-600">
                              {service.available}
                            </p>
                          </div>
                          <a
                            href={`tel:${service.phone.replace(/[^0-9]/g, '')}`}
                            className={`flex-shrink-0 p-2 rounded-lg ${
                              service.isEmergency
                                ? 'bg-red-600 hover:bg-red-700'
                                : 'bg-blue-600 hover:bg-blue-700'
                            } text-white transition-colors`}
                          >
                            <Phone className="h-5 w-5" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Additional resources */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Additional Resources</h3>
                <div className="space-y-2 text-sm">
                  <a
                    href="https://www.mind.org.uk/need-urgent-help/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-700 hover:text-blue-800"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Mind: Need urgent help?
                  </a>
                  <a
                    href="https://www.nhs.uk/mental-health/feelings-symptoms-behaviours/behaviours/help-for-suicidal-thoughts/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-700 hover:text-blue-800"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    NHS: Help for suicidal thoughts
                  </a>
                  <a
                    href="https://988lifeline.org/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-700 hover:text-blue-800"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    988 Suicide & Crisis Lifeline (US)
                  </a>
                </div>
              </div>
            </div>
          </ScrollArea>

          <div className="pt-4 border-t">
            <Button
              onClick={() => setIsOpen(false)}
              variant="outline"
              className="w-full"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
