import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ParsingReport } from '@/types/misc-product';

interface ParsingReportsProps {
  reports: ParsingReport[];
}

export function ParsingReports({ reports }: ParsingReportsProps) {
  if (reports.length === 0) {
    return null;
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
        >
          <AlertTriangle className="h-4 w-4" />
          <span>{reports.length} Report{reports.length !== 1 ? 's' : ''}</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-foreground">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Parsing Reports
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          <p className="text-sm text-muted-foreground mb-4">
            The following columns could not be automatically classified during parsing:
          </p>
          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="space-y-3 pr-4">
              {reports.map((report, idx) => (
                <div 
                  key={idx}
                  className="p-4 rounded-lg border border-border bg-muted/50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-semibold text-sm bg-secondary text-secondary-foreground px-2 py-0.5 rounded">
                      Column {report.columnLetter}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {report.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/80">
                    {report.reason}
                  </p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
