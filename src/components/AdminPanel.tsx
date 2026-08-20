import React, { useState, useCallback } from 'react';
import { MoreVertical, Upload, FileSpreadsheet, Download, Check, Edit2, X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUploadLogs, UploadLog } from '@/hooks/useUploadLogs';
import { useToast } from '@/hooks/use-toast';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { ManualProductsAdmin } from '@/components/ManualProductsAdmin';
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard';
import { InvoiceHistoryAdmin } from '@/components/InvoiceHistoryAdmin';
import { BackupAdmin } from '@/components/BackupAdmin';
import { DailyCurrencyRatesAdmin } from '@/components/DailyCurrencyRatesAdmin';
import { format } from 'date-fns';
 
 interface AdminPanelProps {
   onFileUploaded?: (pageKey: 'lcd' | 'misc' | 'goshi') => void;
 }
 
 export function AdminPanel({ onFileUploaded }: AdminPanelProps) {
   const [isOpen, setIsOpen] = useState(false);
   const { isAdmin, login, logout } = useAdminAuth();
   const [password, setPassword] = useState('');
    const [passwordError, setPasswordError] = useState(false);
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
    const [editingNoteValue, setEditingNoteValue] = useState('');
    const [deleteConfirmLog, setDeleteConfirmLog] = useState<UploadLog | null>(null);
    
    const { logs, isLoading, uploadFile, updateNote, setActiveFile, getDownloadUrl, deleteLog } = useUploadLogs();
    const { toast } = useToast();
 
   const handlePasswordSubmit = useCallback((e: React.FormEvent) => {
     e.preventDefault();
     if (login(password)) {
       setPasswordError(false);
     } else {
       setPasswordError(true);
     }
   }, [password, login]);
 
   const handleFileUpload = useCallback(async (
     e: React.ChangeEvent<HTMLInputElement>,
     pageKey: 'lcd' | 'misc' | 'goshi'
   ) => {
     const file = e.target.files?.[0];
     if (!file) return;
 
     const success = await uploadFile(file, pageKey);
     if (success) {
       toast({
         title: 'File uploaded',
         description: `${file.name} is now active for ${pageKey === 'lcd' ? 'LCD' : 'Misc'} page`,
       });
       onFileUploaded?.(pageKey);
     } else {
       toast({
         title: 'Upload failed',
         description: 'Could not upload the file. Please try again.',
         variant: 'destructive',
       });
     }
     e.target.value = '';
   }, [uploadFile, toast, onFileUploaded]);
 
   const handleSetActive = useCallback(async (log: UploadLog) => {
     const success = await setActiveFile(log.id, log.page_key);
     if (success) {
       toast({
         title: 'Active file changed',
         description: `${log.file_name} is now active`,
       });
       onFileUploaded?.(log.page_key);
     }
   }, [setActiveFile, toast, onFileUploaded]);
 
   const handleStartEditNote = useCallback((log: UploadLog) => {
     setEditingNoteId(log.id);
     setEditingNoteValue(log.note || '');
   }, []);
 
   const handleSaveNote = useCallback(async () => {
     if (!editingNoteId) return;
     await updateNote(editingNoteId, editingNoteValue);
     setEditingNoteId(null);
     setEditingNoteValue('');
   }, [editingNoteId, editingNoteValue, updateNote]);
 
   const handleCancelEditNote = useCallback(() => {
     setEditingNoteId(null);
     setEditingNoteValue('');
   }, []);
 
    const handleClose = useCallback(() => {
      setIsOpen(false);
      setPassword('');
      setPasswordError(false);
      setDeleteConfirmLog(null);
    }, []);

    const handleDeleteClick = useCallback((log: UploadLog) => {
      setDeleteConfirmLog(log);
    }, []);

    const handleConfirmDelete = useCallback(async () => {
      if (!deleteConfirmLog) return;
      
      const success = await deleteLog(deleteConfirmLog.id, deleteConfirmLog.storage_path);
      if (success) {
        toast({
          title: 'File deleted',
          description: `${deleteConfirmLog.file_name} has been removed`,
        });
        if (deleteConfirmLog.is_active) {
          onFileUploaded?.(deleteConfirmLog.page_key);
        }
      } else {
        toast({
          title: 'Delete failed',
          description: 'Could not delete the file. Please try again.',
          variant: 'destructive',
        });
      }
      setDeleteConfirmLog(null);
    }, [deleteConfirmLog, deleteLog, toast, onFileUploaded]);

    const lcdLogs = logs.filter(l => l.page_key === 'lcd');
    const miscLogs = logs.filter(l => l.page_key === 'misc');
    const goshiLogs = logs.filter(l => l.page_key === 'goshi');
 
   return (
     <>
       <Button
         variant="ghost"
         size="icon"
         onClick={() => setIsOpen(true)}
         className="h-8 w-8"
         title="Admin Panel"
       >
         <MoreVertical className="h-5 w-5" />
       </Button>
 
       <Dialog open={isOpen} onOpenChange={handleClose}>
         <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
           <DialogHeader>
             <DialogTitle>Admin Panel</DialogTitle>
           </DialogHeader>
 
           {!isAdmin ? (
             <form onSubmit={handlePasswordSubmit} className="space-y-4">
               <div>
                 <Input
                   type="password"
                   placeholder="Enter password"
                   value={password}
                   onChange={(e) => {
                     setPassword(e.target.value);
                     setPasswordError(false);
                   }}
                   className={passwordError ? 'border-destructive' : ''}
                 />
                 {passwordError && (
                   <p className="text-sm text-destructive mt-1">Incorrect password</p>
                 )}
               </div>
               <Button type="submit" className="w-full">
                 Login
               </Button>
             </form>
           ) : (
               <Tabs defaultValue="upload" className="w-full">
                 <TabsList className="grid w-full grid-cols-7">
                   <TabsTrigger value="upload">Upload</TabsTrigger>
                   <TabsTrigger value="add">Products</TabsTrigger>
                   <TabsTrigger value="logs">Logs</TabsTrigger>
                   <TabsTrigger value="analytics">Analytics</TabsTrigger>
                   <TabsTrigger value="invoices">فاکتورها</TabsTrigger>
                   <TabsTrigger value="rates">نرخ ارز</TabsTrigger>
                   <TabsTrigger value="backup">پشتیبان</TabsTrigger>
                 </TabsList>

                 <TabsContent value="add" className="mt-4">
                   <ManualProductsAdmin />
                 </TabsContent>

                 <TabsContent value="analytics" className="mt-4">
                   <AnalyticsDashboard />
                 </TabsContent>

                 <TabsContent value="invoices" className="mt-4">
                   <InvoiceHistoryAdmin />
                 </TabsContent>

                 <TabsContent value="rates" className="mt-4">
                   <DailyCurrencyRatesAdmin />
                 </TabsContent>

                 <TabsContent value="backup" className="mt-4">
                   <BackupAdmin />
                 </TabsContent>

 
               <TabsContent value="upload" className="space-y-6 mt-4">
                 {/* LCD Upload */}
                 <div className="border rounded-lg p-4">
                   <h3 className="font-semibold mb-3 flex items-center gap-2">
                     <FileSpreadsheet className="h-5 w-5" />
                     LCD Page (ال‌سی‌دی)
                   </h3>
                   <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent transition-colors">
                     <Upload className="h-5 w-5" />
                     <span>Upload Excel File</span>
                     <input
                       type="file"
                       accept=".xlsx,.xls"
                       onChange={(e) => handleFileUpload(e, 'lcd')}
                       className="hidden"
                       disabled={isLoading}
                     />
                   </label>
                   {lcdLogs.find(l => l.is_active) && (
                     <p className="text-sm text-muted-foreground mt-2">
                       Active: {lcdLogs.find(l => l.is_active)?.file_name}
                     </p>
                   )}
                 </div>
 
                 {/* Goshi Upload */}
                 <div className="border rounded-lg p-4">
                   <h3 className="font-semibold mb-3 flex items-center gap-2">
                     <FileSpreadsheet className="h-5 w-5" />
                     Goshi Page (گوشی)
                   </h3>
                   <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent transition-colors">
                     <Upload className="h-5 w-5" />
                     <span>Upload Excel File</span>
                     <input
                       type="file"
                       accept=".xlsx,.xls"
                       onChange={(e) => handleFileUpload(e, 'goshi')}
                       className="hidden"
                       disabled={isLoading}
                     />
                   </label>
                   {goshiLogs.find(l => l.is_active) && (
                     <p className="text-sm text-muted-foreground mt-2">
                       Active: {goshiLogs.find(l => l.is_active)?.file_name}
                     </p>
                   )}
                 </div>

                 {/* Misc Upload */}
                 <div className="border rounded-lg p-4">
                   <h3 className="font-semibold mb-3 flex items-center gap-2">
                     <FileSpreadsheet className="h-5 w-5" />
                     Misc Page (متفرقه)
                   </h3>
                   <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent transition-colors">
                     <Upload className="h-5 w-5" />
                     <span>Upload Excel File</span>
                     <input
                       type="file"
                       accept=".xlsx,.xls"
                       onChange={(e) => handleFileUpload(e, 'misc')}
                       className="hidden"
                       disabled={isLoading}
                     />
                   </label>
                   {miscLogs.find(l => l.is_active) && (
                     <p className="text-sm text-muted-foreground mt-2">
                       Active: {miscLogs.find(l => l.is_active)?.file_name}
                     </p>
                   )}
                 </div>
               </TabsContent>
 
               <TabsContent value="logs" className="mt-4">
                 <div className="space-y-4">
                   {logs.length === 0 ? (
                     <p className="text-center text-muted-foreground py-8">
                       No upload logs yet
                     </p>
                   ) : (
                     <div className="space-y-2">
                       {logs.map((log) => (
                         <div
                           key={log.id}
                           className={`border rounded-lg p-3 ${log.is_active ? 'border-primary bg-primary/5' : ''}`}
                         >
                           <div className="flex items-start justify-between gap-2">
                             <div className="flex-1 min-w-0">
                               <div className="flex items-center gap-2">
                                 <span className="font-medium truncate">{log.file_name}</span>
                                 {log.is_active && (
                                   <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                                     Active
                                   </span>
                                 )}
                                  <span className="text-xs text-muted-foreground">
                                    {log.page_key === 'lcd' ? 'LCD' : log.page_key === 'goshi' ? 'Goshi' : 'Misc'}
                                  </span>
                                </div>
                               <p className="text-sm text-muted-foreground">
                                 {format(new Date(log.uploaded_at), 'yyyy-MM-dd HH:mm')}
                               </p>
                               
                               {/* Note editing */}
                               {editingNoteId === log.id ? (
                                 <div className="flex items-center gap-2 mt-2">
                                   <Input
                                     value={editingNoteValue}
                                     onChange={(e) => setEditingNoteValue(e.target.value)}
                                     placeholder="Add note..."
                                     className="h-8 text-sm"
                                   />
                                   <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSaveNote}>
                                     <Check className="h-4 w-4" />
                                   </Button>
                                   <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCancelEditNote}>
                                     <X className="h-4 w-4" />
                                   </Button>
                                 </div>
                               ) : (
                                 <div className="flex items-center gap-2 mt-1">
                                   <span className="text-sm text-muted-foreground">
                                     {log.note || 'No note'}
                                   </span>
                                   <Button
                                     size="icon"
                                     variant="ghost"
                                     className="h-6 w-6"
                                     onClick={() => handleStartEditNote(log)}
                                   >
                                     <Edit2 className="h-3 w-3" />
                                   </Button>
                                 </div>
                               )}
                             </div>
                             
                             <div className="flex items-center gap-1">
                               {!log.is_active && (
                                 <Button
                                   size="sm"
                                   variant="outline"
                                   onClick={() => handleSetActive(log)}
                                 >
                                   Set Active
                                 </Button>
                               )}
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                  asChild
                                >
                                  <a href={getDownloadUrl(log.storage_path)} download={log.file_name}>
                                    <Download className="h-4 w-4" />
                                  </a>
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => handleDeleteClick(log)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteConfirmLog} onOpenChange={(open) => !open && setDeleteConfirmLog(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this file?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{deleteConfirmLog?.file_name}"? 
                This will permanently remove the file from storage and cannot be undone.
                {deleteConfirmLog?.is_active && (
                  <span className="block mt-2 font-medium text-destructive">
                    Warning: This is the currently active file for {deleteConfirmLog.page_key === 'lcd' ? 'LCD' : 'Misc'} page.
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }