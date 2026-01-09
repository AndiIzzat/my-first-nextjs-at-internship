"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";
import { FadeIn } from "@/components/PageTransition";

interface PostMeta {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  tags: string[];
}

// Hardcoded posts data (since we can't use fs in client components)
const POSTS: PostMeta[] = [
  {
    slug: "building-portfolio-nextjs",
    title: "Building My Portfolio with Next.js",
    date: "2025-01-07",
    excerpt: "A technical deep dive into how I built this portfolio website using Next.js and modern web technologies.",
    tags: ["Next.js", "React", "Web Development"],
  },
  {
    slug: "my-design-journey",
    title: "My Journey as a Graphic Designer",
    date: "2025-01-05",
    excerpt: "How I started my journey in graphic design and what I've learned along the way.",
    tags: ["Design", "Personal", "Career"],
  },
];

export default function BlogSection() {
  const { theme } = useTheme();

  const colors = {
    bg: theme === "dark" ? "#0a0a0a" : "#fafafa",
    bgCard: theme === "dark" ? "#171717" : "#ffffff",
    border: theme === "dark" ? "#262626" : "#e8e4dc",
    text: theme === "dark" ? "#ffffff" : "#2d2a26",
    textMuted: theme === "dark" ? "#a3a3a3" : "#5c574e",
    textLabel: theme === "dark" ? "#737373" : "#8a857c",
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <section id="blog" className="relative py-24 md:py-32">
      <div className="max-w-5xl mx-auto px-8 md:px-12">
        {/* Section Header */}
        <FadeIn delay={0}>
          <div className="mb-12 flex justify-between items-end">
            <div>
              <span style={{ color: colors.textLabel }} className="text-sm tracking-widest uppercase mb-3 block">
                Latest Posts
              </span>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight" style={{ color: colors.text }}>
                Blog<span style={{ color: colors.textLabel }}>.</span>
              </h2>
            </div>
            <Link
              href="/blog"
              className="hidden md:flex items-center gap-2 text-sm transition-opacity hover:opacity-70"
              style={{ color: colors.textMuted }}
            >
              View all posts
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </FadeIn>

        {/* Posts Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {POSTS.map((post, index) => (
            <motion.article
              key={post.slug}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: index * 0.1, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <Link href={`/blog/${post.slug}`}>
                <div
                  className="group h-full p-6 rounded-2xl transition-all duration-300 hover:scale-[1.02]"
                  style={{
                    backgroundColor: colors.bgCard,
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  {/* Date */}
                  <span className="text-xs" style={{ color: colors.textLabel }}>
                    {formatDate(post.date)}
                  </span>

                  {/* Title */}
                  <h3
                    className="text-xl font-semibold mt-2 mb-2 group-hover:opacity-80 transition-opacity"
                    style={{ color: colors.text }}
                  >
                    {post.title}
                  </h3>

                  {/* Excerpt */}
                  <p className="text-sm line-clamp-2 mb-4" style={{ color: colors.textMuted }}>
                    {post.excerpt}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-full text-xs"
                        style={{
                          backgroundColor: colors.bg,
                          color: colors.textMuted,
                          border: `1px solid ${colors.border}`,
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Read more */}
                  <div className="mt-4 flex items-center gap-1 text-sm font-medium group-hover:gap-2 transition-all" style={{ color: colors.text }}>
                    Read more
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            </motion.article>
          ))}
        </div>

        {/* View All Link */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-8 text-center"
        >
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium transition-all duration-300 hover:scale-105"
            style={{
              backgroundColor: colors.bgCard,
              color: colors.text,
              border: `1px solid ${colors.border}`,
            }}
          >
            View all posts
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
