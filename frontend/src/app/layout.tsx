import type { Metadata, Viewport } from 'next';
import './globals.css';
import PwaRegister from '@/components/PwaRegister';

export const metadata: Metadata = {
  title: 'Social-Video — Open Source Video Platform',
  description:
    'Self-hosted social video hosting with Cloudflare R2, Live, Shorts and more. AGPLv3.',
  applicationName: 'Social-Video',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Social-Video',
  },
  formatDetection: { telephone: false },
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#09090b' },
    { media: '(prefers-color-scheme: light)', color: '#e11d48' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-screen antialiased bg-zinc-950 text-zinc-100">
        <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4">
            <a href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight flex-shrink-0">
              <span className="text-brand-500">▶</span>
              <span>Social-Video</span>
            </a>
            <form action="/search" method="get" className="hidden sm:flex flex-1 max-w-md mx-4">
              <input
                type="search"
                name="q"
                placeholder="Поиск..."
                className="w-full rounded-full border border-zinc-700 bg-zinc-900 px-4 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
              />
            </form>
            <nav className="flex items-center gap-3 text-sm text-zinc-400 flex-shrink-0">
              <a href="/search" className="sm:hidden hover:text-white transition">🔍</a>
              <a href="/live" className="hover:text-white transition">Live</a>
              <a href="/shorts" className="hover:text-white transition">Shorts</a>
              <a href="/upload" className="hover:text-white transition hidden sm:inline">Загрузить</a>
              <a href="/playlists" className="hover:text-white transition hidden sm:inline">Плейлисты</a>
              <a href="/tips" className="hover:text-white transition hidden sm:inline" title="Донаты">☕</a>
              <a href="/notifications" className="hover:text-white transition" title="Уведомления">🔔</a>
              <a href="/auth/login" className="rounded-full bg-brand-600 px-4 py-1.5 text-white hover:bg-brand-500 transition">Войти</a>
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 pb-20 sm:pb-6">{children}</main>

        <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-zinc-800 bg-zinc-950/95 backdrop-blur sm:hidden">
          <a href="/" className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] text-zinc-400 hover:text-white">
            <span className="text-lg">🏠</span>Главная
          </a>
          <a href="/shorts" className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] text-zinc-400 hover:text-white">
            <span className="text-lg">📱</span>Shorts
          </a>
          <a href="/upload" className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] text-brand-500">
            <span className="text-lg">➕</span>Upload
          </a>
          <a href="/live" className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] text-zinc-400 hover:text-white">
            <span className="text-lg">📡</span>Live
          </a>
          <a href="/notifications" className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] text-zinc-400 hover:text-white">
            <span className="text-lg">🔔</span>Inbox
          </a>
        </nav>

        <footer className="hidden sm:block border-t border-zinc-800 py-8 text-center text-sm text-zinc-500">
          <p>Social-Video · GNU AGPLv3 · Open Source</p>
          <p className="mt-1">
            <a href="https://github.com/zametkikostik/Social-Video" className="hover:text-brand-500">GitHub</a>
          </p>
        </footer>

        <PwaRegister />
      </body>
    </html>
  );
}
