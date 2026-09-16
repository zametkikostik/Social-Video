export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 p-8 md:p-12">
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
          Открытый <span className="text-brand-500">видео-хостинг</span>
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-zinc-400">
          Social-Video — современная платформа для VOD, Live и Shorts.
          Cloudflare R2, адаптивный HLS, монетизация и полная свобода.
          Лицензия GNU AGPLv3.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <a
            href="/auth/register"
            className="rounded-full bg-brand-600 px-6 py-3 font-medium text-white hover:bg-brand-500 transition"
          >
            Создать аккаунт
          </a>
          <a
            href="https://github.com/zametkikostik/Social-Video"
            className="rounded-full border border-zinc-700 px-6 py-3 font-medium hover:bg-zinc-900 transition"
          >
            GitHub
          </a>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Рекомендуемые видео</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="group rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition"
            >
              <div className="aspect-video bg-zinc-800 flex items-center justify-center text-zinc-600">
                ▶
              </div>
              <div className="p-3">
                <div className="h-4 w-3/4 bg-zinc-800 rounded mb-2" />
                <div className="h-3 w-1/2 bg-zinc-800 rounded" />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-zinc-500 text-sm">
          Видео появятся после первой загрузки и транскодинга.
        </p>
      </section>

      <section className="grid md:grid-cols-3 gap-6">
        <div className="rounded-xl border border-zinc-800 p-6">
          <h3 className="font-semibold text-brand-500">Cloudflare R2</h3>
          <p className="mt-2 text-sm text-zinc-400">
            Zero egress fees. Идеально для видео-библиотеки любого размера.
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 p-6">
          <h3 className="font-semibold text-brand-500">HLS + Adaptive</h3>
          <p className="mt-2 text-sm text-zinc-400">
            Multi-quality streams. Плавное воспроизведение на любом устройстве.
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 p-6">
          <h3 className="font-semibold text-brand-500">Open Source</h3>
          <p className="mt-2 text-sm text-zinc-400">
            Полный контроль. AGPLv3. Можно форкать и модифицировать.
          </p>
        </div>
      </section>
    </div>
  );
}
