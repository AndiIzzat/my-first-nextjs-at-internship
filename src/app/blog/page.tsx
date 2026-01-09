import Link from "next/link";
import { getAllPosts } from "@/lib/mdx";
import BlogList from "./BlogList";

export const metadata = {
  title: "Blog | Izzat Shafran",
  description: "Thoughts on design, development, and creativity",
};

export default function BlogPage() {
  const posts = getAllPosts();

  return <BlogList posts={posts} />;
}
