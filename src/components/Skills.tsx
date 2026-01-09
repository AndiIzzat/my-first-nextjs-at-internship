"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FadeIn } from "@/components/PageTransition";

const skills = [
  {
    category: "Design",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
      </svg>
    ),
    items: [
      { name: "UI/UX Design", level: 90 },
      { name: "Graphic Design", level: 85 },
      { name: "Brand Identity", level: 80 },
      { name: "Prototyping", level: 75 },
    ],
  },
  {
    category: "Development",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
      </svg>
    ),
    items: [
      { name: "React", level: 85 },
      { name: "Next.js", level: 80 },
      { name: "TypeScript", level: 75 },
      { name: "Tailwind CSS", level: 90 },
    ],
  },
  {
    category: "Tools",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
      </svg>
    ),
    items: [
      { name: "Figma", level: 95 },
      { name: "Adobe Suite", level: 85 },
      { name: "VS Code", level: 90 },
      { name: "Git", level: 80 },
    ],
  },
];

export default function Skills() {
  const [hoveredSkill, setHoveredSkill] = useState<string | null>(null);

  return (
    <section id="skills" className="relative py-24 md:py-32">
      <div className="max-w-5xl mx-auto px-8 md:px-12">
        {/* Section Header */}
        <FadeIn delay={0}>
          <div className="mb-12">
            <span className="text-neutral-500 text-sm tracking-widest uppercase mb-3 block">
              My Expertise
            </span>
            <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
              Skills<span className="text-neutral-500">.</span>
            </h2>
          </div>
        </FadeIn>

        {/* Skills Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {skills.map((skillGroup, index) => (
            <motion.div
              key={skillGroup.category}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{
                duration: 0.5,
                delay: index * 0.15,
                ease: [0.25, 0.1, 0.25, 1],
              }}
              className="group relative p-8 rounded-2xl bg-neutral-900/50 border border-neutral-800 hover:border-neutral-700 transition-all duration-500 overflow-hidden"
            >
              {/* Glowing orb effect */}
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-white rounded-full blur-3xl opacity-0 group-hover:opacity-[0.03] transition-opacity duration-700"></div>

              <div className="relative z-10">
                {/* Icon */}
                <div className="w-14 h-14 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-400 group-hover:text-white group-hover:border-neutral-600 group-hover:bg-neutral-700 transition-all duration-300 mb-6">
                  {skillGroup.icon}
                </div>

                {/* Category Title */}
                <h3 className="text-xl font-semibold text-white mb-6">
                  {skillGroup.category}
                </h3>

                {/* Skill Items with animated bars */}
                <div className="space-y-4">
                  {skillGroup.items.map((skill, skillIndex) => (
                    <div
                      key={skill.name}
                      className="group/skill"
                      onMouseEnter={() => setHoveredSkill(skill.name)}
                      onMouseLeave={() => setHoveredSkill(null)}
                    >
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-neutral-400 text-sm group-hover/skill:text-white transition-colors duration-300">
                          {skill.name}
                        </span>
                        <span
                          className={`text-xs font-mono transition-all duration-300 ${
                            hoveredSkill === skill.name ? "text-white" : "text-neutral-600"
                          }`}
                        >
                          {skill.level}%
                        </span>
                      </div>
                      {/* Progress bar */}
                      <div className="h-1 bg-neutral-800 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-white rounded-full"
                          initial={{ width: 0 }}
                          whileInView={{ width: `${skill.level}%` }}
                          viewport={{ once: true }}
                          transition={{
                            duration: 1,
                            delay: index * 0.15 + skillIndex * 0.1 + 0.3,
                            ease: [0.25, 0.1, 0.25, 1],
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom line */}
              <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-neutral-700 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
