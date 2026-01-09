"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";
import { FadeIn } from "@/components/PageTransition";
import emailjs from "@emailjs/browser";

const socialLinks = [
  {
    name: "Email",
    href: "mailto:andiifran25@gmail.com",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    name: "GitHub",
    href: "https://github.com/AndiIzzat",
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
      </svg>
    ),
  },
  {
    name: "LinkedIn",
    href: "https://www.linkedin.com/in/andi-izzat-7329b630a/",
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
      </svg>
    ),
  },
  {
    name: "Instagram",
    href: "https://www.instagram.com/izzat.shafran/",
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
    ),
  },
];

export default function Contact() {
  const { theme } = useTheme();
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const colors = {
    bg: theme === "dark" ? "#171717" : "#ffffff",
    bgInput: theme === "dark" ? "#0a0a0a" : "#f5f5f5",
    border: theme === "dark" ? "#262626" : "#e5e5e5",
    borderFocus: theme === "dark" ? "#525252" : "#a3a3a3",
    text: theme === "dark" ? "#ffffff" : "#171717",
    textMuted: theme === "dark" ? "#a3a3a3" : "#525252",
    textLabel: theme === "dark" ? "#737373" : "#737373",
    placeholder: theme === "dark" ? "#525252" : "#a3a3a3",
    buttonBg: theme === "dark" ? "#ffffff" : "#171717",
    buttonText: theme === "dark" ? "#171717" : "#ffffff",
    buttonHover: theme === "dark" ? "#e5e5e5" : "#404040",
    success: "#22c55e",
    error: "#ef4444",
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus("idle");

    try {
      // Send email using EmailJS
      await emailjs.send(
        process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID!,
        process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID!,
        {
          from_name: formState.name,
          from_email: formState.email,
          message: formState.message,
          to_name: "Izzat",
        },
        process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY!
      );

      setSubmitStatus("success");
      setFormState({ name: "", email: "", message: "" });
    } catch (error) {
      console.error("EmailJS Error:", error);
      setSubmitStatus("error");
    }

    setIsSubmitting(false);

    // Reset status after 5 seconds
    setTimeout(() => setSubmitStatus("idle"), 5000);
  };

  return (
    <section id="contact" className="relative py-24 md:py-32">
      <div className="max-w-5xl mx-auto px-8 md:px-12">
        {/* Success Toast */}
        <div
          className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 px-6 py-4 rounded-xl flex items-center gap-3 transition-all duration-500 ${
            submitStatus === "success"
              ? "opacity-100 translate-y-0"
              : "opacity-0 -translate-y-4 pointer-events-none"
          }`}
          style={{
            backgroundColor: colors.bg,
            border: `1px solid ${colors.success}`,
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: colors.success }}
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="font-medium" style={{ color: colors.text }}>Message sent!</p>
            <p className="text-sm" style={{ color: colors.textMuted }}>I&apos;ll get back to you soon.</p>
          </div>
        </div>

        {/* Error Toast */}
        <div
          className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 px-6 py-4 rounded-xl flex items-center gap-3 transition-all duration-500 ${
            submitStatus === "error"
              ? "opacity-100 translate-y-0"
              : "opacity-0 -translate-y-4 pointer-events-none"
          }`}
          style={{
            backgroundColor: colors.bg,
            border: `1px solid ${colors.error}`,
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: colors.error }}
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div>
            <p className="font-medium" style={{ color: colors.text }}>Failed to send!</p>
            <p className="text-sm" style={{ color: colors.textMuted }}>Please try again later.</p>
          </div>
        </div>

        {/* Section Header */}
        <FadeIn delay={0}>
          <div className="mb-12 text-center">
            <span style={{ color: colors.textLabel }} className="text-sm tracking-widest uppercase mb-3 block">
              Get In Touch
            </span>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4" style={{ color: colors.text }}>
              Contact<span style={{ color: colors.textLabel }}>.</span>
            </h2>
            <p style={{ color: colors.textMuted }} className="max-w-lg mx-auto">
              Have a project in mind or just want to say hello? Feel free to reach out.
              I&apos;m always open to discussing new opportunities.
            </p>
          </div>
        </FadeIn>

        <div className="grid md:grid-cols-2 gap-12 md:gap-16">
          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{
              duration: 0.5,
              delay: 0.1,
              ease: [0.25, 0.1, 0.25, 1],
            }}
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name Input */}
              <div className="group">
                <label
                  htmlFor="name"
                  className="block text-sm tracking-widest uppercase mb-2 transition-colors duration-300"
                  style={{ color: focusedField === "name" ? colors.text : colors.textLabel }}
                >
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={formState.name}
                  onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                  onFocus={() => setFocusedField("name")}
                  onBlur={() => setFocusedField(null)}
                  required
                  className="w-full px-4 py-3 rounded-xl transition-all duration-300 focus:outline-none"
                  style={{
                    backgroundColor: colors.bgInput,
                    border: `1px solid ${focusedField === "name" ? colors.borderFocus : colors.border}`,
                    color: colors.text,
                  }}
                  placeholder="Your name"
                />
              </div>

              {/* Email Input */}
              <div className="group">
                <label
                  htmlFor="email"
                  className="block text-sm tracking-widest uppercase mb-2 transition-colors duration-300"
                  style={{ color: focusedField === "email" ? colors.text : colors.textLabel }}
                >
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={formState.email}
                  onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                  required
                  className="w-full px-4 py-3 rounded-xl transition-all duration-300 focus:outline-none"
                  style={{
                    backgroundColor: colors.bgInput,
                    border: `1px solid ${focusedField === "email" ? colors.borderFocus : colors.border}`,
                    color: colors.text,
                  }}
                  placeholder="your@email.com"
                />
              </div>

              {/* Message Input */}
              <div className="group">
                <label
                  htmlFor="message"
                  className="block text-sm tracking-widest uppercase mb-2 transition-colors duration-300"
                  style={{ color: focusedField === "message" ? colors.text : colors.textLabel }}
                >
                  Message
                </label>
                <textarea
                  id="message"
                  rows={5}
                  value={formState.message}
                  onChange={(e) => setFormState({ ...formState, message: e.target.value })}
                  onFocus={() => setFocusedField("message")}
                  onBlur={() => setFocusedField(null)}
                  required
                  className="w-full px-4 py-3 rounded-xl transition-all duration-300 focus:outline-none resize-none"
                  style={{
                    backgroundColor: colors.bgInput,
                    border: `1px solid ${focusedField === "message" ? colors.borderFocus : colors.border}`,
                    color: colors.text,
                  }}
                  placeholder="Tell me about your project..."
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="group w-full py-4 px-8 font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  backgroundColor: colors.buttonBg,
                  color: colors.buttonText,
                }}
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="animate-spin w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <span>Send Message</span>
                    <svg
                      className="w-5 h-5 transform group-hover:translate-x-1 transition-transform duration-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                      />
                    </svg>
                  </>
                )}
              </button>
            </form>
          </motion.div>

          {/* Contact Info */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{
              duration: 0.5,
              delay: 0.2,
              ease: [0.25, 0.1, 0.25, 1],
            }}
          >
            <div className="space-y-8">
              {/* Email */}
              <div className="group">
                <span style={{ color: colors.textLabel }} className="text-sm tracking-widest uppercase block mb-2">
                  Email
                </span>
                <a
                  href="mailto:andiifran25@gmail.com"
                  className="text-xl transition-colors duration-300 hover:opacity-70"
                  style={{ color: colors.text }}
                >
                  andiifran25@gmail.com
                </a>
              </div>

              {/* Location */}
              <div className="group">
                <span style={{ color: colors.textLabel }} className="text-sm tracking-widest uppercase block mb-2">
                  Location
                </span>
                <p className="text-xl" style={{ color: colors.text }}>Indonesia</p>
              </div>

              {/* Availability */}
              <div className="group">
                <span style={{ color: colors.textLabel }} className="text-sm tracking-widest uppercase block mb-2">
                  Availability
                </span>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  <p className="text-xl" style={{ color: colors.text }}>Open for opportunities</p>
                </div>
              </div>

              {/* Divider */}
              <div className="w-16 h-px" style={{ backgroundColor: colors.border }}></div>

              {/* Social Links */}
              <div>
                <span style={{ color: colors.textLabel }} className="text-sm tracking-widest uppercase block mb-4">
                  Follow Me
                </span>
                <div className="flex gap-4">
                  {socialLinks.map((social, index) => (
                    <motion.a
                      key={social.name}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{
                        duration: 0.3,
                        delay: 0.3 + index * 0.1,
                        ease: "easeOut",
                      }}
                      className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 hover:-translate-y-1 hover:scale-110"
                      style={{
                        backgroundColor: colors.bgInput,
                        border: `1px solid ${colors.border}`,
                        color: colors.textMuted,
                      }}
                      aria-label={social.name}
                    >
                      {social.icon}
                    </motion.a>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{
            duration: 0.5,
            delay: 0.3,
            ease: [0.25, 0.1, 0.25, 1],
          }}
          className="mt-24 pt-8 flex flex-col md:flex-row justify-between items-center gap-4"
          style={{ borderTop: `1px solid ${colors.border}` }}
        >
          <p className="text-sm" style={{ color: colors.textMuted }}>
            &copy; {new Date().getFullYear()} A. Izzat Shafran Ashari. All rights reserved.
          </p>
          <p className="text-sm" style={{ color: colors.textLabel }}>
            Designed & Built with Next.js
          </p>
        </motion.div>
      </div>
    </section>
  );
}
