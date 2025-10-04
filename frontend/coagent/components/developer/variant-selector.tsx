'use client';

import { useArtifactStore } from '@/lib/store/artifact-store';

export function VariantSelector() {
	const { currentVariantSet, selectedVariant, selectVariant } = useArtifactStore();

	if (!currentVariantSet) return null;

	const variants = currentVariantSet.variants;

	return (
		<div className="flex gap-2 p-4 border-b bg-gray-50">
			{[1, 2, 3].map((variantNum) => {
				const variant = variants[variantNum - 1];
				const isSelected = selectedVariant === variantNum;

				return (
					<button
						key={variantNum}
						onClick={() => selectVariant(variantNum as 1 | 2 | 3)}
						className={`
              flex-1 px-4 py-3 rounded-lg border-2 transition-all
              ${
								isSelected
									? 'border-blue-500 bg-blue-50 shadow-sm'
									: 'border-gray-200 bg-white hover:border-gray-300'
							}
            `}
					>
						<div className="text-left">
							<div className="flex items-center gap-2">
								<span
									className={`
                    text-xs font-medium px-2 py-1 rounded
                    ${isSelected ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}
                  `}
								>
									Variant {variantNum}
								</span>
								{variant && (
									<span className="text-sm font-semibold">
										{variantNum === 1 ? 'Minimal' : variantNum === 2 ? 'Balanced' : 'Advanced'}
									</span>
								)}
							</div>
							{variant && (
								<p className="text-xs text-muted-foreground mt-1 line-clamp-2">
									{variant.description}
								</p>
							)}
						</div>
					</button>
				);
			})}
		</div>
	);
}
