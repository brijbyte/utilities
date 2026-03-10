import { articles } from "virtual:blog-data";
import { BlogIndex } from "./components/BlogIndex.tsx";

export function BlogIndexPage() {
  return <BlogIndex articles={articles} />;
}
