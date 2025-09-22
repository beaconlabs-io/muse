import React from "react";
import { EffectIcons, effectData } from "@/components/effect-icons";
import { Separator } from "@/components/ui/separator";

export default function EffectsPage() {
  return (
    <div className="mx-auto max-w-4xl bg-white p-8">
      <div className="text-center">
        <h1 className="mb-8 text-2xl font-bold text-gray-800">About Effects</h1>

        <div className="mb-8 text-left">
          <p className="leading-relaxed text-gray-700">
            The results of each analysis are presented in five intuitive categories for easy
            understanding.
          </p>
        </div>

        <Separator className="my-8" />

        <div className="space-y-6 text-left">
          {effectData.map((effect) => (
            <div key={effect.id} className="flex items-start gap-4">
              <EffectIcons effectId={effect.id} isShowTitle={false} />
              <div className="flex-1">
                <h3 className="mb-2 font-semibold text-gray-800">{effect.title}</h3>
                <p className="leading-relaxed text-gray-700">{effect.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
