'use client';

import { useState } from 'react';
import { useArtifactStore } from '@/lib/store/artifact-store';

export function RefinementInput() {
    const [prompt, setPrompt] = useState('');
    const { currentVariantSet, selectedVariant, isRefining, startRefinement } = useArtifactStore();

    const handleRefine = async () => {
        if (!prompt.trim() || !currentVariantSet || !selectedVariant) return;

        startRefinement(prompt);

        // TODO: Call API to refine the variant
        // For now, just clear the input
        setPrompt('');
    };

    if (!currentVariantSet || !selectedVariant) return null;

    return (
        <div className="border-t p-4 bg-white">
            <div className="space-y-3">
                <label className="text-sm font-medium">Refine this variant</label>

                <div className="flex gap-2">
                    <input
                        type="text"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleRefine()}
                        placeholder="e.g., 'Add a payment tracking field' or 'Remove the description field'"
                        className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isRefining}
                        data-input="refinement"
                    />                    <button
                        onClick={handleRefine}
                        disabled={!prompt.trim() || isRefining}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isRefining ? (
                            <span className="flex items-center gap-2">
                                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Refining...
                            </span>
                        ) : (
                            'Refine'
                        )}
                    </button>
                </div>

                <div className="flex gap-2 text-xs">
                    <button
                        onClick={() => setPrompt('Add payment tracking')}
                        className="px-2 py-1 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                    >
                        Add field
                    </button>
                    <button
                        onClick={() => setPrompt('Make it simpler')}
                        className="px-2 py-1 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                    >
                        Simplify
                    </button>
                    <button
                        onClick={() => setPrompt('Add more validation')}
                        className="px-2 py-1 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                    >
                        Add validation
                    </button>
                </div>
            </div>
        </div>
    );
}
