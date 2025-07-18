import React from "react";
import { EffectIcons } from "@/components/effect-icons";
import { Separator } from "@/components/ui/separator";

export default function EffectsPage() {
  const effectData = [
    {
      id: 1,
      title: "Effect Present",
      description:
        "Indicates that the expected effect was found. In many cases, this is statistically significant and shows that a practically meaningful effect of considerable magnitude was observed.",
    },
    {
      id: 2,
      title: "No Effect",
      description:
        "Indicates that the expected effect was not observed. In many cases, this shows that the sample size was sufficient but the effect was not statistically significant. When the sample size is extremely large, even if statistically significant, it may represent a practically meaningless effect, which would be classified in this category.",
    },
    {
      id: 3,
      title: "Mixed",
      description:
        "Intervention effects show heterogeneity in many cases. For example, effects were found for men but not for women, or effects were found for young people but not for elderly people. Results are classified as mixed when outcomes differ depending on various conditions.",
    },
    {
      id: 4,
      title: "Side Effects",
      description:
        "Indicates that unintended effects other than the intervention's intended outcomes were observed. In many cases, these are statistically significant and represent practically undesirable effects of considerable magnitude.",
    },
    {
      id: 0,
      title: "Unclear",
      description:
        "Classified as unclear when the sample size is insufficient or analytical methods are inadequate. Interventions judged as unclear require additional testing.",
    },
  ];

  return (
    <div className="max-w-4xl mx-auto p-8 bg-white">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-8 text-gray-800">About Effects</h1>

        <div className="text-left mb-8">
          <p className="text-gray-700 leading-relaxed">
            The results of each analysis are presented in five intuitive
            categories for easy understanding.
          </p>
        </div>

        <Separator className="my-8" />

        <div className="space-y-6 text-left">
          {effectData.map((effect) => (
            <div key={effect.id} className="flex items-start gap-4">
              <EffectIcons effectId={effect.id} />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800 mb-2">
                  {effect.title}
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  {effect.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
