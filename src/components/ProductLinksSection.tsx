import React, { useEffect, useState } from 'react';
import { Link as LinkIcon, Image as ImageIcon, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { isValidHttpUrl } from '@/lib/urlUtils';

interface ProductLinksSectionProps {
  websiteProductUrl: string;
  thumbnailUrl: string;
  showThumbnail: boolean;
  onChange: (patch: {
    websiteProductUrl?: string;
    thumbnailUrl?: string;
    showThumbnail?: boolean;
  }) => void;
}

export function ProductLinksSection({
  websiteProductUrl,
  thumbnailUrl,
  showThumbnail,
  onChange,
}: ProductLinksSectionProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const siteOk = isValidHttpUrl(websiteProductUrl);
  const imgOk = isValidHttpUrl(thumbnailUrl);

  useEffect(() => { setImgFailed(false); }, [thumbnailUrl]);

  // Toggle must never stay on without a valid image URL.
  useEffect(() => {
    if (!imgOk && showThumbnail) onChange({ showThumbnail: false });
  }, [imgOk, showThumbnail, onChange]);

  return (
    <div dir="rtl" className="border rounded-lg p-3 space-y-3 bg-muted/20">
      <h4 className="text-sm font-semibold">لینک و تصویر محصول</h4>

      <div className="space-y-1">
        <label className="text-xs font-medium block">لینک صفحه محصول در سایت</label>
        <div className="relative">
          <LinkIcon className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            dir="ltr"
            value={websiteProductUrl}
            onChange={e => onChange({ websiteProductUrl: e.target.value })}
            placeholder="https://example.com/product/123"
            className="pr-8 h-8 text-xs"
          />
        </div>
        {websiteProductUrl.trim() && !siteOk && (
          <p className="text-xs text-destructive">آدرس لینک معتبر نیست.</p>
        )}
        {siteOk && (
          <button
            type="button"
            onClick={() => window.open(websiteProductUrl.trim(), '_blank', 'noopener,noreferrer')}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            باز کردن لینک
          </button>
        )}
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium block">لینک تصویر کوچک محصول</label>
        <div className="flex items-start gap-2">
          <div className="relative flex-1 min-w-0">
            <ImageIcon className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              dir="ltr"
              value={thumbnailUrl}
              onChange={e => onChange({ thumbnailUrl: e.target.value })}
              placeholder="https://example.com/image.jpg"
              className="pr-8 h-8 text-xs"
            />
          </div>
          {imgOk && (
            <div
              className="shrink-0 rounded-md border bg-muted overflow-hidden flex items-center justify-center"
              style={{ width: 44, height: 44, flex: '0 0 44px', maxWidth: 44 }}
            >
              {imgFailed ? (
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
              ) : (
                <img
                  src={thumbnailUrl.trim()}
                  alt="پیش‌نمایش تصویر محصول"
                  loading="lazy"
                  onError={() => setImgFailed(true)}
                  style={{ width: 44, height: 44, objectFit: 'contain' }}
                />
              )}
            </div>
          )}
        </div>
        {thumbnailUrl.trim() && !imgOk && (
          <p className="text-xs text-destructive">آدرس تصویر معتبر نیست.</p>
        )}
        {imgOk && imgFailed && (
          <p className="text-xs text-muted-foreground">تصویر بارگذاری نشد.</p>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-medium">نمایش تصویر کنار ویژگی‌ها</label>
        <Switch
          checked={showThumbnail && imgOk}
          disabled={!imgOk}
          onCheckedChange={v => onChange({ showThumbnail: v })}
        />
      </div>
    </div>
  );
}
