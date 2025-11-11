import { Save, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddLogicSheet } from "./AddLogicSheet";

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
  onClearAllData?: () => void;
}

export function CanvasToolbar({
  onAddCard,
  onSaveLogicModel,
  onExportStandardizedJSON,
  onClearAllData,
}: CanvasToolbarProps) {
  return (
    <div className="bg-background flex items-center justify-end border-b p-3 sm:p-4">
      <div className="flex items-center gap-2">
        {/* Add Logic Button */}
        <AddLogicSheet onSubmit={onAddCard} />
        {onClearAllData && (
          <Button
            onClick={onClearAllData}
            size="sm"
            variant="destructive"
            className="flex cursor-pointer items-center gap-2"
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
            className="flex cursor-pointer items-center gap-2"
          >
            <Save className="h-4 w-4" />
            <span className="hidden sm:inline">Mint Hypercert</span>
          </Button>
        )}
        {process.env.NODE_ENV === "development" && onExportStandardizedJSON && (
          <Button
            onClick={onExportStandardizedJSON}
            size="sm"
            variant="outline"
            className="lex cursor-pointer items-center gap-2"
          >
            <Download className="h-4 w-4" />
            <span className="hidden cursor-pointer sm:inline">Export JSON</span>
          </Button>
        )}
      </div>
    </div>
  );
}
