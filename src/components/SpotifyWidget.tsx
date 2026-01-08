"use client";

import { useState, useEffect, useCallback } from "react";
import { useTheme } from "@/context/ThemeContext";
import Image from "next/image";

interface NowPlayingData {
  isPlaying: boolean;
  configured: boolean;
  loggedIn?: boolean;
  title?: string;
  artist?: string;
  album?: string;
  albumArt?: string;
  songUrl?: string;
  progress?: number;
  duration?: number;
  error?: string;
}

// Your Spotify playlists
const PLAYLISTS = [
  { id: "0ZkyENdDjmcer6cTglOvFE", name: "🌟🦩" },
  { id: "0FJpRxubp4gAdYFd2xukzG", name: "cœur" },
  { id: "0blyqQir5x3BwYWzB8kn5O", name: "....-.....--.." },
];

export default function SpotifyWidget() {
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [nowPlaying, setNowPlaying] = useState<NowPlayingData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showEmbed, setShowEmbed] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [widgetSize, setWidgetSize] = useState({ width: 380, height: 600 });
  const [isResizing, setIsResizing] = useState(false);
  const [volume, setVolume] = useState(50);
  const [isVolumeLoading, setIsVolumeLoading] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  // Colors - aligned with ChatWidget theme (Warm Cream for light mode)
  const colors = {
    bg: theme === "dark" ? "#0a0a0a" : "#faf8f5",
    bgSecondary: theme === "dark" ? "#141414" : "#f5f2ed",
    bgTertiary: theme === "dark" ? "#1a1a1a" : "#ebe7e0",
    border: theme === "dark" ? "#262626" : "#e8e4dc",
    text: theme === "dark" ? "#ededed" : "#2d2a26",
    textSecondary: theme === "dark" ? "#a3a3a3" : "#5c574e",
    textMuted: theme === "dark" ? "#525252" : "#9c958a",
    accent: theme === "dark" ? "#ffffff" : "#2d2a26",
    spotify: "#1DB954",
  };

  const fetchNowPlaying = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/spotify");
      const data: NowPlayingData = await res.json();
      setNowPlaying(data);
    } catch {
      setNowPlaying({ isPlaying: false, configured: false });
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (isOpen && !showEmbed) {
      fetchNowPlaying();
      const interval = setInterval(fetchNowPlaying, 30000);
      return () => clearInterval(interval);
    }
  }, [isOpen, showEmbed, fetchNowPlaying]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("spotify_connected") === "true") {
      setIsOpen(true);
      setShowEmbed(false);
      window.history.replaceState({}, "", window.location.pathname);
    }
    if (params.get("spotify_error")) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // ESC key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  const handleLogin = () => {
    window.location.href = "/api/spotify/login";
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/spotify/logout", { method: "POST" });
      setNowPlaying({ isPlaying: false, configured: true, loggedIn: false });
    } catch {
      // Error handling
    }
    setIsLoggingOut(false);
  };

  // Fetch current volume when logged in
  const fetchVolume = useCallback(async () => {
    try {
      const res = await fetch("/api/spotify/volume");
      if (res.ok) {
        const data = await res.json();
        if (data.volume !== undefined) {
          setVolume(data.volume);
        }
      }
    } catch {
      // Silently fail
    }
  }, []);

  // Set volume
  const handleVolumeChange = async (newVolume: number) => {
    setVolume(newVolume);
    setIsVolumeLoading(true);
    try {
      await fetch("/api/spotify/volume", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ volume: newVolume }),
      });
    } catch {
      // Silently fail
    }
    setIsVolumeLoading(false);
  };

  // Fetch volume when now playing changes
  useEffect(() => {
    if (nowPlaying?.loggedIn && nowPlaying?.isPlaying) {
      fetchVolume();
    }
  }, [nowPlaying?.loggedIn, nowPlaying?.isPlaying, fetchVolume]);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Resize handlers with direction support
  const handleResizeStart = (e: React.MouseEvent, direction: "nw" | "n" | "w" | "ne" | "e" | "sw" | "s" | "se") => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = widgetSize.width;
    const startHeight = widgetSize.height;

    const handleMouseMove = (e: MouseEvent) => {
      let newWidth = startWidth;
      let newHeight = startHeight;

      // Handle horizontal resize (min 320, max 700 - matching ChatWidget)
      if (direction.includes("w")) {
        newWidth = Math.max(320, Math.min(700, startWidth - (e.clientX - startX)));
      } else if (direction.includes("e")) {
        newWidth = Math.max(320, Math.min(700, startWidth + (e.clientX - startX)));
      }

      // Handle vertical resize (min 300, max 900)
      if (direction.includes("n")) {
        newHeight = Math.max(300, Math.min(900, startHeight - (e.clientY - startY)));
      } else if (direction.includes("s")) {
        newHeight = Math.max(300, Math.min(900, startHeight + (e.clientY - startY)));
      }

      setWidgetSize({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const progressPercent =
    nowPlaying?.progress && nowPlaying?.duration
      ? (nowPlaying.progress / nowPlaying.duration) * 100
      : 0;

  // Check if Spotify API is configured
  const isConfigured = nowPlaying?.configured;

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 left-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ease-out hover:scale-110 hover:shadow-xl active:scale-95 group"
        style={{
          backgroundColor: colors.spotify,
          boxShadow: `0 4px 20px ${colors.spotify}40`,
        }}
        aria-label="Open Spotify Widget"
      >
        {/* Spotify Icon */}
        <svg
          className="w-7 h-7 text-white transition-transform duration-300 group-hover:rotate-12"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
        </svg>
      </button>

      {/* Widget Panel */}
      <div
        className={`fixed overflow-hidden flex flex-col ${isResizing ? "" : "transition-all duration-300"} ${
          isFullscreen
            ? "inset-0 rounded-none z-[100]"
            : "rounded-2xl z-50"
        } ${
          isOpen
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-8 pointer-events-none"
        } ${isResizing ? "ring-2 ring-opacity-50" : ""}`}
        style={{
          backgroundColor: colors.bg,
          border: isFullscreen ? "none" : `1px solid ${colors.border}`,
          boxShadow: isFullscreen ? "none" : (theme === "dark" ? "0 0 60px rgba(0,0,0,0.5)" : "0 25px 50px -12px rgba(0,0,0,0.25)"),
          ["--tw-ring-color" as string]: colors.spotify,
          ...(isFullscreen
            ? {}
            : { bottom: 96, left: 24, width: widgetSize.width, height: widgetSize.height }),
        }}
      >
        {/* Resize handles - hidden in fullscreen */}
        {!isFullscreen && isOpen && (
          <>
            {/* Corner handles */}
            {/* Top-left */}
            <div
              onMouseDown={(e) => handleResizeStart(e, "nw")}
              className="absolute top-0 left-0 w-4 h-4 cursor-nw-resize z-50 group"
            >
              <div
                className="absolute top-1 left-1 w-2 h-2 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ backgroundColor: colors.textSecondary }}
              />
            </div>
            {/* Top-right */}
            <div
              onMouseDown={(e) => handleResizeStart(e, "ne")}
              className="absolute top-0 right-0 w-4 h-4 cursor-ne-resize z-50 group"
            >
              <div
                className="absolute top-1 right-1 w-2 h-2 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ backgroundColor: colors.textSecondary }}
              />
            </div>
            {/* Bottom-left */}
            <div
              onMouseDown={(e) => handleResizeStart(e, "sw")}
              className="absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize z-50 group"
            >
              <div
                className="absolute bottom-1 left-1 w-2 h-2 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ backgroundColor: colors.textSecondary }}
              />
            </div>
            {/* Bottom-right - main resize handle with icon */}
            <div
              onMouseDown={(e) => handleResizeStart(e, "se")}
              className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize z-50 flex items-center justify-center group"
            >
              <svg
                className="w-3 h-3 opacity-30 group-hover:opacity-70 transition-opacity"
                fill={colors.textSecondary}
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
        {/* Header */}
        <div
          className={`flex items-center justify-between ${isFullscreen ? "px-6 py-4" : "px-4 py-3"}`}
          style={{ borderBottom: `1px solid ${colors.border}` }}
        >
          <div className="flex items-center gap-2 group cursor-default">
            <svg
              className="w-5 h-5 transition-all duration-300 group-hover:scale-110 group-hover:rotate-12"
              viewBox="0 0 24 24"
              fill={colors.spotify}
              style={{ filter: `drop-shadow(0 0 6px ${colors.spotify}60)` }}
            >
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
            </svg>
            <span className="font-medium text-sm transition-all duration-300 group-hover:tracking-wide" style={{ color: colors.text }}>
              Spotify
            </span>
            {nowPlaying?.loggedIn && (
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse transition-transform duration-300 hover:scale-150" title="Connected"></span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Tabs - only show if API is configured */}
            {isConfigured && (
              <div
                className="flex rounded-full p-0.5 text-xs"
                style={{ backgroundColor: colors.bgSecondary }}
              >
                <button
                  onClick={() => setShowEmbed(false)}
                  className="px-2 py-1 rounded-full transition-all duration-300 ease-out hover:scale-105 active:scale-95"
                  style={{
                    backgroundColor: !showEmbed ? colors.spotify : "transparent",
                    color: !showEmbed ? "#fff" : colors.textMuted,
                    boxShadow: !showEmbed ? `0 2px 8px ${colors.spotify}40` : "none",
                  }}
                >
                  Now
                </button>
                <button
                  onClick={() => setShowEmbed(true)}
                  className="px-2 py-1 rounded-full transition-all duration-300 ease-out hover:scale-105 active:scale-95"
                  style={{
                    backgroundColor: showEmbed ? colors.spotify : "transparent",
                    color: showEmbed ? "#fff" : colors.textMuted,
                    boxShadow: showEmbed ? `0 2px 8px ${colors.spotify}40` : "none",
                  }}
                >
                  Playlist
                </button>
              </div>
            )}
            {/* Minimize Button - only show in fullscreen */}
            {isFullscreen && (
              <button
                onClick={() => setIsFullscreen(false)}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ease-out bg-neutral-800 hover:bg-neutral-700 hover:scale-110 active:scale-95 group"
                style={{ color: "#fff" }}
                aria-label="Minimize"
              >
                <svg className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
            )}
            {/* Fullscreen Button - only show when not fullscreen */}
            {!isFullscreen && (
              <button
                onClick={() => setIsFullscreen(true)}
                className="w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ease-out hover:bg-neutral-800 hover:scale-110 active:scale-95 group"
                style={{ color: colors.textMuted }}
                aria-label="Fullscreen"
              >
                <svg className="w-4 h-4 transition-transform duration-300 group-hover:rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                </svg>
              </button>
            )}
            {/* Close Button */}
            <button
              onClick={() => {
                setIsOpen(false);
                setIsFullscreen(false);
              }}
              className={`rounded-full flex items-center justify-center transition-all duration-300 ease-out group ${
                isFullscreen
                  ? "w-10 h-10 bg-neutral-800 hover:bg-red-500/20 hover:scale-110 active:scale-95"
                  : "w-6 h-6 hover:bg-red-500/20 hover:scale-110 active:scale-95"
              }`}
              style={{ color: isFullscreen ? "#fff" : colors.textMuted }}
              aria-label="Close"
              title="Close"
            >
              <svg className={`${isFullscreen ? "w-5 h-5" : "w-4 h-4"} transition-all duration-300 group-hover:text-red-500 group-hover:rotate-90`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div
          className="p-4 overflow-auto flex-1 flex flex-col"
          style={{ minHeight: 0 }}
        >
          {!showEmbed && isConfigured ? (
            // Now Playing View (only when configured)
            <div>
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="relative">
                    <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: colors.spotify }}></div>
                    <div className="absolute inset-0 w-8 h-8 border-2 border-t-transparent rounded-full animate-spin opacity-30" style={{ borderColor: colors.spotify, animationDirection: "reverse", animationDuration: "1.5s" }}></div>
                  </div>
                  <span className="text-xs animate-pulse" style={{ color: colors.textMuted }}>Loading...</span>
                </div>
              ) : !nowPlaying?.loggedIn ? (
                <div className="text-center py-8">
                  <div
                    className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center transition-all duration-300 hover:scale-110 cursor-pointer group animate-bounce"
                    style={{
                      backgroundColor: colors.bgSecondary,
                      animationDuration: "2s",
                    }}
                  >
                    <svg className="w-6 h-6 transition-all duration-300 group-hover:rotate-12" fill={colors.spotify} viewBox="0 0 24 24" style={{ filter: `drop-shadow(0 0 4px ${colors.spotify}60)` }}>
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                    </svg>
                  </div>
                  <p className="text-sm mb-4 transition-all duration-300 hover:tracking-wide" style={{ color: colors.text }}>
                    Connect your Spotify
                  </p>
                  <button
                    onClick={handleLogin}
                    className="px-6 py-2 rounded-full text-sm font-medium text-white transition-all duration-300 ease-out hover:scale-110 active:scale-95 hover:shadow-lg group"
                    style={{
                      backgroundColor: colors.spotify,
                      boxShadow: `0 4px 15px ${colors.spotify}50`,
                    }}
                  >
                    <span className="inline-flex items-center gap-2">
                      <svg className="w-4 h-4 transition-transform duration-300 group-hover:rotate-12" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                      </svg>
                      Login with Spotify
                    </span>
                  </button>
                </div>
              ) : nowPlaying?.isPlaying && nowPlaying.title ? (
                <div className="space-y-4">
                  <div className="flex gap-4">
                    {nowPlaying.albumArt && (
                      <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg">
                        <Image
                          src={nowPlaying.albumArt}
                          alt={nowPlaying.album || "Album"}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
                          <svg className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-all duration-300 scale-50 group-hover:scale-100" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"/>
                          </svg>
                        </div>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <a
                        href={nowPlaying.songUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-sm block truncate transition-all duration-300 hover:underline"
                        style={{ color: colors.text }}
                        onMouseEnter={(e) => e.currentTarget.style.color = colors.spotify}
                        onMouseLeave={(e) => e.currentTarget.style.color = colors.text}
                      >
                        {nowPlaying.title}
                      </a>
                      <p className="text-xs truncate transition-colors duration-300" style={{ color: colors.textMuted }}>
                        {nowPlaying.artist}
                      </p>
                      <p className="text-xs truncate mt-1 transition-colors duration-300" style={{ color: colors.textMuted }}>
                        {nowPlaying.album}
                      </p>
                    </div>
                  </div>
                  <div className="group cursor-pointer">
                    <div
                      className="h-1 rounded-full overflow-hidden transition-all duration-300 group-hover:h-2"
                      style={{ backgroundColor: colors.bgSecondary }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{
                          width: `${progressPercent}%`,
                          backgroundColor: colors.spotify,
                          boxShadow: `0 0 8px ${colors.spotify}60`,
                        }}
                      ></div>
                    </div>
                    <div className="flex justify-between mt-1 text-xs transition-colors duration-300" style={{ color: colors.textMuted }}>
                      <span>{formatTime(nowPlaying.progress || 0)}</span>
                      <span>{formatTime(nowPlaying.duration || 0)}</span>
                    </div>
                  </div>
                  {/* Volume Control */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowVolumeSlider(!showVolumeSlider)}
                      className="p-1.5 rounded-full transition-all duration-300 hover:scale-110 active:scale-95 group"
                      style={{ backgroundColor: showVolumeSlider ? colors.bgSecondary : "transparent" }}
                      title="Volume"
                    >
                      {volume === 0 ? (
                        <svg className="w-4 h-4 transition-colors duration-300" fill={colors.textSecondary} viewBox="0 0 24 24">
                          <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                        </svg>
                      ) : volume < 50 ? (
                        <svg className="w-4 h-4 transition-colors duration-300" fill={colors.textSecondary} viewBox="0 0 24 24">
                          <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/>
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 transition-colors duration-300" fill={colors.textSecondary} viewBox="0 0 24 24">
                          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                        </svg>
                      )}
                    </button>
                    <div
                      className={`flex-1 flex items-center gap-2 transition-all duration-300 ${
                        showVolumeSlider ? "opacity-100" : "opacity-0 pointer-events-none w-0"
                      }`}
                    >
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={volume}
                        onChange={(e) => handleVolumeChange(Number(e.target.value))}
                        className="flex-1 h-1 rounded-full appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, ${colors.spotify} 0%, ${colors.spotify} ${volume}%, ${colors.bgSecondary} ${volume}%, ${colors.bgSecondary} 100%)`,
                          accentColor: colors.spotify,
                        }}
                      />
                      <span
                        className="text-xs min-w-[28px] text-right tabular-nums"
                        style={{ color: colors.textSecondary }}
                      >
                        {isVolumeLoading ? "..." : `${volume}%`}
                      </span>
                    </div>
                    {!showVolumeSlider && (
                      <div className="flex-1 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        <span className="text-xs" style={{ color: colors.spotify }}>
                          Now Playing
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    {showVolumeSlider && (
                      <div className="flex items-center gap-2 group cursor-default">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse transition-transform duration-300 group-hover:scale-125"></span>
                        <span className="text-xs transition-all duration-300 group-hover:tracking-wide" style={{ color: colors.spotify }}>
                          Now Playing
                        </span>
                      </div>
                    )}
                    <button
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className={`text-xs px-3 py-1 rounded-full transition-all duration-300 ease-out hover:bg-red-500/20 hover:text-red-500 hover:scale-105 active:scale-95 ${!showVolumeSlider ? "ml-auto" : ""}`}
                      style={{ color: colors.textMuted }}
                    >
                      {isLoggingOut ? "..." : "Logout"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <div
                    className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center transition-all duration-300 hover:scale-110 cursor-pointer group"
                    style={{ backgroundColor: colors.bgSecondary }}
                  >
                    <svg className="w-6 h-6 transition-all duration-300 group-hover:scale-110" fill={colors.textMuted} viewBox="0 0 24 24">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                    </svg>
                  </div>
                  <p className="text-sm transition-all duration-300 hover:tracking-wide" style={{ color: colors.textMuted }}>
                    Not playing anything
                  </p>
                  <p className="text-xs mt-1 mb-4" style={{ color: colors.textMuted }}>
                    Play something on Spotify!
                  </p>
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="text-xs px-4 py-1.5 rounded-full transition-all duration-300 ease-out hover:bg-red-500/20 hover:text-red-500 hover:scale-105 active:scale-95"
                    style={{ backgroundColor: colors.bgSecondary, color: colors.textMuted }}
                  >
                    {isLoggingOut ? "Logging out..." : "Disconnect"}
                  </button>
                </div>
              )}
            </div>
          ) : null}

          {/* Playlist Embed View */}
          <div className={`${!showEmbed && isConfigured ? "hidden" : ""} flex-1 flex flex-col min-h-0`}>
            {/* Playlist Selector */}
            <div className="flex gap-2 mb-3">
              {PLAYLISTS.map((playlist, index) => (
                <button
                  key={playlist.id}
                  onClick={() => setSelectedPlaylist(index)}
                  className={`flex-1 rounded-lg font-medium transition-all duration-300 ease-out hover:scale-105 active:scale-95 ${isFullscreen ? "px-4 py-2 text-sm" : "px-2 py-1.5 text-xs"}`}
                  style={{
                    backgroundColor: selectedPlaylist === index ? colors.spotify : colors.bgSecondary,
                    color: selectedPlaylist === index ? "#fff" : colors.textMuted,
                    boxShadow: selectedPlaylist === index ? `0 4px 12px ${colors.spotify}40` : "none",
                    transform: selectedPlaylist === index ? "translateY(-1px)" : "none",
                  }}
                >
                  {playlist.name}
                </button>
              ))}
            </div>

            {/* Spotify Embed */}
            <div className="rounded-xl overflow-hidden flex-1 min-h-0">
              <iframe
                key={PLAYLISTS[selectedPlaylist].id}
                src={`https://open.spotify.com/embed/playlist/${PLAYLISTS[selectedPlaylist].id}?utm_source=generator&theme=${theme === "dark" ? "0" : "1"}`}
                width="100%"
                height="100%"
                frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                style={{ borderRadius: "12px", minHeight: "152px" }}
              ></iframe>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
