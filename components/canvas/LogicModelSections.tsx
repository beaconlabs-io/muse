interface LogicModelSectionsProps {
  zoom: number;
  canvasOffset: { x: number; y: number };
  onAddCardToSection?: (section: string) => void;
}

export function LogicModelSections({
  zoom,
  canvasOffset,
  onAddCardToSection,
}: LogicModelSectionsProps) {
  const sections = [
    {
      name: "Activities",
      value: "activities",
      color: "bg-blue-50 border-blue-300 hover:bg-blue-100",
      textColor: "text-blue-700",
      x: 50,
      width: 300,
    },
    {
      name: "Outputs",
      value: "outputs",
      color: "bg-green-50 border-green-300 hover:bg-green-100",
      textColor: "text-green-700",
      x: 400,
      width: 300,
    },
    {
      name: "Outcomes",
      value: "outcomes",
      color: "bg-yellow-50 border-yellow-300 hover:bg-yellow-100",
      textColor: "text-yellow-700",
      x: 750,
      width: 300,
    },
    {
      name: "Impact",
      value: "impact",
      color: "bg-purple-50 border-purple-300 hover:bg-purple-100",
      textColor: "text-purple-700",
      x: 1100,
      width: 300,
    },
  ];

  return (
    <>
      {sections.map((section) => (
        <div
          key={section.name}
          className={`absolute cursor-pointer rounded-lg border-2 border-dashed transition-all ${section.color}`}
          style={{
            left: section.x * zoom + canvasOffset.x,
            top: 50 * zoom + canvasOffset.y,
            width: section.width * zoom,
            height: 500 * zoom,
            transform: `scale(${zoom})`,
            transformOrigin: "top left",
            zIndex: -1,
          }}
          onClick={() => onAddCardToSection?.(section.value)}
          title={`Click to add a card to ${section.name}`}
        >
          <div
            className={`absolute top-2 left-2 font-semibold select-none ${section.textColor}`}
            style={{
              transform: `scale(${1 / zoom})`,
              transformOrigin: "top left",
              fontSize: zoom < 0.8 ? "14px" : "12px",
            }}
          >
            {section.name}
            <div className="mt-1 text-xs opacity-75">Click to add card</div>
          </div>
        </div>
      ))}
    </>
  );
}
