import { create } from 'zustand';

export type AppLanguage = 'english' | 'hindi';

interface LanguageState {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
}

const getInitialLang = (): AppLanguage => {
  const saved = localStorage.getItem('app-language') as AppLanguage;
  if (saved === 'hindi' || saved === 'english') return saved;
  return 'english';
};

export const useLanguageStore = create<LanguageState>((set) => ({
  language: getInitialLang(),
  setLanguage: (lang) => {
    localStorage.setItem('app-language', lang);
    set({ language: lang });
  }
}));

export const translations: Record<string, Record<AppLanguage, string>> = {
  // Navigation Distributor
  'Dashboard': { english: 'Dashboard', hindi: 'डैशबोर्ड' },
  'Orders': { english: 'Orders', hindi: 'ऑर्डर्स' },
  'Order Summary': { english: 'Order Summary', hindi: 'ऑर्डर सारांश' },
  'Catalog': { english: 'Catalog', hindi: 'कैटलॉग' },
  'Shopkeepers': { english: 'Shopkeepers', hindi: 'दुकानदार' },
  'Invoices': { english: 'Invoices', hindi: 'इनवॉइस' },
  'Settings': { english: 'Settings', hindi: 'सेटिंग्स' },
  
  // Navigation Shopkeeper
  'Order Now': { english: 'Order Now', hindi: 'अभी ऑर्डर करें' },
  'Discover': { english: 'Discover', hindi: 'खोजें' },
  'My Orders': { english: 'My Orders', hindi: 'मेरे ऑर्डर्स' },
  'My Distributor': { english: 'My Distributor', hindi: 'मेरे डिस्ट्रीब्यूटर' },
  
  // Common Buttons & Texts
  'Notifications': { english: 'Notifications', hindi: 'सूचनाएं' },
  'Logout': { english: 'Logout', hindi: 'लॉगआउट' },
  'Save Settings': { english: 'Save Settings', hindi: 'सेटिंग्स सेव करें' },
  'Search products...': { english: 'Search products...', hindi: 'उत्पाद खोजें...' },
  'Items': { english: 'items', hindi: 'सामान' },
  'Total': { english: 'Total', hindi: 'कुल' },
  'Review Order': { english: 'Review Order', hindi: 'ऑर्डर जांचें' },
  'My Profile': { english: 'My Profile', hindi: 'मेरी प्रोफाइल' },
  'Manage your profile details.': { english: 'Manage your profile details.', hindi: 'अपनी प्रोफाइल विवरण प्रबंधित करें।' },
  'Cancel': { english: 'Cancel', hindi: 'रद्द करें' },
  'Save': { english: 'Save', hindi: 'सेव करें' },
  'Edit': { english: 'Edit', hindi: 'बदलें' },
  
  // Profile Fields
  'Owner Name': { english: 'Owner Name', hindi: 'मालिक का नाम' },
  'Business Name': { english: 'Business Name', hindi: 'डेयरी का नाम' },
  'Shop Name': { english: 'Shop Name', hindi: 'दुकान का नाम' },
  'Mobile Number': { english: 'Mobile Number', hindi: 'मोबाइल नंबर' },
  'Login PIN': { english: 'Login PIN', hindi: 'लॉगिन पिन' },
  'Company / Brand': { english: 'Company / Brand', hindi: 'कंपनी / ब्रांड' },
  'City': { english: 'City', hindi: 'शहर' },
  'Address': { english: 'Address', hindi: 'पता' },
  'Delivery Areas': { english: 'Delivery Areas', hindi: 'डिलीवरी क्षेत्र' },
  'Delivery Timing': { english: 'Delivery Timing', hindi: 'डिलीवरी का समय' },
  'GST Number': { english: 'GST Number', hindi: 'जीएसटी नंबर' },
  'Location': { english: 'Location', hindi: 'लोकेशन / स्थान' },
  'Connection Code': { english: 'Connection Code', hindi: 'कनेक्शन कोड' },
  'Copy Code': { english: 'Copy Code', hindi: 'कोड कॉपी करें' },
  'Products in Catalog': { english: 'Products in Catalog', hindi: 'कैटलॉग में उत्पाद' },
  'Connected Shopkeepers': { english: 'Connected Shopkeepers', hindi: 'जुड़े हुए दुकानदार' },
  'Order Window Settings': { english: 'Order Window Settings', hindi: 'ऑर्डर विंडो सेटिंग्स' },
  
  // Account Delete
  'Delete Account': { english: 'Delete Account', hindi: 'खाता हटाएं' },
  'Are you absolutely sure?': { english: 'Are you absolutely sure?', hindi: 'क्या आप पूरी तरह सुनिश्चित हैं?' },
  'This action cannot be undone. All your account data will be permanently deleted.': {
    english: 'This action cannot be undone. All your account data will be permanently deleted.',
    hindi: 'यह क्रिया वापस नहीं ली जा सकती। आपका सारा खाता डेटा हमेशा के लिए हटा दिया जाएगा।'
  },
  'Yes, Delete': { english: 'Yes, Delete', hindi: 'हां, हटाएं' },
  
  // Smart Suggestion
  'Smart Suggestion': { english: 'Smart Suggestion', hindi: 'स्मार्ट सुझाव' },
  'Aaj bhi kal wala order laga du?': { 
    english: 'Should I repeat yesterday\'s order?', 
    hindi: 'क्या आज भी कल वाला ऑर्डर लगा दूँ?' 
  },
  'One-Click Confirm': { english: 'One-Click Confirm', hindi: 'एक-क्लिक कन्फर्म' },
  'Review & Edit': { english: 'Review & Edit', hindi: 'देखें और बदलें' },
  
  // Settings Text
  'App Language': { english: 'App Language', hindi: 'ऐप की भाषा' },
  'Select your preferred language.': { 
    english: 'Select your preferred language.', 
    hindi: 'अपनी पसंदीदा भाषा चुनें।' 
  },
  
  // Alerts & Toasts
  'This field cannot be empty.': { english: 'This field cannot be empty.', hindi: 'यह फ़ील्ड खाली नहीं हो सकती।' },
  'Phone number must be exactly 10 digits.': { english: 'Phone number must be exactly 10 digits.', hindi: 'फ़ोन नंबर बिल्कुल 10 अंकों का होना चाहिए।' },
  'PIN must be exactly 6 digits.': { english: 'PIN must be exactly 6 digits.', hindi: 'पिन बिल्कुल 6 अंकों का होना चाहिए।' },
  'Location captured!': { english: 'Location captured!', hindi: 'स्थान दर्ज कर लिया गया!' },
  'Location access denied': { english: 'Location access denied', hindi: 'स्थान पहुंच अस्वीकृत' },
  'Connection code copied to clipboard!': { english: 'Connection code copied to clipboard!', hindi: 'कनेक्शन कोड कॉपी हो गया!' },
  'Account deleted successfully': { english: 'Account deleted successfully', hindi: 'खाता सफलतापूर्वक हटा दिया गया' },
  'Location updated!': { english: 'Location updated!', hindi: 'स्थान अपडेट हो गया!' },
  'Get GPS Location': { english: 'Get GPS Location', hindi: 'जीपीएस लोकेशन प्राप्त करें' },
  'items': { english: 'items', hindi: 'उत्पाद' },
  'Features': { english: 'Features', hindi: 'विशेषताएं' },
  'How it works': { english: 'How it works', hindi: 'यह कैसे काम करता है' },
  'Login': { english: 'Login', hindi: 'लॉगिन' },
  'Sign Up': { english: 'Sign Up', hindi: 'साइन अप' },
  'The Complete Dairy Business Operating System': { english: 'The Complete Dairy Business Operating System', hindi: 'संपूर्ण डेयरी व्यवसाय ऑपरेटिंग सिस्टम' },
  'Ab Dairy Business Hoga 100x Zyada Fast.': { english: 'Ab Dairy Business Hoga 100x Zyada Fast.', hindi: 'डेयरी बिजनेस अब होगा 100 गुना ज्यादा तेज।' },
  'Everything you need to manage your dairy distribution in one place. From smart ordering to auto-invoicing, DairyWalla takes care of the hard work so you can grow.': {
    english: 'Everything you need to manage your dairy distribution in one place. From smart ordering to auto-invoicing, DairyWalla takes care of the hard work so you can grow.',
    hindi: 'आपके डेयरी वितरण को प्रबंधित करने के लिए सब कुछ एक ही स्थान पर। स्मार्ट ऑर्डरिंग से लेकर ऑटो-इनवॉइसिंग तक, डेयरीवाला कठिन काम खुद करता है ताकि आप आगे बढ़ सकें।'
  },
  'Start Free Trial': { english: 'Start Free Trial', hindi: 'मुफ्त में शुरू करें' },
  'Watch Features': { english: 'Watch Features', hindi: 'फीचर्स देखें' },
  'Download App': { english: 'Download App', hindi: 'ऐप डाउनलोड करें' },
  'Download the DairyWalla APK to use the app on your mobile device.': {
    english: 'Download the DairyWalla APK to use the app on your mobile device.',
    hindi: 'मोबाइल पर ऐप का उपयोग करने के लिए डेयरीवाला एपीके डाउनलोड करें।'
  },
  'Download APK': { english: 'Download APK', hindi: 'एपीके डाउनलोड करें' },
  'Powerful Tools, One App.': { english: 'Powerful Tools, One App.', hindi: 'शक्तिशाली उपकरण, एक ही ऐप।' },
  'Tasks that used to take hours are now done in minutes with DairyWalla.': {
    english: 'Tasks that used to take hours are now done in minutes with DairyWalla.',
    hindi: 'जिन कामों में पहले घंटों लगते थे, वे अब डेयरीवाला के साथ मिनटों में हो जाते हैं।'
  },
  'Smart Cart System': { english: 'Smart Cart System', hindi: 'स्मार्ट कार्ट सिस्टम' },
  'Shopkeepers can repeat yesterday\'s order in exactly one click. No typing needed.': {
    english: 'Shopkeepers can repeat yesterday\'s order in exactly one click. No typing needed.',
    hindi: 'दुकानदार बिल्कुल एक क्लिक में कल के ऑर्डर को दोहरा सकते हैं। किसी टाइपिंग की आवश्यकता नहीं है।'
  },
  'Instant Product Summary': { english: 'Instant Product Summary', hindi: 'त्वरित उत्पाद सारांश' },
  'System calculates total Milk, Paneer, Curd demand across all shops. Get your load ready in seconds.': {
    english: 'System calculates total Milk, Paneer, Curd demand across all shops. Get your load ready in seconds.',
    hindi: 'सिस्टम सभी दुकानों में कुल दूध, पनीर, दही की मांग की गणना करता है। सेकंड में अपना लोड तैयार करें।'
  },
  'Today\'s Demand': { english: 'Today\'s Demand', hindi: 'आज की मांग' },
  'Smart Cutoff Windows': { english: 'Smart Cutoff Windows', hindi: 'स्मार्ट कटऑफ समय' },
  'Define your ordering time. Late orders are flagged for your approval, keeping your inventory stable.': {
    english: 'Define your ordering time. Late orders are flagged for your approval, keeping your inventory stable.',
    hindi: 'ऑर्डर करने का समय तय करें। देर से आने वाले ऑर्डर्स को आपकी मंजूरी के लिए चिह्नित किया जाता है, जिससे आपका स्टॉक स्थिर रहता।'
  },
  '8:00 PM (Normal)': { english: '8:00 PM (Normal)', hindi: 'रात 8:00 बजे (सामान्य)' },
  '8:01 PM (Late)': { english: '8:01 PM (Late)', hindi: 'रात 8:01 बजे (देर से)' },
  'Instant WhatsApp Sharing': { english: 'Instant WhatsApp Sharing', hindi: 'व्हाट्सएप पर तुरंत शेयर करें' },
  'Share professional bills, daily order summaries, and payment reminders with a single tap directly on WhatsApp.': {
    english: 'Share professional bills, daily order summaries, and payment reminders with a single tap directly on WhatsApp.',
    hindi: 'सीधे व्हाट्सएप पर एक टैप से पेशेवर बिल, दैनिक ऑर्डर सारांश और भुगतान अनुस्मारक साझा करें।'
  },
  'PDF Invoices': { english: 'PDF Invoices', hindi: 'पीडीएफ इनवॉइस' },
  'Daily Summaries': { english: 'Daily Summaries', hindi: 'दैनिक सारांश' },
  'WhatsApp Connect': { english: 'WhatsApp Connect', hindi: 'व्हाट्सएप कनेक्ट' },
  'One-Tap Professional Bills': { english: 'One-Tap Professional Bills', hindi: 'एक-टैप में पेशेवर बिल' },
  'Generate professional invoices for any order. Share directly to WhatsApp or download as PDF in seconds.': {
    english: 'Generate professional invoices for any order. Share directly to WhatsApp or download as PDF in seconds.',
    hindi: 'किसी भी ऑर्डर के लिए पेशेवर इनवॉइस जेनरेट करें। सीधे व्हाट्सएप पर साझा करें या सेकंड में पीडीएफ के रूप में डाउनलोड करें।'
  },
  'Share & Grow': { english: 'Share & Grow', hindi: 'साझा करें और बढ़ें' },
  'Distributors get a unique sharing link. Shopkeepers can connect simply by tapping the link on WhatsApp.': {
    english: 'Distributors get a unique sharing link. Shopkeepers can connect simply by tapping the link on WhatsApp.',
    hindi: 'डिस्ट्रीब्यूटर को एक विशिष्ट साझाकरण लिंक मिलता है। दुकानदार व्हाट्सएप पर बस लिंक पर टैप करके जुड़ सकते हैं।'
  },
  'Real-Time Management': { english: 'Real-Time Management', hindi: 'रीअल-टाइम प्रबंधन' },
  'Control Your Business From One Screen.': { english: 'Control Your Business From One Screen.', hindi: 'अपने व्यवसाय को एक स्क्रीन से नियंत्रित करें।' },
  'Live Order Popups': { english: 'Live Order Popups', hindi: 'लाइव ऑर्डर पॉपअप' },
  'Get instant alerts as soon as a new order is placed.': {
    english: 'Get instant alerts as soon as a new order is placed.',
    hindi: 'जैसे ही कोई नया ऑर्डर दिया जाता है, तुरंत अलर्ट प्राप्त करें।'
  },
  'Revenue Tracking': { english: 'Revenue Tracking', hindi: 'राजस्व ट्रैकिंग' },
  'View daily and weekly sales trends at a glance.': {
    english: 'View daily and weekly sales trends at a glance.',
    hindi: 'दैनिक और साप्ताहिक बिक्री रुझान एक नज़र में देखें।'
  },
  'Shopkeeper Activity': { english: 'Shopkeeper Activity', hindi: 'दुकानदार की गतिविधि' },
  'Keep track of active and inactive shopkeepers effortlessly.': {
    english: 'Keep track of active and inactive shopkeepers effortlessly.',
    hindi: 'सक्रिय और निष्क्रिय दुकानदारों पर आसानी से नज़र रखें।'
  },
  'Today\'s Orders': { english: 'Today\'s Orders', hindi: 'आज के ऑर्डर्स' },
  'Aman Store': { english: 'Aman Store', hindi: 'अमन स्टोर' },
  '7:45 PM • Normal': { english: '7:45 PM • Normal', hindi: 'शाम 7:45 • सामान्य' },
  'Rahul Dairy': { english: 'Rahul Dairy', hindi: 'राहुल डेयरी' },
  '8:15 PM • Late': { english: '8:15 PM • Late', hindi: 'रात 8:15 • देर से' },
  'Approve': { english: 'Approve', hindi: 'मंजूर करें' },
  'How It Works.': { english: 'How It Works.', hindi: 'यह कैसे काम करता है।' },
  'Profile Setup': { english: 'Profile Setup', hindi: 'प्रोफ़ाइल सेटअप' },
  'Sign up, select your role, and complete your profile.': {
    english: 'Sign up, select your role, and complete your profile.',
    hindi: 'साइन अप करें, अपनी भूमिका चुनें और अपनी प्रोफ़ाइल पूरी करें।'
  },
  'Connect Shops': { english: 'Connect Shops', hindi: 'दुकानें जोड़ें' },
  'Share your code, accept connection requests.': {
    english: 'Share your code, accept connection requests.',
    hindi: 'अपना कोड साझा करें, कनेक्शन अनुरोध स्वीकार करें।'
  },
  'Manage Orders': { english: 'Manage Orders', hindi: 'ऑर्डर प्रबंधित करें' },
  'Manage catalog, summaries, and digital invoices.': {
    english: 'Manage catalog, summaries, and digital invoices.',
    hindi: 'कैटलॉग, सारांश और डिजिटल इनवॉइस प्रबंधित करें।'
  },
  'Ready to boost your business?': { english: 'Ready to boost your business?', hindi: 'अपने व्यवसाय को बढ़ावा देने के लिए तैयार हैं?' },
  'Join hundreds of local distributors and shops saving hours every single day.': {
    english: 'Join hundreds of local distributors and shops saving hours every single day.',
    hindi: 'हर दिन घंटों की बचत करने वाले सैकड़ों स्थानीय डिस्ट्रीब्यूटर और दुकानों से जुड़ें।'
  },
  'Get Started For Free': { english: 'Get Started For Free', hindi: 'मुफ्त में शुरुआत करें' },
  '© 2026 DairyWalla — Local Dairy Distribution Digitized.': {
    english: '© 2026 DairyWalla — Local Dairy Distribution Digitized.',
    hindi: '© 2026 डेयरीवाला — स्थानीय डेयरी वितरण का डिजिटलीकरण।'
  },
  'Profile': { english: 'Profile', hindi: 'प्रोफाइल' },
  'More': { english: 'More', hindi: 'अन्य' },
  'Why DairyWalla Exists': {
    english: 'Why DairyWalla Exists',
    hindi: 'डेयरीवाला क्यों अस्तित्व में है?'
  },
  'DairyWalla was born out of a real need to transform the daily, exhausting manual processes of local milk distribution into a seamless, modern digital experience.': {
    english: 'DairyWalla was born out of a real need to transform the daily, exhausting manual processes of local milk distribution into a seamless, modern digital experience.',
    hindi: 'डेयरीवाला का जन्म स्थानीय दूध वितरण की दैनिक, थका देने वाली मैन्युअल प्रक्रियाओं को एक सहज, आधुनिक डिजिटल अनुभव में बदलने की वास्तविक आवश्यकता से हुआ था।'
  },
  'What Problem Are We Solving?': {
    english: 'What Problem Are We Solving?',
    hindi: 'हम किस समस्या का समाधान कर रहे हैं?'
  },
  'Deciphering scribbled handwritten notes at midnight, endless phone calls, missed orders, manual load calculation, and mismatching cash ledgers. We replace chaos with absolute order.': {
    english: 'Deciphering scribbled handwritten notes at midnight, endless phone calls, missed orders, manual load calculation, and mismatching cash ledgers. We replace chaos with absolute order.',
    hindi: 'आधी रात को हाथ से लिखे पर्चों को पढ़ना, अंतहीन फोन कॉल, छूटे हुए ऑर्डर, मैन्युअल लोड की गणना, और नकद बहीखाता में गड़बड़ियाँ। हम इस अव्यवस्था को पूर्ण व्यवस्था में बदलते हैं।'
  },
  'Who It Helps & How': {
    english: 'Who It Helps & How',
    hindi: 'यह किसकी और कैसे मदद करता है?'
  },
  'Built specifically for local Dairy Distributors and retail Shopkeepers. Shopkeepers order in 1-click; Distributors get auto-consolidated load lists, automated PDF bills, and WhatsApp summaries instantly.': {
    english: 'Built specifically for local Dairy Distributors and retail Shopkeepers. Shopkeepers order in 1-click; Distributors get auto-consolidated load lists, automated PDF bills, and WhatsApp summaries instantly.',
    hindi: 'विशेष रूप से स्थानीय डेयरी वितरकों (Distributors) और खुदरा दुकानदारों (Shopkeepers) के लिए बनाया गया है। दुकानदार 1-क्लिक में ऑर्डर करते हैं; वितरकों को तुरंत समेकित लोड सूची, स्वचालित पीडीएफ बिल और व्हाट्सएप सारांश मिलता है।'
  },
  'Why I Built This (Creator\'s Vision)': {
    english: 'Why I Built This (Creator\'s Vision)',
    hindi: 'मैंने इसे क्यों बनाया (निर्माता की दृष्टि)'
  },
  '"Every night at 11 PM, I saw local dairy distributors struggling with calculator keys and stained paper files under a dim bulb, just to feed their cities by 5 AM. I created DairyWalla to give them back their sleep, their accuracy, and their time. This is not just software; it\'s a tribute to their dedication."': {
    english: '"Every night at 11 PM, I saw local dairy distributors struggling with calculator keys and stained paper files under a dim bulb, just to feed their cities by 5 AM. I created DairyWalla to give them back their sleep, their accuracy, and their time. This is not just software; it\'s a tribute to their dedication."',
    hindi: '"हर रात 11 बजे, मैंने स्थानीय डेयरी वितरकों को सुबह 5 बजे तक अपने शहरों को दूध पहुँचाने के लिए एक मंद बल्ब के नीचे कैलकुलेटर और फटे हुए कागज के पर्चों के साथ संघर्ष करते देखा। मैंने उनके लिए \'डेयरीवाला\' बनाया ताकि उन्हें उनकी नींद, उनकी शुद्धता और उनका समय वापस मिल सके। यह सिर्फ एक सॉफ्टवेयर नहीं है; यह उनके समर्पण को एक सम्मान है।"'
  },
  'Our Mission & Story': {
    english: 'Our Mission & Story',
    hindi: 'हमारा उद्देश्य और कहानी'
  },
  'The Heart Behind DairyWalla': {
    english: 'The Heart Behind DairyWalla',
    hindi: 'डेयरीवाला के पीछे का दिल'
  },
  'Our Story': {
    english: 'Our Story',
    hindi: 'हमारी कहानी'
  },
  'Modernizing Logistics': {
    english: 'Modernizing Logistics',
    hindi: 'लॉजिस्टिक्स का आधुनिकीकरण'
  },
  'Zero Errors': {
    english: 'Zero Errors',
    hindi: 'शून्य त्रुटियां'
  },
  'Empowering Locals': {
    english: 'Empowering Locals',
    hindi: 'स्थानीय लोगों का सशक्तिकरण'
  }
};

export function useTranslation() {
  const { language, setLanguage } = useLanguageStore();
  const t = (key: string) => {
    if (translations[key]) {
      return translations[key][language] || translations[key]['english'] || key;
    }
    return key;
  };
  return { t, language, setLanguage };
}
