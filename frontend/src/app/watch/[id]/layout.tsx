import type { Metadata } from 'next';

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.API_URL ||
  'http://localhost:4000/api';
const APP =
  process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000';

type Props = {
  params: Promise<{ id: string }> | { id: string };
  children: React.ReactNode;
};

async function fetchVideo(id: string) {
  try {
    const res = await fetch(`${API.replace(/\/$/, '')}/videos/${id}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await Promise.resolve(params);
  const id = p.id;
  const video = await fetchVideo(id);
  if (!video) return { title: 'Video · Social-Video' };
  const title = video.title || 'Video';
  const description = (video.description || title).slice(0, 200);
  const thumb =
    video.thumbnailUrl || video.thumbnailKey || `${APP}/icons/icon-512.png`;
  const url = `${APP.replace(/\/$/, '')}/watch/${id}`;

  return {
    title: `${title} · Social-Video`,
    description,
    openGraph: {
      title,
      description,
      url,
      type: 'video.other',
      siteName: 'Social-Video',
      images: [{ url: thumb, width: 1280, height: 720, alt: title }],
      videos: video.hlsUrl
        ? [{ url: video.hlsUrl, type: 'application/x-mpegURL' }]
        : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [thumb],
    },
    alternates: { canonical: url },
  };
}

export default function WatchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
