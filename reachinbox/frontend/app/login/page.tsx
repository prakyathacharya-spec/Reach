import { googleLoginUrl } from "@/lib/api";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm text-center space-y-6">
        <h1 className="font-display text-3xl">ReachInbox Scheduler</h1>
        <p className="text-sm text-ink/60">Schedule and track cold email sends at scale.</p>
        <a
          href={googleLoginUrl()}
          className="inline-block w-full border border-line px-4 py-3 text-sm font-medium hover:border-ink"
        >
          Continue with Google
        </a>
      </div>
    </main>
  );
}
