import { Link } from 'react-router-dom';

const tools = [
  {
    to: '/estimate',
    title: 'I just bought (or am buying) a home',
    description:
      'Estimate the supplemental tax bills headed your way, when they’ll arrive, and how much to set aside.',
    cta: 'Estimate my supplemental taxes',
    accent: 'bg-brand-600',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75"
      />
    ),
  },
  {
    to: '/check-bill',
    title: 'I received a supplemental tax bill',
    description:
      'Make sense of the bill in your hand: verify the math, see exactly when each installment is due, and learn what happens if you’re late.',
    cta: 'Check my bill',
    accent: 'bg-emerald-600',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
      />
    ),
  },
  {
    to: '/annual',
    title: 'I want to understand my annual bill',
    description:
      'Break your regular property tax bill into plain English, check the Prop 13 cap, and see if you’re missing the homeowner’s exemption.',
    cta: 'Analyze my annual bill',
    accent: 'bg-violet-600',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z"
      />
    ),
  },
];

export default function Home() {
  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="text-center max-w-2xl mx-auto space-y-4 pt-4">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 border border-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">
          For California homeowners
        </p>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
          Property tax bills, translated into plain English
        </h1>
        <p className="text-lg text-gray-600 leading-relaxed">
          Bought a home and surprised by extra tax bills? You're not alone. We'll show you what to expect, check
          your bills' math, and help you avoid penalties — free, no sign-up, and nothing you enter leaves your
          browser.
        </p>
      </section>

      {/* Tool cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {tools.map((tool) => (
          <Link
            key={tool.to}
            to={tool.to}
            className="card flex flex-col hover:shadow-md hover:border-gray-300 transition group"
          >
            <span className={`w-11 h-11 rounded-xl ${tool.accent} text-white flex items-center justify-center mb-4`}>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                {tool.icon}
              </svg>
            </span>
            <h2 className="text-base font-bold mb-2">{tool.title}</h2>
            <p className="text-sm text-gray-600 leading-relaxed flex-1">{tool.description}</p>
            <span className="mt-4 btn-link inline-flex items-center gap-1">
              {tool.cta}
              <svg className="w-4 h-4 transition group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </span>
          </Link>
        ))}
      </section>

      {/* What is a supplemental bill? */}
      <section className="card sm:p-8">
        <h2 className="text-xl font-bold mb-4">Wait — why am I getting extra tax bills?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-gray-600 leading-relaxed">
          <div>
            <p className="font-semibold text-gray-900 mb-1.5">1. Your home was reassessed</p>
            <p>
              In California, when you buy a home (or finish major construction), the county reassesses it at what you
              paid — usually much more than the previous owner's old assessed value, which was capped by Prop 13.
            </p>
          </div>
          <div>
            <p className="font-semibold text-gray-900 mb-1.5">2. The regular bill doesn't catch up right away</p>
            <p>
              Your first regular tax bill is still based on the <em>old</em> value. The county sends one or two
              "supplemental" bills to collect the difference for the part of the year you've owned the home.
            </p>
          </div>
          <div>
            <p className="font-semibold text-gray-900 mb-1.5">3. Your lender usually won't pay them</p>
            <p>
              Even if your mortgage payment includes an escrow account for taxes, supplemental bills are typically
              mailed to <em>you</em> and are <em>your</em> responsibility. Many homeowners get caught off guard — that's
              exactly what this site helps you avoid.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
