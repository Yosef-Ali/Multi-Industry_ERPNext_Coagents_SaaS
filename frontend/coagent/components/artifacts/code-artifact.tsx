'use client';

/**
 * Code Artifact
 * Displays code with syntax highlighting using Shiki
 * For /developer route - showing generated code
 */

import { useEffect, useState } from 'react';
import { codeToHtml } from 'shiki';

export interface CodeArtifactProps {
	code: string;
	language: 'typescript' | 'python' | 'javascript' | 'json' | 'tsx' | 'jsx';
	theme?: 'dark-plus' | 'light-plus';
}

/**
 * CodeArtifact - Syntax-highlighted code viewer
 *
 * Uses Shiki for beautiful syntax highlighting
 *
 * @example
 * ```tsx
 * <CodeArtifact
 *   code="export function Hello() { return <div>Hello</div> }"
 *   language="typescript"
 * />
 * ```
 */
export function CodeArtifact({ code, language, theme = 'dark-plus' }: CodeArtifactProps) {
	const [highlightedHtml, setHighlightedHtml] = useState<string>('');
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const highlightCode = async () => {
			setIsLoading(true);
			try {
				const html = await codeToHtml(code, {
					lang: language,
					theme: theme,
				});
				setHighlightedHtml(html);
			} catch (error) {
				console.error('Failed to highlight code:', error);
				// Fallback to plain text
				setHighlightedHtml(`<pre><code>${escapeHtml(code)}</code></pre>`);
			} finally {
				setIsLoading(false);
			}
		};

		highlightCode();
	}, [code, language, theme]);

	if (isLoading) {
		return (
			<div className="rounded-lg bg-muted p-4">
				<div className="animate-pulse space-y-2">
					<div className="h-4 bg-muted-foreground/20 rounded w-3/4"></div>
					<div className="h-4 bg-muted-foreground/20 rounded w-full"></div>
					<div className="h-4 bg-muted-foreground/20 rounded w-5/6"></div>
				</div>
			</div>
		);
	}

	return (
		<div className="relative rounded-lg overflow-hidden border">
			<div
				className="overflow-x-auto max-h-[600px]"
				dangerouslySetInnerHTML={{ __html: highlightedHtml }}
			/>
		</div>
	);
}

/**
 * Escape HTML for fallback display
 */
function escapeHtml(text: string): string {
	const div = document.createElement('div');
	div.textContent = text;
	return div.innerHTML;
}
