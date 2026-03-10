import { Navigate, useParams } from "react-router";
import { articleMap } from "virtual:blog-data";
import { BlogArticle } from "./components/BlogArticle.tsx";

export function BlogArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const article = slug ? articleMap[slug] : undefined;

  if (!article) return <Navigate to="/blog" replace />;

  return <BlogArticle meta={article.meta} contentHtml={article.contentHtml} />;
}
