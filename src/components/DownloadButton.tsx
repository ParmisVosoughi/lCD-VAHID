 import React, { useState, useEffect } from 'react';
 import { Download } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { useUploadLogs } from '@/hooks/useUploadLogs';
 import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
 
 interface DownloadButtonProps {
   pageKey: 'lcd' | 'misc' | 'goshi';
 }
 
 export function DownloadButton({ pageKey }: DownloadButtonProps) {
   const { getActiveFile, getDownloadUrl } = useUploadLogs();
   const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
   const [fileName, setFileName] = useState<string | null>(null);
 
    useEffect(() => {
      const fetchActiveFile = async () => {
        const activeFile = await getActiveFile(pageKey);
        if (activeFile) {
          // Bust browser/CDN cache so the latest auto-saved version is downloaded
          const baseUrl = getDownloadUrl(activeFile.storage_path);
          const versionTag = encodeURIComponent(activeFile.uploaded_at || String(Date.now()));
          const sep = baseUrl.includes('?') ? '&' : '?';
          setDownloadUrl(`${baseUrl}${sep}v=${versionTag}`);
          setFileName(activeFile.file_name);
        } else {
          setDownloadUrl(null);
          setFileName(null);
        }
      };
      fetchActiveFile();
    }, [pageKey, getActiveFile, getDownloadUrl]);
 
   if (!downloadUrl) return null;
 
   return (
     <Tooltip>
       <TooltipTrigger asChild>
         <Button
           variant="outline"
           size="icon"
           className="h-10 w-10"
           asChild
         >
           <a href={downloadUrl} download={fileName || undefined}>
             <Download className="h-5 w-5" />
           </a>
         </Button>
       </TooltipTrigger>
       <TooltipContent>
         <p>Download {fileName}</p>
       </TooltipContent>
     </Tooltip>
   );
 }