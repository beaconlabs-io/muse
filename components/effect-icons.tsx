import { Plus, AlertTriangle, HelpCircle, Blend } from "lucide-react";
export const effectData = [
  {
    id: 0,
    title: "Unclear",
    description:
      "Classified as unclear when the sample size is insufficient or analytical methods are inadequate. Interventions judged as unclear require additional testing.",
  },
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
];

export function extractEffectData(effectId: number) {
  return effectData.find((effect) => effect.id === effectId);
}

export function EffectIcons({
  effectId,
  size = 20,
}: {
  effectId: number;
  size?: number;
}) {
  const iconProps: {
    [key: number]: { bgColor: string; icon: React.JSX.Element };
  } = {
    0: {
      // unclear
      bgColor: "bg-gray-500",
      icon: <HelpCircle size={size} className="text-white" />,
    },
    1: {
      // effect present
      bgColor: "bg-green-500",
      icon: <Plus size={size} className="text-white" />,
    },
    2: {
      // no effect
      bgColor: "bg-red-500",
      icon: <span className="text-white font-bold text-lg">0</span>,
    },
    3: {
      // mixed
      bgColor: "bg-gray-500",
      icon: <Blend size={size} className="text-white" />,
    },
    4: {
      // side effects
      bgColor: "bg-orange-500",
      icon: <AlertTriangle size={size} className="text-white" />,
    },
  };

  const { bgColor, icon } = iconProps[effectId] || iconProps[0];

  return (
    <div
      className={`flex-shrink-0 w-8 h-8 ${bgColor} rounded-full flex items-center justify-center`}
    >
      {icon}
    </div>
  );
}
