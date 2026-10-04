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

  // 1. Human Escalation / Call Specialist / Contact Founders
  if (text.includes('human') || text.includes('specialist') || text.includes('agent') || text.includes('call') || text.includes('transfer') || text.includes('mohit') || text.includes('aman') || text.includes('number') || text.includes('phone') || text.includes('baat karni hai') || text.includes('support')) {
    return {
      reply: "Main aapko humare specialist se connect kar raha hoon. Aap direct call kar sakte hain ya Mohit ji aur Aman ji ki team se WhatsApp par baat kar sakte hain (+91 76270 47702).",
      action: 'call_human'
    };
  }

  // 2. What is DairyWalla / Kya hai
  if (text.includes('kya hai') || text.includes('about') || text.includes('dairywalla kya') || text.includes('kya kaam') || text.includes('what is')) {
    return {
      reply: "DairyWalla dairy aur ice cream distribution business ka complete digital operating system hai. Ye WhatsApp par aane wale bikhre hue orders ko khatam karta hai, real-time stock deta hai, aur packing sheet tatha automatic PDF bill generate karta hai."
    };
  }

  // 3. Shopkeeper / Dukan-dar details & ordering
  if (text.includes('shopkeeper') || text.includes('dukan') || text.includes('retailer') || text.includes('order kaise') || text.includes('order place')) {
    return {
      reply: "Shopkeepers ke liye order karna behad aasan hai! Play Store se DairyWalla app download karein ya website par jayein, Shopkeeper chunein, aur apne distributor ka 6-digit Connection Code enter karein. Uske baad 1-Click me 'Repeat Yesterday Order' se bina dubara type kiye turant order de sakte hain.",
      action: 'register_shopkeeper'
    };
  }

  // 4. Distributor setup & orders
  if (text.includes('distributor') || text.includes('supply') || text.includes('agency') || text.includes('dispatch') || text.includes('catalog')) {
    return {
      reply: "Distributor ke roop me aap Dairy, Ice Cream ya Dono select karke apna catalog, rate list aur cutoff time (jaise 8:00 PM) set kar sakte hain. Subah gadi load karne ke liye 'Instant Demand Summary' me pata chal jata hai ki total kitne crates milk aur kitna paneer bhejna hai.",
      action: 'register_distributor'
    };
  }

  // 5. WhatsApp vs DairyWalla / Why better
  if (text.includes('whatsapp') || text.includes('fayda') || text.includes('benefit') || text.includes('kyu') || text.includes('difference')) {
    return {
      reply: "WhatsApp par audio messages, 'kal jaisa bhej do', aur late orders se gadi load hone me deri hoti hai aur hisaab me galti hoti hai. DairyWalla me exact pack size book hota hai, order time par lock hota hai, aur automatic PDF bill WhatsApp par chala jata hai."
    };
  }

  // 6. Cutoff Time rule
  if (text.includes('cutoff') || text.includes('late') || text.includes('time') || text.includes('timing')) {
    return {
      reply: "Distributor apna order cutoff time set kar sakta hai, jaise shaam 8 baje. Cutoff se pehle aane wale orders confirm hote hain, aur uske baad aane wale orders 'Late Order' mark hokar distributor ke paas approval ke liye aate hain."
    };
  }

  // 7. Pricing / Charges / Free
  if (text.includes('charge') || text.includes('price') || text.includes('paisa') || text.includes('cost') || text.includes('fees') || text.includes('free')) {
    return {
      reply: "Aap bina kisi initial fees ke bilkul FREE shuru kar sakte hain aur demo le sakte hain. Aap app download karke try kijiye ya humari team se customized plan samajh lijiye."
    };
  }

  // 8. Payment & Invoicing
  if (text.includes('bill') || text.includes('invoice') || text.includes('payment') || text.includes('udhar') || text.includes('hisaab')) {
    return {
      reply: "Order deliver hote hi DairyWalla automatically item-wise PDF bill generate kar deta hai jise 1 click me WhatsApp par bheja ja sakta hai. Kis dukan par kitna payment pending hai, dashboard par saaf dikhta hai."
    };
  }

  // 9. Uneducated / Less educated shopkeeper objection
  if (text.includes('padha') || text.includes('anpadh') || text.includes('seekh') || text.includes('chalana nahi aata') || text.includes('simple')) {
    return {
      reply: "DairyWalla ko itna aasan banaya gaya hai ki koi bhi 2 click me use kar sakta hai. Isme 'Repeat Last Order' feature hai jisme roz likhna bhi nahi padta—sirf ek button dabaya aur kal ka order repeat!"
    };
  }

  // 10. Greetings & Friendly chat
  if (text.includes('namaste') || text.includes('hello') || text.includes('hi') || text.includes('kaise ho')) {
    return {
      reply: "Namaste! Main badhiya hoon. Aap bataiye, DairyWalla ke bare me kya jaanna chahte hain? Main aapko Distributor ya Shopkeeper kisi bhi role ke liye guide kar sakta hoon."
    };
  }

  // Default fallback
  return {
    reply: "Ji bilkul! DairyWalla aapke daily orders, subah ki dispatch packing summary aur billing ko bohot aasan banata hai. Kya aapko Distributor onboarding ya Shopkeeper order flow ke baare me detail chahiye? Ya main hamare specialist se call connect karun?",
    action: 'call_human'
  };
}
