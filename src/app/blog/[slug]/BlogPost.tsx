"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { MDXRemote } from "next-mdx-remote/rsc";
import { useTheme } from "@/context/ThemeContext";
import Navbar from "@/components/Navbar";
import BackToTop from "@/components/BackToTop";
import { Post } from "@/lib/mdx";

interface BlogPostProps {
  post: Post;
}

export default function BlogPost({ post }: BlogPostProps) {
  const { theme } = useTheme();

  const colors = {
    bg: theme === "dark" ? "#0a0a0a" : "#faf8f5",
    bgCard: theme === "dark" ? "#171717" : "#ffffff",
    border: theme === "dark" ? "#262626" : "#e8e4dc",
    text: theme === "dark" ? "#ffffff" : "#2d2a26",
    textMuted: theme === "dark" ? "#a3a3a3" : "#5c574e",
    textLabel: theme === "dark" ? "#737373" : "#8a857c",
    accent: theme === "dark" ? "#ffffff" : "#2d2a26",
    codeBg: theme === "dark" ? "#0a0a0a" : "#f5f5f5",
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Custom MDX components
  const components = {
    h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
      <h1 className="text-3xl font-bold mt-8 mb-4" style={{ color: colors.text }} {...props} />
    ),
    h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
      <h2 className="text-2xl font-semibold mt-8 mb-4" style={{ color: colors.text }} {...props} />
    ),
    h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
      <h3 className="text-xl font-semibold mt-6 mb-3" style={{ color: colors.text }} {...props} />
    ),
    p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
      <p className="mb-4 leading-relaxed" style={{ color: colors.textMuted }} {...props} />
    ),
    ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
      <ul className="list-disc list-inside mb-4 space-y-2" style={{ color: colors.textMuted }} {...props} />
    ),
    ol: (props: React.HTMLAttributes<HTMLOListElement>) => (
      <ol className="list-decimal list-inside mb-4 space-y-2" style={{ color: colors.textMuted }} {...props} />
    ),
    li: (props: React.HTMLAttributes<HTMLLIElement>) => (
      <li className="ml-4" {...props} />
    ),
    a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
      <a className="underline hover:opacity-70 transition-opacity" style={{ color: colors.accent }} {...props} />
    ),
    blockquote: (props: React.HTMLAttributes<HTMLQuoteElement>) => (
      <blockquote
        className="border-l-4 pl-4 my-4 italic"
        style={{ borderColor: colors.border, color: colors.textMuted }}
        {...props}
      />
    ),
    code: (props: React.HTMLAttributes<HTMLElement>) => (
      <code
        className="px-1.5 py-0.5 rounded text-sm font-mono"
        style={{ backgroundColor: colors.codeBg, color: colors.text }}
        {...props}
      />
    ),
    pre: (props: React.HTMLAttributes<HTMLPreElement>) => (
      <pre
        className="p-4 rounded-xl overflow-x-auto mb-4 text-sm"
        style={{ backgroundColor: colors.codeBg, border: `1px solid ${colors.border}` }}
        {...props}
      />
    ),
    hr: () => <hr className="my-8" style={{ borderColor: colors.border }} />,
    img: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
      <img className="rounded-xl my-4 max-w-full" {...props} />
    ),
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.bg }}>
      <Navbar />

      {/* Subtle grid background */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(${theme === "dark" ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)"} 1px, transparent 1px), linear-gradient(90deg, ${theme === "dark" ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)"} 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
        }}
      />

      <main className="relative z-10 pt-32 pb-24 px-6">
        <article className="max-w-3xl mx-auto">
          {/* Back link */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-sm mb-8 transition-opacity hover:opacity-70"
              style={{ color: colors.textMuted }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Blog
            </Link>
          </motion.div>

          {/* Header */}
          <motion.header
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-8"
          >
            {/* Date */}
            <span className="text-sm" style={{ color: colors.textLabel }}>
              {formatDate(post.date)}
            </span>

            {/* Title */}
            <h1 className="text-3xl md:text-4xl font-bold mt-2 mb-4" style={{ color: colors.text }}>
              {post.title}
            </h1>

            {/* Tags */}
            {post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 rounded-full text-xs"
                    style={{
                      backgroundColor: colors.bgCard,
                      color: colors.textMuted,
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </motion.header>

          {/* Divider */}
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="h-px mb-8 origin-left"
            style={{ backgroundColor: colors.border }}
          />

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="prose prose-lg max-w-none"
          >
            <MDXRemote source={post.content} components={components} />
          </motion.div>

          {/* Footer */}
          <motion.footer
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mt-12 pt-8"
            style={{ borderTop: `1px solid ${colors.border}` }}
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
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              More Posts
            </Link>
          </motion.footer>
        </article>
      </main>

      <BackToTop />
    </div>
  );
}
