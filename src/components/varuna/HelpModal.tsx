import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function HelpButton({ title, description }: { title: string; description: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5 border-border bg-panel/60 text-xs"
      >
        <HelpCircle className="h-3.5 w-3.5" /> Help
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-border bg-panel text-foreground">
          <DialogHeader>
            <DialogTitle className="font-display">{title}</DialogTitle>
            <DialogDescription className="whitespace-pre-wrap text-sm text-muted-foreground">
              {description}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function PageHeader({
  title,
  subtitle,
  help,
  actions,
}: {
  title: string;
  subtitle?: string;
  help?: { title: string; description: string };
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        <h1 className="font-display text-xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        {actions}
        {help && <HelpButton title={help.title} description={help.description} />}
      </div>
    </div>
  );
}
