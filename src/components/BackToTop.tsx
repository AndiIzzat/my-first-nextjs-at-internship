"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/context/ThemeContext";

export default function BackToTop() {
  const [isVisible, setIsVisible] = useState(false);
  const { theme } = useTheme();

  // Colors matching ChatWidget - Warm Cream for light mode
  const colors = {
    bg: theme === "dark" ? "#0a0a0a" : "#faf8f5",
    text: theme === "dark" ? "#ededed" : "#2d2a26",
    border: theme === "dark" ? "#262626" : "#e8e4dc",
  };

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <div
      className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-40 transition-all duration-300 ease-out ${
        isVisible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-4 pointer-events-none"
      }`}
    >
      <button
        onClick={scrollToTop}
        className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
        style={{
          backgroundColor: colors.bg,
          color: colors.text,
          border: `1px solid ${colors.border}`,
          boxShadow: theme === "dark"
            ? "0 4px 20px rgba(0,0,0,0.4)"
            : "0 4px 20px rgba(0,0,0,0.15)",
        }}
        aria-label="Back to top"
      >
        <span>Back to top</span>
        <svg
          className="w-3.5 h-3.5 animate-bounce"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 10l7-7m0 0l7 7m-7-7v18"
          />
        </svg>
      </button>
    </div>
  );
}
