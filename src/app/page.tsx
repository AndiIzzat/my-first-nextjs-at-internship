"use client";

import Image from "next/image";
import Navbar from "@/components/Navbar";
import About from "@/components/About";
import Skills from "@/components/Skills";
import Services from "@/components/Services";
import Projects from "@/components/Projects";
import Experience from "@/components/Experience";
import Achievement from "@/components/Achievement";
import Contact from "@/components/Contact";
import GitHubStats from "@/components/GitHubStats";
import BlogSection from "@/components/BlogSection";
import ChatWidget from "@/components/ChatWidget";
import SpotifyWidget from "@/components/SpotifyWidget";
import LoadingScreen from "@/components/LoadingScreen";
import BackToTop from "@/components/BackToTop";
import { FadeIn, ScaleIn } from "@/components/PageTransition";
import { useTypewriter } from "@/hooks/useScrollAnimation";
import { useTheme } from "@/context/ThemeContext";

export default function Home() {
  const typedText = useTypewriter(
    ["Graphic Designer", "Front-End Developer", "UI/UX Enthusiast", "Creative Thinker"],
    80,
    40,
    2500
  );
  const { theme } = useTheme();

  return (
    <div className="min-h-screen bg-neutral-950">
      {/* Loading Screen */}
      <LoadingScreen />

      {/* Navbar */}
      <Navbar />

      {/* Subtle grid background - fixed across all sections */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] pointer-events-none"></div>

      {/* Gradient overlay */}
      <div className="fixed inset-0 bg-gradient-to-b from-neutral-950 via-transparent to-neutral-950 pointer-events-none"></div>

      {/* Hero Section */}
      <section
        id="home"
        className="relative z-10 min-h-screen flex items-center justify-center p-6"
      >
        <main className="w-full max-w-4xl pt-16">
          {/* Horizontal layout */}
          <div className="flex flex-col md:flex-row items-center gap-12 md:gap-16">
            {/* Left side - Photo */}
            <ScaleIn delay={0.2}>
              <div className="flex-shrink-0">
                <div className="relative group">
                  {/* Outer glow */}
                  <div className="absolute -inset-1 bg-gradient-to-br from-neutral-700 to-neutral-800 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-500"></div>

                  {/* Photo container */}
                  <div className="relative w-48 h-48 md:w-64 md:h-64 rounded-2xl bg-neutral-900 border border-neutral-800 overflow-hidden">
                    <Image
                      src="/profile2.jpeg"
                      alt="A. Izzat Shafran Ashari"
                      fill
                      className="object-cover"
                      priority
                    />
                  </div>

                  {/* Status badge */}
                  <div
                    className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-xs tracking-wide flex items-center gap-2 border"
                    style={{
                      backgroundColor: theme === "dark" ? "#171717" : "#ffffff",
                      borderColor: theme === "dark" ? "#262626" : "#e8e4dc",
                      color: theme === "dark" ? "#a3a3a3" : "#5c574e",
                    }}
                  >
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    Available for work
                  </div>
                </div>
              </div>
            </ScaleIn>

            {/* Right side - Content */}
            <div className="flex flex-col text-center md:text-left">
              {/* Small label */}
              <FadeIn delay={0.3}>
                <span className="text-neutral-500 text-sm tracking-widest uppercase mb-3 block">
                  Hello, I am
                </span>
              </FadeIn>

              {/* Name */}
              <FadeIn delay={0.4}>
                <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 tracking-tight leading-tight">
                  A. Izzat
                  <br />
                  <span className="text-neutral-400">Shafran Ashari</span>
                </h1>
              </FadeIn>

              {/* Typing effect role */}
              <FadeIn delay={0.5}>
                <div className="h-8 mb-6 flex items-center justify-center md:justify-start">
                  <span
                    className="text-lg font-medium"
                    style={{ color: theme === "dark" ? "#ffffff" : "#2d2a26" }}
                  >
                    {typedText}
                  </span>
                  <span
                    className="w-0.5 h-6 ml-1 animate-pulse"
                    style={{ backgroundColor: theme === "dark" ? "#ffffff" : "#2d2a26" }}
                  ></span>
                </div>
              </FadeIn>

              {/* Divider line */}
              <FadeIn delay={0.6}>
                <div className="w-16 h-px bg-neutral-700 mb-6 mx-auto md:mx-0"></div>
              </FadeIn>

              {/* Paragraph */}
              <FadeIn delay={0.7}>
                <p className="text-neutral-400 text-lg leading-relaxed max-w-md">
                  I&apos;m a graphic designer and front-end developer with a strong eye
                  for aesthetics and detail. I enjoy creating visually appealing
                  and meaningful digital experiences that combine design and
                  functionality.
                </p>
              </FadeIn>

              {/* CTA Buttons */}
              <FadeIn delay={0.8}>
                <div className="mt-8 flex flex-wrap gap-4 justify-center md:justify-start">
                  <a
                    href="#contact"
                    className="px-6 py-3 rounded-full text-sm tracking-wide transition-all duration-300 hover:scale-105"
                    style={{
                      backgroundColor: theme === "dark" ? "#ffffff" : "#2d2a26",
                      color: theme === "dark" ? "#171717" : "#faf8f5",
                    }}
                  >
                    Get in Touch
                  </a>
                  <a
                    href="#projects"
                    className="px-6 py-3 rounded-full text-sm tracking-wide border transition-all duration-300 hover:scale-105"
                    style={{
                      borderColor: theme === "dark" ? "#404040" : "#ddd8ce",
                      color: theme === "dark" ? "#ffffff" : "#2d2a26",
                    }}
                  >
                    View Projects
                  </a>
                </div>
              </FadeIn>

              {/* Minimal footer info */}
              <FadeIn delay={0.9}>
                <div className="mt-8 flex items-center gap-6 text-sm text-neutral-600 justify-center md:justify-start">
                  <span>Intern | Ashari Tech</span>
                  <span className="w-1 h-1 rounded-full bg-neutral-700"></span>
                  <span>Based in Indonesia</span>
                </div>
              </FadeIn>
            </div>
          </div>

        </main>
      </section>

      {/* About Section */}
      <About />

      {/* GitHub Stats Section */}
      <GitHubStats />

      {/* Experience Section */}
      <Experience />

      {/* Skills Section */}
      <Skills />

      {/* Projects Section */}
      <Projects />

      {/* Blog Section */}
      <BlogSection />

      {/* Achievement Section */}
      <Achievement />

      {/* Services Section */}
      <Services />

      {/* Contact Section */}
      <Contact />

      {/* Chat Widget */}
      <ChatWidget />

      {/* Spotify Widget */}
      <SpotifyWidget />

      {/* Back to Top Button */}
      <BackToTop />
    </div>
  );
}
