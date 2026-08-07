import { Wifi, Battery, EyeOff } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardBody } from "@/components/ui/Card";
import { useAutoSaveSettings } from "@/hooks/useAutoSaveField";
import { useHaStates } from "@/hooks/useHaStates";
import { getMenuBarPages, buildAllMenuBarTitles } from "@/services/tray";
import { cn } from "@/shared";

interface LivePreviewMockupProps {
  /** The drag-adjustable maximum height of the pages list in pixels */
  previewHeight: number;
  /** Callback to toggle the visibility of the mockup preview */
  setShowPreview: (show: boolean) => void;
}

/**
 * Reusable macOS menu bar mockup previewing active paginated layouts,
 * vertical alignment nudges, and stable widths.
 * Supports drag-adjustable heights and collapsing.
 */
export function LivePreviewMockup({ previewHeight, setShowPreview }: LivePreviewMockupProps) {
  const { settings } = useAutoSaveSettings();
  const [states] = useHaStates();

  if (!settings.menuBarPaginationEnabled || settings.menuBarSensors.length === 0) {
    return null;
  }

  const pageTitles = buildAllMenuBarTitles(states, settings);
  const maxCharLength = pageTitles.length > 0 ? Math.max(...pageTitles.map((t) => t.length)) : 0;
  const isMiddle = settings.menuBarVerticalAlignment === "middle";
  const isWidthStabilized = settings.menuBarPageWidthStabilizationEnabled && settings.menuBarPaginationEnabled;

  return (
    <Card className="border-border/80 shadow-sm select-none">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="space-y-0.5">
          <CardTitle className="text-sm font-semibold text-fg">Live macOS Menu Bar Mockup</CardTitle>
          <CardDescription className="text-xs text-fg-muted">
            Real-time preview of how each page will format, align, and size on your macOS menu bar.
          </CardDescription>
        </div>
        <button
          onClick={() => setShowPreview(false)}
          className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md bg-neutral-800/80 hover:bg-neutral-800 text-fg-muted hover:text-fg border border-neutral-700/40 hover:border-neutral-700 transition-colors duration-150 cursor-pointer"
          title="Hide live preview mockup"
        >
          <EyeOff size={13} />
          Hide
        </button>
      </CardHeader>
      <CardBody>
        <div 
          style={{ maxHeight: `${previewHeight}px` }}
          className="space-y-4 pl-1 overflow-y-auto pr-1 transition-all duration-100"
        >
          {getMenuBarPages(settings).map((pageItems, pageIdx) => {
            const renderedTitle = pageTitles[pageIdx] || "—";
            const widthStyle = (isWidthStabilized && maxCharLength > 0)
              ? { minWidth: `calc(${maxCharLength}ch + 1.25rem)`, width: `calc(${maxCharLength}ch + 1.25rem)`, justifyContent: "flex-start" }
              : { justifyContent: "center" };

            return (
              <div key={pageIdx} className="space-y-2">
                <div className="flex justify-between items-center select-none pl-1">
                  <span className="font-semibold text-xs text-blue-500">Page {pageIdx + 1}</span>
                  <span className="text-3xs text-fg-muted font-semibold">{pageItems.length} elements</span>
                </div>
                
                {/* Live macOS Menu Bar Mockup */}
                <div className="relative w-full h-11 bg-[#1e1e1f] border border-neutral-800/80 rounded-xl overflow-hidden flex items-center justify-between px-4 select-none shadow-sm">
                  {/* Left Side: Apple Logo & App Menus */}
                  <div className="flex items-center gap-3 text-neutral-400 font-sans text-xs">
                    <span className="text-neutral-200 text-sm font-sans"></span>
                    <span className="font-bold text-neutral-200 cursor-default">Peek</span>
                    <span className="hover:text-neutral-200 transition-colors hidden sm:inline cursor-default">File</span>
                    <span className="hover:text-neutral-200 transition-colors hidden sm:inline cursor-default">Edit</span>
                  </div>
                  
                  {/* Right Side: Peek Sensor Item & System Control Icons */}
                  <div className="flex items-center gap-3.5">
                    {/* Our Live Active Sensor Title */}
                    <div 
                      style={widthStyle}
                      className="bg-white/5 border border-white/5 hover:bg-white/10 active:bg-white/20 px-2.5 h-6 rounded-md text-xs font-semibold text-neutral-100 font-mono tracking-wide shadow-sm cursor-default transition-all duration-150 flex items-center whitespace-nowrap overflow-visible"
                    >
                      <span className={cn(
                        "transition-transform duration-150 block w-full",
                        isMiddle ? "translate-y-[0.75px]" : "translate-y-[-1px]",
                        isWidthStabilized ? "text-left" : "text-center"
                      )}>
                        {renderedTitle}
                      </span>
                    </div>
                    
                    {/* System Control Center / Date-Time Mockups */}
                    <div className="flex items-center gap-2.5 text-neutral-400">
                      <Wifi className="h-3.5 w-3.5 text-neutral-400 stroke-[2.2]" />
                      <Battery className="h-3.5 w-3.5 text-neutral-400 stroke-[2.2]" />
                      <span className="text-[11px] font-semibold font-sans text-neutral-300 pl-0.5 tracking-wide cursor-default translate-y-[0.5px]">
                        {new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
}
