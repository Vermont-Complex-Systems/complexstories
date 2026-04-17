import * as v from 'valibot';
import { prerender } from '$app/server';
import membersData from '$lib/data/members.csv';
import storiesData from '$lib/data/stories.csv';
import { error, redirect } from '@sveltejs/kit';
import { formatMonth, parseTags } from '$lib/utils';

// MEMBERS

export const getMembers = prerender(async () => {
    return membersData
});

export const getMember = prerender(
    v.string(),
    async (slug) => {
        return membersData.find(d => d.id == slug)
    }
);

// STORIES

export interface Story {
  slug: string;
  title: string;
  description: string;
  author: string;
  date: string;
  month: string;
  externalUrl: string;
  tags: string[];
  level: string;
}

const stories: Story[] = (storiesData as any[]).map((d) => ({
  ...d,
  month: formatMonth(d.date),
  tags: parseTags(d.tags, true)
}));

// Glob for copy data - eager since it's small JSON
// https://vite.dev/guide/features#glob-import
const copyModules = import.meta.glob<{ default: Record<string, unknown> }>(
  '$lib/stories/*/data/copy.json',
  { eager: true }
);

// Query for getting all stories (sorted newest first)
export const getStories = prerender(async () => {
  return stories
    .toSorted((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
});

// Query for getting a single story by slug
export const getStory = prerender(v.string(), async (slug) => {
  const story = stories.find(d => d.slug === slug);

  if (!story) {
    error(404, 'Story not found');
  }

  // If it has an external URL, redirect to it
  if (story.externalUrl) {
    redirect(302, story.externalUrl);
  }

  // Load copy data using glob
  const copyPath = `/src/lib/stories/${slug}/data/copy.json`;
  const copyData = copyModules[copyPath]?.default ?? {};

  return { story, copyData };
});
