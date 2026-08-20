import React, { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, GripVertical, Plus, Save, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useVariantPreset,
  DEFAULT_PRESET_BG,
  DEFAULT_PRESET_TEXT,
  type PresetItem,
} from '@/hooks/useVariantPreset';
import { useToast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Row extends PresetItem {
  key: string;
}

export function VariantPresetDialog({ open, onOpenChange }: Props) {
  const { presets, savePreset } = useVariantPreset();
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [saving, setSaving] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      setRows(presets.map(p => ({ ...p, key: crypto.randomUUID() })));
    }
  }, [open, presets]);

  const patch = (key: string, p: Partial<PresetItem>) =>
    setRows(rs => rs.map(r => (r.key === key ? { ...r, ...p } : r)));
  const remove = (key: string) => setRows(rs => rs.filter(r => r.key !== key));
  const add = () =>
    setRows(rs => [
      ...rs,
      { key: crypto.randomUUID(), name: '', badgeColor: DEFAULT_PRESET_BG, textColor: DEFAULT_PRESET_TEXT },
    ]);
  const move = (idx: number, dir: -1 | 1) => {
    const next = idx + dir;
    if (next < 0 || next >= rows.length) return;
    setRows(rs => {
      const copy = [...rs];
      [copy[idx], copy[next]] = [copy[next], copy[idx]];
      return copy;
    });
  };

  const onDragStart = (idx: number) => setDragIdx(idx);
  const onDragOver = (e: React.DragEvent) => e.preventDefault();
  const onDrop = (idx: number) => {
    if (dragIdx === null || dragIdx === idx) return setDragIdx(null);
    setRows(rs => {
      const copy = [...rs];
      const [moved] = copy.splice(dragIdx, 1);
      copy.splice(idx, 0, moved);
      return copy;
    });
    setDragIdx(null);
  };

  const handleSave = async () => {
    setSaving(true);
    const ok = await savePreset(
      rows.map(({ name, badgeColor, textColor }) => ({ name, badgeColor, textColor })),
    );
    setSaving(false);
    if (ok) {
      toast({ title: 'Preset saved' });
      onOpenChange(false);
    } else {
      toast({ title: 'Save failed', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Default Variant Preset</DialogTitle>
          <DialogDescription>
            These variant names and colors are inserted when you click "Insert Default Variants" on a new product.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
          {rows.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-3">
              No preset variants. Add one below.
            </p>
          )}
          {rows.map((r, idx) => (
            <div
              key={r.key}
              draggable
              onDragStart={() => onDragStart(idx)}
              onDragOver={onDragOver}
              onDrop={() => onDrop(idx)}
              className={`flex items-center gap-2 border rounded-md p-2 bg-muted/30 ${
                dragIdx === idx ? 'opacity-50' : ''
              }`}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab shrink-0" />
              <div className="flex flex-col gap-0.5 shrink-0">
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  onClick={() => move(idx, -1)}
                  disabled={idx === 0}
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  onClick={() => move(idx, 1)}
                  disabled={idx === rows.length - 1}
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
              </div>
              <Input
                value={r.name}
                onChange={e => patch(r.key, { name: e.target.value })}
                placeholder="Variant name"
                className="h-9 flex-1 min-w-0"
              />
              <label
                className="flex flex-col items-center gap-0.5 shrink-0"
                title="Background color"
              >
                <span className="text-[9px] text-muted-foreground leading-none">BG</span>
                <input
                  type="color"
                  value={r.badgeColor}
                  onChange={e => patch(r.key, { badgeColor: e.target.value })}
                  className="h-7 w-7 rounded border border-input cursor-pointer bg-transparent p-0"
                />
              </label>
              <label
                className="flex flex-col items-center gap-0.5 shrink-0"
                title="Text color"
              >
                <span className="text-[9px] text-muted-foreground leading-none">Text</span>
                <input
                  type="color"
                  value={r.textColor}
                  onChange={e => patch(r.key, { textColor: e.target.value })}
                  className="h-7 w-7 rounded border border-input cursor-pointer bg-transparent p-0"
                />
              </label>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-destructive shrink-0"
                onClick={() => remove(r.key)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <Button variant="outline" size="sm" onClick={add} className="w-full">
          <Plus className="h-4 w-4 mr-1" /> Add Preset Variant
        </Button>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-1" /> Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-1" /> {saving ? 'Saving...' : 'Save Preset'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
