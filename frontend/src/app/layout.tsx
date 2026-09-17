import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Social-Video — Open Source Video Platform',
  description: 'Self-hosted social video hosting with Cloudflare R2, Live, Shorts and more. AGPLv3.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-screen antialiased">
        <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4">
            <a href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight flex-shrink-0">
              <span className="text-brand-500">▶</span>
              <span>Social-Video</span>
            </a>
            <form action="/search" method="get" className="hidden sm:flex flex-1 max-w-md mx-4">
              <input type="search" name="q" placeholder="Поиск..."
                className="w-full rounded-full border border-zinc-700 bg-zinc-900 px-4 py-1.5 text-sm focus:border-brand-500 focus:outline-none" />
            </form>
            <nav className="flex items-center gap-3 text-sm text-zinc-400 flex-shrink-0">
              <a href="/search" className="sm:hidden hover:text-white transition">🔍</a>
              <a href="/upload" className="hover:text-white transition">Загрузить</a>
              <a href="/playlists" className="hover:text-white transition hidden sm:inline">Плейлисты</a>
              <a href="/auth/login" className="rounded-full bg-brand-600 px-4 py-1.5 text-white hover:bg-brand-500 transition">Войти</a>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
        <footer className="border-t border-zinc-800 py-8 text-center text-sm text-zinc-500">
          <p>Social-Video · GNU AGPLv3 · Open Source</p>
          <p className="mt-1">
            <a href="https://github.com/zametkikostik/Social-Video" className="hover:text-brand-500">GitHub</a>
          </p>
        </footer>
      </body>
    </html>
  );
}
