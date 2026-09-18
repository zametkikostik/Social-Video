import type { Metadata } from 'next';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const APP = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

type Props = {
  params: Promise<{ slug: string }> | { slug: string };
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await Promise.resolve(params);
  try {
    const res = await fetch(`${API.replace(/\/$/, '')}/channels/${slug}`, {
      next: { revalidate: 120 },
    });
    if (!res.ok) return { title: 'Channel · Social-Video' };
    const ch = await res.json();
    const name = ch.name || slug;
    const description = (ch.description || name).slice(0, 200);
    const url = `${APP.replace(/\/$/, '')}/channel/${slug}`;
    return {
      title: `${name} · Social-Video`,
      description,
      openGraph: {
        title: name,
        description,
        url,
        siteName: 'Social-Video',
        images: ch.avatarUrl ? [{ url: ch.avatarUrl }] : undefined,
      },
      twitter: { card: 'summary', title: name, description },
      alternates: { canonical: url },
    };
  } catch {
    return { title: 'Channel · Social-Video' };
  }
}

export default function ChannelLayout({ children }: { children: React.ReactNode }) {
  return children;
}
