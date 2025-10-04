'use client';

/**
 * Artifact Toolbar
 * Action buttons for artifacts (copy, export, refresh)
 * For /developer route
 */

import { Button } from '@/components/ui/button';
import { CopyIcon, DownloadIcon, RefreshCwIcon, CheckIcon } from 'lucide-react';
import { useState } from 'react';
import type { Artifact } from './artifact-container';

export interface ArtifactToolbarProps {
  artifact: Artifact;
  onCopy?: () => void;
  onExport?: () => void;
  onRefresh?: () => void;
}

/**
 * ArtifactToolbar - Action buttons for artifacts
 *
 * Provides copy, export, and refresh functionality
 *
 * @example
 * ```tsx
 * <ArtifactToolbar
 *   artifact={myArtifact}
 *   onCopy={() => console.log('Copied!')}
 *   onExport={() => console.log('Exported!')}
 * />
 * ```
 */
export function ArtifactToolbar({
  artifact,
  onCopy,
  onExport,
  onRefresh,
}: ArtifactToolbarProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    onCopy?.();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2">
      {/* Copy Button */}
      {artifact.code && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-8"
        >
          {copied ? (
            <>
              <CheckIcon className="h-4 w-4 mr-2" />
              Copied
            </>
          ) : (
            <>
              <CopyIcon className="h-4 w-4 mr-2" />
              Copy
            </>
          )}
        </Button>
      )}

      {/* Export/Download Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onExport}
        className="h-8"
      >
        <DownloadIcon className="h-4 w-4 mr-2" />
        Export
      </Button>

      {/* Refresh Button */}
      {onRefresh && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          className="h-8"
        >
          <RefreshCwIcon className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      )}
    </div>
  );
}
