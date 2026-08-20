import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ManualProductsAdmin } from '@/components/ManualProductsAdmin';
import { useManualEdit } from '@/contexts/ManualEditContext';

export function ManualEditDialog() {
  const { isOpen, editId, close } = useManualEdit();

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
        </DialogHeader>
        <ManualProductsAdmin initialEditId={editId} onAfterSave={close} />
      </DialogContent>
    </Dialog>
  );
}
