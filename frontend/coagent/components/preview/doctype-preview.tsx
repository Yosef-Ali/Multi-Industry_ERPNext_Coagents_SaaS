'use client';

import { useMemo } from 'react';
import type { DocTypeArtifact } from '@/lib/types/artifact';

interface DocTypePreviewProps {
  artifact: DocTypeArtifact;
}

export function DocTypePreview({ artifact }: DocTypePreviewProps) {
  const docType = useMemo(() => {
    try {
      return JSON.parse(artifact.code);
    } catch (e) {
      console.error('Failed to parse DocType:', e);
      return null;
    }
  }, [artifact.code]);

  if (!docType) {
    return (
      <div className="p-4 text-red-500">
        Failed to parse DocType definition
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="border-b pb-4">
        <h2 className="text-2xl font-bold">{docType.name}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Module: {docType.module || 'Custom'}
        </p>
      </div>

      {/* Form Preview */}
      <div className="space-y-4">
        {artifact.metadata.fields?.map((field, idx) => (
          <div key={field.fieldname || idx} className="space-y-2">
            {field.fieldtype === 'Section Break' ? (
              <div className="border-t pt-4 mt-4">
                <h3 className="text-lg font-semibold">{field.label}</h3>
              </div>
            ) : field.fieldtype === 'Column Break' ? (
              <div className="border-l-2 border-gray-200 pl-4 ml-4" />
            ) : (
              <div className="flex flex-col space-y-1">
                <label className="text-sm font-medium">
                  {field.label}
                  {field.reqd === 1 && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </label>
                
                {/* Field Input Preview */}
                {field.fieldtype === 'Data' && (
                  <input
                    type="text"
                    placeholder={field.default as string || ''}
                    className="border rounded px-3 py-2 text-sm"
                    disabled
                  />
                )}
                
                {field.fieldtype === 'Text' && (
                  <textarea
                    placeholder={field.default as string || ''}
                    className="border rounded px-3 py-2 text-sm h-20"
                    disabled
                  />
                )}
                
                {field.fieldtype === 'Text Editor' && (
                  <div className="border rounded px-3 py-2 text-sm h-32 bg-gray-50">
                    <p className="text-gray-400">Rich text editor</p>
                  </div>
                )}
                
                {field.fieldtype === 'Select' && (
                  <select className="border rounded px-3 py-2 text-sm" disabled>
                    <option>Select...</option>
                    {field.options?.split('\n').map((opt, i) => (
                      <option key={i} value={opt}>{opt}</option>
                    ))}
                  </select>
                )}
                
                {field.fieldtype === 'Link' && (
                  <div className="border rounded px-3 py-2 text-sm bg-gray-50">
                    <span className="text-gray-400">
                      Link to {field.options}
                    </span>
                  </div>
                )}
                
                {field.fieldtype === 'Date' && (
                  <input
                    type="date"
                    className="border rounded px-3 py-2 text-sm"
                    disabled
                  />
                )}
                
                {field.fieldtype === 'Check' && (
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      className="mr-2"
                      disabled
                    />
                    <span className="text-sm text-gray-600">
                      {field.description || 'Enable'}
                    </span>
                  </div>
                )}

                {field.description && (
                  <p className="text-xs text-muted-foreground">
                    {field.description}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Properties */}
      <div className="border-t pt-4 space-y-2 text-sm">
        <h3 className="font-semibold">Properties</h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {docType.is_submittable === 1 && (
            <div className="flex items-center">
              <span className="w-3 h-3 bg-green-500 rounded-full mr-2" />
              Submittable
            </div>
          )}
          {docType.track_changes === 1 && (
            <div className="flex items-center">
              <span className="w-3 h-3 bg-blue-500 rounded-full mr-2" />
              Track Changes
            </div>
          )}
          {docType.allow_auto_repeat === 1 && (
            <div className="flex items-center">
              <span className="w-3 h-3 bg-purple-500 rounded-full mr-2" />
              Auto Repeat
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
