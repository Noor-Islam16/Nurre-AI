import { FileText, Scale, AlertCircle, Heart, Shield, Users, Mail } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <FileText className="w-16 h-16 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900">Terms of Service</h1>
          <p className="text-lg text-gray-600">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>

        {/* Content */}
        <div className="prose prose-lg max-w-none text-gray-700">
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
              <Scale className="w-6 h-6 text-blue-600" />
              Agreement to Terms
            </h2>
            <p>
              By accessing or using NureeAI, you agree to be bound by these Terms of Service. 
              If you disagree with any part of these terms, you may not access our service.
            </p>
          </section>

          <section className="space-y-4 mt-8">
            <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
              <Heart className="w-6 h-6 text-blue-600" />
              Our Service
            </h2>
            <p>
              NureeAI provides AI-powered ADHD coaching and productivity tools. Our service includes:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Personalized ADHD assessment and coaching</li>
              <li>Task management and focus tracking</li>
              <li>AI-driven interventions and support</li>
              <li>Mood tracking and wellness features</li>
              <li>Productivity analytics and insights</li>
            </ul>
          </section>

          <section className="space-y-4 mt-8">
            <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-blue-600" />
              Medical Disclaimer
            </h2>
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <p className="font-semibold text-yellow-900 mb-2">Important Notice:</p>
              <p className="text-yellow-800">
                NureeAI is NOT a medical service and does not provide medical advice, diagnosis, or treatment. 
                Our AI coaching is designed to support individuals with ADHD but should not replace professional 
                medical care. Always consult with qualified healthcare providers for medical decisions.
              </p>
            </div>
          </section>

          <section className="space-y-4 mt-8">
            <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
              <Users className="w-6 h-6 text-blue-600" />
              User Responsibilities
            </h2>
            <p>When using NureeAI, you agree to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide accurate information during assessment</li>
              <li>Use the service for personal, non-commercial purposes</li>
              <li>Not misuse or attempt to harm the service</li>
              <li>Respect the privacy and rights of other users</li>
              <li>Keep your account credentials secure</li>
            </ul>
          </section>

          <section className="space-y-4 mt-8">
            <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
              <Shield className="w-6 h-6 text-blue-600" />
              Privacy & Data
            </h2>
            <p>
              Your use of NureeAI is also governed by our{' '}
              <a href="/privacy" className="text-blue-600 hover:underline">
                Privacy Policy
              </a>. 
              By using our service, you consent to the collection and use of your data as described 
              in our Privacy Policy.
            </p>
          </section>

          <section className="space-y-4 mt-8">
            <h2 className="text-2xl font-semibold text-gray-900">
              Subscription & Billing
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Free tier includes basic features with usage limits</li>
              <li>Premium subscriptions are billed monthly or annually</li>
              <li>Cancellations take effect at the end of the billing period</li>
              <li>Refunds are provided according to our refund policy</li>
            </ul>
          </section>

          <section className="space-y-4 mt-8">
            <h2 className="text-2xl font-semibold text-gray-900">
              Intellectual Property
            </h2>
            <p>
              All content, features, and functionality of NureeAI are owned by us and are protected 
              by international copyright, trademark, and other intellectual property laws.
            </p>
          </section>

          <section className="space-y-4 mt-8">
            <h2 className="text-2xl font-semibold text-gray-900">
              Limitation of Liability
            </h2>
            <p>
              To the fullest extent permitted by law, NureeAI shall not be liable for any indirect, 
              incidental, special, consequential, or punitive damages resulting from your use or 
              inability to use the service.
            </p>
          </section>

          <section className="space-y-4 mt-8">
            <h2 className="text-2xl font-semibold text-gray-900">
              Changes to Terms
            </h2>
            <p>
              We reserve the right to modify these terms at any time. We will notify users of any 
              material changes via email or through the service. Continued use after changes 
              constitutes acceptance of the new terms.
            </p>
          </section>

          <section className="space-y-4 mt-8">
            <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
              <Mail className="w-6 h-6 text-blue-600" />
              Contact Information
            </h2>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="font-semibold">Email: legal@nureeai.com</p>
              <p className="font-semibold">Address: NureeAI, Legal Department</p>
            </div>
          </section>

          <section className="mt-8 p-6 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-700">
              By using NureeAI, you acknowledge that you have read, understood, and agree to be 
              bound by these Terms of Service.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}