export default function GdprPage() {
  return (
    <article className="max-w-3xl mx-auto space-y-4 text-sm text-zinc-300">
      <h1 className="text-2xl font-bold text-white">Your Privacy Rights</h1>
      <p className="text-xs text-zinc-500">GDPR · LGPD · CCPA · KVKK · PDPA</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Access / export data</li>
        <li>Erasure / anonymize account</li>
        <li>Withdraw cookie consent</li>
        <li>CCPA: we do not sell personal information</li>
      </ul>
      <p>Settings → export / delete · API /api/compliance/*</p>
    </article>
  );
}
