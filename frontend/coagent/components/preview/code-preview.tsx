'use client';

import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { Artifact } from '@/lib/types/artifact';

interface CodePreviewProps {
  artifact: Artifact;
}

export function CodePreview({ artifact }: CodePreviewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(artifact.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([artifact.code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${artifact.title.toLowerCase().replace(/\s+/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Format JSON for better display
  const formattedCode = (() => {
    try {
      const parsed = JSON.parse(artifact.code);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return artifact.code;
    }
  })();

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h2 className="text-2xl font-bold">{artifact.title}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {artifact.description}
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="px-3 py-2 text-sm border rounded hover:bg-gray-100 transition-colors"
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
          <button
            onClick={handleDownload}
            className="px-3 py-2 text-sm border rounded hover:bg-gray-100 transition-colors"
          >
            Download
          </button>
        </div>
      </div>

      {/* Code Display */}
      <div className="rounded-lg overflow-hidden border">
        <SyntaxHighlighter
          language="json"
          style={vscDarkPlus}
          customStyle={{
            margin: 0,
            borderRadius: 0,
            fontSize: '14px',
          }}
          showLineNumbers
        >
          {formattedCode}
        </SyntaxHighlighter>
      </div>

      {/* Metadata */}
      <div className="border-t pt-4 space-y-2 text-sm">
        <h3 className="font-semibold">Metadata</h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">Type:</span>{' '}
            <span className="font-medium">{artifact.type}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Variant:</span>{' '}
            <span className="font-medium">{artifact.variant}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Status:</span>{' '}
            <span className="font-medium capitalize">{artifact.status}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Created:</span>{' '}
            <span className="font-medium">
              {new Date(artifact.createdAt).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
