import React, { createContext, useCallback, useContext, useState, ReactNode } from 'react';

interface ManualEditContextType {
  isOpen: boolean;
  editId: string | null;
  openEdit: (productId: string) => void;
  close: () => void;
}

const ManualEditContext = createContext<ManualEditContextType | null>(null);

export function ManualEditProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const openEdit = useCallback((productId: string) => {
    setEditId(productId);
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setEditId(null);
  }, []);

  return (
    <ManualEditContext.Provider value={{ isOpen, editId, openEdit, close }}>
      {children}
    </ManualEditContext.Provider>
  );
}

export function useManualEdit() {
  const ctx = useContext(ManualEditContext);
  if (!ctx) throw new Error('useManualEdit must be used within ManualEditProvider');
  return ctx;
}
