"use client";

import { motion } from "framer-motion";
import { FadeIn } from "@/components/PageTransition";

const achievements = [
  {
    year: "2024",
    title: "Best UI/UX Design Award",
    organization: "Design Competition",
    description:
      "Recognized for creating an innovative and user-friendly mobile application interface that improved user engagement by 40%.",
    icon: "trophy",
  },
  {
    year: "2024",
    title: "Web Development Certification",
    organization: "Meta Professional Certificate",
    description:
      "Completed comprehensive front-end development program covering React, responsive design, and modern web technologies.",
    icon: "certificate",
  },
  {
    year: "2023",
    title: "Hackathon Finalist",
    organization: "TechFest Indonesia",
    description:
      "Reached finals in national hackathon with a team project focused on sustainable technology solutions.",
    icon: "code",
  },
  {
    year: "2023",
    title: "Dean's List",
    organization: "Academic Excellence",
    description:
      "Achieved academic excellence with outstanding GPA, demonstrating strong commitment to learning and growth.",
    icon: "academic",
  },
];

const iconComponents = {
  trophy: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
  certificate: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
    </svg>
  ),
  code: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  ),
  academic: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
    </svg>
  ),
};

export default function Achievement() {
  return (
    <section id="achievement" className="relative py-24 md:py-32">
      <div className="max-w-5xl mx-auto px-8 md:px-12">
        {/* Section Header */}
        <FadeIn delay={0}>
          <div className="mb-12">
            <span className="text-neutral-500 text-sm tracking-widest uppercase mb-3 block">
              Recognition & Awards
            </span>
            <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
              Achievement<span className="text-neutral-500">.</span>
            </h2>
          </div>
        </FadeIn>

        {/* Achievement Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {achievements.map((achievement, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{
                duration: 0.5,
                delay: index * 0.1,
                ease: [0.25, 0.1, 0.25, 1],
              }}
              className="group relative p-6 rounded-2xl bg-neutral-900/50 border border-neutral-800 hover:border-neutral-700 transition-all duration-500 hover:bg-neutral-900/80"
            >
              {/* Year Badge */}
              <div className="absolute top-4 right-4">
                <span className="text-xs font-medium text-neutral-600 tracking-wider">
                  {achievement.year}
                </span>
              </div>

              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center mb-4 text-neutral-400 group-hover:text-white group-hover:border-neutral-600 transition-all duration-300">
                {iconComponents[achievement.icon as keyof typeof iconComponents]}
              </div>

              {/* Content */}
              <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-neutral-200 transition-colors">
                {achievement.title}
              </h3>
              <p className="text-neutral-500 text-sm mb-3">{achievement.organization}</p>
              <p className="text-neutral-400 text-sm leading-relaxed">
                {achievement.description}
              </p>

              {/* Hover Glow Effect */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            </motion.div>
          ))}
        </div>

        {/* Bottom Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{
            duration: 0.5,
            delay: 0.4,
            ease: [0.25, 0.1, 0.25, 1],
          }}
          className="mt-12 flex flex-wrap justify-center gap-8 md:gap-16"
        >
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold text-white">4+</div>
            <div className="text-neutral-500 text-sm tracking-widest uppercase mt-1">
              Awards
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold text-white">3+</div>
            <div className="text-neutral-500 text-sm tracking-widest uppercase mt-1">
              Certifications
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold text-white">2+</div>
            <div className="text-neutral-500 text-sm tracking-widest uppercase mt-1">
              Competitions
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
