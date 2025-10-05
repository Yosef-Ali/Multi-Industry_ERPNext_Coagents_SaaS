'use client';

/**
 * Artifact Container
 * v0-style container for displaying generated code and previews
 * For /developer route only
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArtifactToolbar } from './artifact-toolbar';
import { CodeArtifact } from './code-artifact';
import { PreviewArtifact } from './preview-artifact';

export interface Artifact {
	id: string;
	title: string;
	type: 'code' | 'preview' | 'both';
	language?: 'typescript' | 'python' | 'javascript' | 'json';
	code?: string;
	previewUrl?: string;
	description?: string;
	createdAt: string;
}

export interface ArtifactContainerProps {
	artifact: Artifact;
	onExport?: (artifact: Artifact) => void;
	onCopy?: (code: string) => void;
	onRefresh?: () => void;
}

/**
 * ArtifactContainer - Main container for v0-style artifacts
 *
 * Displays generated code with syntax highlighting and optional preview
 *
 * @example
 * ```tsx
 * <ArtifactContainer
 *   artifact={{
 *     id: '1',
 *     title: 'Student Enrollment Form',
 *     type: 'both',
 *     language: 'typescript',
 *     code: 'export function StudentForm() { ... }',
 *     previewUrl: '/preview/student-form',
 *   }}
 * />
 * ```
 */
export function ArtifactContainer({
	artifact,
	onExport,
	onCopy,
	onRefresh,
}: ArtifactContainerProps) {
	const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code');

	const handleExport = () => {
		onExport?.(artifact);
	};

	const handleCopy = () => {
		if (artifact.code) {
			navigator.clipboard.writeText(artifact.code);
			onCopy?.(artifact.code);
		}
	};

	return (
		<Card className="w-full">
			<CardHeader className="space-y-1">
				<div className="flex items-center justify-between">
					<CardTitle className="text-lg">{artifact.title}</CardTitle>
					<ArtifactToolbar
						artifact={artifact}
						onExport={handleExport}
						onCopy={handleCopy}
						onRefresh={onRefresh}
					/>
				</div>
				{artifact.description && (
					<p className="text-sm text-muted-foreground">{artifact.description}</p>
				)}
			</CardHeader>

			<CardContent>
				{artifact.type === 'both' ? (
					<Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'code' | 'preview')}>
						<TabsList className="grid w-full grid-cols-2">
							<TabsTrigger value="code">Code</TabsTrigger>
							<TabsTrigger value="preview">Preview</TabsTrigger>
						</TabsList>

						<TabsContent value="code" className="mt-4">
							<CodeArtifact
								code={artifact.code || ''}
								language={artifact.language || 'typescript'}
							/>
						</TabsContent>

						<TabsContent value="preview" className="mt-4">
							<PreviewArtifact previewUrl={artifact.previewUrl || ''} />
						</TabsContent>
					</Tabs>
				) : artifact.type === 'code' ? (
					<CodeArtifact code={artifact.code || ''} language={artifact.language || 'typescript'} />
				) : (
					<PreviewArtifact previewUrl={artifact.previewUrl || ''} />
				)}
			</CardContent>
		</Card>
	);
}
