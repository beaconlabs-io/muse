import { Save, Download, Trash2, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AddLogicSheet } from "./AddLogicSheet";
import { GenerateLogicModelDialog } from "./GenerateLogicModelDialog";
import type { Card, Arrow, CardMetrics } from "@/types";

interface AddLogicFormData {
  type: string;
  title: string;
  description?: string;
  metrics?: unknown[];
}

interface CanvasToolbarProps {
  onAddCard: (data: AddLogicFormData) => void;
  onSaveLogicModel?: () => void;
  onExportStandardizedJSON?: () => void;
  onExportImage?: () => void;
  onClearAllData?: () => void;
  onLoadGeneratedCanvas?: (data: {
    cards: Card[];
    arrows: Arrow[];
    cardMetrics: Record<string, CardMetrics[]>;
  }) => void;
}

export function CanvasToolbar({
  onAddCard,
  onSaveLogicModel,
  onExportStandardizedJSON,
  onExportImage,
  onClearAllData,
  onLoadGeneratedCanvas,
}: CanvasToolbarProps) {
  return (
    <div className="bg-background flex items-center justify-between border-b p-3 sm:p-4">
      {/* Left Side: Primary Actions */}
      <div className="flex items-center gap-3">
        {onLoadGeneratedCanvas && <GenerateLogicModelDialog onGenerate={onLoadGeneratedCanvas} />}
        <AddLogicSheet onSubmit={onAddCard} />
      </div>

      {/* Right Side: Secondary Actions */}
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="cursor-pointer gap-2">
              <MoreVertical className="h-4 w-4" />
              <span className="hidden sm:inline">More</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onSaveLogicModel && (
              <DropdownMenuItem onClick={onSaveLogicModel} className="cursor-pointer">
                <Save className="mr-2 h-4 w-4" />
                Mint Hypercert
              </DropdownMenuItem>
            )}
            {onExportImage && (
              <DropdownMenuItem onClick={onExportImage} className="cursor-pointer">
                <Download className="mr-2 h-4 w-4" />
                Export Image
              </DropdownMenuItem>
            )}

            <DropdownMenuItem onClick={onExportStandardizedJSON} className="cursor-pointer">
              <Download className="mr-2 h-4 w-4" />
              Export JSON
            </DropdownMenuItem>

            {onClearAllData && <DropdownMenuSeparator />}
            {onClearAllData && (
              <DropdownMenuItem
                onClick={onClearAllData}
                className="text-destructive focus:text-destructive cursor-pointer"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Clear All
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
