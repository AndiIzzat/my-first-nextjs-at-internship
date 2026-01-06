"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTheme } from "@/context/ThemeContext";
import Image from "next/image";

// CSS for animations
const animationStyles = `
  @keyframes fadeSlideIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  @keyframes chatOpen {
    from {
      opacity: 0;
      transform: translateY(20px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
  /* Icon button hover animations */
  .icon-btn .icon-default {
    opacity: 1;
    transform: scale(1);
  }
  .icon-btn .icon-hover {
    opacity: 0;
    transform: scale(0.75);
  }
  .icon-btn:hover .icon-default {
    opacity: 0;
    transform: scale(0.75);
  }
  .icon-btn:hover .icon-hover {
    opacity: 1;
    transform: scale(1);
  }
  /* Bot avatar speaking animation */
  @keyframes avatarPulse {
    0%, 100% {
      box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4);
    }
    50% {
      box-shadow: 0 0 0 8px rgba(34, 197, 94, 0);
    }
  }
  .avatar-speaking {
    animation: avatarPulse 1.5s ease-in-out infinite;
  }
  /* Particle effects */
  @keyframes float-particle {
    0%, 100% {
      transform: translateY(0px) translateX(0px);
      opacity: 0;
    }
    10% {
      opacity: 0.5;
    }
    90% {
      opacity: 0.5;
    }
    100% {
      transform: translateY(-100px) translateX(20px);
      opacity: 0;
    }
  }
  .particle {
    position: absolute;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    pointer-events: none;
  }
  /* Typing cursor animation */
  @keyframes blink {
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0; }
  }
  .typing-cursor {
    display: inline-block;
    width: 2px;
    height: 1em;
    background: currentColor;
    margin-left: 2px;
    animation: blink 1s infinite;
  }
  /* Mobile-specific styles */
  @media (max-width: 639px) {
    .chat-widget-mobile {
      padding-top: env(safe-area-inset-top) !important;
      padding-bottom: env(safe-area-inset-bottom) !important;
      padding-left: env(safe-area-inset-left) !important;
      padding-right: env(safe-area-inset-right) !important;
    }
    .chat-input-mobile {
      padding-bottom: calc(12px + env(safe-area-inset-bottom)) !important;
    }
  }
  /* Touch-friendly styles */
  @media (hover: none) and (pointer: coarse) {
    .icon-btn:active .icon-default {
      opacity: 0;
      transform: scale(0.75);
    }
    .icon-btn:active .icon-hover {
      opacity: 1;
      transform: scale(1);
    }
  }
`;

// Markdown parser
const parseMarkdown = (text: string): React.ReactNode[] => {
  const elements: React.ReactNode[] = [];
  let key = 0;
  const parts = text.split(/(```[\s\S]*?```|`[^`]+`)/g);

  parts.forEach((part) => {
    if (part.startsWith("```") && part.endsWith("```")) {
      const code = part.slice(3, -3).replace(/^\w+\n/, "");
      elements.push(
        <pre key={key++} className="bg-black/20 rounded-lg p-3 my-2 overflow-x-auto text-xs font-mono">
          <code>{code}</code>
        </pre>
      );
    } else if (part.startsWith("`") && part.endsWith("`")) {
      elements.push(
        <code key={key++} className="bg-black/20 px-1.5 py-0.5 rounded text-xs font-mono">
          {part.slice(1, -1)}
        </code>
      );
    } else {
      const lines = part.split("\n");
      lines.forEach((line, lineIndex) => {
        if (lineIndex > 0) elements.push(<br key={key++} />);
        const regex = /(\*\*[^*]+\*\*|__[^_]+__|(?<!\*)\*[^*]+\*(?!\*)|(?<!_)_[^_]+_(?!_)|\[[^\]]+\]\([^)]+\))/g;
        const segments = line.split(regex);
        segments.forEach((segment) => {
          if (segment.startsWith("**") && segment.endsWith("**")) {
            elements.push(<strong key={key++}>{segment.slice(2, -2)}</strong>);
          } else if (segment.startsWith("*") && segment.endsWith("*")) {
            elements.push(<em key={key++}>{segment.slice(1, -1)}</em>);
          } else if (segment.match(/^\[[^\]]+\]\([^)]+\)$/)) {
            const match = segment.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
            if (match) {
              elements.push(
                <a key={key++} href={match[2]} target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80">
                  {match[1]}
                </a>
              );
            }
          } else if (segment) {
            elements.push(<span key={key++}>{segment}</span>);
          }
        });
      });
    }
  });
  return elements;
};

interface Message {
  id: number;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
  image?: string; // base64 image
  replyTo?: number; // message id being replied to
  favorite?: boolean;
  feedback?: "good" | "bad" | null;
}

// Format date for grouping
const formatDateGroup = (date: Date): string => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const isToday = date.toDateString() === today.toDateString();
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) return "Today";
  if (isYesterday) return "Yesterday";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

interface Settings {
  soundEnabled: boolean;
  userName: string;
  userPhoto: string; // base64 or empty for default
  fontSize: "small" | "medium" | "large";
}

const STORAGE_KEY = "izzat-chat-messages";
const SETTINGS_KEY = "izzat-chat-settings";
const DRAFT_KEY = "izzat-chat-draft";
const FAVORITES_KEY = "izzat-chat-favorites";

const defaultSettings: Settings = {
  soundEnabled: true,
  userName: "You",
  userPhoto: "",
  fontSize: "medium",
};

// Mood detection
const detectMood = (text: string): "happy" | "neutral" | "thinking" => {
  const lowerText = text.toLowerCase();
  if (lowerText.includes("😊") || lowerText.includes("great") || lowerText.includes("awesome") || lowerText.includes("happy") || lowerText.includes("!")) {
    return "happy";
  }
  if (lowerText.includes("hmm") || lowerText.includes("let me think") || lowerText.includes("interesting")) {
    return "thinking";
  }
  return "neutral";
};

// Common emojis
const emojis = ["😀", "😂", "😊", "😍", "🥰", "😎", "🤔", "😅", "😢", "😭", "😤", "😱", "🥳", "🤩", "😴", "🤗", "👍", "👎", "👏", "🙌", "💪", "🎉", "❤️", "🔥", "⭐", "💯", "✨", "🚀", "💡", "📌"];

export default function ChatWidget() {
  const { theme } = useTheme();

  // Core state
  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // Settings
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  // UI state
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [botMood, setBotMood] = useState<"happy" | "neutral" | "thinking">("neutral");

  // UX state
  const [toast, setToast] = useState<string | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Typing animation state
  const [typingMessageId, setTypingMessageId] = useState<number | null>(null);
  const [displayedText, setDisplayedText] = useState("");
  const [isAnimatingText, setIsAnimatingText] = useState(false);

  // Particles
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([]);

  // New features state
  const [isOffline, setIsOffline] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [chatSize, setChatSize] = useState({ width: 380, height: 600 });
  const [isResizing, setIsResizing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  // Call state
  const [isInCall, setIsInCall] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const handleSendRef = useRef<((text?: string) => Promise<void>) | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Colors - aligned with portfolio theme (black & white)
  const colors = {
    bg: theme === "dark" ? "#0a0a0a" : "#ffffff",
    bgSecondary: theme === "dark" ? "#141414" : "#f5f5f5",
    bgTertiary: theme === "dark" ? "#1a1a1a" : "#e5e5e5",
    border: theme === "dark" ? "#262626" : "#e5e5e5",
    text: theme === "dark" ? "#ededed" : "#171717",
    textSecondary: theme === "dark" ? "#a3a3a3" : "#525252",
    textMuted: theme === "dark" ? "#525252" : "#a3a3a3",
    accent: theme === "dark" ? "#ffffff" : "#171717",
    accentText: theme === "dark" ? "#000000" : "#ffffff",
    timeline: theme === "dark" ? "#262626" : "#d4d4d4",
  };

  // File input ref for photo upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingSoundRef = useRef<HTMLAudioElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Font size mapping
  const fontSizes = {
    small: "text-xs",
    medium: "text-sm",
    large: "text-base",
  };

  // Handle photo upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings((s) => ({ ...s, userPhoto: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove photo
  const removePhoto = () => {
    setSettings((s) => ({ ...s, userPhoto: "" }));
  };

  // Handle image upload for chat
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove uploaded image
  const removeUploadedImage = () => {
    setUploadedImage(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  // Load messages from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      setMessages(parsed.map((m: Message) => ({ ...m, timestamp: new Date(m.timestamp) })));
    }
  }, []);

  // Load settings
  useEffect(() => {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) setSettings({ ...defaultSettings, ...JSON.parse(stored) });
  }, []);

  // Save messages
  useEffect(() => {
    if (messages.length > 0) localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  // Save settings
  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  // Load draft
  useEffect(() => {
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft) setInputValue(draft);
  }, []);

  // Save draft (debounced)
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (inputValue.trim()) {
        localStorage.setItem(DRAFT_KEY, inputValue);
      } else {
        localStorage.removeItem(DRAFT_KEY);
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [inputValue]);

  // Init audio
  useEffect(() => {
    audioRef.current = new Audio("/notificationsound1.mp3");
    audioRef.current.volume = 0.5;
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Init speech recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechAPI) {
        recognitionRef.current = new SpeechAPI();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = "en-US";

        recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
          const results = Array.from(event.results);
          const transcript = results.map((r) => r[0].transcript).join("");
          setInputValue(transcript);

          const lastResult = results[results.length - 1];
          if (lastResult?.isFinal && recognitionRef.current?.continuous && transcript.trim()) {
            setTimeout(() => {
              setInputValue("");
              window.dispatchEvent(new CustomEvent("voiceCallSend", { detail: transcript }));
            }, 500);
          }
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
          if (recognitionRef.current?.continuous) {
            setTimeout(() => {
              try {
                recognitionRef.current?.start();
                setIsListening(true);
              } catch {}
            }, 100);
          }
        };

        recognitionRef.current.onerror = () => setIsListening(false);
      }
    }
  }, []);

  // Voice call send handler
  useEffect(() => {
    const handler = (event: CustomEvent) => {
      if (isInCall && event.detail && handleSendRef.current) {
        handleSendRef.current(event.detail);
      }
    };
    window.addEventListener("voiceCallSend", handler as EventListener);
    return () => window.removeEventListener("voiceCallSend", handler as EventListener);
  }, [isInCall]);

  // Call timer
  useEffect(() => {
    if (isInCall) {
      callTimerRef.current = setInterval(() => setCallDuration((d) => d + 1), 1000);
    } else {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      setCallDuration(0);
    }
    return () => { if (callTimerRef.current) clearInterval(callTimerRef.current); };
  }, [isInCall]);

  // Scroll to bottom
  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, isOpen]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only when chat is open
      if (!isOpen) return;

      // Escape to close overlays or chat
      if (e.key === "Escape") {
        if (showSettings) setShowSettings(false);
        else if (showStats) setShowStats(false);
        else if (showSearch) setShowSearch(false);
        else if (showFavorites) setShowFavorites(false);
        else if (replyingTo) setReplyingTo(null);
        else if (showEmoji) setShowEmoji(false);
        else setIsOpen(false);
      }

      // Ctrl/Cmd + Enter to send
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleSendRef.current?.();
      }

      // Ctrl/Cmd + K to search
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setShowSearch(true);
      }

      // Ctrl/Cmd + , for settings
      if ((e.ctrlKey || e.metaKey) && e.key === ",") {
        e.preventDefault();
        setShowSettings(true);
      }

      // Ctrl/Cmd + F for fullscreen
      if ((e.ctrlKey || e.metaKey) && e.key === "f" && !showSearch) {
        e.preventDefault();
        setIsFullscreen((f) => !f);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, showSettings, showStats, showSearch, showFavorites, replyingTo, showEmoji]);

  // Generate particles on mount (reduced for performance)
  useEffect(() => {
    if (isOpen) {
      const newParticles = Array.from({ length: 6 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 5,
      }));
      setParticles(newParticles);
    }
  }, [isOpen]);

  // Offline detection
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    setIsOffline(!navigator.onLine);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Responsive detection
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setWindowSize({ width, height });
      setIsMobile(width < 640); // Mobile breakpoint

      // Auto-adjust chat size based on screen
      if (width < 640) {
        // Mobile: fullscreen-like behavior handled separately
      } else if (width < 1024) {
        // Tablet: slightly smaller
        setChatSize({ width: Math.min(360, width - 48), height: Math.min(550, height - 120) });
      } else {
        // Desktop: default size
        setChatSize({ width: 380, height: 600 });
      }
    };

    handleResize(); // Initial check
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Typing sound
  useEffect(() => {
    typingSoundRef.current = new Audio("data:audio/wav;base64,UklGRl9vT19teleUE=");
    typingSoundRef.current.volume = 0.1;
  }, []);

  const playTypingSound = () => {
    if (settings.soundEnabled && typingSoundRef.current) {
      typingSoundRef.current.currentTime = 0;
      typingSoundRef.current.play().catch(() => {});
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
      showToast("Image added!");
    }
  };

  // Resize handlers with direction support
  const handleResizeStart = (e: React.MouseEvent, direction: "nw" | "n" | "w" | "ne" | "e" | "sw" | "s" | "se") => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = chatSize.width;
    const startHeight = chatSize.height;

    const handleMouseMove = (e: MouseEvent) => {
      let newWidth = startWidth;
      let newHeight = startHeight;

      // Handle horizontal resize
      if (direction.includes("w")) {
        newWidth = Math.max(320, Math.min(700, startWidth - (e.clientX - startX)));
      } else if (direction.includes("e")) {
        newWidth = Math.max(320, Math.min(700, startWidth + (e.clientX - startX)));
      }

      // Handle vertical resize
      if (direction.includes("n")) {
        newHeight = Math.max(400, Math.min(900, startHeight - (e.clientY - startY)));
      } else if (direction.includes("s")) {
        newHeight = Math.max(400, Math.min(900, startHeight + (e.clientY - startY)));
      }

      setChatSize({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // Format full timestamp for hover
  const formatFullTime = (d: Date) => {
    return d.toLocaleString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  // Extract and preview links
  const extractLinks = (text: string): string[] => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex) || [];
  };

  // Typing animation effect - stable version
  const animateTyping = useCallback((messageId: number, fullText: string) => {
    setTypingMessageId(messageId);
    setIsAnimatingText(true);

    let index = 0;
    const chunkSize = 5; // Characters per update
    const speed = 40; // ms per update

    const interval = setInterval(() => {
      index += chunkSize;
      if (index >= fullText.length) {
        setDisplayedText(fullText);
        setIsAnimatingText(false);
        setTypingMessageId(null);
        clearInterval(interval);
      } else {
        setDisplayedText(fullText.slice(0, index));
      }
    }, speed);

    // Initial text
    setDisplayedText(fullText.slice(0, chunkSize));
  }, []);

  // Helpers
  const formatTime = (d: Date) => d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  const formatDuration = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  // Toast notification
  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  };

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setUnreadCount(0);
  };

  // Handle scroll
  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollBtn(!isAtBottom);
      if (isAtBottom) setUnreadCount(0);
    }
  };

  const playSound = () => {
    if (settings.soundEnabled && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  };

  const speak = useCallback((text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1;
      u.pitch = 1;
      window.speechSynthesis.speak(u);
    }
  }, []);

  // Call functions
  const startCall = useCallback(() => {
    setIsInCall(true);
    setIsMuted(false);
    setShowDropdown(false);
    if (recognitionRef.current) {
      recognitionRef.current.continuous = true;
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch {}
    }
    speak("Hi! I'm Izzat Bot. How can I help you?");
  }, [speak]);

  const endCall = useCallback(() => {
    setIsInCall(false);
    setIsMuted(false);
    setIsListening(false);
    if (recognitionRef.current) {
      recognitionRef.current.continuous = false;
      recognitionRef.current.stop();
    }
    window.speechSynthesis.cancel();
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((m) => {
      if (!m && recognitionRef.current) {
        recognitionRef.current.stop();
        setIsListening(false);
      } else if (m && recognitionRef.current && isInCall) {
        try {
          recognitionRef.current.start();
          setIsListening(true);
        } catch {}
      }
      return !m;
    });
  }, [isInCall]);

  // Send message
  const handleSend = async (text?: string) => {
    const msg = text || inputValue;
    if (!msg.trim() && !uploadedImage) return;

    const userMsg: Message = {
      id: Date.now(),
      text: msg,
      sender: "user",
      timestamp: new Date(),
      image: uploadedImage || undefined,
      replyTo: replyingTo?.id,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    localStorage.removeItem(DRAFT_KEY); // Clear draft on send
    setUploadedImage(null);
    setReplyingTo(null);
    setIsTyping(true);
    setShowEmoji(false);
    if (imageInputRef.current) imageInputRef.current.value = "";

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          history: messages.slice(-10),
          image: userMsg.image // Send image if attached
        }),
      });
      const data = await res.json();
      setIsTyping(false);

      const responseText = data.response || "Sorry, I couldn't process that.";
      const botMsgId = Date.now() + 1;
      const botMsg: Message = {
        id: botMsgId,
        text: responseText,
        sender: "bot",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMsg]);
      setBotMood(detectMood(responseText));
      playSound();

      // Start typing animation for bot response
      animateTyping(botMsgId, responseText);

      // Increment unread count if user is scrolled up
      if (messagesContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
        if (!isAtBottom) {
          setUnreadCount((prev) => prev + 1);
        }
      }
      if (isInCall) speak(responseText);
    } catch {
      setIsTyping(false);
      const errMsg: Message = { id: Date.now() + 1, text: "Sorry, connection error.", sender: "bot", timestamp: new Date() };
      setMessages((prev) => [...prev, errMsg]);
      if (isInCall) speak("Sorry, connection error.");
    }
  };

  // Regenerate last bot response
  const regenerateResponse = async (msgId: number) => {
    const msgIndex = messages.findIndex((m) => m.id === msgId);
    if (msgIndex === -1) return;

    // Find the user message before this bot message
    let userMsgIndex = msgIndex - 1;
    while (userMsgIndex >= 0 && messages[userMsgIndex].sender !== "user") {
      userMsgIndex--;
    }
    if (userMsgIndex < 0) return;

    const userMsg = messages[userMsgIndex];
    setIsTyping(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg.text, history: messages.slice(0, userMsgIndex).slice(-10) }),
      });
      const data = await res.json();
      setIsTyping(false);

      const responseText = data.response || "Sorry, I couldn't process that.";
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, text: responseText, timestamp: new Date() } : m))
      );
      setBotMood(detectMood(responseText));
      showToast("Response regenerated!");
    } catch {
      setIsTyping(false);
      showToast("Failed to regenerate");
    }
  };

  // Toggle favorite
  const toggleFavorite = (msgId: number) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, favorite: !m.favorite } : m))
    );
    showToast("Favorite updated!");
  };

  // Set feedback
  const setFeedback = (msgId: number, feedback: "good" | "bad") => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, feedback: m.feedback === feedback ? null : feedback } : m))
    );
  };

  // Get message by id
  const getMessageById = (id: number) => messages.find((m) => m.id === id);

  useEffect(() => { handleSendRef.current = handleSend; });

  // Actions
  const clearChat = () => {
    localStorage.removeItem(STORAGE_KEY);
    setMessages([]);
    setShowDropdown(false);
  };

  const exportChat = () => {
    const text = messages.map((m) => `[${formatTime(m.timestamp)}] ${m.sender === "user" ? settings.userName : "Izzat Bot"}: ${m.text}`).join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `chat-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    setShowDropdown(false);
    showToast("Chat exported!");
  };

  const copyMessage = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast("Message copied!");
  };

  const addEmoji = (emoji: string) => {
    setInputValue((v) => v + emoji);
  };

  // Search
  const searchResults = searchQuery ? messages.filter((m) => m.text.toLowerCase().includes(searchQuery.toLowerCase())) : [];
  const scrollToMessage = (id: number) => {
    setHighlightedId(id);
    document.getElementById(`msg-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => setHighlightedId(null), 2000);
    setShowSearch(false);
    setSearchQuery("");
  };

  // Stats
  const stats = {
    total: messages.length,
    user: messages.filter((m) => m.sender === "user").length,
    bot: messages.filter((m) => m.sender === "bot").length,
    avgLen: messages.length ? Math.round(messages.reduce((a, m) => a + m.text.length, 0) / messages.length) : 0,
  };

  // Open chat
  const openChat = () => {
    setIsOpen(true);
    if (messages.length === 0) {
      setMessages([{ id: Date.now(), text: "Hello! I'm Izzat Bot. How can I help you today?", sender: "bot", timestamp: new Date() }]);
    }
  };

  // Menu item component
  const MenuItem = ({ icon, label, onClick, danger }: { icon: string; label: string; onClick: () => void; danger?: boolean }) => (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-colors text-left"
      style={{ color: danger ? "#ef4444" : colors.text }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.bgTertiary)}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} />
      </svg>
      {label}
    </button>
  );

  return (
    <>
      {/* Inject animation styles */}
      <style>{animationStyles}</style>

      {/* Chat Panel */}
      <div
        ref={chatContainerRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`fixed z-50 overflow-hidden flex flex-col ${
          isResizing ? "" : "transition-all duration-300"
        } ${
          isMobile ? "chat-widget-mobile" : "rounded-2xl"
        } ${
          isOpen ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-8 pointer-events-none"
        } ${isDragging ? "ring-2 ring-blue-500" : ""} ${isResizing ? "ring-2 ring-opacity-50" : ""}`}
        style={{
          backgroundColor: colors.bg,
          border: isMobile ? "none" : `1px solid ${colors.border}`,
          boxShadow: isMobile ? "none" : (theme === "dark" ? "0 0 60px rgba(0,0,0,0.5)" : "0 25px 50px -12px rgba(0,0,0,0.25)"),
          ["--tw-ring-color" as string]: colors.accent,
          borderRadius: isMobile ? 0 : undefined,
          ...(isFullscreen || isMobile
            ? { top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%" }
            : { bottom: 96, right: 24, width: chatSize.width, height: chatSize.height }),
        }}
      >
        {/* Resize handles - hidden on mobile and fullscreen */}
        {!isFullscreen && !isMobile && (
          <>
            {/* Corner handles */}
            {/* Top-left */}
            <div
              onMouseDown={(e) => handleResizeStart(e, "nw")}
              className="absolute top-0 left-0 w-4 h-4 cursor-nw-resize z-50 group"
            >
              <div
                className="absolute top-1 left-1 w-2 h-2 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ backgroundColor: colors.textMuted }}
              />
            </div>
            {/* Top-right */}
            <div
              onMouseDown={(e) => handleResizeStart(e, "ne")}
              className="absolute top-0 right-0 w-4 h-4 cursor-ne-resize z-50 group"
            >
              <div
                className="absolute top-1 right-1 w-2 h-2 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ backgroundColor: colors.textMuted }}
              />
            </div>
            {/* Bottom-left */}
            <div
              onMouseDown={(e) => handleResizeStart(e, "sw")}
              className="absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize z-50 group"
            >
              <div
                className="absolute bottom-1 left-1 w-2 h-2 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ backgroundColor: colors.textMuted }}
              />
            </div>
            {/* Bottom-right - main resize handle with icon */}
            <div
              onMouseDown={(e) => handleResizeStart(e, "se")}
              className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize z-50 flex items-center justify-center group"
            >
              <svg
                className="w-3 h-3 opacity-30 group-hover:opacity-70 transition-opacity"
                fill={colors.textMuted}
                viewBox="0 0 24 24"
              >
                <path d="M22 22H20V20H22V22ZM22 18H20V16H22V18ZM18 22H16V20H18V22ZM22 14H20V12H22V14ZM18 18H16V16H18V18ZM14 22H12V20H14V22ZM22 10H20V8H22V10ZM18 14H16V12H18V14ZM14 18H12V16H14V18ZM10 22H8V20H10V22Z"/>
              </svg>
            </div>

            {/* Edge handles */}
            {/* Top edge */}
            <div
              onMouseDown={(e) => handleResizeStart(e, "n")}
              className="absolute top-0 left-4 right-4 h-2 cursor-n-resize z-40"
            />
            {/* Bottom edge */}
            <div
              onMouseDown={(e) => handleResizeStart(e, "s")}
              className="absolute bottom-0 left-4 right-4 h-2 cursor-s-resize z-40"
            />
            {/* Left edge */}
            <div
              onMouseDown={(e) => handleResizeStart(e, "w")}
              className="absolute left-0 top-4 bottom-4 w-2 cursor-w-resize z-40"
            />
            {/* Right edge */}
            <div
              onMouseDown={(e) => handleResizeStart(e, "e")}
              className="absolute right-0 top-4 bottom-4 w-2 cursor-e-resize z-40"
            />
          </>
        )}

        {/* Drag overlay */}
        {isDragging && (
          <div
            className="absolute inset-0 z-40 flex items-center justify-center"
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          >
            <div className="text-white text-lg font-medium flex items-center gap-2">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Drop image here
            </div>
          </div>
        )}

        {/* Offline banner */}
        {isOffline && (
          <div className="px-3 py-2 text-center text-sm font-medium bg-red-500 text-white flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m-3.536-3.536a4 4 0 010-5.656m-7.072 7.072a9 9 0 010-12.728m3.536 3.536a4 4 0 010 5.656" />
            </svg>
            You're offline
          </div>
        )}
        {/* Header */}
        <div className={`px-4 py-3 flex items-center justify-between ${isMobile ? "pt-4" : ""}`} style={{ borderBottom: `1px solid ${colors.border}` }}>
          <div className="flex items-center gap-2.5">
            {/* Back button on mobile */}
            {isMobile && (
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 -ml-1 mr-1 rounded-lg transition-colors"
                style={{ color: colors.textSecondary }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            {/* Bot avatar */}
            <div className="relative">
              <div className="w-8 h-8 rounded-full overflow-hidden" style={{ border: `1px solid ${colors.border}` }}>
                <Image src="/profile2.jpeg" alt="Bot" width={32} height={32} className="w-full h-full object-cover" />
              </div>
              {/* Online indicator */}
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2" style={{ borderColor: colors.bg }} />
            </div>
            <div className="flex flex-col">
              <h3 className="text-sm font-semibold leading-tight" style={{ color: colors.text }}>Izzat Bot</h3>
              <span className="text-[10px] leading-tight" style={{ color: colors.textMuted }}>Online</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Dropdown Menu */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="p-2 rounded-lg transition-colors hover:bg-opacity-10"
                style={{ color: colors.textSecondary }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>

              {showDropdown && (
                <div
                  className="absolute right-0 top-full mt-2 w-48 rounded-xl p-1.5 z-50"
                  style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}`, boxShadow: "0 10px 40px rgba(0,0,0,0.2)" }}
                >
                  <MenuItem icon="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" label="Voice Call" onClick={startCall} />
                  <MenuItem icon="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" label="Search" onClick={() => { setShowSearch(true); setShowDropdown(false); }} />
                  <MenuItem icon="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" label="Favorites" onClick={() => { setShowFavorites(true); setShowDropdown(false); }} />
                  <MenuItem icon="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" label="Statistics" onClick={() => { setShowStats(true); setShowDropdown(false); }} />
                  <MenuItem icon="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" label="Settings" onClick={() => { setShowSettings(true); setShowDropdown(false); }} />
                  <MenuItem icon="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" label="Export" onClick={exportChat} />
                  <div className="my-1 border-t" style={{ borderColor: colors.border }} />
                  <MenuItem icon="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" label="Delete Chat" onClick={clearChat} danger />
                  <MenuItem icon={isFullscreen ? "M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" : "M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"} label={isFullscreen ? "Exit Fullscreen" : "Fullscreen"} onClick={() => { setIsFullscreen(!isFullscreen); setShowDropdown(false); }} />
                </div>
              )}
            </div>

            {/* Close - hidden on mobile since we have back button */}
            {!isMobile && (
              <button
                onClick={() => { setIsOpen(false); setIsFullscreen(false); }}
                className="p-2 rounded-lg transition-colors hover:bg-opacity-10"
                style={{ color: colors.textSecondary }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Call Overlay - Portfolio theme */}
        {isInCall && (
          <div className="absolute inset-0 z-50 flex flex-col" style={{ backgroundColor: colors.accent }}>
            {/* Call header */}
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${theme === "dark" ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.2)"}` }}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm" style={{ color: colors.accentText, opacity: 0.8 }}>Voice Call</span>
              </div>
              <span className="font-mono" style={{ color: colors.accentText }}>{formatDuration(callDuration)}</span>
            </div>

            {/* Call content */}
            <div className="flex-1 flex flex-col items-center justify-center">
              <div
                className={`w-32 h-32 rounded-full overflow-hidden mb-6 ${isListening && !isMuted ? "ring-4 animate-pulse" : ""}`}
                style={{
                  border: `4px solid ${theme === "dark" ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.3)"}`,
                  ["--tw-ring-color" as string]: theme === "dark" ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.3)"
                }}
              >
                <Image src="/profile2.jpeg" alt="Izzat" width={128} height={128} className="w-full h-full object-cover" />
              </div>
              <h2 className="text-2xl font-semibold mb-2" style={{ color: colors.accentText }}>Izzat Bot</h2>
              <p style={{ color: colors.accentText, opacity: 0.7 }}>
                {isTyping ? "Speaking..." : isListening && !isMuted ? "Listening..." : "Connected"}
              </p>

              {/* Voice transcript */}
              {inputValue && (
                <div className="mt-6 mx-8 p-4 rounded-2xl" style={{ backgroundColor: theme === "dark" ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.2)" }}>
                  <p className="text-center" style={{ color: colors.accentText, opacity: 0.9 }}>{inputValue}</p>
                </div>
              )}
            </div>

            {/* Call controls */}
            <div className="pb-12 flex items-center justify-center gap-8">
              <button
                onClick={toggleMute}
                className="w-14 h-14 rounded-full flex items-center justify-center transition-all"
                style={{ backgroundColor: isMuted ? colors.bg : (theme === "dark" ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.2)") }}
              >
                <svg className="w-6 h-6" fill="none" stroke={isMuted ? colors.accent : colors.accentText} viewBox="0 0 24 24">
                  {isMuted ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  )}
                </svg>
              </button>

              <button
                onClick={endCall}
                className="w-16 h-16 rounded-full flex items-center justify-center bg-red-500 hover:bg-red-600 transition-colors"
              >
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
                </svg>
              </button>

              <button
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ backgroundColor: theme === "dark" ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.2)" }}
              >
                <svg className="w-6 h-6" fill="none" stroke={colors.accentText} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M12 6l-4 4H4v4h4l4 4V6z" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Search Overlay */}
        {showSearch && (
          <div className="absolute inset-0 z-40 flex flex-col" style={{ backgroundColor: colors.bg }}>
            <div className="px-4 py-3 flex items-center gap-3" style={{ borderBottom: `1px solid ${colors.border}` }}>
              <button onClick={() => { setShowSearch(false); setSearchQuery(""); }} style={{ color: colors.textMuted }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search messages..."
                className="flex-1 bg-transparent text-sm focus:outline-none"
                style={{ color: colors.text }}
                autoFocus
              />
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {searchResults.length > 0 ? (
                searchResults.map((msg) => (
                  <button
                    key={msg.id}
                    onClick={() => scrollToMessage(msg.id)}
                    className="w-full text-left p-3 rounded-xl transition-colors"
                    style={{ backgroundColor: colors.bgSecondary }}
                  >
                    <p className="text-xs mb-1" style={{ color: colors.textMuted }}>
                      {msg.sender === "user" ? settings.userName : "Izzat Bot"} • {formatTime(msg.timestamp)}
                    </p>
                    <p className="text-sm truncate" style={{ color: colors.text }}>{msg.text}</p>
                  </button>
                ))
              ) : searchQuery ? (
                <p className="text-center text-sm" style={{ color: colors.textMuted }}>No messages found</p>
              ) : null}
            </div>
          </div>
        )}

        {/* Statistics Overlay */}
        {showStats && (
          <div className="absolute inset-0 z-40 flex flex-col" style={{ backgroundColor: colors.bg }}>
            <div className="px-4 py-3 flex items-center gap-3" style={{ borderBottom: `1px solid ${colors.border}` }}>
              <button onClick={() => setShowStats(false)} style={{ color: colors.textMuted }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h3 className="text-sm font-medium" style={{ color: colors.text }}>Statistics</h3>
            </div>
            <div className="flex-1 p-4 space-y-3">
              {[
                { label: "Total Messages", value: stats.total, icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" },
                { label: "Your Messages", value: stats.user, icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
                { label: "Bot Messages", value: stats.bot, icon: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
                { label: "Avg. Length", value: `${stats.avgLen} chars`, icon: "M4 6h16M4 12h16m-7 6h7" },
              ].map((stat, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-xl" style={{ backgroundColor: colors.bgSecondary }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: colors.bgTertiary }}>
                      <svg className="w-5 h-5" fill="none" stroke={colors.text} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={stat.icon} />
                      </svg>
                    </div>
                    <span className="text-sm" style={{ color: colors.text }}>{stat.label}</span>
                  </div>
                  <span className="text-lg font-semibold" style={{ color: colors.text }}>{stat.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Settings Overlay */}
        {showSettings && (
          <div className="absolute inset-0 z-40 flex flex-col" style={{ backgroundColor: colors.bg }}>
            <div className="px-4 py-3 flex items-center gap-3" style={{ borderBottom: `1px solid ${colors.border}` }}>
              <button onClick={() => setShowSettings(false)} style={{ color: colors.textMuted }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h3 className="text-sm font-medium" style={{ color: colors.text }}>Settings</h3>
            </div>
            <div className="flex-1 p-4 space-y-5 overflow-y-auto">
              {/* Profile Picture */}
              <div>
                <label className="text-xs mb-3 block" style={{ color: colors.textSecondary }}>Profile Picture</label>
                <div className="flex items-center gap-4">
                  {/* Current photo or default */}
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center overflow-hidden"
                    style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}` }}
                  >
                    {settings.userPhoto ? (
                      <img src={settings.userPhoto} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <svg className="w-8 h-8" fill="none" stroke={theme === "dark" ? "#ffffff" : "#000000"} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 text-sm rounded-lg transition-colors"
                      style={{ backgroundColor: colors.accent, color: colors.accentText }}
                    >
                      Upload Photo
                    </button>
                    {settings.userPhoto && (
                      <button
                        onClick={removePhoto}
                        className="px-4 py-2 text-sm rounded-lg transition-colors"
                        style={{ backgroundColor: colors.bgTertiary, color: colors.text }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="text-xs mb-2 block" style={{ color: colors.textSecondary }}>Your Name</label>
                <input
                  type="text"
                  value={settings.userName}
                  onChange={(e) => setSettings((s) => ({ ...s, userName: e.target.value }))}
                  className="w-full p-3 rounded-xl text-sm focus:outline-none"
                  style={{ backgroundColor: colors.bgSecondary, color: colors.text, border: `1px solid ${colors.border}` }}
                />
              </div>

              {/* Sound */}
              <div className="flex items-center justify-between p-4 rounded-xl" style={{ backgroundColor: colors.bgSecondary }}>
                <span className="text-sm" style={{ color: colors.text }}>Notification Sound</span>
                <button
                  onClick={() => setSettings((s) => ({ ...s, soundEnabled: !s.soundEnabled }))}
                  className="w-12 h-6 rounded-full relative transition-colors"
                  style={{ backgroundColor: settings.soundEnabled ? colors.accent : colors.bgTertiary }}
                >
                  <div
                    className="absolute top-1 w-4 h-4 rounded-full bg-white transition-transform"
                    style={{ left: settings.soundEnabled ? 26 : 4 }}
                  />
                </button>
              </div>

              {/* Font Size */}
              <div>
                <label className="text-xs mb-2 block" style={{ color: colors.textSecondary }}>Font Size</label>
                <div className="flex gap-2">
                  {(["small", "medium", "large"] as const).map((size) => (
                    <button
                      key={size}
                      onClick={() => setSettings((s) => ({ ...s, fontSize: size }))}
                      className="flex-1 py-2 rounded-lg text-xs font-medium capitalize transition-colors"
                      style={{
                        backgroundColor: settings.fontSize === size ? colors.accent : colors.bgSecondary,
                        color: settings.fontSize === size ? colors.accentText : colors.text,
                      }}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Keyboard Shortcuts */}
              <div>
                <label className="text-xs mb-2 block" style={{ color: colors.textSecondary }}>Keyboard Shortcuts</label>
                <div className="space-y-2 text-xs" style={{ color: colors.textMuted }}>
                  <div className="flex justify-between"><span>Send message</span><kbd className="px-1.5 py-0.5 rounded" style={{ backgroundColor: colors.bgTertiary }}>Ctrl + Enter</kbd></div>
                  <div className="flex justify-between"><span>Search</span><kbd className="px-1.5 py-0.5 rounded" style={{ backgroundColor: colors.bgTertiary }}>Ctrl + K</kbd></div>
                  <div className="flex justify-between"><span>Settings</span><kbd className="px-1.5 py-0.5 rounded" style={{ backgroundColor: colors.bgTertiary }}>Ctrl + ,</kbd></div>
                  <div className="flex justify-between"><span>Fullscreen</span><kbd className="px-1.5 py-0.5 rounded" style={{ backgroundColor: colors.bgTertiary }}>Ctrl + F</kbd></div>
                  <div className="flex justify-between"><span>Close</span><kbd className="px-1.5 py-0.5 rounded" style={{ backgroundColor: colors.bgTertiary }}>Esc</kbd></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Favorites Overlay */}
        {showFavorites && (
          <div className="absolute inset-0 z-40 flex flex-col" style={{ backgroundColor: colors.bg }}>
            <div className="px-4 py-3 flex items-center gap-3" style={{ borderBottom: `1px solid ${colors.border}` }}>
              <button onClick={() => setShowFavorites(false)} style={{ color: colors.textMuted }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h3 className="text-sm font-medium" style={{ color: colors.text }}>Favorites</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {messages.filter((m) => m.favorite).length > 0 ? (
                messages.filter((m) => m.favorite).map((msg) => (
                  <button
                    key={msg.id}
                    onClick={() => { scrollToMessage(msg.id); setShowFavorites(false); }}
                    className="w-full text-left p-3 rounded-xl transition-colors"
                    style={{ backgroundColor: colors.bgSecondary }}
                  >
                    <p className="text-xs mb-1" style={{ color: colors.textMuted }}>
                      {msg.sender === "user" ? settings.userName : "Izzat Bot"} • {formatTime(msg.timestamp)}
                    </p>
                    <p className={`${fontSizes[settings.fontSize]} truncate`} style={{ color: colors.text }}>{msg.text}</p>
                  </button>
                ))
              ) : (
                <p className="text-center text-sm" style={{ color: colors.textMuted }}>No favorites yet</p>
              )}
            </div>
          </div>
        )}

        {/* Messages */}
        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 relative"
          style={{ minHeight: 0 }}
        >
          {/* Particle effects */}
          {particles.map((particle) => (
            <div
              key={particle.id}
              className="particle"
              style={{
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                backgroundColor: theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                animation: `float-particle 8s ease-in-out infinite`,
                animationDelay: `${particle.delay}s`,
              }}
            />
          ))}

          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-4 bottom-0 w-px" style={{ backgroundColor: colors.timeline }} />

            <div className="space-y-5">
              {messages.map((msg, index) => {
                // Check if we need to show date separator
                const showDateSeparator = index === 0 ||
                  formatDateGroup(msg.timestamp) !== formatDateGroup(messages[index - 1].timestamp);

                return (
                  <div key={msg.id}>
                    {/* Date separator */}
                    {showDateSeparator && (
                      <div className="flex items-center justify-center mb-4 mt-2">
                        <span
                          className="px-3 py-1 rounded-full text-[10px] font-medium"
                          style={{ backgroundColor: colors.bgSecondary, color: colors.textMuted }}
                        >
                          {formatDateGroup(msg.timestamp)}
                        </span>
                      </div>
                    )}

                    <div
                      id={`msg-${msg.id}`}
                      className={`flex gap-4 group relative animate-fade-in ${highlightedId === msg.id ? "animate-pulse" : ""}`}
                      style={{ animation: "fadeSlideIn 0.3s ease-out" }}
                    >
                      {/* Profile dot */}
                      <div
                        className={`relative z-10 w-8 h-8 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center ${
                          msg.sender === "bot" && (isAnimatingText && typingMessageId === msg.id) ? "avatar-speaking" : ""
                        }`}
                        style={{
                          border: `1px solid ${colors.border}`,
                          backgroundColor: colors.bg,
                        }}
                      >
                        {msg.sender === "user" ? (
                          settings.userPhoto ? (
                            <img src={settings.userPhoto} alt="You" className="w-full h-full object-cover" />
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke={theme === "dark" ? "#a3a3a3" : "#525252"} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          )
                        ) : (
                          <Image src="/profile2.jpeg" alt="Bot" width={32} height={32} className="w-full h-full object-cover" />
                        )}
                      </div>

                      {/* Message content */}
                      <div className="flex-1 min-w-0 pt-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-medium" style={{ color: colors.text }}>
                            {msg.sender === "user" ? settings.userName : "Izzat Bot"}
                          </span>
                          <span
                            className="text-[10px] cursor-help"
                            style={{ color: colors.textMuted }}
                            title={formatFullTime(msg.timestamp)}
                          >{formatTime(msg.timestamp)}</span>
                          {msg.favorite && <span className="text-[10px]">⭐</span>}
                          {/* Action buttons */}
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-0.5 ml-auto">
                            {/* Reply */}
                            <button
                              onClick={() => setReplyingTo(msg)}
                              className="icon-btn relative w-6 h-6 flex items-center justify-center rounded transition-transform duration-300 ease-out hover:scale-110 active:scale-95"
                              style={{ color: colors.textMuted }}
                              title="Reply"
                            >
                              <svg className="icon-default w-3.5 h-3.5 absolute transition-all duration-300 ease-out" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                              </svg>
                              <svg className="icon-hover w-3.5 h-3.5 absolute transition-all duration-300 ease-out" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                            </button>
                            {/* Copy */}
                            <button
                              onClick={() => copyMessage(msg.text)}
                              className="icon-btn relative w-6 h-6 flex items-center justify-center rounded transition-transform duration-300 ease-out hover:scale-110 active:scale-95"
                              style={{ color: colors.textMuted }}
                              title="Copy"
                            >
                              <svg className="icon-default w-3.5 h-3.5 absolute transition-all duration-300 ease-out" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              <svg className="icon-hover w-3.5 h-3.5 absolute transition-all duration-300 ease-out" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            {/* Favorite */}
                            <button
                              onClick={() => toggleFavorite(msg.id)}
                              className="icon-btn relative w-6 h-6 flex items-center justify-center rounded transition-transform duration-300 ease-out hover:scale-110 active:scale-95"
                              style={{ color: msg.favorite ? "#eab308" : colors.textMuted }}
                              title="Favorite"
                            >
                              <svg className="icon-default w-3.5 h-3.5 absolute transition-all duration-300 ease-out" fill={msg.favorite ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                              </svg>
                              <svg className="icon-hover w-3.5 h-3.5 absolute transition-all duration-300 ease-out" fill="currentColor" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                              </svg>
                            </button>
                            {msg.sender === "bot" && (
                              <>
                                {/* Listen */}
                                <button
                                  onClick={() => speak(msg.text)}
                                  className="icon-btn relative w-6 h-6 flex items-center justify-center rounded transition-transform duration-300 ease-out hover:scale-110 active:scale-95"
                                  style={{ color: colors.textMuted }}
                                  title="Listen"
                                >
                                  <svg className="icon-default w-3.5 h-3.5 absolute transition-all duration-300 ease-out" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M12 6l-4 4H4v4h4l4 4V6z" />
                                  </svg>
                                  <svg className="icon-hover w-3.5 h-3.5 absolute transition-all duration-300 ease-out" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
                                  </svg>
                                </button>
                                {/* Regenerate */}
                                <button
                                  onClick={() => regenerateResponse(msg.id)}
                                  className="icon-btn relative w-6 h-6 flex items-center justify-center rounded transition-transform duration-300 ease-out hover:scale-110 active:scale-95"
                                  style={{ color: colors.textMuted }}
                                  title="Regenerate"
                                >
                                  <svg className="icon-default w-3.5 h-3.5 absolute transition-all duration-300 ease-out" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                  <svg className="icon-hover w-3.5 h-3.5 absolute transition-all duration-300 ease-out" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                  </svg>
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Reply preview */}
                        {msg.replyTo && (
                          <div
                            className="text-[10px] px-2 py-1 mb-1 rounded border-l-2 cursor-pointer hover:opacity-80"
                            style={{ backgroundColor: colors.bgSecondary, borderColor: colors.textMuted, color: colors.textMuted }}
                            onClick={() => scrollToMessage(msg.replyTo!)}
                          >
                            ↩ {getMessageById(msg.replyTo)?.text.slice(0, 50)}...
                          </div>
                        )}

                        {/* Image */}
                        {msg.image && (
                          <img
                            src={msg.image}
                            alt="Uploaded"
                            className="max-w-full max-h-48 rounded-lg mb-2 cursor-pointer hover:opacity-90"
                            onClick={() => window.open(msg.image, "_blank")}
                          />
                        )}

                        {/* Message text */}
                        <div className={`${fontSizes[settings.fontSize]} leading-relaxed`} style={{ color: colors.text }}>
                          {msg.sender === "bot" && typingMessageId === msg.id ? (
                            <>
                              {parseMarkdown(displayedText)}
                              {isAnimatingText && <span className="typing-cursor" />}
                            </>
                          ) : (
                            parseMarkdown(msg.text)
                          )}
                        </div>

                        {/* Link preview */}
                        {extractLinks(msg.text).length > 0 && (
                          <div className="mt-2 space-y-1">
                            {extractLinks(msg.text).slice(0, 2).map((link, i) => (
                              <a
                                key={i}
                                href={link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 p-2 rounded-lg text-xs transition-colors hover:opacity-80"
                                style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}` }}
                              >
                                <svg className="w-4 h-4 flex-shrink-0" style={{ color: colors.textMuted }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                </svg>
                                <span className="truncate" style={{ color: colors.text }}>{link.replace(/^https?:\/\//, "").slice(0, 40)}...</span>
                                <svg className="w-3 h-3 flex-shrink-0" style={{ color: colors.textMuted }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </a>
                            ))}
                          </div>
                        )}

                        {/* Feedback buttons for bot messages */}
                        {msg.sender === "bot" && (
                          <div className="flex gap-1 mt-2">
                            <button
                              onClick={() => setFeedback(msg.id, "good")}
                              className="icon-btn relative w-6 h-6 flex items-center justify-center rounded transition-transform duration-300 ease-out hover:scale-110 active:scale-95"
                              style={{ color: msg.feedback === "good" ? "#22c55e" : colors.textMuted }}
                              title="Good response"
                            >
                              <svg className="icon-default w-3.5 h-3.5 absolute transition-all duration-300 ease-out" fill={msg.feedback === "good" ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                              </svg>
                              <svg className="icon-hover w-3.5 h-3.5 absolute transition-all duration-300 ease-out" fill="currentColor" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                              </svg>
                            </button>
                            <button
                              onClick={() => setFeedback(msg.id, "bad")}
                              className="icon-btn relative w-6 h-6 flex items-center justify-center rounded transition-transform duration-300 ease-out hover:scale-110 active:scale-95"
                              style={{ color: msg.feedback === "bad" ? "#ef4444" : colors.textMuted }}
                              title="Bad response"
                            >
                              <svg className="icon-default w-3.5 h-3.5 absolute transition-all duration-300 ease-out" fill={msg.feedback === "bad" ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                              </svg>
                              <svg className="icon-hover w-3.5 h-3.5 absolute transition-all duration-300 ease-out" fill="currentColor" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}


              {/* Typing indicator */}
              {isTyping && (
                <div className="flex gap-4 relative" style={{ animation: "fadeSlideIn 0.3s ease-out" }}>
                  <div className="relative z-10 w-8 h-8 rounded-full flex-shrink-0 overflow-hidden" style={{ border: `1px solid ${colors.border}`, backgroundColor: colors.bg }}>
                    <Image src="/profile2.jpeg" alt="Bot" width={32} height={32} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 pt-1">
                    <span className="text-xs font-medium" style={{ color: colors.text }}>Izzat Bot</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs" style={{ color: colors.textMuted }}>is typing</span>
                      <span className="flex gap-0.5">
                        <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: colors.textMuted }} />
                        <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: colors.textMuted, animationDelay: "0.15s" }} />
                        <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: colors.textMuted, animationDelay: "0.3s" }} />
                      </span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Scroll to bottom button */}
          {showScrollBtn && (
            <div
              className="sticky bottom-2 z-10 flex justify-center"
              style={{ animation: "fadeSlideIn 0.3s ease-out" }}
            >
              <button
                onClick={scrollToBottom}
                className="relative flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
                style={{
                  backgroundColor: colors.bg,
                  color: colors.text,
                  border: `1px solid ${colors.border}`,
                  boxShadow: theme === "dark"
                    ? "0 4px 20px rgba(0,0,0,0.4)"
                    : "0 4px 20px rgba(0,0,0,0.15)"
                }}
              >
                {unreadCount > 0 && (
                  <span
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse"
                    style={{ backgroundColor: "#ef4444", color: "#fff" }}
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
                <span>New messages</span>
                <svg
                  className="w-3.5 h-3.5 animate-bounce"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Toast notification */}
        {toast && (
          <div
            className="absolute bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-sm font-medium shadow-lg z-50"
            style={{
              backgroundColor: colors.accent,
              color: colors.accentText,
              animation: "fadeSlideIn 0.2s ease-out"
            }}
          >
            {toast}
          </div>
        )}

        {/* Emoji Picker */}
        {showEmoji && (
          <div className="px-4 py-2 border-t" style={{ borderColor: colors.border, backgroundColor: colors.bgSecondary }}>
            <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
              {emojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => addEmoji(emoji)}
                  className="w-8 h-8 flex items-center justify-center text-lg hover:bg-black/10 rounded transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className={`px-4 py-3 ${isMobile ? "chat-input-mobile" : ""}`} style={{ borderTop: `1px solid ${colors.border}` }}>
          {/* Reply preview */}
          {replyingTo && (
            <div
              className="flex items-center justify-between mb-2 px-3 py-2 rounded-lg text-xs"
              style={{ backgroundColor: colors.bgSecondary, borderLeft: `3px solid ${colors.accent}` }}
            >
              <div className="flex-1 min-w-0">
                <span style={{ color: colors.textMuted }}>Replying to </span>
                <span style={{ color: colors.text }}>{replyingTo.sender === "user" ? settings.userName : "Izzat Bot"}</span>
                <p className="truncate mt-0.5" style={{ color: colors.textMuted }}>{replyingTo.text.slice(0, 60)}...</p>
              </div>
              <button onClick={() => setReplyingTo(null)} className="p-1 ml-2" style={{ color: colors.textMuted }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Uploaded image preview */}
          {uploadedImage && (
            <div className="relative inline-block mb-2">
              <img src={uploadedImage} alt="Upload" className="max-h-20 rounded-lg" />
              <button
                onClick={removeUploadedImage}
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center"
                style={{ backgroundColor: colors.accent, color: colors.accentText }}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          <div className="flex items-center gap-1 p-2 rounded-xl" style={{ backgroundColor: colors.bgSecondary }}>
            {/* Image upload button */}
            <button
              onClick={() => imageInputRef.current?.click()}
              className="group relative w-9 h-9 flex items-center justify-center rounded-lg transition-transform duration-300 ease-out hover:scale-105 active:scale-95"
              style={{ color: uploadedImage ? colors.accent : colors.textMuted }}
              title="Upload image"
            >
              {/* Default icon */}
              <svg className="w-5 h-5 absolute transition-all duration-300 ease-out opacity-100 group-hover:opacity-0 group-hover:scale-75" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {/* Hover icon */}
              <svg className="w-5 h-5 absolute transition-all duration-300 ease-out opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />

            {/* Voice to text button */}
            <button
              onClick={() => {
                if (!recognitionRef.current) return;
                if (isListening) {
                  recognitionRef.current.stop();
                  setIsListening(false);
                } else {
                  try {
                    recognitionRef.current.start();
                    setIsListening(true);
                  } catch {}
                }
              }}
              className={`group relative w-9 h-9 flex items-center justify-center rounded-lg transition-transform duration-300 ease-out hover:scale-105 active:scale-95 ${isListening ? "animate-pulse" : ""}`}
              style={{ backgroundColor: isListening ? colors.accent : "transparent", color: isListening ? colors.accentText : colors.textMuted }}
              title={isListening ? "Stop listening" : "Voice input"}
            >
              {/* Default icon */}
              <svg className={`w-5 h-5 absolute transition-all duration-300 ease-out ${isListening ? "opacity-100" : "opacity-100 group-hover:opacity-0 group-hover:scale-75"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              {/* Hover icon */}
              <svg className={`w-5 h-5 absolute transition-all duration-300 ease-out ${isListening ? "opacity-0" : "opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
              </svg>
            </button>

            {/* Emoji button */}
            <button
              onClick={() => setShowEmoji(!showEmoji)}
              className="group relative w-9 h-9 flex items-center justify-center rounded-lg transition-transform duration-300 ease-out hover:scale-105 active:scale-95"
              style={{ color: showEmoji ? colors.accent : colors.textMuted }}
            >
              {/* Default icon */}
              <svg className="w-5 h-5 absolute transition-all duration-300 ease-out opacity-100 group-hover:opacity-0 group-hover:scale-75" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {/* Hover icon - bigger smile */}
              <svg className="w-5 h-5 absolute transition-all duration-300 ease-out opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" strokeWidth={1.5} />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 10h.01M15 10h.01M8 14s1.5 2 4 2 4-2 4-2" />
              </svg>
            </button>

            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => {
                  if (e.target.value.length <= 500) {
                    setInputValue(e.target.value);
                    if (e.target.value.length > inputValue.length) {
                      playTypingSound();
                    }
                  }
                }}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder={replyingTo ? "Type your reply..." : "Type a message..."}
                maxLength={500}
                className="w-full bg-transparent text-sm focus:outline-none pr-12"
                style={{ color: colors.text }}
              />
              {/* Character counter inside input */}
              {inputValue.length > 0 && (
                <span
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-[10px]"
                  style={{ color: inputValue.length > 450 ? "#ef4444" : colors.textMuted }}
                >
                  {inputValue.length}/500
                </span>
              )}
            </div>

            <button
              onClick={() => handleSend()}
              disabled={!inputValue.trim() && !uploadedImage}
              className="group relative w-9 h-9 flex items-center justify-center rounded-lg transition-transform duration-300 ease-out hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100"
              style={{ color: (inputValue.trim() || uploadedImage) ? colors.accent : colors.textMuted }}
            >
              {/* Default icon */}
              <svg className="w-5 h-5 absolute transition-all duration-300 ease-out opacity-100 group-hover:opacity-0 group-hover:scale-75 group-disabled:opacity-100 group-disabled:scale-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 12L3 21l18-9L3 3l3 9m0 0h12" />
              </svg>
              {/* Hover icon - arrow up */}
              <svg className="w-5 h-5 absolute transition-all duration-300 ease-out opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 group-disabled:opacity-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19V5m0 0l-7 7m7-7l7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Floating Button - Responsive */}
      <button
        onClick={() => {
          if (isOpen) {
            setIsOpen(false);
          } else {
            openChat();
            setUnreadCount(0); // Clear unread when opening
          }
        }}
        className={`fixed z-50 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${
          isMobile ? "bottom-4 right-4 w-12 h-12" : "bottom-6 right-6 w-14 h-14"
        } ${isOpen && isMobile ? "opacity-0 pointer-events-none" : "opacity-100"}`}
        style={{
          backgroundColor: theme === "dark" ? "#ffffff" : "#000000",
          boxShadow: theme === "dark" ? "0 4px 20px rgba(255,255,255,0.2)" : "0 4px 20px rgba(0,0,0,0.3)"
        }}
      >
        {/* Unread badge */}
        {!isOpen && unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center animate-bounce"
            style={{ backgroundColor: "#ef4444", color: "#fff" }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
        {isOpen ? (
          <svg className={isMobile ? "w-5 h-5" : "w-6 h-6"} fill="none" stroke={theme === "dark" ? "#000000" : "#ffffff"} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className={isMobile ? "w-5 h-5" : "w-6 h-6"} fill="none" stroke={theme === "dark" ? "#000000" : "#ffffff"} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </button>
    </>
  );
}
