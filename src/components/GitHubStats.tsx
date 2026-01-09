"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";
import { FadeIn } from "@/components/PageTransition";

interface GitHubUser {
  login: string;
  avatar_url: string;
  public_repos: number;
  followers: number;
  following: number;
  html_url: string;
}

interface GitHubRepo {
  stargazers_count: number;
  language: string | null;
  fork: boolean;
}

interface GitHubStats {
  user: GitHubUser | null;
  totalStars: number;
  topLanguages: { name: string; count: number }[];
  loading: boolean;
  error: string | null;
}

const GITHUB_USERNAME = "AndiIzzat";

export default function GitHubStats() {
  const { theme } = useTheme();
  const [stats, setStats] = useState<GitHubStats>({
    user: null,
    totalStars: 0,
    topLanguages: [],
    loading: true,
    error: null,
  });

  const colors = {
    bg: theme === "dark" ? "#171717" : "#ffffff",
    bgCard: theme === "dark" ? "#0a0a0a" : "#fafafa",
    border: theme === "dark" ? "#262626" : "#e5e5e5",
    text: theme === "dark" ? "#ffffff" : "#171717",
    textMuted: theme === "dark" ? "#a3a3a3" : "#525252",
    textLabel: theme === "dark" ? "#737373" : "#737373",
    accent: theme === "dark" ? "#ffffff" : "#171717",
  };

  useEffect(() => {
    const fetchGitHubData = async () => {
      try {
        // Fetch user data
        const userRes = await fetch(`https://api.github.com/users/${GITHUB_USERNAME}`);
        if (!userRes.ok) throw new Error("Failed to fetch user data");
        const userData: GitHubUser = await userRes.json();

        // Fetch repos
        const reposRes = await fetch(`https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100`);
        if (!reposRes.ok) throw new Error("Failed to fetch repos");
        const reposData: GitHubRepo[] = await reposRes.json();

        // Calculate total stars (excluding forks)
        const totalStars = reposData
          .filter((repo) => !repo.fork)
          .reduce((sum, repo) => sum + repo.stargazers_count, 0);

        // Calculate top languages
        const languageCounts: Record<string, number> = {};
        reposData.forEach((repo) => {
          if (repo.language && !repo.fork) {
            languageCounts[repo.language] = (languageCounts[repo.language] || 0) + 1;
          }
        });

        const topLanguages = Object.entries(languageCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 4)
          .map(([name, count]) => ({ name, count }));

        setStats({
          user: userData,
          totalStars,
          topLanguages,
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error("GitHub API Error:", error);
        setStats((prev) => ({
          ...prev,
          loading: false,
          error: "Failed to load GitHub stats",
        }));
      }
    };

    fetchGitHubData();
  }, []);

  if (stats.loading) {
    return (
      <section id="github" className="relative py-24 md:py-32">
        <div className="max-w-5xl mx-auto px-8 md:px-12">
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: colors.border, borderTopColor: "transparent" }} />
          </div>
        </div>
      </section>
    );
  }

  if (stats.error || !stats.user) {
    return null;
  }

  const statItems = [
    { label: "Repositories", value: stats.user.public_repos },
    { label: "Followers", value: stats.user.followers },
    { label: "Following", value: stats.user.following },
    { label: "Total Stars", value: stats.totalStars },
  ];

  return (
    <section id="github" className="relative py-24 md:py-32">
      <div className="max-w-5xl mx-auto px-8 md:px-12">
        {/* Section Header */}
        <FadeIn delay={0}>
          <div className="mb-12">
            <span style={{ color: colors.textLabel }} className="text-sm tracking-widest uppercase mb-3 block">
              Open Source
            </span>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight" style={{ color: colors.text }}>
              GitHub<span style={{ color: colors.textLabel }}>.</span>
            </h2>
          </div>
        </FadeIn>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Profile Card */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
            className="p-6 rounded-2xl"
            style={{ backgroundColor: colors.bgCard, border: `1px solid ${colors.border}` }}
          >
            <div className="flex items-center gap-4 mb-6">
              <img
                src={stats.user.avatar_url}
                alt={stats.user.login}
                className="w-16 h-16 rounded-full"
                style={{ border: `2px solid ${colors.border}` }}
              />
              <div>
                <h3 className="text-xl font-semibold" style={{ color: colors.text }}>
                  @{stats.user.login}
                </h3>
                <a
                  href={stats.user.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm hover:underline"
                  style={{ color: colors.textMuted }}
                >
                  View Profile
                </a>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              {statItems.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="p-4 rounded-xl text-center"
                  style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}` }}
                >
                  <div className="text-2xl font-bold" style={{ color: colors.text }}>
                    {stat.value}
                  </div>
                  <div className="text-xs uppercase tracking-wider" style={{ color: colors.textMuted }}>
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Languages Card */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
            className="p-6 rounded-2xl"
            style={{ backgroundColor: colors.bgCard, border: `1px solid ${colors.border}` }}
          >
            <h3 className="text-lg font-semibold mb-6" style={{ color: colors.text }}>
              Top Languages
            </h3>

            <div className="space-y-4">
              {stats.topLanguages.map((lang, index) => {
                const maxCount = stats.topLanguages[0]?.count || 1;
                const percentage = (lang.count / maxCount) * 100;

                return (
                  <motion.div
                    key={lang.name}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium" style={{ color: colors.text }}>
                        {lang.name}
                      </span>
                      <span className="text-sm" style={{ color: colors.textMuted }}>
                        {lang.count} repos
                      </span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: colors.border }}>
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: colors.accent }}
                        initial={{ width: 0 }}
                        whileInView={{ width: `${percentage}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* GitHub Contribution Graph (using GitHub readme stats) */}
            <div className="mt-6 pt-6" style={{ borderTop: `1px solid ${colors.border}` }}>
              <a
                href={`https://github.com/${GITHUB_USERNAME}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-300 hover:scale-[1.02]"
                style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}`, color: colors.text }}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                View Full Profile
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
