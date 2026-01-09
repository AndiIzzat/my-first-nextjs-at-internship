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
  editingImageUrl?: string; // image being edited
  favorite?: boolean;
  feedback?: "good" | "bad" | null;
  isGeneratedImage?: boolean; // flag for AI-generated images
  imagePrompt?: string; // original prompt used to generate the image
  isError?: boolean; // flag for error messages
  errorType?: "connection" | "generation" | "timeout" | "rate_limit"; // type of error
}

// Generated image for gallery
interface GeneratedImage {
  id: number;
  image: string;
  prompt: string;
  timestamp: Date;
  isFavorite?: boolean;
  style?: string;
  aspectRatio?: string;
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
const GALLERY_KEY = "izzat-chat-gallery";

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

// Style presets for image generation
const stylePresets = [
  { id: "anime", label: "Anime", icon: "🎌", prompt: "anime style, vibrant colors, detailed linework, studio ghibli inspired" },
  { id: "realistic", label: "Realistic", icon: "📷", prompt: "photorealistic, ultra detailed, 8k resolution, professional photography" },
  { id: "fantasy", label: "Fantasy", icon: "🧙", prompt: "fantasy art style, magical atmosphere, ethereal lighting, mystical" },
  { id: "cyberpunk", label: "Cyberpunk", icon: "🤖", prompt: "cyberpunk style, neon lights, futuristic cityscape, high tech low life" },
  { id: "watercolor", label: "Watercolor", icon: "🎨", prompt: "watercolor painting style, soft edges, flowing colors, artistic" },
  { id: "minimal", label: "Minimal", icon: "⬜", prompt: "minimalist style, clean lines, simple shapes, modern design" },
  { id: "vintage", label: "Vintage", icon: "📺", prompt: "vintage style, retro aesthetic, film grain, nostalgic colors" },
  { id: "3d", label: "3D Render", icon: "🎮", prompt: "3D render, octane render, volumetric lighting, highly detailed" },
];

// Color mood presets
const colorMoods = [
  { id: "warm", label: "Warm", colors: ["#FF6B6B", "#FFA07A", "#FFD700"], prompt: "warm color palette, orange and red tones, cozy atmosphere" },
  { id: "cool", label: "Cool", colors: ["#4ECDC4", "#45B7D1", "#96CEB4"], prompt: "cool color palette, blue and teal tones, calm atmosphere" },
  { id: "neon", label: "Neon", colors: ["#FF00FF", "#00FFFF", "#FFFF00"], prompt: "neon colors, vibrant glowing effects, electric atmosphere" },
  { id: "pastel", label: "Pastel", colors: ["#FFB5E8", "#B5DEFF", "#E7FFAC"], prompt: "pastel colors, soft and dreamy, gentle tones" },
  { id: "mono", label: "Mono", colors: ["#2C3E50", "#7F8C8D", "#ECF0F1"], prompt: "monochromatic, black and white, high contrast" },
  { id: "earth", label: "Earth", colors: ["#8B4513", "#228B22", "#DAA520"], prompt: "earth tones, natural colors, organic feel" },
];

// Prompt templates
const promptTemplates = [
  { category: "Portrait", icon: "👤", templates: [
    "A portrait of {subject}, professional lighting, detailed features",
    "Close-up portrait of {subject}, cinematic lighting, shallow depth of field",
    "Artistic portrait of {subject}, dramatic shadows, expressive eyes",
  ]},
  { category: "Landscape", icon: "🏔️", templates: [
    "A breathtaking landscape of {place}, golden hour lighting, panoramic view",
    "Serene {place} at sunset, reflection on water, peaceful atmosphere",
    "Majestic {place} with dramatic clouds, epic scale, nature photography",
  ]},
  { category: "Character", icon: "🦸", templates: [
    "A {character} character design, full body, detailed costume, dynamic pose",
    "Fantasy {character} warrior, ornate armor, magical weapon, epic stance",
    "Cute chibi {character}, adorable expression, colorful outfit",
  ]},
  { category: "Object", icon: "💎", templates: [
    "Product shot of {object}, studio lighting, clean background, professional",
    "Detailed {object}, macro photography, intricate details, artistic composition",
    "Floating {object}, magical glow, particles, dramatic lighting",
  ]},
  { category: "Scene", icon: "🎬", templates: [
    "A cozy {scene}, warm lighting, detailed interior, inviting atmosphere",
    "Futuristic {scene}, neon lights, holographic displays, sci-fi elements",
    "Magical {scene}, sparkles and glow, enchanted forest, fantasy elements",
  ]},
];

// Random creative prompts for inspiration
const randomPrompts = [
  "A magical treehouse in an enchanted forest with glowing fireflies",
  "A steampunk flying ship above the clouds at sunset",
  "An underwater city with bioluminescent buildings and sea creatures",
  "A cozy coffee shop on a rainy day with warm lighting",
  "A dragon made of galaxies and stars in deep space",
  "A Japanese garden with cherry blossoms and a red bridge",
  "A robot artist painting in a futuristic studio",
  "A mystical library with floating books and magical orbs",
  "A crystal cave with rainbow reflections and ancient ruins",
  "A winter wonderland with aurora borealis and ice palace",
  "A surreal clock tower melting like in a Salvador Dali painting",
  "A phoenix rising from flames with golden and red feathers",
  "A cyberpunk street food vendor with neon signs at night",
  "A peaceful zen garden with raked sand and meditation stones",
  "A giant mechanical whale swimming through clouds",
];

// Prompt enhancer - magic words to improve image quality
const promptEnhancers = {
  quality: ["highly detailed", "8k resolution", "masterpiece", "best quality", "ultra HD", "professional"],
  lighting: ["dramatic lighting", "cinematic lighting", "golden hour", "soft lighting", "volumetric lighting", "rim lighting"],
  composition: ["rule of thirds", "centered composition", "dynamic angle", "bird's eye view", "close-up shot", "wide angle"],
  mood: ["atmospheric", "dreamy", "epic", "serene", "mysterious", "vibrant"],
  details: ["intricate details", "sharp focus", "fine textures", "crisp edges", "smooth gradients"],
};

// Surprise me - wild and fun prompts
const surprisePrompts = [
  "A cat astronaut floating in space with Earth in the background, wearing a tiny spacesuit",
  "A tiny dragon sleeping on a stack of gold coins inside a coffee cup",
  "A polar bear DJ spinning records at a neon-lit ice party in Antarctica",
  "A Victorian-era robot having afternoon tea with a clockwork owl",
  "A giant friendly mushroom house with glowing windows in an enchanted forest",
  "A samurai warrior made entirely of autumn leaves fighting the wind",
  "A cozy bookshop inside a giant hollow tree with fairy lights",
  "A whale made of clouds swimming through a sunset sky over a city",
  "A steampunk submarine exploring an underwater crystal cave",
  "A magical fox with nine tails made of northern lights",
  "A floating island with a waterfall pouring into the clouds below",
  "A robot artist painting a self-portrait in a futuristic gallery",
  "A secret garden hidden inside an old grandfather clock",
  "A phoenix made of cherry blossoms rising from a zen garden",
  "A cosmic turtle carrying a miniature city on its shell through space",
];

// Stats storage key
const STATS_KEY = "izzat-chat-image-stats";

// Default stats
interface ImageStats {
  totalGenerated: number;
  favoriteCount: number;
  stylesUsed: Record<string, number>;
  lastGenerated: string | null;
}

const defaultStats: ImageStats = {
  totalGenerated: 0,
  favoriteCount: 0,
  stylesUsed: {},
  lastGenerated: null,
};

export default function ChatWidget() {
  const { theme } = useTheme();

  // Core state
  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

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
  const [isListening, setIsListening] = useState(false);

  // Image features state
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lightboxPrompt, setLightboxPrompt] = useState<string>("");
  const [showGallery, setShowGallery] = useState(false);
  const [imageGallery, setImageGallery] = useState<GeneratedImage[]>([]);
  const [lastGeneratedImage, setLastGeneratedImage] = useState<{ image: string; prompt: string } | null>(null);
  const [editingImage, setEditingImage] = useState<string | null>(null);
  const [showPromptOverlay, setShowPromptOverlay] = useState(false);
  const [imageZoom, setImageZoom] = useState(1);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Image generation options state
  const [showImageOptions, setShowImageOptions] = useState(false);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<"1:1" | "16:9" | "9:16" | "4:3" | "3:4">("1:1");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [isAnimationMode, setIsAnimationMode] = useState(false);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [showCompareSlider, setShowCompareSlider] = useState(false);
  const [compareImages, setCompareImages] = useState<{ before: string; after: string } | null>(null);

  // Advanced image generation features
  const [selectedStyle, setSelectedStyle] = useState<string>("");
  const [selectedColorMood, setSelectedColorMood] = useState<string>("");
  const [showPromptTemplates, setShowPromptTemplates] = useState(false);
  const [lastPromptUsed, setLastPromptUsed] = useState<string>("");
  const [favoriteImages, setFavoriteImages] = useState<Set<string>>(new Set());
  const [imageStats, setImageStats] = useState<ImageStats>(defaultStats);
  const [enableEnhancer, setEnableEnhancer] = useState(true);
  const [enableSoundEffects, setEnableSoundEffects] = useState(true);
  const [galleryFilter, setGalleryFilter] = useState<"all" | "favorites">("all");
  const [hoveredImageId, setHoveredImageId] = useState<string | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const lightboxContainerRef = useRef<HTMLDivElement>(null);

  // Colors - aligned with portfolio theme (Warm Cream for light mode)
  const colors = {
    bg: theme === "dark" ? "#0a0a0a" : "#faf8f5",
    bgSecondary: theme === "dark" ? "#141414" : "#f5f2ed",
    bgTertiary: theme === "dark" ? "#1a1a1a" : "#ebe7e0",
    border: theme === "dark" ? "#262626" : "#e8e4dc",
    text: theme === "dark" ? "#ededed" : "#2d2a26",
    textSecondary: theme === "dark" ? "#a3a3a3" : "#5c574e",
    textMuted: theme === "dark" ? "#525252" : "#9c958a",
    accent: theme === "dark" ? "#ffffff" : "#2d2a26",
    accentText: theme === "dark" ? "#000000" : "#faf8f5",
    timeline: theme === "dark" ? "#262626" : "#ddd8ce",
  };

  // File input ref for photo upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const referenceImageInputRef = useRef<HTMLInputElement>(null);
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

  // Handle reference image upload for image-to-image
  const handleReferenceImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReferenceImage(reader.result as string);
        showToast("Reference image added!");
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove reference image
  const removeReferenceImage = () => {
    setReferenceImage(null);
    if (referenceImageInputRef.current) referenceImageInputRef.current.value = "";
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

  // Load image gallery from localStorage on mount
  const [galleryLoaded, setGalleryLoaded] = useState(false);
  useEffect(() => {
    try {
      const stored = localStorage.getItem(GALLERY_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setImageGallery(parsed.map((img: GeneratedImage) => ({
            ...img,
            timestamp: new Date(img.timestamp)
          })));
        }
      }
    } catch (e) {
      console.error("Failed to load gallery:", e);
    }
    setGalleryLoaded(true);
  }, []);

  // Save image gallery to localStorage whenever it changes
  useEffect(() => {
    if (galleryLoaded) {
      try {
        localStorage.setItem(GALLERY_KEY, JSON.stringify(imageGallery));
      } catch (e) {
        console.error("Failed to save gallery:", e);
      }
    }
  }, [imageGallery, galleryLoaded]);

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

  // Init audio with preload
  useEffect(() => {
    const audio = new Audio("/notificationsound1.mp3");
    audio.volume = 0.5;
    audio.preload = "auto";
    audioRef.current = audio;

    // Unlock audio on first user interaction (browser policy)
    const unlockAudio = () => {
      if (audioRef.current) {
        audioRef.current.play().then(() => {
          audioRef.current?.pause();
          audioRef.current!.currentTime = 0;
        }).catch(() => {});
      }
      document.removeEventListener("click", unlockAudio);
      document.removeEventListener("touchstart", unlockAudio);
    };

    document.addEventListener("click", unlockAudio);
    document.addEventListener("touchstart", unlockAudio);

    return () => {
      document.removeEventListener("click", unlockAudio);
      document.removeEventListener("touchstart", unlockAudio);
    };
  }, []);

  // Init speech recognition for voice-to-text
  useEffect(() => {
    const SpeechRecognition = (window as unknown as { SpeechRecognition?: new () => SpeechRecognition; webkitSpeechRecognition?: new () => SpeechRecognition }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognition }).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0].transcript)
          .join("");
        setInputValue(transcript);
      };
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
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
        if (lightboxImage) setLightboxImage(null);
        else if (showGallery) setShowGallery(false);
        else if (showSettings) setShowSettings(false);
        else if (showStats) setShowStats(false);
        else if (showSearch) setShowSearch(false);
        else if (showFavorites) setShowFavorites(false);
        else if (editingImage) setEditingImage(null);
        else if (replyingTo) setReplyingTo(null);
        else if (showEmoji) setShowEmoji(false);
        else setIsOpen(false);
      }

      // Ctrl/Cmd + Enter to send
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleSend();
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
  }, [isOpen, showSettings, showStats, showSearch, showFavorites, replyingTo, showEmoji, lightboxImage, showGallery, editingImage]);

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

  // Non-passive wheel event listener for lightbox zoom (prevents browser zoom)
  useEffect(() => {
    const container = lightboxContainerRef.current;
    if (!container || !lightboxImage) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Determine zoom delta
      const delta = e.ctrlKey
        ? (e.deltaY > 0 ? -0.05 : 0.05)  // Pinch zoom
        : (e.deltaY > 0 ? -0.1 : 0.1);    // Scroll zoom

      // Zoom toward cursor position
      setImageZoom((prevZoom) => {
        const newZoom = Math.min(3, Math.max(0.5, prevZoom + delta));
        if (newZoom !== prevZoom) {
          const viewportCenterX = window.innerWidth / 2;
          const viewportCenterY = window.innerHeight / 2;
          const mouseOffsetX = e.clientX - viewportCenterX;
          const mouseOffsetY = e.clientY - viewportCenterY;
          const zoomRatio = newZoom / prevZoom;

          setImagePosition((prevPos) => ({
            x: prevPos.x - (mouseOffsetX - prevPos.x) * (zoomRatio - 1),
            y: prevPos.y - (mouseOffsetY - prevPos.y) * (zoomRatio - 1)
          }));
        }
        return newZoom;
      });
    };

    // Add with { passive: false } to allow preventDefault
    container.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, [lightboxImage]);

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
      editingImageUrl: editingImage || undefined,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    localStorage.removeItem(DRAFT_KEY); // Clear draft on send
    setUploadedImage(null);
    setReplyingTo(null);
    setEditingImage(null);
    setIsTyping(true);
    setShowEmoji(false);
    if (imageInputRef.current) imageInputRef.current.value = "";

    // Detect if user is asking for image generation
    const lowerMsg = msg.toLowerCase();
    // Keywords that strongly indicate image generation
    const strongImageKeywords = ["generate", "draw", "gambar", "bikin gambar", "buat gambar"];
    // Keywords + targets combination
    const imageKeywords = ["create", "generate", "draw", "make", "design", "buat", "bikin", "tolong", "coba", "please"];
    const imageTargets = ["image", "picture", "photo", "illustration", "art", "gambar", "foto", "artwork", "visual", "icon", "logo", "poster", "banner"];
    // Direct patterns
    const directImagePatterns = [
      "gambar ", "generate ", "draw ", "create image", "buat gambar", "bikin gambar",
      "make a picture", "make an image", "generate a", "generate an", "draw a", "draw an",
      "create a", "create an", "design a", "design an"
    ];
    const isImageRequest =
      strongImageKeywords.some(k => lowerMsg.includes(k)) ||
      (imageKeywords.some(k => lowerMsg.includes(k)) && imageTargets.some(t => lowerMsg.includes(t))) ||
      directImagePatterns.some(p => lowerMsg.includes(p)) ||
      (lowerMsg.startsWith("gambar") || lowerMsg.includes(" gambar"));

    // Set prompt before setting generating state so loading shows the prompt
    if (isImageRequest) {
      setLastPromptUsed(msg);
    }
    setIsGeneratingImage(isImageRequest);

    try {
      // Build enhanced prompt with style, color mood, and AI enhancer
      let enhancedMessage = msg;
      if (isImageRequest) {
        const stylePrompt = selectedStyle ? stylePresets.find(s => s.id === selectedStyle)?.prompt : "";
        const colorPrompt = selectedColorMood ? colorMoods.find(c => c.id === selectedColorMood)?.prompt : "";

        // Apply prompt enhancer for better quality
        let basePrompt = msg;
        if (enableEnhancer) {
          basePrompt = enhancePrompt(msg);
        }

        if (stylePrompt || colorPrompt) {
          enhancedMessage = `${basePrompt}, ${stylePrompt} ${colorPrompt}`.trim();
        } else {
          enhancedMessage = basePrompt;
        }
      }

      // Build image options if this looks like an image generation request
      const imageOptions = isImageRequest ? {
        aspectRatio: selectedAspectRatio,
        negativePrompt: negativePrompt || undefined,
        referenceImage: referenceImage || undefined,
        isAnimation: isAnimationMode,
      } : undefined;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: enhancedMessage,
          history: messages.slice(-10),
          image: userMsg.image, // Send image if attached
          imageOptions,
        }),
      });
      const data = await res.json();

      setIsTyping(false);
      setIsGeneratingImage(false);

      const responseText = data.response || "Sorry, I couldn't process that.";
      const botMsgId = Date.now() + 1;
      const hasGeneratedImage = data.image && data.isImageGeneration;
      const botMsg: Message = {
        id: botMsgId,
        text: responseText,
        sender: "bot",
        timestamp: new Date(),
        image: data.image || undefined,
        isGeneratedImage: hasGeneratedImage,
        imagePrompt: hasGeneratedImage ? msg : undefined,
      };
      setMessages((prev) => [...prev, botMsg]);
      setBotMood(detectMood(responseText));
      playSound();

      // Add generated image to gallery
      if (hasGeneratedImage && data.image) {
        // Store for comparison if there was a reference image
        if (referenceImage) {
          setCompareImages({ before: referenceImage, after: data.image });
        }
        addToGallery(data.image, msg);
        // Clear reference image after generation
        setReferenceImage(null);

        // Play sound effect
        playGenerationSound();
        updateStats(selectedStyle || undefined);
      }

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
    } catch (error: unknown) {
      setIsTyping(false);
      const wasGeneratingImage = isGeneratingImage;
      setIsGeneratingImage(false);

      // Determine error type and concise message
      let errorType: "connection" | "generation" | "timeout" | "rate_limit" = "connection";
      let errorText = "Connection failed. Check internet and retry.";

      if (error instanceof Error) {
        if (error.message.includes("timeout") || error.name === "AbortError") {
          errorType = "timeout";
          errorText = wasGeneratingImage
            ? "Image generation timed out. Try again."
            : "Request timed out. Try again.";
        } else if (error.message.includes("rate") || error.message.includes("limit")) {
          errorType = "rate_limit";
          errorText = "Rate limit reached. Wait a moment and retry.";
        } else if (wasGeneratingImage) {
          errorType = "generation";
          errorText = "Image generation failed. Try different prompt.";
        }
      }

      const errMsg: Message = {
        id: Date.now() + 1,
        text: errorText,
        sender: "bot",
        timestamp: new Date(),
        isError: true,
        errorType: errorType
      };
      setMessages((prev) => [...prev, errMsg]);
    }
  };

  // Generate random prompt for inspiration
  const generateRandomPrompt = () => {
    const randomIndex = Math.floor(Math.random() * randomPrompts.length);
    const prompt = `Generate an image of ${randomPrompts[randomIndex]}`;
    setInputValue(prompt);
    showToast("Random prompt added!");
  };

  // Apply prompt template
  const applyTemplate = (template: string) => {
    setInputValue(`Generate an image: ${template}`);
    setShowPromptTemplates(false);
    inputRef.current?.focus();
  };

  // Regenerate with variations (different seed)
  const regenerateWithVariation = () => {
    if (lastPromptUsed) {
      handleSend(`Generate an image of ${lastPromptUsed} (variation)`);
    }
  };

  // Surprise Me - generate completely random creative prompt
  const surpriseMe = () => {
    const randomIndex = Math.floor(Math.random() * surprisePrompts.length);
    const prompt = surprisePrompts[randomIndex];
    setInputValue(`Generate an image: ${prompt}`);
    showToast("🎁 Surprise prompt ready!");
    inputRef.current?.focus();
  };

  // Enhance prompt with magic words
  const enhancePrompt = (basePrompt: string): string => {
    if (!enableEnhancer) return basePrompt;

    const categories = Object.keys(promptEnhancers) as (keyof typeof promptEnhancers)[];
    const enhancements: string[] = [];

    // Pick 1-2 random enhancers from different categories
    const shuffled = categories.sort(() => Math.random() - 0.5).slice(0, 2);
    shuffled.forEach(cat => {
      const words = promptEnhancers[cat];
      const randomWord = words[Math.floor(Math.random() * words.length)];
      enhancements.push(randomWord);
    });

    return `${basePrompt}, ${enhancements.join(", ")}`;
  };

  // Toggle favorite image
  const toggleFavorite = (imageUrl: string) => {
    setFavoriteImages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(imageUrl)) {
        newSet.delete(imageUrl);
        showToast("Removed from favorites");
      } else {
        newSet.add(imageUrl);
        showToast("❤️ Added to favorites!");
      }
      return newSet;
    });
  };

  // Update image stats
  const updateStats = (style?: string) => {
    setImageStats(prev => {
      const newStats = {
        ...prev,
        totalGenerated: prev.totalGenerated + 1,
        lastGenerated: new Date().toISOString(),
        stylesUsed: style
          ? { ...prev.stylesUsed, [style]: (prev.stylesUsed[style] || 0) + 1 }
          : prev.stylesUsed,
      };
      localStorage.setItem(STATS_KEY, JSON.stringify(newStats));
      return newStats;
    });
  };

  // Load stats from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STATS_KEY);
    if (stored) {
      try {
        setImageStats(JSON.parse(stored));
      } catch {}
    }
  }, []);

  // Copy prompt to clipboard
  const copyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
    showToast("📋 Prompt copied!");
  };

  // Play generation sound effect
  const playGenerationSound = () => {
    if (!enableSoundEffects) return;
    // Using Web Audio API for a simple success sound
    try {
      const audioContext = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
      oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
      oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.4);
    } catch {}
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

  // Toggle message favorite
  const toggleMessageFavorite = (msgId: number) => {
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

  // Image helper functions
  const downloadImage = (imageData: string, filename?: string) => {
    const link = document.createElement("a");
    link.href = imageData;
    link.download = filename || `generated-image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Image downloaded!");
  };

  const shareImage = async (imageData: string, prompt: string) => {
    // Try native share API first (mobile)
    if (navigator.share && navigator.canShare) {
      try {
        // Convert base64 to blob for sharing
        const response = await fetch(imageData);
        const blob = await response.blob();
        const file = new File([blob], "generated-image.png", { type: "image/png" });

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: "AI Generated Image",
            text: `Check out this AI-generated image: "${prompt}"`,
            files: [file],
          });
          showToast("Shared successfully!");
          return;
        }
      } catch (err) {
        console.log("Native share failed:", err);
      }
    }

    // Fallback: Copy image data URL to clipboard
    try {
      await navigator.clipboard.writeText(imageData);
      showToast("Image URL copied to clipboard!");
    } catch {
      showToast("Failed to share image");
    }
  };

  const openLightbox = (image: string, prompt: string = "") => {
    setLightboxImage(image);
    setLightboxPrompt(prompt);
    setShowPromptOverlay(false);
    setImageZoom(1);
    setImagePosition({ x: 0, y: 0 });
  };

  // Store last mouse position for zoom centering
  const lastMousePosRef = useRef({ x: 0, y: 0 });

  const handleImageMouseLeave = () => {
    setIsDraggingImage(false);
  };

  // Touch pinch zoom handlers
  const touchStartRef = useRef<{ distance: number; zoom: number; position: { x: number; y: number } } | null>(null);

  const getTouchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getTouchCenter = (touches: React.TouchList) => {
    if (touches.length < 2) return { x: 0, y: 0 };
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    };
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      touchStartRef.current = {
        distance: getTouchDistance(e.touches),
        zoom: imageZoom,
        position: { ...imagePosition }
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && touchStartRef.current) {
      e.preventDefault();
      const currentDistance = getTouchDistance(e.touches);
      const scale = currentDistance / touchStartRef.current.distance;
      const newZoom = Math.min(3, Math.max(0.5, touchStartRef.current.zoom * scale));

      // Zoom toward touch center
      const touchCenter = getTouchCenter(e.touches);
      const viewportCenterX = window.innerWidth / 2;
      const viewportCenterY = window.innerHeight / 2;
      const offsetX = touchCenter.x - viewportCenterX;
      const offsetY = touchCenter.y - viewportCenterY;

      const zoomRatio = newZoom / touchStartRef.current.zoom;
      const newPosX = touchStartRef.current.position.x - (offsetX - touchStartRef.current.position.x) * (zoomRatio - 1);
      const newPosY = touchStartRef.current.position.y - (offsetY - touchStartRef.current.position.y) * (zoomRatio - 1);

      setImageZoom(newZoom);
      setImagePosition({ x: newPosX, y: newPosY });
    }
  };

  const handleTouchEnd = () => {
    touchStartRef.current = null;
  };

  const resetImageView = () => {
    setImageZoom(1);
    setShowPromptOverlay(false);
    setImagePosition({ x: 0, y: 0 });
  };

  // Drag handlers - pan the image when zoomed
  const handleImageDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingImage(true);
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleImageDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingImage) return;

    const deltaX = e.clientX - lastMousePosRef.current.x;
    const deltaY = e.clientY - lastMousePosRef.current.y;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };

    // Pan the image
    setImagePosition(prev => ({
      x: prev.x + deltaX,
      y: prev.y + deltaY
    }));
  };

  const handleImageDragEnd = () => {
    setIsDraggingImage(false);
  };

  const addToGallery = (image: string, prompt: string, style?: string, aspectRatio?: string) => {
    const newImage: GeneratedImage = {
      id: Date.now(),
      image,
      prompt,
      timestamp: new Date(),
      isFavorite: false,
      style: style || selectedStyle || undefined,
      aspectRatio: aspectRatio || selectedAspectRatio,
    };
    setImageGallery((prev) => [newImage, ...prev]);
    setLastGeneratedImage({ image, prompt });
    showToast("🖼️ Saved to gallery!");
  };

  const toggleGalleryFavorite = (id: number) => {
    setImageGallery((prev) =>
      prev.map((img) =>
        img.id === id ? { ...img, isFavorite: !img.isFavorite } : img
      )
    );
    const img = imageGallery.find((i) => i.id === id);
    showToast(img?.isFavorite ? "Removed from favorites" : "❤️ Added to favorites!");
  };

  const copyPromptToClipboard = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
    showToast("📋 Prompt copied!");
  };

  const removeFromGallery = (id: number) => {
    setImageGallery((prev) => prev.filter((img) => img.id !== id));
    showToast("Image removed from gallery");
  };

  const clearGallery = () => {
    setImageGallery([]);
    localStorage.removeItem(GALLERY_KEY);
    showToast("Gallery cleared");
  };

  const editImage = (prompt: string) => {
    if (!lastGeneratedImage) {
      showToast("No image to edit. Generate an image first!");
      return;
    }
    setEditingImage(lastGeneratedImage.image);
    setInputValue(`Edit the previous image: ${prompt}`);
    inputRef.current?.focus();
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
      className="menu-item w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all duration-200 text-left group hover:pl-4"
      style={{ color: danger ? "#ef4444" : colors.text }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.bgTertiary)}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
    >
      <svg className="menu-icon w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ transformStyle: "preserve-3d" }}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} />
      </svg>
      <span className="menu-text">{label}</span>
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
                className="dropdown-btn w-9 h-9 rounded-lg transition-colors hover:bg-opacity-10 flex items-center justify-center"
                style={{ color: colors.textSecondary }}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <circle className="dropdown-dot-1" cx="12" cy="5" r="1.5" />
                  <circle className="dropdown-dot-2" cx="12" cy="12" r="1.5" />
                  <circle className="dropdown-dot-3" cx="12" cy="19" r="1.5" />
                </svg>
              </button>

              {showDropdown && (
                <div
                  className="absolute right-0 top-full mt-2 w-48 rounded-xl p-1.5 z-50"
                  style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}`, boxShadow: "0 10px 40px rgba(0,0,0,0.2)" }}
                >
                  <MenuItem icon="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" label="Search" onClick={() => { setShowSearch(true); setShowDropdown(false); }} />
                  <MenuItem icon="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" label="Image Gallery" onClick={() => { setShowGallery(true); setShowDropdown(false); }} />
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
                className="close-btn w-9 h-9 rounded-lg transition-colors hover:bg-opacity-10 flex items-center justify-center"
                style={{ color: colors.textSecondary }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

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

        {/* Image Gallery Overlay */}
        {showGallery && (
          <div className="absolute inset-0 z-40 flex flex-col" style={{ backgroundColor: colors.bg }}>
            {/* Gallery Header */}
            <div className="px-4 py-3 flex flex-col gap-2" style={{ borderBottom: `1px solid ${colors.border}` }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={() => setShowGallery(false)} style={{ color: colors.textMuted }}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <h3 className="text-sm font-medium" style={{ color: colors.text }}>
                    🖼️ Image Gallery
                  </h3>
                </div>
                {imageGallery.length > 0 && (
                  <button
                    onClick={clearGallery}
                    className="text-xs px-2 py-1 rounded-lg transition-colors"
                    style={{ color: "#ef4444", backgroundColor: "rgba(239,68,68,0.1)" }}
                  >
                    Clear All
                  </button>
                )}
              </div>
              {/* Gallery Filter Tabs */}
              <div className="flex gap-2">
                <button
                  onClick={() => setGalleryFilter("all")}
                  className="flex-1 py-1.5 text-xs rounded-lg transition-all"
                  style={{
                    backgroundColor: galleryFilter === "all" ? colors.accent : colors.bgSecondary,
                    color: galleryFilter === "all" ? colors.accentText : colors.textSecondary,
                  }}
                >
                  All ({imageGallery.length})
                </button>
                <button
                  onClick={() => setGalleryFilter("favorites")}
                  className="flex-1 py-1.5 text-xs rounded-lg transition-all flex items-center justify-center gap-1"
                  style={{
                    backgroundColor: galleryFilter === "favorites" ? "#ef4444" : colors.bgSecondary,
                    color: galleryFilter === "favorites" ? "#fff" : colors.textSecondary,
                  }}
                >
                  <span>❤️</span>
                  Favorites ({imageGallery.filter(i => i.isFavorite).length})
                </button>
              </div>
            </div>
            {/* Gallery Grid */}
            <div className="flex-1 overflow-y-auto p-4">
              {(() => {
                const filteredImages = galleryFilter === "favorites"
                  ? imageGallery.filter(i => i.isFavorite)
                  : imageGallery;
                return filteredImages.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {filteredImages.map((img) => (
                    <div
                      key={img.id}
                      className="relative group rounded-xl overflow-hidden cursor-pointer"
                      style={{ backgroundColor: colors.bgSecondary }}
                      onClick={() => openLightbox(img.image, img.prompt)}
                    >
                      {/* Favorite Badge - Always visible when favorited */}
                      {img.isFavorite && (
                        <div className="absolute top-1.5 left-1.5 z-10">
                          <svg className="w-4 h-4 text-red-500 drop-shadow-md" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                        </div>
                      )}
                      <img
                        src={img.image}
                        alt={img.prompt}
                        className="w-full aspect-square object-cover"
                      />
                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-200">
                        {/* Top Actions */}
                        <div className="absolute top-1.5 right-1.5 flex gap-1">
                          {/* Favorite Toggle */}
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleGalleryFavorite(img.id); }}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 ${
                              img.isFavorite
                                ? "bg-red-500 text-white"
                                : "bg-black/40 text-white/80 hover:bg-black/60 hover:text-white"
                            }`}
                            title={img.isFavorite ? "Remove from favorites" : "Add to favorites"}
                          >
                            <svg className="w-3.5 h-3.5" fill={img.isFavorite ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                          </button>
                          {/* Delete */}
                          <button
                            onClick={(e) => { e.stopPropagation(); removeFromGallery(img.id); }}
                            className="w-7 h-7 rounded-lg flex items-center justify-center bg-black/40 text-white/80 hover:bg-red-500 hover:text-white transition-all duration-200"
                            title="Remove from gallery"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                        {/* Bottom Actions */}
                        <div className="absolute bottom-1.5 left-1.5 right-1.5">
                          <div className="flex gap-1 justify-center">
                            {/* Copy Prompt */}
                            <button
                              onClick={(e) => { e.stopPropagation(); copyPromptToClipboard(img.prompt); }}
                              className="w-7 h-7 rounded-lg flex items-center justify-center bg-black/40 text-white/80 hover:bg-white hover:text-neutral-900 transition-all duration-200"
                              title="Copy Prompt"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                            {/* Download */}
                            <button
                              onClick={(e) => { e.stopPropagation(); downloadImage(img.image); }}
                              className="w-7 h-7 rounded-lg flex items-center justify-center bg-black/40 text-white/80 hover:bg-white hover:text-neutral-900 transition-all duration-200"
                              title="Download"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                            </button>
                            {/* Share */}
                            <button
                              onClick={(e) => { e.stopPropagation(); shareImage(img.image, img.prompt); }}
                              className="w-7 h-7 rounded-lg flex items-center justify-center bg-black/40 text-white/80 hover:bg-white hover:text-neutral-900 transition-all duration-200"
                              title="Share"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                              </svg>
                            </button>
                            {/* Edit */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setLastGeneratedImage({ image: img.image, prompt: img.prompt });
                                setEditingImage(img.image);
                                setShowGallery(false);
                                inputRef.current?.focus();
                              }}
                              className="w-7 h-7 rounded-lg flex items-center justify-center bg-black/40 text-white/80 hover:bg-white hover:text-neutral-900 transition-all duration-200"
                              title="Edit"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                            {/* Expand */}
                            <button
                              onClick={(e) => { e.stopPropagation(); openLightbox(img.image, img.prompt); }}
                              className="w-7 h-7 rounded-lg flex items-center justify-center bg-black/40 text-white/80 hover:bg-white hover:text-neutral-900 transition-all duration-200"
                              title="Expand"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                      {/* Image Info */}
                      <div className="p-2">
                        <p className="text-[10px] truncate" style={{ color: colors.textMuted }}>
                          {img.prompt}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-[9px]" style={{ color: colors.textMuted }}>
                            {img.timestamp.toLocaleDateString()}
                          </p>
                          {img.style && (
                            <span className="text-[8px] px-1.5 py-0.5 rounded" style={{ backgroundColor: colors.bgTertiary, color: colors.textMuted }}>
                              {img.style}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <svg className="w-16 h-16 mb-4" style={{ color: colors.textMuted }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm font-medium mb-1" style={{ color: colors.text }}>No images yet</p>
                  <p className="text-xs" style={{ color: colors.textMuted }}>
                    Generated images will appear here
                  </p>
                  <p className="text-xs mt-3" style={{ color: colors.textMuted }}>
                    Try: &quot;Generate an image of a sunset&quot;
                  </p>
                </div>
              );
              })()}
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
                          {msg.favorite && <span className="text-[10px]">❤️</span>}
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
                              onClick={() => toggleMessageFavorite(msg.id)}
                              className="icon-btn relative w-6 h-6 flex items-center justify-center rounded transition-transform duration-300 ease-out hover:scale-110 active:scale-95"
                              style={{ color: msg.favorite ? "#ef4444" : colors.textMuted }}
                              title="Favorite"
                            >
                              <svg className="icon-default w-3.5 h-3.5 absolute transition-all duration-300 ease-out" fill={msg.favorite ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                              </svg>
                              <svg className="icon-hover w-3.5 h-3.5 absolute transition-all duration-300 ease-out" fill="currentColor" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                              </svg>
                            </button>
                            {msg.sender === "bot" && (
                              <>
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

                        {/* Reply & Edit reference */}
                        {(msg.replyTo || msg.editingImageUrl) && (
                          <div
                            className="flex items-center gap-2 mb-2 p-2 rounded-lg border-l-2 cursor-pointer hover:opacity-80 transition-opacity"
                            style={{
                              backgroundColor: colors.bgSecondary,
                              borderColor: msg.editingImageUrl ? "#8b5cf6" : colors.textMuted
                            }}
                            onClick={() => msg.replyTo && scrollToMessage(msg.replyTo)}
                          >
                            {msg.editingImageUrl && (
                              <img
                                src={msg.editingImageUrl}
                                alt="Editing"
                                className="w-8 h-8 rounded object-cover flex-shrink-0"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1 text-[10px]" style={{ color: msg.editingImageUrl ? "#8b5cf6" : colors.textMuted }}>
                                {msg.editingImageUrl ? (
                                  <>
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    <span>Editing image</span>
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                    </svg>
                                    <span>Replying to {getMessageById(msg.replyTo!)?.sender === "bot" ? "Izzat Bot" : settings.userName}</span>
                                  </>
                                )}
                              </div>
                              {msg.replyTo && (
                                <p className="text-[11px] truncate mt-0.5" style={{ color: colors.textMuted }}>
                                  {getMessageById(msg.replyTo)?.text.slice(0, 60)}{(getMessageById(msg.replyTo)?.text.length || 0) > 60 ? "..." : ""}
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Image with hover overlay buttons */}
                        {msg.image && (
                          <div className="group relative mb-2 inline-block">
                            {/* Favorite indicator */}
                            {msg.isGeneratedImage && favoriteImages.has(msg.image) && (
                              <div className="absolute top-2 right-2 z-10">
                                <span className="text-red-500 text-lg drop-shadow-lg">❤️</span>
                              </div>
                            )}
                            <img
                              src={msg.image}
                              alt={msg.isGeneratedImage ? "AI Generated" : "Uploaded"}
                              className="max-w-full max-h-48 rounded-lg cursor-pointer transition-all duration-200 group-hover:brightness-95"
                              onClick={() => openLightbox(msg.image!, msg.imagePrompt || "")}
                            />
                            {/* Hover overlay - bottom center buttons */}
                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 bg-black/60 backdrop-blur-sm">
                              {/* Favorite button */}
                              {msg.isGeneratedImage && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); toggleFavorite(msg.image!); }}
                                  className="icon-btn relative w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/20 text-white transition-all duration-300 ease-out hover:scale-110 active:scale-95"
                                  title={favoriteImages.has(msg.image!) ? "Remove from favorites" : "Add to favorites"}
                                >
                                  <svg className={`w-3.5 h-3.5 transition-all duration-300 ${favoriteImages.has(msg.image!) ? "fill-red-500 text-red-500" : ""}`} fill={favoriteImages.has(msg.image!) ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                  </svg>
                                </button>
                              )}
                              {/* Copy prompt button */}
                              {msg.isGeneratedImage && msg.imagePrompt && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); copyPrompt(msg.imagePrompt!); }}
                                  className="icon-btn relative w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/20 text-white transition-all duration-300 ease-out hover:scale-110 active:scale-95"
                                  title="Copy prompt"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                </button>
                              )}
                              <button
                                onClick={(e) => { e.stopPropagation(); downloadImage(msg.image!); }}
                                className="icon-btn relative w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/20 text-white transition-all duration-300 ease-out hover:scale-110 active:scale-95"
                                title="Download"
                              >
                                <svg className="icon-default w-3.5 h-3.5 absolute transition-all duration-300 ease-out" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                <svg className="icon-hover w-3.5 h-3.5 absolute transition-all duration-300 ease-out" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); shareImage(msg.image!, msg.imagePrompt || "AI generated image"); }}
                                className="icon-btn relative w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/20 text-white transition-all duration-300 ease-out hover:scale-110 active:scale-95"
                                title="Share"
                              >
                                <svg className="icon-default w-3.5 h-3.5 absolute transition-all duration-300 ease-out" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                </svg>
                                <svg className="icon-hover w-3.5 h-3.5 absolute transition-all duration-300 ease-out" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </button>
                              {msg.isGeneratedImage && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setLastGeneratedImage({ image: msg.image!, prompt: msg.imagePrompt || "" });
                                    setEditingImage(msg.image!);
                                    inputRef.current?.focus();
                                  }}
                                  className="icon-btn relative w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/20 text-white transition-all duration-300 ease-out hover:scale-110 active:scale-95"
                                  title="Edit"
                                >
                                  <svg className="icon-default w-3.5 h-3.5 absolute transition-all duration-300 ease-out" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                  <svg className="icon-hover w-3.5 h-3.5 absolute transition-all duration-300 ease-out" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
                                </button>
                              )}
                              <button
                                onClick={(e) => { e.stopPropagation(); openLightbox(msg.image!, msg.imagePrompt || ""); }}
                                className="icon-btn relative w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/20 text-white transition-all duration-300 ease-out hover:scale-110 active:scale-95"
                                title="Fullscreen"
                              >
                                <svg className="icon-default w-3.5 h-3.5 absolute transition-all duration-300 ease-out" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                </svg>
                                <svg className="icon-hover w-3.5 h-3.5 absolute transition-all duration-300 ease-out" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Message text */}
                        {msg.isError ? (
                          /* Clean Error UI */
                          <div
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl"
                            style={{
                              backgroundColor: theme === "dark" ? "rgba(239, 68, 68, 0.15)" : "rgba(239, 68, 68, 0.08)",
                              border: `1px solid ${theme === "dark" ? "rgba(239, 68, 68, 0.25)" : "rgba(239, 68, 68, 0.15)"}`,
                            }}
                          >
                            {/* Error icon */}
                            <svg className="w-4 h-4 flex-shrink-0" style={{ color: "#ef4444" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              {msg.errorType === "connection" ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m-3.828-9.9a5 5 0 010 7.072M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
                              ) : msg.errorType === "generation" ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              ) : msg.errorType === "timeout" ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              ) : msg.errorType === "rate_limit" ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              )}
                            </svg>
                            {/* Error message */}
                            <span className={`${fontSizes[settings.fontSize]}`} style={{ color: colors.text }}>
                              {msg.text}
                            </span>
                            {/* Dismiss button */}
                            <button
                              onClick={() => setMessages(prev => prev.filter(m => m.id !== msg.id))}
                              className="ml-1 p-1 rounded-lg transition-all hover:scale-110 active:scale-95"
                              style={{
                                color: colors.textMuted,
                              }}
                              title="Dismiss"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          /* Normal message text */
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
                        )}

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

                        {/* Action buttons row for bot messages */}
                        {msg.sender === "bot" && (
                          <div className="flex items-center gap-0.5 mt-2">
                            {/* Feedback: Good */}
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
                            {/* Feedback: Bad */}
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


              {/* Typing indicator / Loading skeleton */}
              {isTyping && (
                <div className="flex gap-4 relative" style={{ animation: "fadeSlideIn 0.3s ease-out" }}>
                  <div className="relative z-10 w-8 h-8 rounded-full flex-shrink-0 overflow-hidden" style={{ border: `1px solid ${colors.border}`, backgroundColor: colors.bg }}>
                    <Image src="/profile2.jpeg" alt="Bot" width={32} height={32} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 pt-1">
                    <span className="text-xs font-medium" style={{ color: colors.text }}>Izzat Bot</span>

                    {/* Image generation loading skeleton */}
                    {isGeneratingImage ? (
                      <div className="mt-2 space-y-2">
                        {/* Title with prompt */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium" style={{ color: colors.text }}>
                              {editingImage ? "Editing image:" : "Generating image:"}
                            </span>
                            <span className="flex gap-0.5">
                              <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: colors.textMuted }} />
                              <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: colors.textMuted, animationDelay: "0.15s" }} />
                              <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: colors.textMuted, animationDelay: "0.3s" }} />
                            </span>
                          </div>
                          {lastPromptUsed && (
                            <p className="text-xs italic max-w-[200px] truncate" style={{ color: colors.textMuted }}>
                              &quot;{lastPromptUsed}&quot;
                            </p>
                          )}
                        </div>
                        {/* Image skeleton placeholder */}
                        <div
                          className="relative w-48 h-48 rounded-xl overflow-hidden"
                          style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}` }}
                        >
                          {/* Shimmer effect */}
                          <div
                            className="absolute inset-0"
                            style={{
                              background: `linear-gradient(90deg, transparent, ${theme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)"}, transparent)`,
                              animation: "shimmer 1.5s infinite",
                            }}
                          />
                          {/* Icon placeholder */}
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                            <svg
                              className="w-10 h-10 animate-pulse"
                              style={{ color: colors.textMuted }}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-[10px]" style={{ color: colors.textMuted }}>
                              This may take 5-15 seconds
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Regular typing indicator */
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs" style={{ color: colors.textMuted }}>is typing</span>
                        <span className="flex gap-0.5">
                          <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: colors.textMuted }} />
                          <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: colors.textMuted, animationDelay: "0.15s" }} />
                          <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: colors.textMuted, animationDelay: "0.3s" }} />
                        </span>
                      </div>
                    )}
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

        {/* Toast notification - styled to match portfolio */}
        {toast && (
          <div
            className="absolute bottom-24 left-1/2 -translate-x-1/2 z-50"
            style={{ animation: "fadeSlideIn 0.2s ease-out" }}
          >
            <div
              className="flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-medium backdrop-blur-md"
              style={{
                backgroundColor: theme === "dark" ? "rgba(23, 23, 23, 0.9)" : "rgba(255, 255, 255, 0.95)",
                color: colors.text,
                border: `1px solid ${colors.border}`,
                boxShadow: theme === "dark"
                  ? "0 4px 20px rgba(0,0,0,0.4)"
                  : "0 4px 20px rgba(0,0,0,0.1)",
              }}
            >
              <span>{toast}</span>
            </div>
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
          {/* Editing image preview */}
          {editingImage && (
            <div
              className="flex items-center gap-3 mb-2 px-3 py-2 rounded-lg text-xs"
              style={{ backgroundColor: colors.bgSecondary, borderLeft: `3px solid #8b5cf6` }}
            >
              <img src={editingImage} alt="Editing" className="w-10 h-10 rounded object-cover" />
              <div className="flex-1 min-w-0">
                <span style={{ color: "#8b5cf6" }}>Editing image</span>
                <p className="truncate mt-0.5" style={{ color: colors.textMuted }}>Describe the changes you want...</p>
              </div>
              <button onClick={() => setEditingImage(null)} className="p-1 ml-2 hover:opacity-70" style={{ color: colors.textMuted }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

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

          {/* Image Generation Options Panel - Enhanced */}
          {showImageOptions && (
            <div
              className="mb-3 rounded-xl overflow-hidden"
              style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}` }}
            >
              {/* Header with tabs feel */}
              <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: `1px solid ${colors.border}` }}>
                <div className="flex items-center gap-2">
                  <span className="text-lg">🎨</span>
                  <span className="text-xs font-medium" style={{ color: colors.text }}>Image Studio</span>
                </div>
                <button
                  onClick={() => setShowImageOptions(false)}
                  className="p-1 rounded hover:opacity-70"
                  style={{ color: colors.textMuted }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-3 space-y-3 max-h-96 overflow-y-auto">
                {/* Stats Banner */}
                {imageStats.totalGenerated > 0 && (
                  <div className="flex items-center justify-between p-2 rounded-lg text-[10px]" style={{ backgroundColor: `${colors.accent}15` }}>
                    <div className="flex items-center gap-3">
                      <span style={{ color: colors.text }}>🖼️ <strong>{imageStats.totalGenerated}</strong> generated</span>
                      {Object.keys(imageStats.stylesUsed).length > 0 && (
                        <span style={{ color: colors.textMuted }}>
                          🎨 Top: {Object.entries(imageStats.stylesUsed).sort((a, b) => b[1] - a[1])[0]?.[0] || "None"}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Quick Actions - Row 1 */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={surpriseMe}
                    className="flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                    style={{ background: "linear-gradient(135deg, #ec4899, #8b5cf6)", color: "#fff" }}
                  >
                    <span>🎁</span> Surprise Me!
                  </button>
                  <button
                    onClick={generateRandomPrompt}
                    className="flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-lg text-xs transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                    style={{ backgroundColor: "#8b5cf6", color: "#fff" }}
                  >
                    <span>🎲</span> Random
                  </button>
                </div>

                {/* Quick Actions - Row 2 */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowPromptTemplates(!showPromptTemplates)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                    style={{ backgroundColor: "#06b6d4", color: "#fff" }}
                  >
                    <span>📝</span> Templates
                  </button>
                  {lastPromptUsed && (
                    <button
                      onClick={regenerateWithVariation}
                      className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                      style={{ backgroundColor: "#f59e0b", color: "#fff" }}
                    >
                      <span>🔄</span> Variation
                    </button>
                  )}
                </div>

                {/* Enhancer Toggle */}
                <div className="flex items-center justify-between p-2 rounded-lg" style={{ backgroundColor: colors.bgTertiary }}>
                  <div className="flex items-center gap-2">
                    <span>✨</span>
                    <div>
                      <label className="text-xs" style={{ color: colors.text }}>AI Enhancer</label>
                      <p className="text-[9px]" style={{ color: colors.textMuted }}>Auto-add quality keywords</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setEnableEnhancer(!enableEnhancer)}
                    className="relative w-10 h-5 rounded-full transition-colors duration-200"
                    style={{ backgroundColor: enableEnhancer ? "#22c55e" : colors.border }}
                  >
                    <div
                      className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 shadow"
                      style={{ transform: enableEnhancer ? "translateX(22px)" : "translateX(2px)" }}
                    />
                  </button>
                </div>

                {/* Prompt Templates Dropdown */}
                {showPromptTemplates && (
                  <div className="p-2 rounded-lg space-y-2" style={{ backgroundColor: colors.bgTertiary }}>
                    <span className="text-[10px] uppercase tracking-wider" style={{ color: colors.textMuted }}>Choose Template</span>
                    {promptTemplates.map((cat) => (
                      <div key={cat.category}>
                        <div className="flex items-center gap-1 text-xs font-medium mb-1" style={{ color: colors.text }}>
                          <span>{cat.icon}</span> {cat.category}
                        </div>
                        <div className="space-y-1 pl-5">
                          {cat.templates.map((tmpl, i) => (
                            <button
                              key={i}
                              onClick={() => applyTemplate(tmpl)}
                              className="w-full text-left text-[10px] px-2 py-1 rounded hover:opacity-80 truncate"
                              style={{ color: colors.textSecondary, backgroundColor: colors.bgSecondary }}
                            >
                              {tmpl}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Style Presets */}
                <div>
                  <label className="text-[10px] uppercase tracking-wider mb-1.5 block" style={{ color: colors.textMuted }}>
                    Art Style
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {stylePresets.map((style) => (
                      <button
                        key={style.id}
                        onClick={() => setSelectedStyle(selectedStyle === style.id ? "" : style.id)}
                        className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg text-[10px] transition-all duration-200 hover:scale-[1.05]"
                        style={{
                          backgroundColor: selectedStyle === style.id ? colors.accent : colors.bgTertiary,
                          color: selectedStyle === style.id ? colors.accentText : colors.text,
                          border: `1px solid ${selectedStyle === style.id ? colors.accent : colors.border}`,
                        }}
                      >
                        <span className="text-base">{style.icon}</span>
                        <span>{style.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color Mood */}
                <div>
                  <label className="text-[10px] uppercase tracking-wider mb-1.5 block" style={{ color: colors.textMuted }}>
                    Color Mood
                  </label>
                  <div className="flex gap-1.5 flex-wrap">
                    {colorMoods.map((mood) => (
                      <button
                        key={mood.id}
                        onClick={() => setSelectedColorMood(selectedColorMood === mood.id ? "" : mood.id)}
                        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] transition-all duration-200 hover:scale-[1.05]"
                        style={{
                          backgroundColor: selectedColorMood === mood.id ? colors.accent : colors.bgTertiary,
                          color: selectedColorMood === mood.id ? colors.accentText : colors.text,
                          border: `1px solid ${selectedColorMood === mood.id ? colors.accent : colors.border}`,
                        }}
                      >
                        <div className="flex -space-x-1">
                          {mood.colors.map((c, i) => (
                            <div key={i} className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: c }} />
                          ))}
                        </div>
                        <span>{mood.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Aspect Ratio */}
                <div>
                  <label className="text-[10px] uppercase tracking-wider mb-1.5 block" style={{ color: colors.textMuted }}>
                    Aspect Ratio
                  </label>
                  <div className="flex gap-1.5 flex-wrap">
                    {(["1:1", "16:9", "9:16", "4:3", "3:4"] as const).map((ratio) => (
                      <button
                        key={ratio}
                        onClick={() => setSelectedAspectRatio(ratio)}
                        className="px-2.5 py-1.5 rounded-lg text-xs transition-all duration-200"
                        style={{
                          backgroundColor: selectedAspectRatio === ratio ? colors.accent : colors.bgTertiary,
                          color: selectedAspectRatio === ratio ? colors.accentText : colors.text,
                          border: `1px solid ${selectedAspectRatio === ratio ? colors.accent : colors.border}`,
                        }}
                      >
                        {ratio}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Negative Prompt */}
                <div>
                  <label className="text-[10px] uppercase tracking-wider mb-1.5 block" style={{ color: colors.textMuted }}>
                    Negative Prompt <span className="normal-case">(avoid these)</span>
                  </label>
                  <input
                    type="text"
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    placeholder="e.g., blurry, low quality, text, watermark"
                    className="w-full px-3 py-2 rounded-lg text-xs focus:outline-none"
                    style={{
                      backgroundColor: colors.bgTertiary,
                      color: colors.text,
                      border: `1px solid ${colors.border}`,
                    }}
                  />
                </div>

                {/* Animation Mode Toggle */}
                <div className="flex items-center justify-between p-2 rounded-lg" style={{ backgroundColor: colors.bgTertiary }}>
                  <div className="flex items-center gap-2">
                    <span>🎬</span>
                    <label className="text-xs" style={{ color: colors.text }}>Animation Mode</label>
                  </div>
                  <button
                    onClick={() => setIsAnimationMode(!isAnimationMode)}
                    className="relative w-10 h-5 rounded-full transition-colors duration-200"
                    style={{ backgroundColor: isAnimationMode ? "#22c55e" : colors.border }}
                  >
                    <div
                      className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 shadow"
                      style={{ transform: isAnimationMode ? "translateX(22px)" : "translateX(2px)" }}
                    />
                  </button>
                </div>

                {/* Reference Image */}
                <div>
                  <label className="text-[10px] uppercase tracking-wider mb-1.5 block" style={{ color: colors.textMuted }}>
                    Reference Image <span className="normal-case">(img2img)</span>
                  </label>
                  {referenceImage ? (
                    <div className="relative inline-block">
                      <img src={referenceImage} alt="Reference" className="max-h-16 rounded-lg" />
                      <button
                        onClick={removeReferenceImage}
                        className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center shadow-lg"
                        style={{ backgroundColor: "#ef4444", color: "#fff" }}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => referenceImageInputRef.current?.click()}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all duration-200 hover:opacity-80"
                      style={{
                        backgroundColor: colors.bgTertiary,
                        color: colors.textMuted,
                        border: `1px dashed ${colors.border}`,
                      }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Upload reference image
                    </button>
                  )}
                  <input
                    ref={referenceImageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleReferenceImageUpload}
                    className="hidden"
                  />
                </div>

                {/* Compare Button */}
                {compareImages && (
                  <button
                    onClick={() => setShowCompareSlider(true)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs transition-all duration-200 hover:opacity-80"
                    style={{ backgroundColor: "#8b5cf6", color: "#fff" }}
                  >
                    <span>🔀</span> Compare Before/After
                  </button>
                )}

                {/* Active Settings Summary */}
                {(selectedStyle || selectedColorMood || negativePrompt || isAnimationMode || selectedAspectRatio !== "1:1") && (
                  <div className="flex flex-wrap gap-1 pt-2" style={{ borderTop: `1px solid ${colors.border}` }}>
                    <span className="text-[10px]" style={{ color: colors.textMuted }}>Active:</span>
                    {selectedStyle && (
                      <span className="px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: colors.accent, color: colors.accentText }}>
                        {stylePresets.find(s => s.id === selectedStyle)?.label}
                      </span>
                    )}
                    {selectedColorMood && (
                      <span className="px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: colors.accent, color: colors.accentText }}>
                        {colorMoods.find(c => c.id === selectedColorMood)?.label}
                      </span>
                    )}
                    {selectedAspectRatio !== "1:1" && (
                      <span className="px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: colors.accent, color: colors.accentText }}>
                        {selectedAspectRatio}
                      </span>
                    )}
                    {isAnimationMode && (
                      <span className="px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: "#22c55e", color: "#fff" }}>
                        GIF
                      </span>
                    )}
                    {negativePrompt && (
                      <span className="px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: "#ef4444", color: "#fff" }}>
                        -Prompt
                      </span>
                    )}
                  </div>
                )}
              </div>
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

            {/* Image generation options button */}
            <button
              onClick={() => setShowImageOptions(!showImageOptions)}
              className="group relative w-9 h-9 flex items-center justify-center rounded-lg transition-transform duration-300 ease-out hover:scale-105 active:scale-95"
              style={{ color: showImageOptions || referenceImage || negativePrompt || isAnimationMode || selectedAspectRatio !== "1:1" || selectedStyle || selectedColorMood ? colors.accent : colors.textMuted }}
              title="Image Studio - Style, Colors, Templates & More"
            >
              {/* Default icon - settings/sliders */}
              <svg className="w-5 h-5 absolute transition-all duration-300 ease-out opacity-100 group-hover:opacity-0 group-hover:scale-75" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              {/* Hover icon - magic wand */}
              <svg className="w-5 h-5 absolute transition-all duration-300 ease-out opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              {/* Active indicator dot */}
              {(referenceImage || negativePrompt || isAnimationMode || selectedAspectRatio !== "1:1" || selectedStyle || selectedColorMood) && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              )}
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
                placeholder={editingImage ? "Edit the image: describe changes..." : replyingTo ? "Type your reply..." : "Type a message..."}
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
        className={`fixed z-50 rounded-full flex items-center justify-center transition-all duration-300 ease-out hover:scale-105 active:scale-95 group ${
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
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center animate-bounce z-10"
            style={{ backgroundColor: "#ef4444", color: "#fff" }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
        {isOpen ? (
          <>
            {/* Default X icon */}
            <svg className={`${isMobile ? "w-5 h-5" : "w-6 h-6"} absolute transition-all duration-300 opacity-100 group-hover:opacity-0 group-hover:scale-75`} fill="none" stroke={theme === "dark" ? "#000000" : "#ffffff"} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
            {/* Hover - Chevron down icon */}
            <svg className={`${isMobile ? "w-5 h-5" : "w-6 h-6"} absolute transition-all duration-300 opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100`} fill="none" stroke={theme === "dark" ? "#000000" : "#ffffff"} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
            </svg>
          </>
        ) : (
          <>
            {/* Default chat icon */}
            <svg className={`${isMobile ? "w-5 h-5" : "w-6 h-6"} absolute transition-all duration-300 opacity-100 group-hover:opacity-0 group-hover:scale-75`} fill="none" stroke={theme === "dark" ? "#000000" : "#ffffff"} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {/* Hover - Bot/Robot icon */}
            <svg className={`${isMobile ? "w-5 h-5" : "w-6 h-6"} absolute transition-all duration-300 opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100`} fill="none" stroke={theme === "dark" ? "#000000" : "#ffffff"} viewBox="0 0 24 24">
              {/* Antenna */}
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 2v3" />
              <circle cx="12" cy="2" r="1" fill={theme === "dark" ? "#000000" : "#ffffff"} />
              {/* Head */}
              <rect x="4" y="5" width="16" height="12" rx="2" strokeWidth={1.5} />
              {/* Eyes */}
              <circle cx="9" cy="11" r="1.5" fill={theme === "dark" ? "#000000" : "#ffffff"} />
              <circle cx="15" cy="11" r="1.5" fill={theme === "dark" ? "#000000" : "#ffffff"} />
              {/* Ears */}
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2 10v4M22 10v4" />
              {/* Body hint */}
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 17v3M16 17v3" />
            </svg>
          </>
        )}
      </button>

      {/* Image Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => setLightboxImage(null)}
          style={{ animation: "fadeSlideIn 0.2s ease-out", perspective: "1000px" }}
        >
          {/* Close button */}
          <div
            className="absolute top-6 right-6 z-20"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="p-1.5 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10">
              <button
                onClick={() => setLightboxImage(null)}
                className="flex items-center justify-center w-10 h-10 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200"
                title="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Zoom controls */}
          <div
            className="absolute top-6 left-1/2 -translate-x-1/2 z-20"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-1 p-1.5 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10">
              {/* Zoom out */}
              <button
                onClick={(e) => { e.stopPropagation(); setImageZoom((z) => Math.max(0.5, z - 0.25)); }}
                className="flex items-center justify-center w-10 h-10 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200"
                title="Zoom out"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                </svg>
              </button>

              {/* Zoom level */}
              <span className="text-white/80 text-xs min-w-[3rem] text-center font-medium">{Math.round(imageZoom * 100)}%</span>

              {/* Zoom in */}
              <button
                onClick={(e) => { e.stopPropagation(); setImageZoom((z) => Math.min(3, z + 0.25)); }}
                className="flex items-center justify-center w-10 h-10 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200"
                title="Zoom in"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                </svg>
              </button>

              {/* Divider */}
              <div className="w-px h-6 bg-white/20" />

              {/* Show Prompt */}
              <button
                onClick={(e) => { e.stopPropagation(); setShowPromptOverlay(prev => !prev); }}
                className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 ${showPromptOverlay ? "text-white bg-white/20" : "text-white/70 hover:text-white hover:bg-white/10"}`}
                title={showPromptOverlay ? "Hide prompt" : "Show prompt"}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
              </button>

              {/* Reset */}
              <button
                onClick={(e) => { e.stopPropagation(); resetImageView(); }}
                className="flex items-center justify-center w-10 h-10 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200"
                title="Reset view"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>

          {/* Image container - optimized for performance */}
          <div
            ref={lightboxContainerRef}
            className="relative flex flex-col items-center touch-none"
            style={{ width: "100vw", height: "100vh" }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={handleImageDragStart}
            onMouseMove={handleImageDrag}
            onMouseUp={handleImageDragEnd}
            onMouseLeave={handleImageMouseLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div
              className="absolute top-1/2 left-1/2 cursor-grab active:cursor-grabbing"
              style={{
                transform: `translate(-50%, -50%) translate3d(${imagePosition.x}px, ${imagePosition.y}px, 0) scale(${imageZoom})`,
                transition: isDraggingImage ? "none" : "transform 0.15s ease-out",
                willChange: "transform",
              }}
            >
              {/* Image */}
              <div className="relative">
                <img
                  src={lightboxImage}
                  alt="Generated image"
                  className="max-w-[85vw] max-h-[75vh] rounded-xl object-contain select-none"
                  style={{
                    boxShadow: "0 25px 50px rgba(0,0,0,0.4)",
                  }}
                  draggable={false}
                />

                {/* Prompt overlay */}
                {showPromptOverlay && (
                  <div
                    className="absolute inset-0 flex items-end justify-center rounded-xl overflow-hidden"
                    style={{
                      background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.5) 50%, transparent 100%)",
                    }}
                  >
                    <div className="p-6 text-center max-w-full">
                      <p className="text-white text-sm leading-relaxed">
                        {lightboxPrompt || "No prompt available"}
                      </p>
                      <span className="text-white/40 text-[10px] mt-2 block">
                        Generated with AI
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom controls - fixed at bottom */}
            <div
              className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20"
              onMouseDown={(e) => e.stopPropagation()}
            >
              {/* Clean action bar */}
              <div className="flex items-center gap-1 p-1.5 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10">
                {/* Favorite */}
                <button
                  onClick={() => toggleFavorite(lightboxImage)}
                  className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 ${
                    favoriteImages.has(lightboxImage)
                      ? "bg-red-500 text-white"
                      : "text-white/70 hover:text-white hover:bg-white/10"
                  }`}
                  title={favoriteImages.has(lightboxImage) ? "Remove from favorites" : "Add to favorites"}
                >
                  <svg className="w-5 h-5" fill={favoriteImages.has(lightboxImage) ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>

                {/* Divider */}
                <div className="w-px h-6 bg-white/20" />

                {/* Copy Prompt */}
                {lightboxPrompt && (
                  <button
                    onClick={() => copyPromptToClipboard(lightboxPrompt)}
                    className="flex items-center justify-center w-10 h-10 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200"
                    title="Copy prompt"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                )}

                {/* Download */}
                <button
                  onClick={() => downloadImage(lightboxImage)}
                  className="flex items-center justify-center w-10 h-10 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200"
                  title="Download image"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>

                {/* Share */}
                <button
                  onClick={() => shareImage(lightboxImage, lightboxPrompt)}
                  className="flex items-center justify-center w-10 h-10 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200"
                  title="Share image"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                </button>

                {/* Divider */}
                <div className="w-px h-6 bg-white/20" />

                {/* Save to Gallery */}
                <button
                  onClick={() => addToGallery(lightboxImage, lightboxPrompt || "Untitled")}
                  className="flex items-center justify-center w-10 h-10 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200"
                  title="Save to gallery"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </button>

                {/* Edit */}
                {lightboxPrompt && (
                  <button
                    onClick={() => {
                      setLastGeneratedImage({ image: lightboxImage, prompt: lightboxPrompt });
                      setEditingImage(lightboxImage);
                      setLightboxImage(null);
                      inputRef.current?.focus();
                    }}
                    className="flex items-center justify-center w-10 h-10 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200"
                    title="Edit image"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Comparison Slider Modal */}
      {showCompareSlider && compareImages && (
        <ImageCompareSlider
          beforeImage={compareImages.before}
          afterImage={compareImages.after}
          onClose={() => setShowCompareSlider(false)}
          theme={theme}
        />
      )}
    </>
  );
}

// Image Comparison Slider Component
function ImageCompareSlider({
  beforeImage,
  afterImage,
  onClose,
  theme,
}: {
  beforeImage: string;
  afterImage: string;
  onClose: () => void;
  theme: string;
}) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = () => setIsDragging(true);
  const handleMouseUp = () => setIsDragging(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    setSliderPosition((x / rect.width) * 100);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const touch = e.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(touch.clientX - rect.left, rect.width));
    setSliderPosition((x / rect.width) * 100);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
      style={{ animation: "fadeSlideIn 0.2s ease-out" }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        onMouseDown={(e) => e.stopPropagation()}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm text-white z-20 transition-all duration-200 hover:bg-white/20 hover:scale-110 active:scale-95 flex items-center justify-center"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Header */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 z-20">
        <span className="text-white text-sm font-medium">Before / After</span>
      </div>

      {/* Comparison container */}
      <div
        ref={containerRef}
        className="relative w-[80vw] max-w-3xl aspect-square rounded-xl overflow-hidden cursor-ew-resize select-none"
        onClick={(e) => e.stopPropagation()}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleMouseUp}
      >
        {/* After image (full width background) */}
        <img
          src={afterImage}
          alt="After"
          className="absolute inset-0 w-full h-full object-contain"
          style={{ backgroundColor: theme === "dark" ? "#0a0a0a" : "#faf8f5" }}
          draggable={false}
        />

        {/* Before image (clipped) */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ width: `${sliderPosition}%` }}
        >
          <img
            src={beforeImage}
            alt="Before"
            className="absolute inset-0 w-full h-full object-contain"
            style={{
              width: containerRef.current?.offsetWidth || "100%",
              maxWidth: "none",
              backgroundColor: theme === "dark" ? "#0a0a0a" : "#faf8f5",
            }}
            draggable={false}
          />
        </div>

        {/* Slider handle */}
        <div
          className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize z-10"
          style={{ left: `${sliderPosition}%`, transform: "translateX(-50%)" }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleMouseDown}
        >
          {/* Handle grip */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
            </svg>
          </div>
        </div>

        {/* Labels */}
        <div className="absolute bottom-4 left-4 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm text-white text-xs font-medium">
          Before
        </div>
        <div className="absolute bottom-4 right-4 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm text-white text-xs font-medium">
          After
        </div>
      </div>
    </div>
  );
}
