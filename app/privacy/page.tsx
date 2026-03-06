import { Shield, Lock, Eye, Database, UserCheck, Globe, Mail } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <Shield className="w-16 h-16 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900">Privacy Policy</h1>
          <p className="text-lg text-gray-600">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>

        {/* Content */}
        <div className="prose prose-lg max-w-none text-gray-700">
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
              <Eye className="w-6 h-6 text-blue-600" />
              Overview
            </h2>
            <p>
              At NureeAI, we take your privacy seriously. This Privacy Policy explains how we collect, 
              use, and protect your personal information when you use our AI-powered ADHD coaching platform.
            </p>
          </section>

          <section className="space-y-4 mt-8">
            <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
              <Database className="w-6 h-6 text-blue-600" />
              Information We Collect
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Account Information:</strong> Email, name, and profile details</li>
              <li><strong>ADHD Assessment Data:</strong> Your personalized ADHD persona and related preferences</li>
              <li><strong>Usage Data:</strong> Task completion, focus sessions, productivity patterns</li>
              <li><strong>Behavioral Data:</strong> Interaction patterns to improve AI coaching</li>
              <li><strong>Mood & Wellness Data:</strong> Mood entries and emotional patterns</li>
            </ul>
          </section>

          <section className="space-y-4 mt-8">
            <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
              <Lock className="w-6 h-6 text-blue-600" />
              How We Use Your Information
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide personalized ADHD coaching and interventions</li>
              <li>Track and improve your productivity patterns</li>
              <li>Generate insights about your focus and task management</li>
              <li>Enhance our AI algorithms to better support ADHD needs</li>
              <li>Send relevant notifications and reminders</li>
            </ul>
          </section>

          <section className="space-y-4 mt-8">
            <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
              <UserCheck className="w-6 h-6 text-blue-600" />
              Your Rights
            </h2>
            <p>Under GDPR and CCPA, you have the following rights:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Correction:</strong> Update or correct your information</li>
              <li><strong>Deletion:</strong> Request deletion of your account and data</li>
              <li><strong>Portability:</strong> Export your data in a portable format</li>
              <li><strong>Opt-out:</strong> Disable specific data collection categories</li>
              <li><strong>Withdraw Consent:</strong> Change your privacy preferences at any time</li>
            </ul>
          </section>

          <section className="space-y-4 mt-8">
            <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
              <Globe className="w-6 h-6 text-blue-600" />
              Data Retention
            </h2>
            <p>
              We retain your data only as long as necessary to provide our services:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Active account data: Retained while account is active</li>
              <li>Behavioral analytics: 90 days</li>
              <li>Task and productivity data: 1 year</li>
              <li>Deleted account data: Permanently removed after 30 days</li>
            </ul>
          </section>

          <section className="space-y-4 mt-8">
            <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
              <Mail className="w-6 h-6 text-blue-600" />
              Contact Us
            </h2>
            <p>
              If you have questions about this Privacy Policy or your data:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="font-semibold">Email: privacy@nureeai.com</p>
              <p className="font-semibold">Address: NureeAI, Privacy Team</p>
            </div>
          </section>

          <section className="space-y-4 mt-8 p-6 bg-blue-50 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900">
              Cookie Preferences
            </h3>
            <p className="text-sm">
              You can manage your cookie and data collection preferences at any time in your{' '}
              <a href="/settings" className="text-blue-600 hover:underline">
                account settings
              </a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}