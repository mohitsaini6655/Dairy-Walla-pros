import React, { useState, useEffect, useRef } from 'react';
import { 
  Phone, 
  PhoneCall, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  MessageSquare, 
  Bot, 
  Sparkles, 
  X, 
  Send, 
  Headphones, 
  ShieldCheck 
} from 'lucide-react';
import { 
  AGENT_CONFIG, 
  generateAgentResponse, 
  getInitialGreeting, 
  type ChatMessage 
} from './agentKnowledge';
import { RetellWebClient } from 'retell-client-js-sdk';

export function DairyWallaAIAgent() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'voice' | 'chat'>('voice');
  const [isCalling, setIsCalling] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [agentSpeaking, setAgentSpeaking] = useState(false);
  const [userSpeaking, setUserSpeaking] = useState(false);
  const [callStatusText, setCallStatusText] = useState('Ready to call');
  const [transcriptSubtitle, setTranscriptSubtitle] = useState('');
  
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');

  // Retell Web Client reference
  const retellClientRef = useRef<RetellWebClient | null>(null);
  const [isRetellActive, setIsRetellActive] = useState(false);

  // Web Speech recognition & synthesis refs
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'hi-IN';

        recognition.onstart = () => {
          setUserSpeaking(true);
        };

        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }

          if (interimTranscript) {
            setTranscriptSubtitle(`You: "${interimTranscript}"`);
          }

          if (finalTranscript.trim()) {
            handleUserVoiceInput(finalTranscript.trim());
          }
        };

        recognition.onerror = (e: any) => {
          console.warn('Speech recognition error:', e?.error);
          setUserSpeaking(false);
        };

        recognition.onend = () => {
          setUserSpeaking(false);
          // Auto restart if still in voice call and not muted
          if (isCalling && !isMuted) {
            try {
              recognition.start();
            } catch (_) {}
          }
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isCalling, isMuted]);

  // Handle Call Timer
  useEffect(() => {
    if (isCalling) {
      setCallDuration(0);
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setCallDuration(0);
      setTranscriptSubtitle('');
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    }
  }, [isCalling]);

  // Auto scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Speak agent reply using SpeechSynthesis
  const speakText = (text: string, onEnd?: () => void) => {
    if (typeof window === 'undefined' || !window.speechSynthesis || !isSpeakerOn) {
      if (onEnd) onEnd();
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'hi-IN';
    utterance.rate = 1.02;
    utterance.pitch = 1.0;

    // Pick Hindi or Indian English voice if available
    const voices = window.speechSynthesis.getVoices();
    const hindiVoice = voices.find(v => v.lang.includes('hi') || v.name.includes('India') || v.lang.includes('IN'));
    if (hindiVoice) {
      utterance.voice = hindiVoice;
    }

    utterance.onstart = () => {
      setAgentSpeaking(true);
      setCallStatusText('Aryan is speaking...');
      setTranscriptSubtitle(`Aryan: "${text}"`);
    };

    utterance.onend = () => {
      setAgentSpeaking(false);
      setCallStatusText('Listening to you...');
      if (onEnd) onEnd();
    };

    utterance.onerror = () => {
      setAgentSpeaking(false);
      setCallStatusText('Listening to you...');
      if (onEnd) onEnd();
    };

    window.speechSynthesis.speak(utterance);
  };

  // Start Voice Call
  const startCall = async () => {
    setIsCalling(true);
    setCallStatusText('Connecting to Aryan...');
    
    // Check if Retell Web Client access token is available from API
    try {
      const response = await fetch('/api/retell/create-web-call', { method: 'POST' }).catch(() => null);
      if (response && response.ok) {
        const data = await response.json();
        if (data.access_token) {
          const retellWebClient = new RetellWebClient();
          retellClientRef.current = retellWebClient;
          
          retellWebClient.on('call_started', () => {
            setIsRetellActive(true);
            setCallStatusText('Connected with Retell AI (HD Voice)');
          });

          retellWebClient.on('call_ended', () => {
            endCall();
          });

          retellWebClient.on('update', (update) => {
            if (update.transcript && update.transcript.length > 0) {
              const lastItem = update.transcript[update.transcript.length - 1];
              setTranscriptSubtitle(`${lastItem.role === 'agent' ? 'Aryan' : 'You'}: "${lastItem.content}"`);
            }
          });

          await retellWebClient.startCall({ accessToken: data.access_token });
          return;
        }
      }
    } catch (err) {
      console.log('Retell API not connected, falling back to instant browser voice engine:', err);
    }

    // Default Browser Voice Mode
    setIsRetellActive(false);
    setTimeout(() => {
      setCallStatusText('Connected (HD Voice)');
      const greeting = getInitialGreeting();
      speakText(greeting, () => {
        // Start listening after greeting completes
        if (recognitionRef.current && !isMuted) {
          try {
            recognitionRef.current.start();
          } catch (_) {}
        }
      });

      // Add initial greeting to chat log
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          sender: 'agent',
          text: greeting,
          timestamp: new Date()
        }
      ]);
    }, 600);
  };

  // End Call
  const endCall = () => {
    if (retellClientRef.current) {
      try {
        retellClientRef.current.stopCall();
      } catch (_) {}
      retellClientRef.current = null;
    }
    setIsRetellActive(false);
    setIsCalling(false);
    setAgentSpeaking(false);
    setUserSpeaking(false);
    setCallStatusText('Call ended');

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  // Handle voice speech input
  const handleUserVoiceInput = (text: string) => {
    if (!text) return;
    setTranscriptSubtitle(`You: "${text}"`);
    
    // Add user message
    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      sender: 'user',
      text,
      timestamp: new Date()
    };

    const { reply, action } = generateAgentResponse(text);
    const agentMsg: ChatMessage = {
      id: (Math.random() + 1).toString(),
      sender: 'agent',
      text: reply,
      timestamp: new Date(),
      action
    };

    setMessages((prev) => [...prev, userMsg, agentMsg]);

    // Speak response
    speakText(reply, () => {
      if (recognitionRef.current && !isMuted && isCalling) {
        try {
          recognitionRef.current.start();
        } catch (_) {}
      }
    });
  };

  // Handle Text Chat submit
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    const userText = inputText.trim();
    setInputText('');

    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      sender: 'user',
      text: userText,
      timestamp: new Date()
    };

    const { reply, action } = generateAgentResponse(userText);
    const agentMsg: ChatMessage = {
      id: (Math.random() + 1).toString(),
      sender: 'agent',
      text: reply,
      timestamp: new Date(),
      action
    };

    setMessages((prev) => [...prev, userMsg, agentMsg]);

    // Optional audio read if speaker is enabled
    if (isSpeakerOn && mode === 'voice') {
      speakText(reply);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {/* Floating Launcher Button */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2 select-none">
        {!isOpen && (
          <div className="animate-bounce bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg border border-brand-200 text-xs font-semibold text-brand-800 flex items-center gap-1.5 cursor-pointer" onClick={() => { setIsOpen(true); if (!isCalling) startCall(); }}>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Talk with Aryan (DairyWalla AI)
          </div>
        )}

        <button
          onClick={() => {
            setIsOpen(!isOpen);
            if (!isOpen && !isCalling) {
              startCall();
            }
          }}
          className="relative group flex items-center gap-3 bg-gradient-to-r from-brand-600 via-blue-600 to-indigo-700 hover:from-brand-700 hover:to-indigo-800 text-white p-4 rounded-full shadow-2xl hover:shadow-brand-500/40 transition-all duration-300 active:scale-95"
          aria-label="Open DairyWalla AI Voice Assistant"
        >
          {/* Glowing pulse ring */}
          <span className="absolute -inset-1 rounded-full bg-gradient-to-r from-brand-400 to-indigo-500 opacity-60 group-hover:opacity-100 blur-sm animate-pulse" />

          <div className="relative flex items-center gap-2.5 z-10">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <Headphones className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-bold leading-tight flex items-center gap-1">
                Aryan AI Calling
                <Sparkles className="w-3 h-3 text-amber-300" />
              </span>
              <span className="text-[10px] text-white/80 leading-tight">24/7 Voice Support</span>
            </div>
          </div>
        </button>
      </div>

      {/* Main Calling / Chat Modal Window */}
      {isOpen && (
        <div className="fixed inset-0 sm:inset-auto sm:bottom-24 sm:right-6 z-50 w-full sm:w-[420px] sm:max-h-[640px] h-full sm:h-[640px] bg-white sm:rounded-3xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-300">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 text-white px-5 py-4 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-500 to-blue-700 flex items-center justify-center font-bold text-white shadow-inner">
                  DW
                </div>
                <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${isCalling ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
              </div>
              <div>
                <h3 className="font-bold text-sm tracking-wide flex items-center gap-1.5">
                  Aryan (DairyWalla AI)
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                </h3>
                <p className="text-[11px] text-slate-300 font-medium">
                  {isCalling ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      {isRetellActive ? 'Retell AI' : 'Live Call'} • {formatTimer(callDuration)}
                    </span>
                  ) : (
                    'Official Voice & Onboarding Agent'
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Mode switch */}
              <button
                onClick={() => setMode(mode === 'voice' ? 'chat' : 'voice')}
                className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors ${mode === 'chat' ? 'bg-white/20 text-white' : 'text-slate-300 hover:bg-white/10'}`}
                title={mode === 'voice' ? 'Switch to Chat' : 'Switch to Voice Call'}
              >
                {mode === 'voice' ? <MessageSquare className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
              </button>

              <button
                onClick={() => {
                  if (isCalling) endCall();
                  setIsOpen(false);
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mode 1: VOICE CALL SCREEN */}
          {mode === 'voice' && (
            <div className="flex-1 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950 text-white flex flex-col justify-between p-6 overflow-hidden">
              
              {/* Call Status & Avatar Center */}
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                
                {/* Pulsating Avatar Rings */}
                <div className="relative mb-6">
                  {agentSpeaking && (
                    <>
                      <div className="absolute -inset-4 rounded-full bg-brand-500/30 animate-ping" />
                      <div className="absolute -inset-8 rounded-full bg-blue-500/20 animate-pulse" />
                    </>
                  )}
                  {userSpeaking && (
                    <div className="absolute -inset-4 rounded-full bg-emerald-500/30 animate-pulse" />
                  )}
                  
                  <div className="relative w-28 h-28 rounded-full bg-gradient-to-tr from-brand-600 via-blue-500 to-indigo-600 p-1 shadow-2xl flex items-center justify-center">
                    <div className="w-full h-full rounded-full bg-slate-900 flex flex-col items-center justify-center">
                      <Bot className="w-12 h-12 text-brand-400" />
                      <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-1">AI Voice</span>
                    </div>
                  </div>
                </div>

                <h4 className="text-xl font-bold tracking-tight text-white mb-1">
                  Aryan
                </h4>
                <p className="text-xs text-brand-300 font-medium mb-3">
                  DairyWalla Customer Success
                </p>

                <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-medium text-slate-200 mb-4">
                  <span className={`w-2 h-2 rounded-full ${isCalling ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  {callStatusText}
                </div>

                {/* Sound wave visualizer bars */}
                {isCalling && (
                  <div className="flex items-center justify-center gap-1.5 h-10 w-full max-w-[200px] mb-3">
                    {[40, 75, 55, 90, 65, 30, 85, 45, 70, 35].map((height, i) => (
                      <div
                        key={i}
                        className={`w-1.5 rounded-full transition-all duration-150 ${
                          agentSpeaking
                            ? 'bg-brand-400 animate-pulse'
                            : userSpeaking
                            ? 'bg-emerald-400 animate-pulse'
                            : 'bg-white/20'
                        }`}
                        style={{
                          height: (agentSpeaking || userSpeaking)
                            ? `${Math.max(12, (height * Math.random()) + 15)}px`
                            : '8px'
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Real-time speech subtitle */}
                {transcriptSubtitle && (
                  <div className="bg-black/40 backdrop-blur-md border border-white/10 px-4 py-2.5 rounded-2xl max-w-[340px] text-xs text-slate-200 leading-relaxed shadow-lg">
                    {transcriptSubtitle}
                  </div>
                )}
              </div>

              {/* Call Action Bar */}
              <div className="space-y-4 pt-4 border-t border-white/10">
                <div className="flex items-center justify-around">
                  {/* Mute button */}
                  <button
                    onClick={() => {
                      setIsMuted(!isMuted);
                      if (!isMuted && recognitionRef.current) {
                        recognitionRef.current.stop();
                      } else if (isMuted && recognitionRef.current && isCalling) {
                        recognitionRef.current.start();
                      }
                    }}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                      isMuted ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                    title={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>

                  {/* Main Call Connect / End Button */}
                  {isCalling ? (
                    <button
                      onClick={endCall}
                      className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg shadow-red-600/40 active:scale-95 transition-all"
                      title="End Call"
                    >
                      <PhoneOff className="w-7 h-7" />
                    </button>
                  ) : (
                    <button
                      onClick={startCall}
                      className="w-16 h-16 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-lg shadow-emerald-600/40 active:scale-95 transition-all animate-pulse"
                      title="Start Call"
                    >
                      <PhoneCall className="w-7 h-7" />
                    </button>
                  )}

                  {/* Speaker toggle */}
                  <button
                    onClick={() => {
                      setIsSpeakerOn(!isSpeakerOn);
                      if (isSpeakerOn && typeof window !== 'undefined' && window.speechSynthesis) {
                        window.speechSynthesis.cancel();
                      }
                    }}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                      !isSpeakerOn ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                    title={isSpeakerOn ? 'Mute Audio Output' : 'Enable Audio Output'}
                  >
                    {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                  </button>
                </div>

                {/* Transfer to Human Specialist button */}
                <div className="flex items-center justify-between gap-2 pt-2">
                  <a
                    href={`tel:${AGENT_CONFIG.phoneSupportNumber}`}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-medium transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5 text-blue-400" />
                    Call Human Specialist
                  </a>
                  <a
                    href={AGENT_CONFIG.whatsappLink}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-medium transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    WhatsApp Team
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Mode 2: CHAT INTERFACE */}
          {mode === 'chat' && (
            <div className="flex-1 bg-slate-50 flex flex-col justify-between overflow-hidden">
              
              {/* Messages list */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                {messages.length === 0 && (
                  <div className="text-center py-6 px-4">
                    <div className="w-12 h-12 rounded-2xl bg-brand-100 text-brand-700 flex items-center justify-center mx-auto mb-3">
                      <Bot className="w-6 h-6" />
                    </div>
                    <h5 className="font-bold text-gray-900 text-sm">Namaste! Main Aryan hoon.</h5>
                    <p className="text-xs text-gray-500 mt-1 max-w-[260px] mx-auto leading-relaxed">
                      DairyWalla ke orders, distributor catalog ya shopkeeper features ke bare me kuch bhi puchiye.
                    </p>

                    {/* Quick suggestion chips */}
                    <div className="mt-4 flex flex-wrap gap-2 justify-center">
                      {[
                        "Shopkeeper order kaise kare?",
                        "Distributor setup aur Cutoff time",
                        "WhatsApp se behtar kyu hai?",
                        "PDF Bill kaise banta hai?",
                        "Human Specialist se baat karein"
                      ].map((chip) => (
                        <button
                          key={chip}
                          onClick={() => {
                            setInputText(chip);
                          }}
                          className="bg-white border border-gray-200 hover:border-brand-500 hover:bg-brand-50 text-gray-700 text-xs py-1.5 px-3 rounded-full transition-all shadow-2xs text-left"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                        msg.sender === 'user'
                          ? 'bg-brand-600 text-white rounded-tr-none'
                          : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none'
                      }`}
                    >
                      {msg.text}
                    </div>

                    {/* Action buttons embedded in message */}
                    {msg.action === 'call_human' && (
                      <div className="mt-2 flex items-center gap-2">
                        <a
                          href={`tel:${AGENT_CONFIG.phoneSupportNumber}`}
                          className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold py-1.5 px-3 rounded-lg shadow-xs"
                        >
                          <Phone className="w-3 h-3" />
                          Call: {AGENT_CONFIG.phoneFormatted}
                        </a>
                        <a
                          href={AGENT_CONFIG.whatsappLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold py-1.5 px-3 rounded-lg shadow-xs"
                        >
                          WhatsApp
                        </a>
                      </div>
                    )}

                    <span className="text-[9px] text-gray-400 mt-1 px-1">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input form */}
              <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-gray-200 flex items-center gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Type your question or message..."
                  className="flex-1 bg-gray-100 border-none rounded-xl px-4 py-2.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />

                <button
                  type="button"
                  onClick={() => {
                    setMode('voice');
                    if (!isCalling) startCall();
                  }}
                  className="p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                  title="Speak via Voice Call"
                >
                  <Mic className="w-4 h-4 text-brand-600" />
                </button>

                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="p-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white transition-all shadow-sm"
                  title="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

        </div>
      )}
    </>
  );
}
