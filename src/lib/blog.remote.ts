import * as v from 'valibot';
import { prerender } from '$app/server';
import blogsData from '$lib/data/blog.csv';
import { error } from '@sveltejs/kit';
import { formatMonth, parseTags } from '$lib/utils';

export interface Blog {
  id: number;
  slug: string;
  title: string;
  tease: string;
  excerpt: string;
  date: string;
  month: string;
  author: string[];
  tags: string[];
  hasMarkdown: boolean;
}

function parseAuthor(author: string): string[] {
  if (!author) return [];
  return author.split(',').map((a) =>
    a.trim().toLowerCase().split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  );
}

const blogs: Blog[] = (blogsData as any[])
  .filter((d) => !d.hide && d.slug)
  .map((d, i) => ({
    id: i + 1,
    slug: d.slug,
    title: d.title || 'Untitled',
    tease: d.tease || '',
    excerpt: d.excerpt || d.tease || '',
    date: d.date,
    month: formatMonth(d.date),
    author: parseAuthor(d.author),
    tags: parseTags(d.tags),
    hasMarkdown: d.content_type === 'markdown'
  }));

export const getBlogs = prerender(async () => {
  return blogs.toSorted((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
});

export const getBlog = prerender(v.string(), async (slug) => {
  const blog = blogs.find((d) => d.slug === slug);

  if (!blog) {
    error(404, 'Blog post not found');
  }

  let content = '';

  if (blog.hasMarkdown) {
    try {
      const markdownModule = await import(`$lib/blog/${slug}.md?raw`);
      content = markdownModule.default;
    } catch (e) {
      console.warn(`No markdown file found for ${slug}`);
    }
  }

  return { blog, content };
});
