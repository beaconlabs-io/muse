import { Plus, AlertTriangle, HelpCircle, Blend, Minus } from "lucide-react";

export const effectData = [
  {
    id: "N/A",
    title: "Unclear",
    description:
      "Classified as unclear when the sample size is insufficient or analytical methods are inadequate. Interventions judged as unclear require additional testing.",
    bg: "bg-gray-500",
    icon: <HelpCircle size={20} className="text-white" />,
  },
  {
    id: "+",
    title: "Positive",
    description:
      "Indicates that the expected effect was found. In many cases, this is statistically significant and shows that a practically meaningful effect of considerable magnitude was observed.",
    bg: "bg-green-500",
    icon: <Plus size={20} className="text-white" />,
  },
  {
    id: "-",
    title: "No",
    description:
      "Indicates that the expected effect was not observed. In many cases, this shows that the sample size was sufficient but the effect was not statistically significant. When the sample size is extremely large, even if statistically significant, it may represent a practically meaningless effect, which would be classified in this category.",
    bg: "bg-red-500",
    icon: <Minus size={20} className="text-white" />,
  },
  {
    id: "+-",
    title: "Mixed",
    description:
      "Intervention effects show heterogeneity in many cases. For example, effects were found for men but not for women, or effects were found for young people but not for elderly people. Results are classified as mixed when outcomes differ depending on various conditions.",
    bg: "bg-gray-500",
    icon: <Blend size={20} className="text-white" />,
  },
  {
    id: "!",
    title: "Side",
    description:
      "Indicates that unintended effects other than the intervention's intended outcomes were observed. In many cases, these are statistically significant and represent practically undesirable effects of considerable magnitude.",
    bg: "bg-orange-500",
    icon: <AlertTriangle size={20} className="text-white" />,
  },
];

const effectMap = new Map(effectData.map((e) => [e.id, e]));

export function extractEffectData(effectId: string) {
  return effectMap.get(effectId);
}

interface EffectIconsProps {
  effectId: string;
  isShowTitle?: boolean;
}

export function EffectIcons({ effectId, isShowTitle = true }: EffectIconsProps) {
  const effect = extractEffectData(effectId);

  if (!effect) {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`h-8 w-8 flex-shrink-0 ${effect.bg} flex items-center justify-center rounded-full`}
      >
        {effect.icon}
      </div>
      {isShowTitle && <div className="text-sm text-gray-500">{effect.title}</div>}
    </div>
  );
}
