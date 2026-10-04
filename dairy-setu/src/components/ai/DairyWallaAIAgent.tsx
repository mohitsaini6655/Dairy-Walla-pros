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
  ShieldCheck,
  Settings,
  AlertCircle,
  CheckCircle,
  Radio,
  Globe
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
  const [micVolume, setMicVolume] = useState(0);
  const [visualizerBars, setVisualizerBars] = useState<number[]>([12, 18, 14, 25, 30, 22, 16, 28, 20, 15]);
  const [micPermissionError, setMicPermissionError] = useState<string | null>(null);
  const [language, setLanguage] = useState<'hi-IN' | 'en-IN'>('hi-IN');
  
  // Settings modal state for Retell AI configuration
  const [showSettings, setShowSettings] = useState(false);
  const [retellApiKey, setRetellApiKey] = useState(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('dairywalla_retell_api_key') || '' : '';
  });
  const [retellAgentId, setRetellAgentId] = useState(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('dairywalla_retell_agent_id') || '' : '';
  });
  const [savedSettingsNotice, setSavedSettingsNotice] = useState(false);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [voiceQuickInput, setVoiceQuickInput] = useState('');

  // Retell Web Client reference
  const retellClientRef = useRef<RetellWebClient | null>(null);
  const [isRetellActive, setIsRetellActive] = useState(false);

  // Hardware audio & speech refs
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Speech Recognition & Synthesis references
  const recognitionRef = useRef<any>(null);
  const isRecognizingRef = useRef(false);
  const isCallingRef = useRef(false);
  const isMutedRef = useRef(false);
  const agentSpeakingRef = useRef(false);
  const speechSilenceTimerRef = useRef<any>(null);
  const accumulatedSpeechRef = useRef<string>('');
  const utteranceWatchdogRef = useRef<any>(null);
  const timerRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Keep ref mirrors in sync with state for real-time async callbacks
  useEffect(() => {
    isCallingRef.current = isCalling;
  }, [isCalling]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    agentSpeakingRef.current = agentSpeaking;
  }, [agentSpeaking]);

  // Clean shutdown on unmount
  useEffect(() => {
    return () => {
      cleanupAudioAndSpeech();
    };
  }, []);

  // Cleanup helper
  const cleanupAudioAndSpeech = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (speechSilenceTimerRef.current) {
      clearTimeout(speechSilenceTimerRef.current);
      speechSilenceTimerRef.current = null;
    }
    if (utteranceWatchdogRef.current) {
      clearTimeout(utteranceWatchdogRef.current);
      utteranceWatchdogRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (_) {}
      isRecognizingRef.current = false;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch (_) {}
      audioContextRef.current = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (retellClientRef.current) {
      try {
        retellClientRef.current.stopCall();
      } catch (_) {}
      retellClientRef.current = null;
    }
  };

  // Initialize Speech Recognition instance
  const setupSpeechRecognition = () => {
    if (typeof window === 'undefined') return null;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('SpeechRecognition API not available in this browser');
      return null;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = language;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        isRecognizingRef.current = true;
        if (!agentSpeakingRef.current) {
          setCallStatusText('Listening to you...');
        }
      };

      recognition.onresult = (event: any) => {
        if (agentSpeakingRef.current) return;

        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item && item[0]) {
            if (item.isFinal) {
              finalTranscript += ' ' + item[0].transcript;
            } else {
              interimTranscript += ' ' + item[0].transcript;
            }
          }
        }

        const candidateText = (finalTranscript || interimTranscript).trim();
        if (candidateText) {
          accumulatedSpeechRef.current = candidateText;
          setTranscriptSubtitle(`You: "${candidateText}"`);
          setUserSpeaking(true);

          // Fast Voice Activity debounce: if user pauses for 1100ms, process response!
          if (speechSilenceTimerRef.current) clearTimeout(speechSilenceTimerRef.current);
          speechSilenceTimerRef.current = setTimeout(() => {
            if (accumulatedSpeechRef.current.trim().length > 1 && !agentSpeakingRef.current && isCallingRef.current) {
              const query = accumulatedSpeechRef.current.trim();
              accumulatedSpeechRef.current = '';
              handleUserVoiceInput(query);
            }
          }, 1100);
        }
      };

      recognition.onerror = (e: any) => {
        console.warn('Speech recognition warning:', e?.error);
        isRecognizingRef.current = false;
        setUserSpeaking(false);

        if (e?.error === 'not-allowed' || e?.error === 'service-not-allowed') {
          setMicPermissionError('Microphone blocked. Please grant microphone permission in your browser address bar.');
        } else if (e?.error === 'no-speech') {
          // Normal timeout due to silence, quietly restart
          restartRecognitionSafely(200);
        } else if (isCallingRef.current && !agentSpeakingRef.current) {
          restartRecognitionSafely(400);
        }
      };

      recognition.onend = () => {
        isRecognizingRef.current = false;
        setUserSpeaking(false);
        if (isCallingRef.current && !agentSpeakingRef.current && !isMutedRef.current) {
          restartRecognitionSafely(150);
        }
      };

      recognitionRef.current = recognition;
      return recognition;
    } catch (err) {
      console.warn('Failed to initialize speech recognition:', err);
      return null;
    }
  };

  const startRecognitionSafely = () => {
    if (!recognitionRef.current) {
      setupSpeechRecognition();
    }
    if (recognitionRef.current && !isRecognizingRef.current && isCallingRef.current && !agentSpeakingRef.current) {
      try {
        recognitionRef.current.start();
        isRecognizingRef.current = true;
      } catch (err: any) {
        // Recognition already started or busy
        if (err?.name !== 'InvalidStateError') {
          console.warn('SpeechRecognition start err:', err);
        }
      }
    }
  };

  const stopRecognitionSafely = () => {
    if (recognitionRef.current && isRecognizingRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
      isRecognizingRef.current = false;
    }
  };

  const restartRecognitionSafely = (delay = 200) => {
    setTimeout(() => {
      if (isCallingRef.current && !agentSpeakingRef.current && !isMutedRef.current) {
        startRecognitionSafely();
      }
    }, delay);
  };

  // Initialize Web Audio API Analyser for real microphone volume & visualizer
  const initAudioAnalyser = async (): Promise<boolean> => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setMicPermissionError('Your browser does not support microphone audio capture.');
        return false;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      mediaStreamRef.current = stream;
      setMicPermissionError(null);

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const audioCtx = new AudioContextClass();
        audioContextRef.current = audioCtx;
        if (audioCtx.state === 'suspended') {
          await audioCtx.resume();
        }

        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 32;
        analyser.smoothingTimeConstant = 0.5;
        analyserRef.current = analyser;

        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const updateMeters = () => {
          if (!analyserRef.current || !isCallingRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);

          let sum = 0;
          const dynamicBars: number[] = [];
          for (let i = 0; i < 10; i++) {
            const rawVal = dataArray[i % dataArray.length] || 0;
            // Scale bar height between 10px and 70px
            const barH = Math.min(70, Math.max(10, Math.round(rawVal * 0.55)));
            dynamicBars.push(barH);
            sum += rawVal;
          }
          const avg = Math.round(sum / (dataArray.length || 1));
          setMicVolume(avg);
          setVisualizerBars(dynamicBars);

          // Audio activity detection
          if (avg > 14 && !agentSpeakingRef.current && !isMutedRef.current) {
            setUserSpeaking(true);
          } else {
            setUserSpeaking(false);
          }

          animFrameRef.current = requestAnimationFrame(updateMeters);
        };

        animFrameRef.current = requestAnimationFrame(updateMeters);
      }
      return true;
    } catch (err: any) {
      console.warn('Microphone permission request failed:', err);
      setMicPermissionError('Microphone permission denied. Click "Allow Microphone" in your browser.');
      return false;
    }
  };

  // Handle call timer
  useEffect(() => {
    if (isCalling) {
      setCallDuration(0);
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setCallDuration(0);
    }
  }, [isCalling]);

  // Auto scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Speak agent reply with garbage-collection protection & auto-recovery
  const speakText = (text: string, onEnd?: () => void) => {
    if (typeof window === 'undefined' || !window.speechSynthesis || !isSpeakerOn) {
      if (onEnd) onEnd();
      return;
    }

    // Stop microphone recognition while agent is speaking to prevent self-echo
    stopRecognitionSafely();
    agentSpeakingRef.current = true;
    setAgentSpeaking(true);
    setCallStatusText('Aryan is speaking...');
    setTranscriptSubtitle(`Aryan: "${text}"`);

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    // Prevent Chrome garbage-collection bug
    (window as any).__dwActiveUtterance = utterance;

    // Pick Indian Hindi or English voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (v) => v.lang.includes('hi') || v.name.includes('India') || v.name.includes('Hindi') || v.lang.includes('IN')
    );
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    const finishSpeaking = () => {
      if (utteranceWatchdogRef.current) {
        clearTimeout(utteranceWatchdogRef.current);
        utteranceWatchdogRef.current = null;
      }
      agentSpeakingRef.current = false;
      setAgentSpeaking(false);
      setCallStatusText('Listening to you...');
      
      // Start listening to user once agent finishes speaking
      if (isCallingRef.current && !isMutedRef.current) {
        startRecognitionSafely();
      }
      if (onEnd) onEnd();
    };

    utterance.onend = finishSpeaking;
    utterance.onerror = (e) => {
      console.warn('Speech synthesis utterance error:', e);
      finishSpeaking();
    };

    // Watchdog fallback in case Chrome drops onend event
    const estimatedWords = text.split(' ').length;
    const estimatedDurationMs = Math.max(2500, estimatedWords * 320);
    utteranceWatchdogRef.current = setTimeout(() => {
      if (agentSpeakingRef.current) {
        finishSpeaking();
      }
    }, estimatedDurationMs + 1500);

    window.speechSynthesis.speak(utterance);
  };

  // Start Voice Call
  const startCall = async () => {
    setIsCalling(true);
    setCallStatusText('Connecting microphone...');
    setTranscriptSubtitle('');

    // Step 1: Initialize microphone stream & audio analyser
    const micReady = await initAudioAnalyser();
    if (!micReady) {
      setCallStatusText('Mic permission required');
    }

    // Step 2: Initialize speech recognition
    setupSpeechRecognition();

    // Step 3: Check if Retell Web Client access token is available
    try {
      const response = await fetch('/api/retell/create-web-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: retellApiKey.trim() || undefined,
          agentId: retellAgentId.trim() || undefined
        })
      }).catch(() => null);

      if (response && response.ok) {
        const data = await response.json();
        if (data.access_token) {
          const retellWebClient = new RetellWebClient();
          retellClientRef.current = retellWebClient;

          retellWebClient.on('call_started', () => {
            setIsRetellActive(true);
            setCallStatusText('Connected with Retell AI (Ultra HD)');
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

          retellWebClient.on('error', (err) => {
            console.warn('Retell error, falling back to browser voice:', err);
            setIsRetellActive(false);
          });

          await retellWebClient.startCall({ accessToken: data.access_token });
          return;
        }
      }
    } catch (err) {
      console.log('Retell API not connected, using instant browser voice engine:', err);
    }

    // Step 4: Default High-Speed Browser Voice Mode
    setIsRetellActive(false);
    setCallStatusText('Connected • Aryan Live');

    const greeting = getInitialGreeting();
    // Greet user and then start listening
    setTimeout(() => {
      speakText(greeting, () => {
        startRecognitionSafely();
      });

      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          sender: 'agent',
          text: greeting,
          timestamp: new Date()
        }
      ]);
    }, 400);
  };

  // End Call
  const endCall = () => {
    setIsCalling(false);
    setIsRetellActive(false);
    setAgentSpeaking(false);
    setUserSpeaking(false);
    setCallStatusText('Call ended');
    setTranscriptSubtitle('');
    cleanupAudioAndSpeech();
  };

  // Handle voice speech input
  const handleUserVoiceInput = (text: string) => {
    if (!text || !text.trim()) return;
    const cleanText = text.trim();
    setTranscriptSubtitle(`You: "${cleanText}"`);

    // Add user message
    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      sender: 'user',
      text: cleanText,
      timestamp: new Date()
    };

    const { reply, action } = generateAgentResponse(cleanText);
    const agentMsg: ChatMessage = {
      id: (Math.random() + 1).toString(),
      sender: 'agent',
      text: reply,
      timestamp: new Date(),
      action
    };

    setMessages((prev) => [...prev, userMsg, agentMsg]);

    // Speak response
    speakText(reply);
  };

  // Handle quick text query submitted in Voice screen
  const handleVoiceQuickSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!voiceQuickInput.trim()) return;
    const query = voiceQuickInput.trim();
    setVoiceQuickInput('');
    handleUserVoiceInput(query);
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

    // Speak reply if speaker is on and in voice mode
    if (isSpeakerOn && mode === 'voice') {
      speakText(reply);
    }
  };

  // Save Retell settings
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      localStorage.setItem('dairywalla_retell_api_key', retellApiKey.trim());
      localStorage.setItem('dairywalla_retell_agent_id', retellAgentId.trim());
    }
    setSavedSettingsNotice(true);
    setTimeout(() => {
      setSavedSettingsNotice(false);
      setShowSettings(false);
    }, 1200);
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
          <div 
            className="animate-bounce bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-lg border border-brand-200 text-xs font-semibold text-brand-800 flex items-center gap-1.5 cursor-pointer hover:bg-white transition-all" 
            onClick={() => { 
              setIsOpen(true); 
              if (!isCalling) startCall(); 
            }}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
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
        <div className="fixed inset-0 sm:inset-auto sm:bottom-24 sm:right-6 z-50 w-full sm:w-[430px] sm:max-h-[660px] h-full sm:h-[660px] bg-white sm:rounded-3xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-300">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 text-white px-5 py-3.5 flex items-center justify-between shadow-md">
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
                <p className="text-[11px] text-slate-300 font-medium flex items-center gap-1.5">
                  {isCalling ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      {isRetellActive ? 'Retell AI HD' : 'Live Voice'} • {formatTimer(callDuration)}
                    </span>
                  ) : (
                    'Official Voice & Onboarding Agent'
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Language toggle */}
              <button
                onClick={() => {
                  const newLang = language === 'hi-IN' ? 'en-IN' : 'hi-IN';
                  setLanguage(newLang);
                  if (recognitionRef.current) {
                    recognitionRef.current.lang = newLang;
                  }
                }}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                title={`Current: ${language === 'hi-IN' ? 'Hindi/Hinglish' : 'English'}. Click to switch.`}
              >
                <Globe className="w-3.5 h-3.5 text-blue-400" />
                <span>{language === 'hi-IN' ? 'HI' : 'EN'}</span>
              </button>

              {/* Retell settings toggle */}
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2 rounded-xl text-xs font-semibold transition-colors ${showSettings ? 'bg-white/20 text-white' : 'text-slate-300 hover:bg-white/10'}`}
                title="Retell AI Settings"
              >
                <Settings className="w-4 h-4" />
              </button>

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

          {/* Retell Settings Drawer */}
          {showSettings && (
            <div className="bg-slate-900 border-b border-slate-800 p-4 text-white text-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold flex items-center gap-1 text-slate-200">
                  <Radio className="w-3.5 h-3.5 text-blue-400" />
                  Retell AI WebRTC Integration
                </span>
                <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
                Connect directly with your Retell AI dashboard agent for ultra-low latency conversational audio.
              </p>
              <form onSubmit={handleSaveSettings} className="space-y-2.5">
                <div>
                  <label className="text-[10px] text-slate-300 uppercase tracking-wider font-semibold block mb-1">
                    Retell API Key
                  </label>
                  <input
                    type="password"
                    placeholder="key_xxxxxxxxxxxx"
                    value={retellApiKey}
                    onChange={(e) => setRetellApiKey(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-300 uppercase tracking-wider font-semibold block mb-1">
                    Retell Agent ID (e.g. agent_xxxx)
                  </label>
                  <input
                    type="text"
                    placeholder="agent_xxxxxxxxxxxx"
                    value={retellAgentId}
                    onChange={(e) => setRetellAgentId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div className="flex items-center justify-between pt-1">
                  {savedSettingsNotice ? (
                    <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                      <CheckCircle className="w-3.5 h-3.5" /> Saved!
                    </span>
                  ) : <span />}
                  <button
                    type="submit"
                    className="bg-brand-600 hover:bg-brand-700 text-white font-semibold py-1.5 px-3.5 rounded-lg text-xs transition-colors"
                  >
                    Save & Apply
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Mode 1: VOICE CALL SCREEN */}
          {mode === 'voice' && (
            <div className="flex-1 bg-gradient-to-b from-slate-900 via-slate-850 to-slate-950 text-white flex flex-col justify-between p-5 overflow-hidden">
              
              {/* Permission Alert Banner if blocked */}
              {micPermissionError && (
                <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-2.5 mb-2 text-xs text-red-200 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{micPermissionError}</span>
                  </div>
                  <button
                    onClick={() => initAudioAnalyser()}
                    className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-[10px] font-bold shrink-0"
                  >
                    Allow Mic
                  </button>
                </div>
              )}

              {/* Call Status & Avatar Center */}
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                
                {/* Pulsating Avatar Rings with Live Audio Feedback */}
                <div 
                  className="relative mb-4 cursor-pointer group"
                  onClick={() => {
                    // Tap avatar to stop Aryan talking and immediately speak
                    if (agentSpeaking && window.speechSynthesis) {
                      window.speechSynthesis.cancel();
                      agentSpeakingRef.current = false;
                      setAgentSpeaking(false);
                      startRecognitionSafely();
                    }
                  }}
                  title={agentSpeaking ? "Click to interrupt Aryan" : "Aryan AI Avatar"}
                >
                  {agentSpeaking && (
                    <>
                      <div className="absolute -inset-4 rounded-full bg-brand-500/30 animate-ping" />
                      <div className="absolute -inset-8 rounded-full bg-blue-500/20 animate-pulse" />
                    </>
                  )}
                  {userSpeaking && !agentSpeaking && (
                    <>
                      <div className="absolute -inset-4 rounded-full bg-emerald-500/40 animate-pulse" />
                      <div className="absolute -inset-7 rounded-full bg-emerald-500/20 animate-ping" />
                    </>
                  )}
                  
                  <div className={`relative w-24 h-24 rounded-full bg-gradient-to-tr from-brand-600 via-blue-500 to-indigo-600 p-1 shadow-2xl flex items-center justify-center transition-transform ${userSpeaking ? 'scale-105' : ''}`}>
                    <div className="w-full h-full rounded-full bg-slate-900 flex flex-col items-center justify-center">
                      <Bot className={`w-10 h-10 ${userSpeaking ? 'text-emerald-400' : 'text-brand-400'} transition-colors`} />
                      <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mt-0.5">
                        {userSpeaking ? 'Hearing You' : agentSpeaking ? 'Speaking' : 'AI Voice'}
                      </span>
                    </div>
                  </div>
                </div>

                <h4 className="text-lg font-bold tracking-tight text-white mb-0.5">
                  Aryan
                </h4>
                <p className="text-xs text-brand-300 font-medium mb-2.5">
                  DairyWalla Customer Success
                </p>

                {/* Status indicator badge */}
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-3 backdrop-blur-md transition-all ${
                  userSpeaking
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : agentSpeaking
                    ? 'bg-brand-500/20 text-blue-300 border border-brand-500/30'
                    : isCalling
                    ? 'bg-white/10 text-slate-200 border border-white/10'
                    : 'bg-amber-500/20 text-amber-300'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${
                    userSpeaking 
                      ? 'bg-emerald-400 animate-ping' 
                      : agentSpeaking
                      ? 'bg-blue-400 animate-pulse'
                      : isCalling 
                      ? 'bg-emerald-400' 
                      : 'bg-amber-400'
                  }`} />
                  {userSpeaking ? 'Hearing you speak...' : callStatusText}
                </div>

                {/* Real-time Dynamic Sound Wave Visualizer */}
                {isCalling && (
                  <div className="flex items-center justify-center gap-1.5 h-10 w-full max-w-[220px] mb-2 px-2">
                    {visualizerBars.map((height, i) => (
                      <div
                        key={i}
                        className={`w-1.5 rounded-full transition-all duration-100 ${
                          userSpeaking
                            ? 'bg-gradient-to-t from-emerald-500 to-teal-300'
                            : agentSpeaking
                            ? 'bg-gradient-to-t from-brand-500 to-blue-300'
                            : 'bg-white/20'
                        }`}
                        style={{
                          height: (userSpeaking || agentSpeaking)
                            ? `${Math.max(10, height)}px`
                            : `${Math.max(6, (micVolume > 5 ? micVolume * 0.4 : 6))}px`
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Real-time Speech Subtitle */}
                {transcriptSubtitle ? (
                  <div className="bg-black/50 backdrop-blur-md border border-white/10 px-4 py-2 rounded-2xl max-w-[340px] text-xs text-slate-200 leading-relaxed shadow-lg line-clamp-3">
                    {transcriptSubtitle}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">
                    Aap bolna shuru kijiye, Aryan live sun raha hai...
                  </p>
                )}

                {/* Quick Voice Inquiry Chips */}
                {isCalling && (
                  <div className="mt-3 flex flex-wrap gap-1.5 justify-center max-w-[340px]">
                    {[
                      "Hello Aryan!",
                      "Order kaise karein?",
                      "Distributor setup",
                      "Cutoff time kya hai?",
                      "Human specialist"
                    ].map((chip) => (
                      <button
                        key={chip}
                        onClick={() => {
                          handleUserVoiceInput(chip);
                        }}
                        className="bg-white/10 hover:bg-white/20 border border-white/10 text-slate-300 hover:text-white text-[10px] py-1 px-2.5 rounded-full transition-all active:scale-95"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Call Controls & Quick Input Bar */}
              <div className="space-y-3 pt-3 border-t border-white/10">
                {/* Fast in-call text query (if mic environment is noisy) */}
                {isCalling && (
                  <form onSubmit={handleVoiceQuickSubmit} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={voiceQuickInput}
                      onChange={(e) => setVoiceQuickInput(e.target.value)}
                      placeholder="Or type your question here..."
                      className="flex-1 bg-white/10 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-brand-500"
                    />
                    <button
                      type="submit"
                      disabled={!voiceQuickInput.trim()}
                      className="bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white p-2 rounded-xl transition-all"
                      title="Send query"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                )}

                <div className="flex items-center justify-around">
                  {/* Mute button */}
                  <button
                    onClick={() => {
                      const nextMute = !isMuted;
                      setIsMuted(nextMute);
                      if (nextMute) {
                        stopRecognitionSafely();
                      } else {
                        startRecognitionSafely();
                      }
                    }}
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
                      isMuted ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                    title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                  >
                    {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>

                  {/* Main Call Connect / End Button */}
                  {isCalling ? (
                    <button
                      onClick={endCall}
                      className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg shadow-red-600/40 active:scale-95 transition-all"
                      title="End Call"
                    >
                      <PhoneOff className="w-6 h-6" />
                    </button>
                  ) : (
                    <button
                      onClick={startCall}
                      className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-lg shadow-emerald-600/40 active:scale-95 transition-all animate-pulse"
                      title="Start Call"
                    >
                      <PhoneCall className="w-6 h-6" />
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
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
                      !isSpeakerOn ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                    title={isSpeakerOn ? 'Mute Audio Output' : 'Enable Audio Output'}
                  >
                    {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                  </button>
                </div>

                {/* Transfer to Human Specialist / WhatsApp */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <a
                    href={`tel:${AGENT_CONFIG.phoneSupportNumber}`}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-[11px] font-medium transition-colors"
                  >
                    <Phone className="w-3 h-3 text-blue-400" />
                    Call Human Specialist
                  </a>
                  <a
                    href={AGENT_CONFIG.whatsappLink}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-[11px] font-medium transition-colors"
                  >
                    <MessageSquare className="w-3 h-3" />
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
