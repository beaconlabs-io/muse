import { Plus, AlertTriangle, HelpCircle, Blend } from "lucide-react";

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
