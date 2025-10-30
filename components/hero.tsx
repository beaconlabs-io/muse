import Link from "next/link";

const text = `{
  "id": "0",
  "title": "MUSE",
  "description": "MUSE is a evidence layer for funding public goods.",
  "author": "Beacon Labs",
  "timestamp": "2025-05-01T10:00:00Z"
}`;

export function Hero() {
  return (
    <div className="relative isolate overflow-hidden bg-gradient-to-b from-indigo-100/20">
      <div className="container mx-auto px-4 pt-10 pb-24 sm:pb-32 lg:grid lg:grid-cols-2 lg:gap-x-8 lg:py-40">
        <div className="px-6 lg:px-0 lg:pt-4">
          <div className="mx-auto max-w-2xl">
            <div className="max-w-lg">
              <h1 className="mt-10 text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
                MUSE
              </h1>
              {/* TODO: to be modified */}
              <p className="mt-6 text-lg leading-8 text-gray-600">
                Bridge communities and decision makers through evidence-based decision making.
                Curate research evidence, build logic models, and track impact with hypercerts.
              </p>
              <div className="mt-10 flex items-center gap-x-6">
                {/* TODO: replace to whitepaper */}
                <Link
                  href="https://beaconlabs.io/reports/evidence-layer-for-digital-public-goods"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm leading-6 font-semibold text-gray-900"
                >
                  Learn more <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-20 sm:mt-24 md:mx-auto md:max-w-2xl lg:mx-0 lg:mt-0 lg:w-screen">
          <div className="absolute inset-y-0 right-1/2 -z-10 -mr-10 w-[200%] skew-x-[-30deg] bg-white shadow-xl ring-1 shadow-indigo-600/10 ring-indigo-50 md:-mr-20 lg:-mr-36" />
          <div className="shadow-lg md:rounded-3xl">
            <div className="bg-indigo-500 [clip-path:inset(0)] md:[clip-path:inset(0_round_theme(borderRadius.3xl))]">
              <div className="absolute -inset-y-px left-1/2 -z-10 ml-10 w-[200%] skew-x-[-30deg] bg-indigo-100 opacity-20 ring-1 ring-white ring-inset md:ml-20 lg:ml-36" />
              <div className="relative px-6 pt-8 sm:pt-16 md:pr-0 md:pl-16">
                <div className="mx-auto max-w-2xl md:mx-0 md:max-w-none">
                  <div className="w-screen overflow-hidden rounded-tl-xl bg-gray-900">
                    <div className="flex bg-gray-800/40 ring-1 ring-white/5">
                      <div className="-mb-px flex text-sm leading-6 font-medium text-gray-400">
                        <div className="border-r border-b border-r-white/10 border-b-white/20 bg-white/5 px-4 py-2 text-white">
                          Evidence
                        </div>
                        <div className="border-r border-gray-600/10 px-4 py-2">Claims</div>
                      </div>
                    </div>
                    <div className="px-6 pt-6 pb-14">
                      <pre className="text-[0.8125rem] leading-6 text-gray-300">
                        {/* TODO: to be fixed */}
                        <code>{text}</code>
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
