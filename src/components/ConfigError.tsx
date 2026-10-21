export default function ConfigError({ missing }: { missing: string[] }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 p-6">
      <div className="max-w-md w-full bg-white border border-red-200 rounded-xl p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-red-700 mb-2">TrailMix isn't configured</h1>
        <p className="text-sm text-stone-700 mb-3">
          The following environment variables are missing from this build:
        </p>
        <ul className="list-disc list-inside text-sm font-mono text-stone-900 mb-3">
          {missing.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
        <p className="text-sm text-stone-600">
          Add them to <code>.env.local</code> for local development, or to your hosting
          provider's environment settings (e.g. Vercel), then rebuild and redeploy.
        </p>
      </div>
    </div>
  );
}
