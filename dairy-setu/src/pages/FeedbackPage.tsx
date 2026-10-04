import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useToast } from '../components/ui/Toast';
import { MessageSquare, CheckCircle, User } from 'lucide-react';
import { BrandLogo } from '../components/ui/BrandLogo';
import confetti from 'canvas-confetti';

export function FeedbackPage() {
  const { show } = useToast();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    feedback: '',
    rating: '5'
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.feedback) {
      show('Please fill in required fields', 'error');
      return;
    }

    setLoading(true);
    try {
      // 1. Save to Firebase Database
      await addDoc(collection(db, 'feedbacks'), {
        ...formData,
        createdAt: serverTimestamp(),
        source: 'Website Feedback Form'
      });

      // 2. Send Email via FormSubmit
      try {
        await fetch("https://formsubmit.co/ajax/newdairy.walla@gmail.com", {
          method: "POST",
          headers: { 
              'Content-Type': 'application/json',
              'Accept': 'application/json'
          },
          body: JSON.stringify({
              _subject: "New Feedback Received - DairyWalla",
              Name: formData.name,
              Phone: formData.phone || 'Not Provided',
              Rating: formData.rating + " Stars",
              Feedback: formData.feedback
          })
        });
      } catch (emailError) {
        console.error("Email sending failed, but feedback was saved:", emailError);
      }

      setSuccess(true);
      
      // Trigger Confetti Celebration
      const duration = 2 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;
      const interval: any = setInterval(function() {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) { return clearInterval(interval); }
        const particleCount = 50 * (timeLeft / duration);
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
      }, 250);

      show('Feedback submitted successfully!', 'success');
    } catch (error) {
      console.error('Error submitting form:', error);
      show('Something went wrong. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl shadow-slate-200/50 max-w-lg w-full text-center border border-slate-100">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-4">Thank You!</h1>
          <p className="text-slate-600 text-lg mb-8 leading-relaxed">
            Your feedback is extremely valuable to us and helps us improve DairyWalla.
          </p>
          <a href="/" className="inline-flex items-center justify-center px-8 py-4 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-2xl transition-all hover:-translate-y-1 shadow-lg shadow-brand-500/30">
            Return to Homepage
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="p-4 sm:p-6 flex items-center justify-between max-w-7xl w-full mx-auto">
        <a href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-xl shadow-sm flex items-center justify-center p-1 sm:p-1.5 border border-slate-100 group-hover:shadow-md transition-all">
            <BrandLogo className="w-full h-full rounded-lg" />
          </div>
          <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
            Dairy<span className="text-brand-600">Walla</span>
          </span>
        </a>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 py-12">
        <div className="bg-white p-6 md:p-10 rounded-3xl shadow-xl shadow-slate-200/50 max-w-xl w-full border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-50 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none opacity-60"></div>
          
          <div className="relative">
            <div className="text-center mb-10">
              <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-4 tracking-tight">Share Your Feedback</h1>
              <p className="text-slate-500 text-lg">Help us make DairyWalla better for you.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Full Name <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                      <User className="w-5 h-5" />
                    </div>
                    <input 
                      type="text" 
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all font-medium"
                      placeholder="e.g. Rahul Sharma"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Phone Number</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 font-bold">
                      +91
                    </div>
                    <input 
                      type="tel" 
                      name="phone"
                      value={formData.phone}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setFormData(prev => ({ ...prev, phone: val }));
                      }}
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all font-medium tracking-wide"
                      placeholder="Optional"
                      maxLength={10}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Rate your experience</label>
                <select 
                  name="rating"
                  value={formData.rating}
                  onChange={handleChange}
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all font-medium appearance-none"
                >
                  <option value="5">⭐⭐⭐⭐⭐ (Excellent)</option>
                  <option value="4">⭐⭐⭐⭐ (Good)</option>
                  <option value="3">⭐⭐⭐ (Average)</option>
                  <option value="2">⭐⭐ (Poor)</option>
                  <option value="1">⭐ (Terrible)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Your Feedback/Suggestions <span className="text-red-500">*</span></label>
                <div className="relative">
                  <div className="absolute top-4 left-4 pointer-events-none text-slate-400">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <textarea 
                    name="feedback"
                    value={formData.feedback}
                    onChange={handleChange}
                    rows={4}
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all font-medium resize-none"
                    placeholder="Tell us what you love or what we can improve..."
                    required
                  />
                </div>
              </div>

              <div className="pt-4">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-brand-600 to-emerald-600 hover:from-brand-700 hover:to-emerald-700 text-white font-bold py-4 px-8 rounded-2xl shadow-xl shadow-brand-500/20 transition-all hover:-translate-y-1 disabled:opacity-70 disabled:hover:translate-y-0 text-lg"
                >
                  {loading ? (
                    <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <span>Submit Feedback</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
