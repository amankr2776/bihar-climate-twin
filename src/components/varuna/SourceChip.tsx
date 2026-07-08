import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type Props = {
  source: string;
  dataset?: string;
  updated?: string;
  resolution?: string;
  cadence?: string;
};

/**
 * Small provenance chip surfacing dataset source + freshness on every widget.
 * Required by ISRO/national-data provenance norms.
 */
export function SourceChip({ source, dataset, updated, resolution, cadence }: Props) {
  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded border border-border bg-background/40 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
            aria-label={`Data source: ${source}`}
          >
            <Info className="h-2.5 w-2.5" />
            {source}
            {updated && <span className="text-[color:var(--brand-cyan)]">· {updated}</span>}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-[11px]">
          <div className="space-y-0.5">
            <div><span className="text-muted-foreground">Source:</span> {source}</div>
            {dataset && <div><span className="text-muted-foreground">Dataset:</span> {dataset}</div>}
            {resolution && <div><span className="text-muted-foreground">Resolution:</span> {resolution}</div>}
            {cadence && <div><span className="text-muted-foreground">Cadence:</span> {cadence}</div>}
            {updated && <div><span className="text-muted-foreground">Last updated:</span> {updated}</div>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
