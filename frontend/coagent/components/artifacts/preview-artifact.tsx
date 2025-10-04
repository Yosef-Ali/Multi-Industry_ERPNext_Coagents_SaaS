'use client';

/**
 * Preview Artifact
 * Displays live preview of generated app in iframe
 * For /developer route - showing how the generated app looks
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCwIcon, Smartphone, Monitor } from 'lucide-react';

export interface PreviewArtifactProps {
  previewUrl: string;
  onRefresh?: () => void;
}

type ViewportSize = 'mobile' | 'tablet' | 'desktop';

/**
 * PreviewArtifact - Live preview iframe with responsive controls
 *
 * Shows generated ERPNext app in different viewport sizes
 *
 * @example
 * ```tsx
 * <PreviewArtifact
 *   previewUrl="/preview/school-app"
 *   onRefresh={() => console.log('Refreshing preview')}
 * />
 * ```
 */
export function PreviewArtifact({ previewUrl, onRefresh }: PreviewArtifactProps) {
  const [viewport, setViewport] = useState<ViewportSize>('desktop');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setIsLoading(true);
    setRefreshKey((prev) => prev + 1);
    onRefresh?.();
  };

  const viewportSizes: Record<ViewportSize, { width: string; height: string }> = {
    mobile: { width: '375px', height: '667px' },
    tablet: { width: '768px', height: '1024px' },
    desktop: { width: '100%', height: '100%' },
  };

  const currentSize = viewportSizes[viewport];

  return (
    <div className="space-y-4">
      {/* Viewport Controls */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex gap-2">
          <Button
            variant={viewport === 'mobile' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewport('mobile')}
          >
            <Smartphone className="h-4 w-4 mr-2" />
            Mobile
          </Button>
          <Button
            variant={viewport === 'tablet' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewport('tablet')}
          >
            <Monitor className="h-4 w-4 mr-2" />
            Tablet
          </Button>
          <Button
            variant={viewport === 'desktop' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewport('desktop')}
          >
            <Monitor className="h-4 w-4 mr-2" />
            Desktop
          </Button>
        </div>

        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCwIcon className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Preview Frame */}
      <div className="relative flex items-center justify-center bg-muted/20 rounded-lg border min-h-[600px] overflow-auto">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-sm text-muted-foreground">Loading preview...</p>
            </div>
          </div>
        )}

        <div
          className="transition-all duration-300 ease-in-out"
          style={{
            width: currentSize.width,
            height: viewport === 'desktop' ? '600px' : currentSize.height,
            maxWidth: '100%',
          }}
        >
          <iframe
            key={refreshKey}
            src={previewUrl}
            className="w-full h-full rounded-lg border bg-background"
            onLoad={() => setIsLoading(false)}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            title="App Preview"
          />
        </div>
      </div>

      {/* Preview Info */}
      <div className="text-xs text-muted-foreground text-center">
        Preview URL: <code className="bg-muted px-1 py-0.5 rounded">{previewUrl}</code>
      </div>
    </div>
  );
}
