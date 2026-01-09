"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useTheme } from "@/context/ThemeContext";

// Theme Toggle Component - Rounded Monochromatic Design
function ThemeToggle({ theme, toggleTheme, size = "default" }: { theme: string; toggleTheme: () => void; size?: "default" | "small" }) {
  const isLight = theme === "light";
  const dimensions = size === "small" ? { width: 48, height: 24 } : { width: 56, height: 28 };
  const knobDimensions = size === "small" ? { width: 16, height: 16 } : { width: 20, height: 20 };
  const translateX = size === "small" ? 24 : 28;

  return (
    <button
      onClick={toggleTheme}
      className="relative rounded-full transition-all duration-300 ease-out overflow-hidden"
      style={{
        width: dimensions.width,
        height: dimensions.height,
        backgroundColor: isLight ? "#e5e5e5" : "#262626",
      }}
      aria-label="Toggle theme"
    >
      {/* Sliding knob with icon */}
      <div
        className="absolute rounded-full shadow-md transition-all duration-300 ease-out flex items-center justify-center"
        style={{
          width: knobDimensions.width,
          height: knobDimensions.height,
          top: 4,
          left: 4,
          transform: `translateX(${isLight ? translateX : 0}px)`,
          backgroundColor: isLight ? "#171717" : "#ffffff",
        }}
      >
        {/* Sun icon */}
        <svg
          className="absolute transition-all duration-300"
          style={{
            width: 10,
            height: 10,
            opacity: isLight ? 1 : 0,
            transform: isLight ? "rotate(0deg)" : "rotate(90deg)",
            color: "#ffffff",
          }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>

        {/* Moon icon */}
        <svg
          className="absolute transition-all duration-300"
          style={{
            width: 10,
            height: 10,
            opacity: isLight ? 0 : 1,
            transform: isLight ? "rotate(-90deg)" : "rotate(0deg)",
            color: "#171717",
          }}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
      </div>
    </button>
  );
}

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("home");
  const pathname = usePathname();
  const isHomePage = pathname === "/";
  const { theme, toggleTheme } = useTheme();

  const navLinks = [
    {
      name: "Home",
      href: "/#home",
      section: "home",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      )
    },
    {
      name: "About",
      href: "/#about",
      section: "about",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      )
    },
    {
      name: "GitHub",
      href: "/#github",
      section: "github",
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
        </svg>
      )
    },
    {
      name: "Experience",
      href: "/#experience",
      section: "experience",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
        </svg>
      )
    },
    {
      name: "Skills",
      href: "/#skills",
      section: "skills",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
        </svg>
      )
    },
    {
      name: "Projects",
      href: "/#projects",
      section: "projects",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
        </svg>
      )
    },
    {
      name: "Blog",
      href: "/#blog",
      section: "blog",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
        </svg>
      )
    },
    {
      name: "Achievement",
      href: "/#achievement",
      section: "achievement",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
        </svg>
      )
    },
    {
      name: "Services",
      href: "/#services",
      section: "services",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
      )
    },
    {
      name: "Contact",
      href: "/#contact",
      section: "contact",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
        </svg>
      )
    },
  ];

  // Track active section on homepage using Intersection Observer
  useEffect(() => {
    if (!isHomePage) return;

    const sections = ["home", "about", "github", "experience", "skills", "projects", "blog", "achievement", "services", "contact"];

    const observerOptions = {
      root: null,
      rootMargin: "-20% 0px -60% 0px",
      threshold: 0,
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    sections.forEach((sectionId) => {
      const element = document.getElementById(sectionId);
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [isHomePage]);

  // For homepage, use simple anchor links for smooth scrolling
  const getHref = (href: string) => {
    if (isHomePage && href.startsWith("/#")) {
      return href.replace("/", "");
    }
    return href;
  };

  // Handle smooth scroll for hash links
  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    // Extract section id from href (e.g., "/#blog" -> "blog" or "#blog" -> "blog")
    const sectionId = href.replace("/#", "").replace("#", "");
    const element = document.getElementById(sectionId);

    if (element) {
      e.preventDefault();
      // Calculate position with offset for fixed navbar (64px height + 16px padding)
      const navbarOffset = 80;
      const elementPosition = element.getBoundingClientRect().top + window.scrollY;
      const offsetPosition = elementPosition - navbarOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
      // Update URL hash without page reload
      window.history.pushState(null, "", `#${sectionId}`);
    }
  };

  // Check if a nav link is active
  const isActive = (link: typeof navLinks[0]) => {
    // On projects pages, highlight Projects link
    if (pathname.startsWith("/projects")) {
      return link.section === "projects";
    }
    // On homepage, highlight based on scroll position
    if (isHomePage) {
      return activeSection === link.section;
    }
    return false;
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50">
      {/* Navbar background with blur */}
      <div
        className="absolute inset-0 backdrop-blur-md"
        style={{
          backgroundColor: theme === "dark" ? "rgba(10, 10, 10, 0.8)" : "rgba(250, 248, 245, 0.85)",
          borderBottom: `1px solid ${theme === "dark" ? "rgba(38, 38, 38, 0.5)" : "rgba(232, 228, 220, 0.6)"}`,
        }}
      ></div>

      <div className="relative max-w-6xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Name */}
          <Link
            href="/"
            className="font-bold text-lg tracking-tight transition-all duration-300 hover:scale-105 active:scale-95"
            style={{ color: theme === "dark" ? "#ffffff" : "#171717" }}
          >
            Izzat<span style={{ color: theme === "dark" ? "#737373" : "#a3a3a3" }}>.</span>
          </Link>

          {/* Desktop Navigation - Centered with Icons */}
          <div
            className="hidden md:flex items-center gap-0.5 px-1.5 py-1 rounded-2xl border absolute left-1/2 -translate-x-1/2"
            style={{
              backgroundColor: theme === "dark" ? "rgba(10, 10, 10, 0.6)" : "rgba(250, 248, 245, 0.8)",
              borderColor: theme === "dark" ? "rgba(38, 38, 38, 0.8)" : "rgba(232, 228, 220, 0.8)",
            }}
          >
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={getHref(link.href)}
                onClick={(e) => isHomePage && handleNavClick(e, link.href)}
                className="relative p-2 rounded-xl transition-all duration-300 ease-out group hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
                style={{
                  color: isActive(link)
                    ? (theme === "dark" ? "#ffffff" : "#2d2a26")
                    : (theme === "dark" ? "#525252" : "#9c958a"),
                  backgroundColor: isActive(link)
                    ? (theme === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(45, 42, 38, 0.08)")
                    : "transparent",
                }}
                title={link.name}
              >
                <span className="transition-all duration-300 ease-out group-hover:scale-110 block">
                  {link.icon}
                </span>
                {/* Tooltip */}
                <span
                  className="absolute -bottom-9 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg text-xs font-medium tracking-wide whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none scale-95 group-hover:scale-100"
                  style={{
                    backgroundColor: theme === "dark" ? "#ffffff" : "#2d2a26",
                    color: theme === "dark" ? "#0a0a0a" : "#faf8f5",
                  }}
                >
                  {link.name}
                </span>
                {/* Active indicator */}
                {isActive(link) && (
                  <span
                    className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                    style={{ backgroundColor: theme === "dark" ? "#ffffff" : "#2d2a26" }}
                  />
                )}
              </Link>
            ))}
          </div>

          {/* Theme Toggle - Separate on the right */}
          <div className="hidden md:block transition-all duration-300 ease-out hover:scale-105 hover:-translate-y-0.5 active:scale-95 active:translate-y-0">
            <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden relative w-10 h-10 flex items-center justify-center group rounded-xl transition-all duration-300 ease-out hover:scale-105 active:scale-95"
            style={{
              backgroundColor: isMenuOpen
                ? (theme === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(45, 42, 38, 0.05)")
                : "transparent",
            }}
            aria-label="Toggle menu"
          >
            <div className="flex flex-col gap-1.5 transition-transform duration-300 group-hover:scale-110">
              <span
                className={`block w-5 h-px transition-all duration-300 ease-out ${
                  isMenuOpen ? "rotate-45 translate-y-[3.5px]" : ""
                }`}
                style={{ backgroundColor: theme === "dark" ? "#a3a3a3" : "#525252" }}
              ></span>
              <span
                className={`block w-5 h-px transition-all duration-300 ease-out ${
                  isMenuOpen ? "-rotate-45 -translate-y-[3.5px]" : ""
                }`}
                style={{ backgroundColor: theme === "dark" ? "#a3a3a3" : "#525252" }}
              ></span>
            </div>
          </button>
        </div>

        {/* Mobile Menu */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ${
            isMenuOpen ? "max-h-96 pb-6" : "max-h-0"
          }`}
        >
          <div
            className="flex flex-col gap-1 pt-4"
            style={{ borderTop: `1px solid ${theme === "dark" ? "rgba(38, 38, 38, 0.5)" : "rgba(232, 228, 220, 0.8)"}` }}
          >
            {navLinks.map((link, index) => (
              <Link
                key={link.name}
                href={getHref(link.href)}
                onClick={(e) => {
                  setIsMenuOpen(false);
                  if (isHomePage) handleNavClick(e, link.href);
                }}
                className="text-sm tracking-wide transition-all duration-300 ease-out flex items-center gap-3 py-2 px-3 rounded-xl hover:translate-x-1 active:scale-[0.98] group"
                style={{
                  color: isActive(link)
                    ? (theme === "dark" ? "#ffffff" : "#2d2a26")
                    : (theme === "dark" ? "#737373" : "#9c958a"),
                  backgroundColor: isActive(link)
                    ? (theme === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(45, 42, 38, 0.05)")
                    : "transparent",
                  animationDelay: `${index * 50}ms`,
                }}
              >
                {/* Icon */}
                <span className="w-5 h-5 flex-shrink-0 transition-transform duration-300 group-hover:scale-110">{link.icon}</span>
                <span className="font-medium">{link.name}</span>
              </Link>
            ))}

            {/* Theme Toggle for Mobile */}
            <div
              className="flex items-center justify-between pt-4 mt-2"
              style={{ borderTop: `1px solid ${theme === "dark" ? "rgba(38, 38, 38, 0.5)" : "rgba(229, 229, 229, 0.5)"}` }}
            >
              <span
                className="text-sm tracking-widest uppercase"
                style={{ color: theme === "dark" ? "#737373" : "#737373" }}
              >
                {theme === "dark" ? "Dark Mode" : "Light Mode"}
              </span>
              <ThemeToggle theme={theme} toggleTheme={toggleTheme} size="small" />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
