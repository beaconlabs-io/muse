import { Plus, Move, FileText, Target, Save, Download, Trash2 } from "lucide-react";
import { ZoomControls } from "@/components/canvas/ZoomControls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CanvasToolbarProps {
  onAddCard: (section?: string) => void;
  zoom: number;
  onZoomChange: (delta: number) => void;
  onToggleEvidencePanel: () => void;
  showEvidencePanel: boolean;
  selectedGoal?: string;
  onGoalChange: (goal: string) => void;
  onSaveLogicModel?: () => void;
  onExportStandardizedJSON?: () => void;
  onClearAllData?: () => void;
}

const LOGIC_MODEL_SECTIONS = [
  { value: "activities", label: "Activities", color: "#c7d2fe" },
  { value: "outputs", label: "Outputs", color: "#d1fae5" },
  { value: "outcomes", label: "Outcomes", color: "#fef08a" },
  { value: "impact", label: "Impact", color: "#e9d5ff" },
] as const;

const PROJECT_GOALS = [
  {
    value: "environmental-sustainability",
    label: "Environmental Sustainability",
  },
  { value: "economic-growth", label: "Economic Growth" },
] as const;

export function CanvasToolbar({
  onAddCard,
  zoom,
  onZoomChange,
  onToggleEvidencePanel,
  showEvidencePanel,
  selectedGoal,
  onGoalChange,
  onSaveLogicModel,
  onExportStandardizedJSON,
  onClearAllData,
}: CanvasToolbarProps) {
  return (
    <div className="bg-background flex flex-col gap-3 border-b p-3 sm:p-4">
      {/* Goal Selection and Save/Export */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="text-muted-foreground h-4 w-4" />
          <span className="text-sm font-medium">Goal:</span>
          <Select value={selectedGoal} onValueChange={onGoalChange}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select your goal" />
            </SelectTrigger>
            <SelectContent>
              {PROJECT_GOALS.map((goal) => (
                <SelectItem key={goal.value} value={goal.value}>
                  {goal.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedGoal && (
            <Badge variant="secondary">
              {PROJECT_GOALS.find((g) => g.value === selectedGoal)?.label}
            </Badge>
          )}
        </div>

        {/* Save and Export buttons - fixed right */}
        <div className="flex items-center gap-2">
          {onClearAllData && (
            <Button
              onClick={onClearAllData}
              size="sm"
              variant="destructive"
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Clear All</span>
            </Button>
          )}
          {onSaveLogicModel && (
            <Button
              onClick={onSaveLogicModel}
              size="sm"
              variant="default"
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              <span className="hidden sm:inline">Mint Hypercert</span>
            </Button>
          )}
          {onExportStandardizedJSON && (
            <Button
              onClick={onExportStandardizedJSON}
              size="sm"
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export JSON</span>
            </Button>
          )}
        </div>
      </div>

      {/* Section buttons */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {LOGIC_MODEL_SECTIONS.map((section) => (
          <Button
            key={section.value}
            onClick={() => onAddCard(section.value)}
            size="sm"
            variant="outline"
            className="border-2 px-2 text-xs transition-all hover:scale-105 sm:px-3 sm:text-sm"
            style={{
              borderColor: section.color,
              backgroundColor: `${section.color}20`,
            }}
          >
            <Plus className="mr-1 h-3 w-3" />
            <span className="hidden sm:inline">{section.label}</span>
            <span className="sm:hidden">{section.label.slice(0, 3)}</span>
          </Button>
        ))}
      </div>

      {/* Controls and help text */}
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
        {/* Evidence panel toggle */}
        <Button
          onClick={onToggleEvidencePanel}
          size="sm"
          variant={showEvidencePanel ? "default" : "outline"}
          className="flex cursor-pointer items-center gap-2"
        >
          <FileText className="h-4 w-4" />
          <span className="hidden sm:inline">Evidence</span>
        </Button>

        {/* Zoom controls */}
        <ZoomControls zoom={zoom} onZoomChange={onZoomChange} />

        {/* Help text */}
        <div className="text-muted-foreground flex items-center gap-2 text-xs sm:text-sm">
          <Move className="h-4 w-4 flex-shrink-0" />
          <span className="hidden lg:inline">
            Drag cards or canvas to move • Double-click to edit • Delete key to remove • Click + on
            cards to connect
          </span>
          <span className="hidden sm:inline lg:hidden">
            Drag to move • Double-click to edit • Delete to remove • Click + to connect
          </span>
          <span className="sm:hidden">Drag to move • Double-click to edit</span>
        </div>
      </div>
    </div>
  );
}
