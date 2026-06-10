import { Link } from 'react-router-dom';

const faqs: { q: string; a: JSX.Element }[] = [
  {
    q: 'What is a supplemental tax bill?',
    a: (
      <p>
        When you buy a home (or finish significant construction) in California, the county reassesses the property —
        usually at your purchase price. But your regular tax bill for that year was already calculated using the
        previous owner's lower assessed value. A supplemental bill collects the difference for the portion of the tax
        year you've owned the home. It's a one-time catch-up, not a permanent extra bill.
      </p>
    ),
  },
  {
    q: 'Why did I get TWO supplemental bills?',
    a: (
      <p>
        If your purchase closed between <strong>January 1 and May 31</strong>, the county had already locked in the
        following tax year's roll using the old value (rolls are set every January 1). So you get one bill for the
        rest of the current tax year <em>and</em> a second bill correcting the entire following year. Buy between June
        and December and you'll typically get just one.
      </p>
    ),
  },
  {
    q: "Won't my mortgage company pay this from escrow?",
    a: (
      <p>
        Usually <strong>no</strong>. Supplemental bills are mailed directly to the homeowner, and most lenders' escrow
        accounts only budget for the regular annual bill. Some lenders will pay it if you send them the bill and ask —
        but never assume. Unpaid supplemental bills accrue the same 10% penalties as regular bills.
      </p>
    ),
  },
  {
    q: 'When will my supplemental bill arrive?',
    a: (
      <p>
        Typically <strong>3 to 6 months after closing</strong>, though busy counties can take a year or more. The
        wait doesn't make it go away — which is why we suggest setting the estimated amount aside now. Use the{' '}
        <Link to="/estimate" className="text-brand-700 font-semibold hover:underline">
          estimator
        </Link>{' '}
        to see how much.
      </p>
    ),
  },
  {
    q: 'When is a supplemental bill due?',
    a: (
      <p>
        It depends on when the county <em>mails</em> it. Mailed July–October: the installments follow the regular
        schedule (late after December 10 and April 10). Mailed November–June: the first installment is late after the
        end of the <em>next</em> month, and the second four months after that. The{' '}
        <Link to="/check-bill" className="text-brand-700 font-semibold hover:underline">
          bill checker
        </Link>{' '}
        computes your exact dates.
      </p>
    ),
  },
  {
    q: 'I paid less than the old assessed value. Do I still owe?',
    a: (
      <p>
        No — if the reassessed value is <em>lower</em> than the old one, the supplemental assessment is negative and
        the county owes <em>you</em> a prorated refund. Refunds are issued automatically but can be slow; follow up
        with the tax collector if months pass with nothing.
      </p>
    ),
  },
  {
    q: "What's the homeowner's exemption and should I file?",
    a: (
      <p>
        If the home is your primary residence, filing a one-time form with your county assessor reduces your assessed
        value by <strong>$7,000</strong> — roughly $70–90 off your taxes every single year. It's free. Be wary of
        official-looking mailers that charge $25–50 to "process" it for you; that's a junk fee.
      </p>
    ),
  },
  {
    q: 'What is Prop 13, in one paragraph?',
    a: (
      <p>
        Proposition 13 (1978) caps the base property tax at <strong>1%</strong> of assessed value and limits how fast
        that assessed value can grow to <strong>2% per year</strong> — until the property sells, at which point it
        resets to market price. That reset is exactly why buyers get supplemental bills, and why your bill can be
        very different from your neighbor's. The amount above 1% on your bill is voter-approved local debt
        (school bonds and similar) plus fixed direct assessments.
      </p>
    ),
  },
  {
    q: 'I think my assessment is too high. What can I do?',
    a: (
      <p>
        Two paths: (1) ask the assessor's office for an informal review — sometimes errors get fixed with a phone
        call — or (2) file a formal <strong>assessment appeal</strong> with your county's Assessment Appeals Board.
        Appeals have strict filing windows (commonly July 2 – September 15 for regular assessments, or 60 days from
        the notice for supplemental assessments — check your county). Importantly: <strong>pay the bill anyway</strong>{' '}
        while you appeal, to avoid penalties; you'll be refunded if you win.
      </p>
    ),
  },
  {
    q: 'Is my data stored anywhere?',
    a: (
      <p>
        No. Every calculation runs locally in your browser. There's no account, no server, no analytics on the
        numbers you type. Close the tab and it's gone.
      </p>
    ),
  },
];

export default function Faq() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Frequently asked questions</h1>
        <p className="text-gray-600">Straight answers about California property and supplemental taxes.</p>
      </header>

      <div className="space-y-3">
        {faqs.map((item) => (
          <details key={item.q} className="card group p-0 overflow-hidden">
            <summary className="flex items-center justify-between gap-4 cursor-pointer list-none px-6 py-4 font-semibold text-sm sm:text-base hover:bg-gray-50">
              {item.q}
              <svg
                className="w-5 h-5 text-gray-400 transition group-open:rotate-180 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </summary>
            <div className="px-6 pb-5 text-sm text-gray-600 leading-relaxed">{item.a}</div>
          </details>
        ))}
      </div>
    </div>
  );
}
