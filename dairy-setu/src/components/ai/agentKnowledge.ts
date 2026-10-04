// DairyWalla AI Voice Calling Assistant Knowledge Base & Logic
// Configured according to the official Retell AI Single-Prompt Agent specification

export const AGENT_CONFIG = {
  agentName: "DairyWalla AI Calling Assistant",
  personaNames: ["Aryan", "Priya"],
  phoneSupportNumber: "+917627047702",
  phoneFormatted: "+91 76270 47702",
  whatsappLink: "https://wa.me/917627047702?text=Namaste%20DairyWalla%20Team%2C%20mujhe%20app%2Fplatform%20ke%20bare%20me%20help%20chahiye.",
  language: "hi-IN",
  founders: "Aman Sharma aur Mohit Saini",
  llmModel: "gpt-5.6-terra",
  voiceId: "retell-Cimo",
};

export interface ChatMessage {
  id: string;
  sender: 'agent' | 'user' | 'system';
  text: string;
  timestamp: Date;
  action?: 'call_human' | 'whatsapp' | 'register_distributor' | 'register_shopkeeper';
}

export function getInitialGreeting(callerName?: string): string {
  if (callerName) {
    return `Namaste ${callerName} ji! Main DairyWalla se Aryan baat kar raha hoon. Main aapki kya sahayata kar sakta hoon? Aap Dairy/Ice Cream Distributor hain ya Retail Shopkeeper?`;
  }
  return `Namaste! DairyWalla support me aapka swagat hai. Main Aryan, aapka official AI Voice Assistant. Main aapki kya sahayata kar sakta hoon? Aap Distributor hain ya Shopkeeper?`;
}

export function generateAgentResponse(input: string): { reply: string; action?: 'call_human' | 'whatsapp' | 'register_distributor' | 'register_shopkeeper' } {
  const text = input.toLowerCase().trim();

  // 1. Listening / Audio Check (Very important for voice interactions!)
  if (
    text.includes('sun rahe') || 
    text.includes('suno') || 
    text.includes('awaz') || 
    text.includes('aawaz') || 
    text.includes('meri baat') || 
    text.includes('can you hear') || 
    text.includes('you listening') || 
    text.includes('koi hai') ||
    text.includes('test')
  ) {
    return {
      reply: "Haanji! Main aapko bilkul saaf aur clear sun raha hoon. Namaste! Main Aryan hoon. Aap bataiye, main aapki kya sahayata kar sakta hoon?"
    };
  }

  // 2. Human Escalation / Call Specialist / Contact Founders
  if (text.includes('human') || text.includes('specialist') || text.includes('agent') || text.includes('call') || text.includes('transfer') || text.includes('mohit') || text.includes('aman') || text.includes('number') || text.includes('phone') || text.includes('baat karni hai') || text.includes('support')) {
    return {
      reply: "Main aapko humare specialist se connect kar raha hoon. Aap direct call kar sakte hain ya Mohit ji aur Aman ji ki team se WhatsApp par baat kar sakte hain (+91 76270 47702).",
      action: 'call_human'
    };
  }

  // 3. What is DairyWalla / Kya hai
  if (text.includes('kya hai') || text.includes('about') || text.includes('dairywalla kya') || text.includes('kya kaam') || text.includes('what is')) {
    return {
      reply: "DairyWalla dairy aur ice cream distribution ka complete digital platform hai. Ye WhatsApp ke messy orders ko khatam karke daily order, packing sheet aur automatic PDF bill generate karta hai."
    };
  }

  // 4. Shopkeeper / Dukan-dar details & ordering
  if (text.includes('shopkeeper') || text.includes('dukan') || text.includes('retailer') || text.includes('order kaise') || text.includes('order place') || text.includes('order karna')) {
    return {
      reply: "Shopkeepers ke liye order karna behad aasan hai! App ya website me Shopkeeper chunein, distributor ka 6-digit code enter karein, aur 'Repeat Yesterday Order' se 1-click me order place karein.",
      action: 'register_shopkeeper'
    };
  }

  // 5. Distributor setup & orders
  if (text.includes('distributor') || text.includes('supply') || text.includes('agency') || text.includes('dispatch') || text.includes('catalog')) {
    return {
      reply: "Distributor Dairy ya Ice Cream select karke catalog aur cutoff time (jaise 8 PM) set kar sakte hain. Subah gadi load karne ke liye 'Demand Summary' me exact crate count mil jata hai.",
      action: 'register_distributor'
    };
  }

  // 6. Milk, Paneer, Dahi, Ice Cream products & pricing
  if (text.includes('milk') || text.includes('doodh') || text.includes('paneer') || text.includes('dahi') || text.includes('ice cream') || text.includes('icecream') || text.includes('rate')) {
    return {
      reply: "DairyWalla me distributor fresh doodh, paneer, dahi aur ice cream ka rate list aur pack size update kar sakte hain, jo shopkeeper ko instant dikhta hai."
    };
  }

  // 7. Connection Code
  if (text.includes('code') || text.includes('connection') || text.includes('connect')) {
    return {
      reply: "Distributor ko profile me ek 6-digit Connection Code milta hai. Shopkeeper us code ko enter karke distributor se instant connect ho sakte hain."
    };
  }

  // 8. Account creation & login
  if (text.includes('account') || text.includes('login') || text.includes('sign up') || text.includes('password') || text.includes('register')) {
    return {
      reply: "Aap email aur password se 1 minute me account bana sakte hain. Role me Distributor ya Shopkeeper chuniye aur turant shuru kijiye."
    };
  }

  // 9. WhatsApp vs DairyWalla / Why better
  if (text.includes('whatsapp') || text.includes('fayda') || text.includes('benefit') || text.includes('kyu') || text.includes('difference')) {
    return {
      reply: "WhatsApp me voice notes aur late orders se gadi load hone me deri aur hisaab me galti hoti hai. DairyWalla me time par order lock hota hai aur automatic PDF bill generate hota hai."
    };
  }

  // 10. Cutoff Time rule
  if (text.includes('cutoff') || text.includes('late') || text.includes('time') || text.includes('timing')) {
    return {
      reply: "Distributor apna cutoff time set karta hai, jaise 8:00 PM. Iske baad ke orders 'Late Order' mark hote hain jise distributor chahe to approve kar sakta hai."
    };
  }

  // 11. Pricing / Charges / Free
  if (text.includes('charge') || text.includes('price') || text.includes('paisa') || text.includes('cost') || text.includes('fees') || text.includes('free')) {
    return {
      reply: "DairyWalla shuruat me bilkul FREE hai! Aap bina kisi charges ke direct use shuru kar sakte hain."
    };
  }

  // 12. Payment & Invoicing
  if (text.includes('bill') || text.includes('invoice') || text.includes('payment') || text.includes('udhar') || text.includes('hisaab')) {
    return {
      reply: "Order confirm hote hi automatic item-wise PDF bill banta hai jise WhatsApp par share kiya ja sakta hai. Kis shopkeeper par kitna balance hai, dashboard me dikhta hai."
    };
  }

  // 13. Greetings & Friendly chat
  if (text.includes('namaste') || text.includes('hello') || text.includes('hi') || text.includes('kaise ho') || text.includes('good morning') || text.includes('good evening')) {
    return {
      reply: "Namaste! Main badhiya hoon. Aap bataiye, DairyWalla ke bare me kya jaanna chahte hain? Main aapko Distributor ya Shopkeeper dono ke liye guide kar sakta hoon."
    };
  }

  // Default fallback
  return {
    reply: "Ji bilkul! DairyWalla dairy aur ice cream supply chain ko digital banata hai. Kya aapko shopkeeper order flow ya distributor setup ke bare me jaankari chahiye?",
    action: 'call_human'
  };
}
