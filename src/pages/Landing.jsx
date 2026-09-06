import { Link } from 'react-router'

const features = [
  {
    title: 'A pipeline you can actually see',
    description:
      'Capture leads and move them from first contact to won. Every lead, status, and deal value in one clean board.',
  },
  {
    title: 'Follow-ups that never slip',
    description:
      'Schedule the next touchpoint for every lead and see exactly what is due today, overdue, or coming up.',
  },
  {
    title: 'AI-drafted follow-up messages',
    description:
      'Generate a personalized follow-up in seconds, informed by your notes and pipeline context.',
  },
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <span className="text-lg font-bold tracking-tight text-brand-700">
          ClientFlow<span className="text-slate-900"> AI</span>
        </span>
        <nav className="flex items-center gap-2">
          <Link
            to="/login"
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Log in
          </Link>
          <Link
            to="/signup"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
          >
            Get started
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        <section className="py-20 text-center sm:py-28">
          <span className="inline-flex items-center rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
            Early access build
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Win more clients without losing track of a single one.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
            ClientFlow AI is a lightweight CRM for freelancers, agencies, and
            consultants — capture leads, move them through your pipeline,
            schedule follow-ups, and let AI draft the perfect message.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/signup"
              className="w-full rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 sm:w-auto"
            >
              Create your free account
            </Link>
            <a
              href="#features"
              className="w-full rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 sm:w-auto"
            >
              See how it works
            </a>
          </div>
        </section>

        <section id="features" className="grid gap-6 pb-24 sm:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h2 className="text-base font-semibold text-slate-900">
                {feature.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {feature.description}
              </p>
            </article>
          ))}
        </section>
      </main>

      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        © 2026 ClientFlow AI · Built by Pius
      </footer>
    </div>
  )
}
