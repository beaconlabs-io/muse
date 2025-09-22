import React from "react";
import { StarsComponent } from "@/components/stars";
import { Separator } from "@/components/ui/separator";

export default function SMS() {
  return (
    <div className="mx-auto max-w-4xl bg-white p-8">
      <div className="text-center">
        <h1 className="mb-8 text-2xl font-bold text-gray-800">About the Strength of Evidence</h1>

        <div className="space-y-6 text-left leading-relaxed text-gray-700">
          <p>
            We evaluate the strength of evidence for analytical results presented in studies. We
            primarily use the Maryland Scientific Method Scale (SMS) for evidence strength
            evaluation criteria. Below, we provide explanations based on the What Works Center for
            Local Growth (
            <a
              href="https://whatworksgrowth.org/resources/the-scientific-maryland-scale/"
              className="text-blue-600 underline"
            >
              https://whatworksgrowth.org/resources/the-scientific-maryland-scale/
            </a>
            ).
          </p>

          <p>
            Additionally, analyses that do not use rigorous causal inference methods based on
            experimental or quasi-experimental approaches are classified as "Level 0."
          </p>
        </div>

        <Separator className="my-8" />

        <div className="space-y-6 text-left">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <span className="font-semibold text-gray-800">Level 1</span>
              <StarsComponent max={1} />
            </div>
            <p className="leading-relaxed text-gray-700">
              Comparison between (a) intervention and non-intervention groups, or (b) comparison of
              intervention groups before and after intervention. Control variables are used to
              adjust for differences between intervention and non-intervention groups.
            </p>
          </div>
          <Separator className="my-4" />

          <div>
            <div className="mb-2 flex items-center gap-3">
              <span className="font-semibold text-gray-800">Level 2</span>
              <StarsComponent max={2} />
            </div>
            <p className="leading-relaxed text-gray-700">
              Comparison between (a) intervention and non-intervention groups, or (b) comparison
              where intervention and non-intervention groups are partially but not completely
              aligned. Control variables or matching methods are used. At the macro level, control
              variables are used to control for baseline characteristics.
            </p>
          </div>
          <Separator className="my-4" />

          <div>
            <div className="mb-2 flex items-center gap-3">
              <span className="font-semibold text-gray-800">Level 3</span>
              <StarsComponent max={3} />
            </div>
            <p className="leading-relaxed text-gray-700">
              Provides comparison of intervention group's pre-intervention outcomes with
              post-intervention outcomes, as well as comparison with outcomes of non-intervention
              groups (e.g., difference-in-differences or regression discontinuity). When using
              methods that compare before and after intervention periods, results are presented
              separately for intervention and non-intervention groups. Additionally, important
              baseline characteristics are measured and controlled for through propensity score
              matching, though fundamental differences may still exist.
            </p>
          </div>
          <Separator className="my-4" />

          <div>
            <div className="mb-2 flex items-center gap-3">
              <span className="font-semibold text-gray-800">Level 4</span>
              <StarsComponent max={4} />
            </div>
            <p className="leading-relaxed text-gray-700">
              Interventions are conducted randomly, and differences in outcomes between intervention
              and non-intervention groups due to the presence or absence of intervention are
              examined. This should ideally involve operationalization in intervention design or
              baseline heterogeneity in intervention implementation timing. Measured variables
              should be isolated as much as possible.
            </p>
          </div>
          <Separator className="my-4" />

          <div>
            <div className="mb-2 flex items-center gap-3">
              <span className="font-semibold text-gray-800">Level 5</span>
              <StarsComponent max={5} />
            </div>
            <p className="leading-relaxed text-gray-700">
              Experimental design involving randomized allocation to intervention and
              non-intervention groups, specifically Randomized Controlled Trials (RCT). The
              allocation ratio for intervention and non-intervention groups should be approximately
              50-50% to examine the degree of contamination through control variable usage. This
              measurement should be conducted using variables that can represent appropriate
              differences. Control variables should be used to examine contamination from the
              perspective of intervention target subjects (when saying "appropriate contamination"),
              with baseline variables being appropriately differentiated where possible, and
              statistical adjustment or sampling-based post-stratification considered when
              necessary.
            </p>
          </div>
          <Separator className="my-4" />

          <div className="pt-4">
            <div className="mb-2 flex items-center gap-3">
              <span className="font-semibold text-gray-800">Level 0</span>
              <StarsComponent max={0} />
            </div>
            <p className="leading-relaxed text-gray-700">
              Rather than experimental or quasi-experimental approaches, analyses based on
              mathematical models that combine empirical data with statistics.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
