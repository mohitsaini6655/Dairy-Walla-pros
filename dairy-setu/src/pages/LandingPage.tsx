import { Link, useNavigate } from 'react-router-dom';
import {
  Store, Clock, FileText,
  ArrowRight,
  CheckCircle, Zap, TrendingUp,
  Check, Share2, ClipboardList, Globe, Play,
  Heart, Sparkles, HelpCircle, Info
} from 'lucide-react';
import { BrandLogo } from '../components/ui/BrandLogo';
import { useAuthStore } from '../store/authStore';
import { useTranslation, type AppLanguage } from '../utils/i18n';

export function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const { t, language, setLanguage } = useTranslation();

  const handleCTA = () => {
    if (isAuthenticated && user) {
      navigate(user.role === 'distributor' ? '/distributor' : '/shop');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-brand-500 selection:text-white overflow-x-hidden">
      
      {/* Fixed Header Wrapper */}
      <div className="fixed top-0 left-0 right-0 z-50 flex flex-col">

        {/* Navigation */}
        <nav className="bg-white/95 backdrop-blur-md border-b border-slate-100 w-full">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 sm:w-9 h-8 sm:h-9 rounded-lg sm:rounded-xl bg-brand-600 shadow-lg shadow-brand-200 flex items-center justify-center flex-shrink-0">
                <BrandLogo className="w-5 sm:w-6 h-5 sm:h-6" />
              </div>
              <span className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">DairyWalla</span>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-4 md:gap-6">
              <div className="hidden lg:flex items-center gap-4 md:gap-6 mr-2 md:mr-4">
                <a href="#features" className="text-xs md:text-sm font-semibold text-slate-600 hover:text-brand-600 transition-colors">{t('Features')}</a>
                <a href="#our-story" className="text-xs md:text-sm font-semibold text-slate-600 hover:text-brand-600 transition-colors">{t('Our Story')}</a>
                <a href="#dashboard" className="text-xs md:text-sm font-semibold text-slate-600 hover:text-brand-600 transition-colors">{t('Dashboard')}</a>
                <a href="#how-it-works" className="text-xs md:text-sm font-semibold text-slate-600 hover:text-brand-600 transition-colors">{t('How it works')}</a>
                <Link to="/blogs" className="text-xs md:text-sm font-bold text-brand-600 hover:text-brand-700 transition-colors">Blog</Link>
                <a href="/about-us-faq.html" className="text-xs md:text-sm font-bold text-brand-600 hover:text-brand-700 transition-colors">FAQ</a>
              </div>

              {/* Language Selector */}
              <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-100 border border-slate-200 rounded-full px-2 sm:px-3 py-1 flex-shrink-0">
                <Globe className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 flex-shrink-0" />
                <select 
                  value={language} 
                  onChange={(e) => setLanguage(e.target.value as AppLanguage)}
                  className="bg-transparent text-[11px] sm:text-[13px] font-bold text-slate-700 focus:outline-none cursor-pointer pr-0.5"
                >
                  <option value="english">English</option>
                  <option value="hindi">Hindi (हिंदी)</option>
                </select>
              </div>

              {isAuthenticated ? (
                <button onClick={handleCTA} className="bg-slate-900 text-white text-xs sm:text-sm font-bold px-3 sm:px-5 py-2 rounded-full hover:bg-slate-800 transition-all whitespace-nowrap">
                  {t('Dashboard')}
                </button>
              ) : (
                <div className="flex items-center gap-2 sm:gap-3">
                  <Link to="/login" className="text-xs sm:text-sm font-bold text-slate-700 hover:text-brand-600 transition-colors hidden sm:block">
                    {t('Login')}
                  </Link>
                  <Link to="/signup" className="bg-brand-600 hover:bg-brand-700 text-white text-xs sm:text-sm font-bold px-3 sm:px-6 py-2 rounded-full shadow-md shadow-brand-100 transition-all whitespace-nowrap">
                    {t('Sign Up')}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
      </div>

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 sm:pt-40 sm:pb-24 lg:pt-56 lg:pb-36 overflow-hidden px-4 sm:px-0">
        {/* Organic background neon gradients */}
        <div className="absolute top-20 right-0 w-[700px] h-[700px] bg-gradient-to-br from-brand-300/30 to-emerald-300/20 rounded-full blur-3xl opacity-75 -z-10 translate-x-1/3 animate-pulse"></div>
        <div className="absolute top-40 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-blue-300/20 to-teal-200/20 rounded-full blur-3xl opacity-60 -z-10 -translate-x-1/3"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/70 backdrop-blur-md border border-brand-100/50 shadow-md shadow-brand-100/20 text-brand-700 text-xs font-bold mb-8 animate-fade-in hover:scale-105 transition-all">
            <Zap className="w-3.5 h-3.5 fill-brand-600 animate-bounce" />
            {t('The Complete Dairy & Ice Cream Business Operating System')}
          </div>
          
          <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black text-slate-900 leading-[1.05] mb-6 sm:mb-8 max-w-5xl mx-auto tracking-tight">
            {language === 'hindi' ? 'डेयरी और आइसक्रीम डिस्ट्रीब्यूशन को करें' : 'Digitizing Dairy & Ice Cream'} <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 via-emerald-500 to-amber-500">
              {language === 'hindi' ? 'डिजिटल' : 'Distribution'}
            </span>
          </h1>
          
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-slate-500 leading-relaxed mb-8 sm:mb-12 max-w-4xl mx-auto font-medium">
            {t('DairyWalla helps dairy and ice cream distributors manage product catalogs, shopkeeper orders, stock availability, order windows, invoices, and delivery workflows from one simple platform.')}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 sm:mb-24 px-2 sm:px-0">
            <button onClick={() => navigate('/demo')} className="w-full sm:w-auto bg-gradient-to-r from-brand-600 to-emerald-600 hover:from-brand-700 hover:to-emerald-700 text-white font-bold py-4 sm:py-5 px-8 sm:px-14 rounded-2xl shadow-2xl shadow-brand-500/20 flex items-center justify-center gap-3 text-base sm:text-lg transition-all duration-300 hover:-translate-y-1">
              {t('Book Demo')} <ArrowRight className="w-5 h-5" />
            </button>
            <a href="https://play.google.com/store/apps/details?id=com.dairywalla.app&pcampaignid=web_share" target="_blank" rel="noreferrer" className="w-full sm:w-auto bg-white/80 backdrop-blur-md border border-slate-200/80 hover:border-brand-300 hover:bg-white text-slate-700 font-bold py-4 sm:py-5 px-8 sm:px-14 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 text-base sm:text-lg shadow-sm hover:shadow-md">
              <Play className="w-5 h-5 fill-slate-700" /> {t('Get the App')}
            </a>
          </div>

          <div className="max-w-2xl mx-auto mb-20 sm:mb-28">
            <div className="bg-white/80 backdrop-blur-md border border-brand-100/60 rounded-3xl shadow-2xl shadow-brand-100/40 p-5 sm:p-7 flex flex-col sm:flex-row items-center justify-between gap-5 hover:border-brand-200 transition-all duration-300">
              <div className="flex items-center gap-4 text-left">
                <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0 border border-brand-100/50 shadow-sm shadow-brand-100/10">
                  <Play className="w-7 h-7 fill-brand-600" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">{t('DairyWalla App')}</h2>
                  <p className="text-xs sm:text-sm text-slate-500 font-semibold leading-relaxed mt-0.5">{t('The official DairyWalla app is now available on the Google Play Store!')}</p>
                </div>
              </div>
              <a
                href="https://play.google.com/store/apps/details?id=com.dairywalla.app&pcampaignid=web_share"
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-7 rounded-xl flex items-center justify-center gap-2 text-sm transition-all duration-300 hover:-translate-y-0.5 whitespace-nowrap shadow-md shadow-slate-900/15"
              >
                <Play className="w-4 h-4 fill-current" /> {t('Download Now')}
              </a>
            </div>
          </div>

          {/* Hero Visual Mockup with Neon Glows */}
          <div className="relative max-w-6xl mx-auto animate-slide-up-fade">
             <div className="absolute inset-0 bg-gradient-to-tr from-brand-500 to-emerald-500 rounded-[2.5rem] blur-3xl opacity-20 -z-10 animate-pulse pointer-events-none"></div>
             <div className="relative rounded-[2.5rem] p-3 bg-white shadow-3xl border border-slate-100 overflow-hidden">
                <div className="bg-slate-900 rounded-[2rem] overflow-hidden border border-slate-800 shadow-inner">
                   <div className="bg-slate-850 h-9 w-full flex items-center px-5 gap-2 border-b border-slate-800">
                      <div className="w-3.5 h-3.5 rounded-full bg-red-400"></div>
                      <div className="w-3.5 h-3.5 rounded-full bg-amber-400"></div>
                      <div className="w-3.5 h-3.5 rounded-full bg-green-400"></div>
                      <div className="flex-1 text-center text-[10px] text-slate-500 font-bold uppercase tracking-widest">dairywalla-v2.pro.dashboard</div>
                   </div>
                   <img src="/screenshots/dashboard.png" alt="Dashboard" className="w-full h-auto object-cover" />
                </div>
             </div>
             {/* Floating Mobile Feature */}
             <div className="absolute -bottom-16 -right-8 lg:-right-24 w-60 lg:w-80 z-20 hidden sm:block">
                <div className="relative rounded-[3.5rem] p-2 bg-slate-900 shadow-3xl border-8 border-slate-850 overflow-hidden rotate-6 hover:rotate-0 transition-transform duration-500 group">
                   <img src="/screenshots/catalog.png" alt="Mobile Catalog" className="w-full h-auto rounded-[3rem]" />
                   <div className="absolute inset-0 bg-gradient-to-t from-brand-600/30 to-transparent pointer-events-none group-hover:opacity-0 transition-opacity"></div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* Feature Showoff - Bento Grid Style */}
      <section className="py-16 sm:py-28 bg-slate-50 border-y border-slate-100 px-4 sm:px-0" id="features">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 sm:mb-24 px-2 sm:px-0">
             <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-bold mb-4 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-brand-600 animate-spin" /> {t('Power Packed System')}
             </div>
             <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight leading-none">{t('Powerful Tools, One App.')}</h2>
             <p className="text-base sm:text-lg text-slate-500 font-semibold max-w-2xl mx-auto italic">{t('Tasks that used to take hours are now done in minutes with DairyWalla.')}</p>
             <div className="w-16 h-1 bg-gradient-to-r from-brand-500 to-emerald-500 rounded-full mx-auto mt-6"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 auto-rows-auto md:auto-rows-[240px]">
            {/* 1. Smart Re-Ordering (4 cols) */}
            <div className="md:col-span-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 group overflow-hidden relative hover:border-brand-200 hover:-translate-y-1">
               <div className="absolute -bottom-10 -right-10 w-36 h-36 bg-brand-50/50 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
               <div className="relative z-10 h-full flex flex-col justify-between">
                  <div>
                     <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-6 border border-brand-100/50 shadow-sm shadow-brand-100/10 group-hover:scale-110 transition-transform"><Zap className="w-6 h-6 fill-brand-600" /></div>
                     <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-3 tracking-tight">{t('Smart Cart System')}</h3>
                     <p className="text-slate-500 text-xs sm:text-sm font-semibold leading-relaxed">{t('Shopkeepers can repeat yesterday\'s order in exactly one click. No typing needed.')}</p>
                  </div>
                  <span className="text-[10px] text-brand-600 font-bold uppercase tracking-wider flex items-center gap-1 mt-4">Learn More &rarr;</span>
               </div>
            </div>

            {/* 2. Auto Summaries (8 cols) */}
            <div className="md:col-span-8 bg-slate-950 p-6 sm:p-8 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 group overflow-hidden relative hover:-translate-y-1">
               <div className="absolute top-0 right-0 w-80 h-80 bg-brand-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
               <div className="relative z-10 flex flex-col md:flex-row h-full items-stretch justify-between gap-6">
                  <div className="flex-1 flex flex-col justify-between">
                     <div>
                        <div className="w-12 h-12 rounded-2xl bg-white/10 text-white flex items-center justify-center mb-6 border border-white/10 shadow-lg group-hover:scale-110 transition-transform"><ClipboardList className="w-6 h-6 text-brand-400" /></div>
                        <h3 className="text-xl sm:text-2xl font-bold text-white mb-3 tracking-tight">{t('Instant Product Summary')}</h3>
                        <p className="text-slate-400 text-xs sm:text-sm font-medium leading-relaxed">{t('System calculates total Milk, Paneer, Curd demand across all shops. Get your load ready in seconds.')}</p>
                     </div>
                     <span className="text-[10px] text-brand-400 font-bold uppercase tracking-wider flex items-center gap-1 mt-4">Automated Consolidated Dispatch &rarr;</span>
                  </div>
                  <div className="w-full md:w-72 bg-white/[0.03] backdrop-blur-sm rounded-2xl p-4 border border-white/10 hidden sm:block flex-shrink-0 self-center">
                     <div className="text-[10px] text-brand-400 font-black mb-3 uppercase tracking-widest flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-ping"></span>{t('Today\'s Demand')}</div>
                     <div className="space-y-3">
                        <div className="flex justify-between items-center"><span className="text-slate-300 text-xs font-semibold">Amul Milk (500ml)</span><span className="text-white font-bold text-xs bg-white/10 px-2 py-0.5 rounded">420 Pkts</span></div>
                        <div className="flex justify-between items-center"><span className="text-slate-300 text-xs font-semibold">Fresh Paneer (1kg)</span><span className="text-white font-bold text-xs bg-white/10 px-2 py-0.5 rounded">25 Kg</span></div>
                        <div className="flex justify-between items-center"><span className="text-slate-300 text-xs font-semibold">Curd Cups (200g)</span><span className="text-white font-bold text-xs bg-white/10 px-2 py-0.5 rounded">180 Units</span></div>
                     </div>
                  </div>
               </div>
            </div>

            {/* 3. Normal vs Late Orders (7 cols) */}
            <div className="md:col-span-7 bg-gradient-to-br from-amber-50 to-orange-50/70 p-6 sm:p-8 rounded-3xl border border-amber-100 hover:shadow-xl transition-all duration-300 group hover:-translate-y-1 hover:border-amber-200">
               <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-6 h-full justify-between">
                  <div className="flex-1 flex flex-col justify-between h-full">
                     <div>
                        <div className="w-12 h-12 rounded-2xl bg-white text-amber-600 shadow-md shadow-amber-100/50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"><Clock className="w-6 h-6" /></div>
                        <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-3 tracking-tight">{t('Smart Cutoff Windows')}</h3>
                        <p className="text-slate-600 text-xs sm:text-sm font-semibold leading-relaxed">{t('Define your ordering time. Late orders are flagged for your approval, keeping your inventory stable.')}</p>
                     </div>
                     <span className="text-[10px] text-amber-600 font-bold uppercase tracking-wider flex items-center gap-1 mt-4">Order Cutoff Control &rarr;</span>
                  </div>
                  <div className="hidden sm:block flex-shrink-0 self-center">
                     <div className="flex flex-col gap-2.5 bg-white p-3.5 rounded-2xl border border-amber-100/50 shadow-sm">
                        <div className="bg-emerald-50 text-emerald-700 text-[10px] font-black px-3.5 py-1.5 rounded-xl text-center border border-emerald-100 hover:scale-105 transition-transform cursor-pointer">{t('8:00 PM (Normal)')}</div>
                        <div className="bg-red-50 text-red-700 text-[10px] font-black px-3.5 py-1.5 rounded-xl text-center border border-red-100 hover:scale-105 transition-transform cursor-pointer">{t('8:01 PM (Late)')}</div>
                     </div>
                  </div>
               </div>
            </div>

            {/* 4. Instant WhatsApp Sharing (5 cols) */}
            <div className="md:col-span-5 bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 group overflow-hidden relative hover:border-emerald-200 hover:-translate-y-1">
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
               <div className="relative z-10 h-full flex flex-col justify-between">
                  <div>
                     <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-6 border border-emerald-100/30 group-hover:scale-110 transition-transform"><Share2 className="w-6 h-6" /></div>
                     <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-3 tracking-tight">{t('Instant WhatsApp Sharing')}</h3>
                     <p className="text-slate-500 text-xs sm:text-sm font-semibold leading-relaxed">{t('Share professional bills, daily order summaries, and payment reminders with a single tap directly on WhatsApp.')}</p>
                  </div>
                  <div className="flex gap-2 mt-4 flex-wrap">
                     <span className="text-[9px] font-bold bg-slate-50 text-slate-500 border border-slate-100 px-2 py-1 rounded-lg">{t('PDF Invoices')}</span>
                     <span className="text-[9px] font-bold bg-slate-50 text-slate-500 border border-slate-100 px-2 py-1 rounded-lg">{t('Daily Summaries')}</span>
                     <span className="text-[9px] font-bold bg-slate-50 text-slate-500 border border-slate-100 px-2 py-1 rounded-lg">{t('WhatsApp Connect')}</span>
                  </div>
               </div>
            </div>

            {/* 5. Invoice Generation (6 cols) */}
            <div className="md:col-span-6 bg-gradient-to-br from-blue-50 to-indigo-50/70 p-6 sm:p-8 rounded-3xl border border-blue-100 hover:shadow-xl transition-all duration-300 group hover:-translate-y-1 hover:border-blue-200">
               <div className="h-full flex flex-col justify-between">
                  <div>
                     <div className="w-12 h-12 rounded-2xl bg-white text-blue-600 shadow-md shadow-blue-100/50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"><FileText className="w-6 h-6" /></div>
                     <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-3 tracking-tight">{t('One-Tap Professional Bills')}</h3>
                     <p className="text-slate-600 text-xs sm:text-sm font-semibold leading-relaxed">{t('Generate professional invoices for any order. Share directly to WhatsApp or download as PDF in seconds.')}</p>
                  </div>
                  <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider flex items-center gap-1 mt-4">Automatic Billing Engine &rarr;</span>
               </div>
            </div>

            {/* 6. Profile Sharing (6 cols) */}
            <div className="md:col-span-6 bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 group relative overflow-hidden hover:border-brand-200 hover:-translate-y-1">
               <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-slate-50 rounded-full opacity-50"></div>
               <div className="relative z-10 h-full flex flex-col justify-between">
                  <div>
                     <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-6 border border-brand-100/50 group-hover:scale-110 transition-transform"><Share2 className="w-6 h-6" /></div>
                     <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-3 tracking-tight">{t('Share & Grow')}</h3>
                     <p className="text-slate-500 text-xs sm:text-sm font-semibold leading-relaxed">{t('Distributors get a unique sharing link. Shopkeepers can connect simply by tapping the link on WhatsApp.')}</p>
                  </div>
                  <span className="text-[10px] text-brand-600 font-bold uppercase tracking-wider flex items-center gap-1 mt-4">Grow Network &rarr;</span>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dynamic Story & Purpose Section - Premium Look */}
      <section className="py-16 sm:py-28 bg-gradient-to-b from-white via-slate-50 to-white px-4 sm:px-0 relative overflow-hidden" id="our-story">
         {/* Background decorative shapes */}
         <div className="absolute top-1/2 left-0 w-96 h-96 bg-brand-200/20 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>
         <div className="absolute top-1/3 right-0 w-[400px] h-[400px] bg-emerald-100/20 rounded-full blur-3xl translate-x-1/3 pointer-events-none"></div>
         
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="text-center mb-16 sm:mb-24">
               <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-bold mb-4 uppercase tracking-wider">
                  <Heart className="w-3.5 h-3.5 animate-pulse text-brand-600" /> {t('Our Mission & Story')}
               </div>
               <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-none mb-6">
                  {t('The Heart Behind DairyWalla')}
               </h2>
               <div className="w-24 h-1.5 bg-gradient-to-r from-brand-500 to-emerald-500 rounded-full mx-auto"></div>
            </div>

            {/* Main Content Grid */}
            <div className="grid lg:grid-cols-3 gap-8 items-stretch mb-16 sm:mb-20">
               
               {/* 1. Why Exists */}
               <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
                  <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-brand-50/50 rounded-full group-hover:scale-150 transition-transform duration-500 pointer-events-none"></div>
                  <div className="relative z-10">
                     <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-6">
                        <Info className="w-6 h-6" />
                     </div>
                     <h3 className="text-xl font-bold text-slate-900 mb-4">{t('Why DairyWalla Exists')}</h3>
                     <p className="text-slate-500 text-sm font-medium leading-relaxed mb-6">
                        {t('DairyWalla was born out of a real need to transform the daily, exhausting manual processes of local milk distribution into a seamless, modern digital experience.')}
                     </p>
                  </div>
                  <div className="text-[10px] text-brand-600 font-bold uppercase tracking-wider relative z-10 flex items-center gap-1">
                     <span>{t('Modernizing Logistics')}</span> &rarr;
                  </div>
               </div>

               {/* 2. Problem We Solve */}
               <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
                  <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-amber-50/50 rounded-full group-hover:scale-150 transition-transform duration-500 pointer-events-none"></div>
                  <div className="relative z-10">
                     <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-6">
                        <HelpCircle className="w-6 h-6" />
                     </div>
                     <h3 className="text-xl font-bold text-slate-900 mb-4">{t('What Problem Are We Solving?')}</h3>
                     <p className="text-slate-500 text-sm font-medium leading-relaxed mb-6">
                        {t('Deciphering scribbled handwritten notes at midnight, endless phone calls, missed orders, manual load calculation, and mismatching cash ledgers. We replace chaos with absolute order.')}
                     </p>
                  </div>
                  <div className="text-[10px] text-amber-600 font-bold uppercase tracking-wider relative z-10 flex items-center gap-1">
                     <span>{t('Zero Errors')}</span> &rarr;
                  </div>
               </div>

               {/* 3. Who It Helps */}
               <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
                  <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-blue-50/50 rounded-full group-hover:scale-150 transition-transform duration-500 pointer-events-none"></div>
                  <div className="relative z-10">
                     <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6">
                        <Sparkles className="w-6 h-6" />
                     </div>
                     <h3 className="text-xl font-bold text-slate-900 mb-4">{t('Who It Helps & How')}</h3>
                     <p className="text-slate-500 text-sm font-medium leading-relaxed mb-6">
                        {t('Built specifically for local Dairy and Ice Cream Distributors and retail Shopkeepers. Shopkeepers order in 1-click; Distributors get auto-consolidated load lists, automated PDF bills, and WhatsApp summaries instantly.')}
                     </p>
                  </div>
                  <div className="text-[10px] text-blue-600 font-bold uppercase tracking-wider relative z-10 flex items-center gap-1">
                     <span>{t('Empowering Locals')}</span> &rarr;
                  </div>
               </div>

            </div>

            {/* Creator Story Voice - Premium Quote Layout */}
            <div className="bg-slate-900 rounded-[2.5rem] p-8 sm:p-12 md:p-16 relative overflow-hidden shadow-2xl border border-slate-880">
               <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-500/10 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3 pointer-events-none"></div>
               <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-2xl -translate-x-1/4 translate-y-1/4 pointer-events-none"></div>
               
               <div className="relative z-10 max-w-4xl mx-auto text-center">
                  <div className="w-12 sm:w-16 h-12 sm:h-16 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center mx-auto mb-6 sm:mb-8 border border-brand-500/30">
                     <Heart className="w-6 sm:w-8 h-6 sm:h-8 text-brand-400 fill-brand-400/20" />
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-brand-400 uppercase tracking-widest mb-4 sm:mb-6">{t('Why I Built This (Creator\'s Vision)')}</h3>
                  <blockquote className="text-base sm:text-lg md:text-xl lg:text-2xl font-semibold text-slate-100 leading-relaxed mb-8 sm:mb-10 italic">
                     {t('"Every night at 11 PM, I saw local dairy distributors struggling with calculator keys and stained paper files under a dim bulb, just to feed their cities by 5 AM. I created DairyWalla to give them back their sleep, their accuracy, and their time. This is not just software; it\'s a tribute to their dedication."')}
                  </blockquote>
                  <div className="w-16 h-0.5 bg-slate-800 mx-auto mb-4"></div>
                  <p className="text-xs sm:text-sm text-slate-400 font-bold tracking-widest uppercase">DairyWalla Creator Team</p>
                  <p className="text-[10px] text-brand-500 font-medium mt-1">Made with ❤️ for Local Dairy Ecosystem</p>
               </div>
            </div>
         </div>
      </section>

      {/* Interactive Feature: Order Window Visualizer */}
      <section className="py-12 sm:py-24 bg-white px-4 sm:px-0" id="dashboard">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-8 sm:gap-16 items-center">
               <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold mb-6 tracking-wider uppercase">{t('Real-Time Management')}</div>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mb-6 sm:mb-8 leading-tight">{t('Control Your Business From One Screen.')}</h2>
                  <div className="space-y-6">
                     {[
                       { icon: CheckCircle, title: 'Live Order Popups', desc: 'Get instant alerts as soon as a new order is placed.' },
                       { icon: TrendingUp, title: 'Revenue Tracking', desc: 'View daily and weekly sales trends at a glance.' },
                       { icon: Store, title: 'Shopkeeper Activity', desc: 'Keep track of active and inactive shopkeepers effortlessly.' }
                     ].map((item, i) => (
                        <div key={i} className="flex gap-4 items-start">
                           <div className="w-6 h-6 rounded-full bg-brand-50 flex items-center justify-center shrink-0 mt-1"><item.icon className="w-4 h-4 text-brand-600" /></div>
                           <div>
                              <h4 className="font-bold text-slate-900">{t(item.title)}</h4>
                              <p className="text-slate-500 text-sm font-medium">{t(item.desc)}</p>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
               <div className="bg-slate-100 rounded-[3rem] p-6 sm:p-10 relative group">
                  <div className="absolute -top-6 -right-6 w-32 h-32 bg-brand-500/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-1000"></div>
                  <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200">
                     <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <span className="font-bold text-slate-900">{t('Today\'s Orders')}</span>
                        <div className="flex gap-2">
                           <span className="w-3 h-3 rounded-full bg-brand-500"></span>
                           <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                        </div>
                     </div>
                     <div className="p-4 space-y-3">
                        <div className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-100">
                           <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center font-bold text-brand-700">A</div>
                              <div><div className="text-sm font-bold text-slate-900">{t('Aman Store')}</div><div className="text-[10px] text-slate-400 font-bold uppercase">{t('7:45 PM • Normal')}</div></div>
                           </div>
                           <div className="text-brand-600 font-black">₹4,810</div>
                        </div>
                        <div className="p-4 bg-red-50/50 rounded-2xl flex items-center justify-between border border-red-100/50">
                           <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center font-bold text-red-700">R</div>
                              <div><div className="text-sm font-bold text-slate-900">{t('Rahul Dairy')}</div><div className="text-[10px] text-red-500 font-bold uppercase">{t('8:15 PM • Late')}</div></div>
                           </div>
                           <button className="bg-slate-900 text-white text-[10px] font-bold px-4 py-2 rounded-lg">{t('Approve')}</button>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </section>

      {/* How It Works - Visual Timeline */}
      <section className="py-12 sm:py-24 bg-slate-900 relative overflow-hidden px-4 sm:px-0" id="how-it-works">
         <div className="absolute top-0 left-0 w-full h-full bg-brand-600/5 -z-10"></div>
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white text-center mb-16 sm:mb-20 tracking-tight">{t('How It Works.')}</h2>
            
            <div className="grid md:grid-cols-3 gap-6 sm:gap-12 relative">
               <div className="hidden md:block absolute top-12 left-0 w-full h-0.5 bg-white/10 -z-10"></div>
               {[
                 { step: 1, title: 'Profile Setup', desc: 'Sign up, select your role, and complete your profile.' },
                 { step: 2, title: 'Connect Shops', desc: 'Share your code, accept connection requests.' },
                 { step: 3, title: 'Manage Orders', desc: 'Manage catalog, summaries, and digital invoices.' }
               ].map((item, i) => (
                  <div key={i} className="text-center group">
                     <div className="w-20 h-20 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-8 shadow-2xl group-hover:bg-brand-500 group-hover:scale-110 transition-all duration-300 relative">
                        <span className="text-2xl font-bold text-white">{item.step}</span>
                        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-brand-500 rounded-full flex items-center justify-center shadow-lg animate-pulse"><Check className="w-4 h-4 text-white" /></div>
                     </div>
                     <h4 className="text-xl font-bold text-white mb-3 tracking-tight">{t(item.title)}</h4>
                     <p className="text-slate-400 text-sm font-medium leading-relaxed">{t(item.desc)}</p>
                  </div>
               ))}
            </div>
         </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 sm:py-32 bg-white text-center px-4 sm:px-0 relative overflow-hidden">
         <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-50 rounded-full blur-3xl opacity-40 -z-10 translate-x-1/2"></div>
         <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-bold text-slate-900 mb-6 sm:mb-8 tracking-tight px-2 sm:px-0">{t('Ready to boost your business?')}</h2>
         <p className="text-slate-500 text-sm sm:text-base md:text-lg lg:text-xl font-medium mb-8 sm:mb-12 max-w-2xl mx-auto italic px-2 sm:px-0">{t('Join hundreds of local distributors and shops saving hours every single day.')}</p>
         <button onClick={() => navigate('/demo')} className="bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 sm:py-4 lg:py-5 px-8 sm:px-12 lg:px-16 rounded-2xl shadow-2xl shadow-brand-200 transition-all hover:-translate-y-1 text-sm sm:text-base lg:text-xl flex items-center justify-center gap-3 mx-auto">
            {t('Book Demo')} <ArrowRight className="w-4 sm:w-5 lg:w-6 h-4 sm:h-5 lg:h-6" />
         </button>
      </section>

      {/* Footer */}
      <footer className="py-16 bg-white border-t border-slate-100 text-center">
         <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center p-1.5">
               <BrandLogo className="w-full h-full grayscale opacity-40" />
            </div>
            <span className="text-xl font-bold text-slate-900 tracking-tight">DairyWalla</span>
         </div>
         <div className="flex flex-col items-center gap-2">
            <div className="flex gap-4 mb-2">
              <Link to="/feedback" className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors">Leave Feedback</Link>
              <span className="text-slate-300">•</span>
              <Link to="/privacy-policy" className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors">Privacy Policy</Link>
              <span className="text-slate-300">•</span>
              <Link to="/terms-conditions" className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors">Terms & Conditions</Link>
              <span className="text-slate-300">•</span>
              <Link to="/blogs" className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors">Blog</Link>
              <span className="text-slate-300">•</span>
              <a href="/about-us-faq.html" className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors">FAQ</a>
            </div>
            <p className="text-slate-400 text-sm font-medium tracking-tight">
               Built with ❤️ by <a href="https://mohit-portfolio-65976.web.app/" target="_blank" rel="noreferrer" className="text-brand-600 font-bold hover:underline">Mohit Saini</a> &amp; <a href="https://portfolio-aman-sharma.web.app/" target="_blank" rel="noreferrer" className="text-brand-600 font-bold hover:underline">Aman Sharma</a>
            </p>
         </div>
      </footer>
    </div>
  );
}
