"use client";

import { FadeIn, ScaleIn } from "@/components/PageTransition";

export default function About() {
  return (
    <section id="about" className="relative py-24 md:py-32">
      <div className="max-w-5xl mx-auto px-8 md:px-12">
        {/* Section Header */}
        <FadeIn delay={0}>
          <div className="mb-12">
            <span className="text-neutral-500 text-sm tracking-widest uppercase mb-3 block">
              Get to know me
            </span>
            <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
              About<span className="text-neutral-500">.</span>
            </h2>
          </div>
        </FadeIn>

        {/* Bio */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <FadeIn delay={0.1}>
            <p className="text-neutral-400 text-lg leading-relaxed">
              I am a passionate creative professional based in Indonesia,
              dedicated to bridging the gap between imaginative design and robust
              development. With a keen eye for detail and a deep appreciation for
              clean, minimalist aesthetics, I strive to create digital experiences
              that are as intuitive as they are visually striking.
            </p>
          </FadeIn>
          <FadeIn delay={0.2}>
            <p className="text-neutral-400 text-lg leading-relaxed">
              My approach is rooted in the belief that a product&apos;s beauty should
              be matched by its functionality. By blending technical expertise
              with a user-centric design philosophy, I transform complex ideas
              into seamless, high-performance interfaces.
            </p>
          </FadeIn>
        </div>

        {/* Stats Bar */}
        <ScaleIn delay={0.3}>
          <div className="grid grid-cols-3 gap-6 py-8 px-6 bg-neutral-900/50 border border-neutral-800 rounded-2xl">
          <div className="group text-center">
            <div className="text-3xl md:text-4xl font-bold text-white group-hover:text-neutral-300 transition-colors duration-300">
              2+
            </div>
            <div className="text-neutral-500 text-sm tracking-widest uppercase mt-1">
              Years Exp
            </div>
          </div>
          <div className="group text-center border-x border-neutral-800">
            <div className="text-3xl md:text-4xl font-bold text-white group-hover:text-neutral-300 transition-colors duration-300">
              20+
            </div>
            <div className="text-neutral-500 text-sm tracking-widest uppercase mt-1">
              Projects
            </div>
          </div>
          <div className="group text-center">
            <div className="text-3xl md:text-4xl font-bold text-white group-hover:text-neutral-300 transition-colors duration-300">
              10+
            </div>
            <div className="text-neutral-500 text-sm tracking-widest uppercase mt-1">
              Clients
            </div>
          </div>
        </div>
        </ScaleIn>
      </div>
    </section>
  );
}
