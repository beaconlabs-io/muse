import { memo, useState, useCallback } from "react";
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
import { useCanvasOperations } from "./context";
import { GenerateLogicModelDialog } from "./GenerateLogicModelDialog";

export const CanvasToolbar = memo(() => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const {
    addCard,
    saveLogicModel,
    exportAsJSON,
    exportAsImage,
    clearAllData,
    loadGeneratedCanvas,
  } = useCanvasOperations();

  const handleClearAll = useCallback(() => {
    // Close dropdown first to avoid modal stacking conflict
    setDropdownOpen(false);
    // Open alert dialog after dropdown closes
    clearAllData();
  }, [clearAllData]);
  return (
    <div className="bg-background flex items-center justify-between border-b p-3 sm:p-4">
      {/* Left Side: Primary Actions */}
      <div className="flex items-center gap-3">
        <GenerateLogicModelDialog onGenerate={loadGeneratedCanvas} />
        <AddLogicSheet onSubmit={addCard} />
      </div>

      {/* Right Side: Secondary Actions */}
      <div className="flex items-center gap-2">
        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="cursor-pointer gap-2">
              <MoreVertical className="h-4 w-4" />
              <span className="hidden sm:inline">More</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={saveLogicModel} className="cursor-pointer">
              <Save className="mr-2 h-4 w-4" />
              Mint Hypercert
            </DropdownMenuItem>
            <DropdownMenuItem onClick={exportAsImage} className="cursor-pointer">
              <Download className="mr-2 h-4 w-4" />
              Export Image
            </DropdownMenuItem>

            <DropdownMenuItem onClick={exportAsJSON} className="cursor-pointer">
              <Download className="mr-2 h-4 w-4" />
              Export JSON
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleClearAll}
              className="text-destructive focus:text-destructive cursor-pointer"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Clear All
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});

CanvasToolbar.displayName = "CanvasToolbar";
