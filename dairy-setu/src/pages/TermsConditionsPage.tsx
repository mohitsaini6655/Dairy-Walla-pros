import { Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { BrandLogo } from '../components/ui/BrandLogo';

export function TermsConditionsPage() {
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
            <FileText className="w-8 h-8" />
          </div>
          
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4 tracking-tight">Terms & Conditions</h1>
          <p className="text-slate-500 font-medium mb-12">Last Updated: June 11, 2026</p>

          <div className="prose prose-slate max-w-none prose-headings:font-bold prose-headings:text-slate-900 prose-p:text-slate-600 prose-li:text-slate-600">
            <p>By accessing or using the DairyWalla platform, you agree to be bound by these Terms & Conditions.</p>

            <h3>1. Platform Role & No Marketplace</h3>
            <p><strong>DairyWalla is a software platform only. DairyWalla does not manufacture, store, sell, transport, deliver, inspect, or guarantee any dairy, ice cream, or other goods listed by distributors. All product pricing, availability, quality, delivery, taxes, licenses, and business disputes are the responsibility of the respective distributor and shopkeeper.</strong> We are a technology provider and are not a party to the transactions between distributors and shopkeepers.</p>

            <h3>2. Eligibility</h3>
            <p>DairyWalla is a B2B application designed for business users. It is not intended for consumers or minors. You must be of legal age to form a binding contract to use this platform.</p>

            <h3>3. User Accounts & Acceptable Use</h3>
            <ul>
              <li><strong>Accuracy:</strong> You must provide accurate and complete information when creating an account.</li>
              <li><strong>Security:</strong> You are responsible for maintaining the confidentiality of your account credentials.</li>
              <li><strong>Acceptable Use:</strong> You agree not to use the platform to send spam, fraudulent orders, abuse the system, or attempt to reverse-engineer the app.</li>
            </ul>

            <h3>4. Orders, Transactions & Product Quality</h3>
            <ul>
              <li><strong>Order Placement:</strong> Shopkeepers are responsible for ensuring the accuracy of orders placed.</li>
              <li><strong>Fulfillment & Quality:</strong> Distributors are responsible for accepting, rejecting, or fulfilling orders, as well as ensuring product quality, FSSAI compliance, GST compliance, and issuing tax invoices.</li>
              <li><strong>Disputes:</strong> Any disputes regarding product quality, missing items, or payments must be resolved directly between the Distributor and the Shopkeeper.</li>
            </ul>

            <h3>5. Payments & Taxes</h3>
            <p>DairyWalla does not process end-customer product payments unless explicitly enabled via integrated payment gateways. All invoicing and tax liabilities are the sole responsibility of the distributor.</p>

            <h3>6. Subscription & Pricing</h3>
            <p>DairyWalla app and website access may be provided free for up to 5 months for eligible early users. Shopkeepers can currently use the app free of charge for placing orders with connected distributors. Paid pricing for distributors may apply after prior notice. Users will not be automatically charged unless they actively choose a paid plan and complete payment. DairyWalla may update pricing or introduce paid features in the future with prior notice.</p>

            <h3>7. Service Availability & Limitation of Liability</h3>
            <p>We strive to keep our services operational, but downtime and maintenance may occur. DairyWalla shall not be liable for any business loss, spoiled goods, delivery failure, missed profit, or data loss arising from the use or inability to use the platform, to the maximum extent permitted by law.</p>

            <h3>8. Indemnity</h3>
            <p>You agree to indemnify and hold harmless DairyWalla and its owners (Mohit Saini and Aman Sharma) from any claims, damages, or losses arising from your misuse of the platform or violation of these terms.</p>

            <h3>9. Governing Law & Jurisdiction</h3>
            <p>These terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in Jaipur, Rajasthan, India.</p>

            <h3>10. Contact Information</h3>
            <p>For any legal or support queries, contact us at <strong>newdairy.walla@gmail.com</strong>.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
