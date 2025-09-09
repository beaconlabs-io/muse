import React from "react";
import { effectData, EffectIcons } from "@/components/effect-icons";
import { Separator } from "@/components/ui/separator";

export default function EffectsPage() {
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
