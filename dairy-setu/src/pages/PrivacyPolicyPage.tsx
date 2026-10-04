import { Link } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';
import { BrandLogo } from '../components/ui/BrandLogo';

export function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-brand-50 transition-colors">
              <ArrowLeft className="w-4 h-4 text-slate-600 group-hover:text-brand-600" />
            </div>
            <span className="font-bold text-slate-700 group-hover:text-brand-600 transition-colors">Back to Home</span>
          </Link>
          <div className="flex items-center gap-2 opacity-50 pointer-events-none">
             <div className="w-6 h-6 rounded bg-slate-200 flex items-center justify-center p-1"><BrandLogo className="w-full h-full grayscale" /></div>
             <span className="font-bold text-slate-400 text-sm">DairyWalla</span>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 sm:p-12">
          <div className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-8 border border-brand-100/50">
            <Shield className="w-8 h-8" />
          </div>
          
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4 tracking-tight">Privacy Policy</h1>
          <p className="text-slate-500 font-medium mb-12">Effective Date: June 11, 2026</p>

          <div className="prose prose-slate max-w-none prose-headings:font-bold prose-headings:text-slate-900 prose-p:text-slate-600 prose-li:text-slate-600">
            <p>Welcome to DairyWalla! This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or use our application.</p>

            <h3>1. Who We Are (Data Controller)</h3>
            <p>DairyWalla is owned and operated by Mohit Saini and Aman Sharma, located in Jaipur, Rajasthan, India. This privacy policy applies to our website and mobile application.</p>

            <h3>2. Information We Collect</h3>
            <p>We may collect personal identification information from Users in a variety of ways, including, but not limited to:</p>
            <ul>
              <li><strong>Personal Data:</strong> Name, email address, phone number, and business details (business name, GST number, location).</li>
              <li><strong>Location Data:</strong> We may collect approximate or precise location only when the user provides permission or manually adds location details, for purposes such as distributor discovery, delivery-area setup, shop location, and route planning. We do not use continuous background location tracking unless clearly disclosed and separately enabled.</li>
              <li><strong>Usage & Device Data:</strong> Firebase installation ID/device tokens, app interactions, and crash diagnostics.</li>
              <li><strong>Transaction Data:</strong> Order history, quantities, and status.</li>
            </ul>
            <p><em>Note:</em> We do not store sensitive payment/credit card information on our servers.</p>

            <h3>3. How We Use Your Information</h3>
            <p>We use the collected information based on your consent and our legitimate business interests for the following purposes:</p>
            <ul>
              <li>To create and manage your account.</li>
              <li>To facilitate order placement and fulfillment between distributors and shopkeepers.</li>
              <li>To send important notifications regarding order status (via Push Notifications or WhatsApp where applicable).</li>
              <li>To improve our platform, analytics, and customer service.</li>
            </ul>

            <h3>4. Data Sharing & Third-Party Services</h3>
            <p>We do not sell, trade, or rent your personal identification information to others. We share your information only:</p>
            <ul>
              <li>Between connected Distributors and Shopkeepers to process orders.</li>
              <li>We may use trusted third-party service providers such as hosting (Render), authentication/database (Firebase), notification, analytics, crash-reporting, and communication service providers. These providers process data only as required to provide their services to us, subject to their own terms and policies.</li>
              <li>When required by law.</li>
            </ul>

            <h3>5. Security & Data Retention</h3>
            <p>We use reasonable technical and organizational safeguards such as secure authentication, access controls, and encrypted transmission where applicable. No digital platform can guarantee absolute security. We retain your data only for as long as necessary to provide our services or as required by law.</p>

            <h3>6. Your Rights & Account Deletion</h3>
            <p>You have the right to request access to, correction of, or deletion of your personal data stored with us. You can request account and data deletion by contacting our support email.</p>

            <h3>7. Children's Privacy</h3>
            <p>Our platform is intended for B2B business users and is not directed at children or minors under the age of 18. We do not knowingly collect personal data from minors.</p>

            <h3>8. Changes to Policy</h3>
            <p>We may update this policy periodically. We will notify you of any changes by updating the "Effective Date" of this policy.</p>

            <h3>9. Contact Us</h3>
            <p>If you have any questions, grievances, or deletion requests regarding this Privacy Policy, please contact us at <strong>newdairy.walla@gmail.com</strong>.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
