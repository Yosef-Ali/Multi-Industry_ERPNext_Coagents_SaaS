'use client';

import equal from 'fast-deep-equal';
import { AnimatePresence, motion } from 'framer-motion';
import { type MouseEvent, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import { useArtifact } from '@/hooks/use-artifact';
import type { Document } from '@/lib/db/schema';
import { cn, fetcher } from '@/lib/utils';
import type { ArtifactKind, UIArtifact } from './artifact';
import { CodeEditor } from './code-editor';
import { FileIcon, FullscreenIcon, ImageIcon, LoaderIcon } from './icons';
import { ImageEditor } from './image-editor';
import { SpreadsheetEditor } from './sheet-editor';
import { Editor } from './text-editor';

type DocumentPreviewProps = {
	isReadonly: boolean;
	result?: any;
	args?: any;
};

export function DocumentPreview({ isReadonly, result, args }: DocumentPreviewProps) {
	const { artifact, setArtifact } = useArtifact();

	const { data: documents, isLoading: isDocumentsFetching } = useSWR<Document[]>(
		result ? `/api/document?id=${result.id}` : null,
		fetcher
	);

	const previewDocument = useMemo(() => documents?.[0], [documents]);
	const hitboxRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const boundingBox = hitboxRef.current?.getBoundingClientRect();

		if (artifact.documentId && boundingBox) {
			setArtifact((currentArtifact) => ({
				...currentArtifact,
				boundingBox: {
					left: boundingBox.x,
					top: boundingBox.y,
					width: boundingBox.width,
					height: boundingBox.height,
				},
			}));
		}
	}, [artifact.documentId, setArtifact]);

	if (isDocumentsFetching) {
		return null;
	}

	const document: Document | null = previewDocument
		? previewDocument
		: artifact.status === 'streaming'
			? {
				title: artifact.title,
				kind: artifact.kind,
				content: artifact.content,
				id: artifact.documentId,
				createdAt: new Date(),
				userId: 'noop',
			}
			: null;

	if (!document) {
		return null;
	}

	return (
		<motion.div
			animate={{ opacity: 1, y: 0, scale: 1 }}
			className="relative w-full cursor-pointer overflow-hidden rounded-2xl shadow-[0_18px_45px_rgba(15,23,42,0.08)] transition-shadow duration-500 hover:shadow-[0_26px_55px_rgba(15,23,42,0.12)] dark:shadow-[0_26px_65px_rgba(0,0,0,0.65)]"
			initial={{ opacity: 0, y: 12, scale: 0.98 }}
		>
			<HitboxLayer hitboxRef={hitboxRef} result={result} setArtifact={setArtifact} />
			<motion.div
				animate={{ opacity: 1, y: 0 }}
				initial={{ opacity: 0, y: 6 }}
				transition={{ delay: 0.05, duration: 0.2, ease: 'easeOut' }}
			>
				<DocumentHeader
					isStreaming={artifact.status === 'streaming'}
					kind={document.kind}
					title={document.title}
				/>
				<DocumentContent document={document} />
			</motion.div>
		</motion.div>
	);
}

const PureHitboxLayer = ({
	hitboxRef,
	result,
	setArtifact,
}: {
	hitboxRef: React.RefObject<HTMLDivElement>;
	result: any;
	setArtifact: (updaterFn: UIArtifact | ((currentArtifact: UIArtifact) => UIArtifact)) => void;
}) => {
	const [isHovering, setIsHovering] = useState(false);

	const handleClick = useCallback(
		(event: MouseEvent<HTMLElement>) => {
			const boundingBox = event.currentTarget.getBoundingClientRect();

			setArtifact((artifact) =>
				artifact.status === 'streaming'
					? { ...artifact, isVisible: true }
					: {
						...artifact,
						title: result.title,
						documentId: result.id,
						kind: result.kind,
						isVisible: true,
						boundingBox: {
							left: boundingBox.x,
							top: boundingBox.y,
							width: boundingBox.width,
							height: boundingBox.height,
						},
					}
			);
		},
		[setArtifact, result]
	);

	return (
		<div
			aria-hidden="true"
			className="absolute top-0 left-0 z-10 size-full rounded-2xl"
			onClick={handleClick}
			onMouseEnter={() => setIsHovering(true)}
			onMouseLeave={() => setIsHovering(false)}
			ref={hitboxRef}
			role="presentation"
		>
			<AnimatePresence>
				{isHovering && (
					<motion.div
						animate={{ opacity: 1, scale: 1 }}
						className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent backdrop-blur-sm"
						exit={{ opacity: 0, scale: 1.02 }}
						initial={{ opacity: 0, scale: 0.96 }}
					/>
				)}
			</AnimatePresence>
			<div className="flex w-full items-center justify-end p-4">
				<div className="absolute top-[13px] right-[9px] rounded-lg border border-zinc-300/50 bg-background/70 p-2 shadow-sm backdrop-blur transition-colors duration-200 hover:bg-zinc-100/70 dark:border-zinc-700/70 dark:bg-zinc-900/70 dark:hover:bg-zinc-800/80">
					<FullscreenIcon />
				</div>
			</div>
		</div>
	);
};

const HitboxLayer = memo(PureHitboxLayer, (prevProps, nextProps) => {
	if (!equal(prevProps.result, nextProps.result)) {
		return false;
	}
	return true;
});

const PureDocumentHeader = ({
	title,
	kind,
	isStreaming,
}: {
	title: string;
	kind: ArtifactKind;
	isStreaming: boolean;
}) => (
	<div className="flex flex-row items-start justify-between gap-2 rounded-t-2xl border border-b-0 p-4 sm:items-center dark:border-zinc-700 dark:bg-muted">
		<div className="flex flex-row items-start gap-3 sm:items-center">
			<div className="text-muted-foreground">
				{isStreaming ? (
					<div className="animate-spin">
						<LoaderIcon />
					</div>
				) : kind === 'image' ? (
					<ImageIcon />
				) : (
					<FileIcon />
				)}
			</div>
			<div className="-translate-y-1 font-medium sm:translate-y-0">{title}</div>
		</div>
		<div className="w-8" />
	</div>
);

const DocumentHeader = memo(PureDocumentHeader, (prevProps, nextProps) => {
	if (prevProps.title !== nextProps.title) {
		return false;
	}
	if (prevProps.isStreaming !== nextProps.isStreaming) {
		return false;
	}

	return true;
});

const DocumentContent = ({ document }: { document: Document }) => {
	const { artifact } = useArtifact();

	const containerClassName = cn(
		'h-[257px] overflow-y-scroll rounded-b-2xl border border-t-0 dark:border-zinc-700 dark:bg-muted',
		{
			'p-4 sm:px-14 sm:py-16': document.kind === 'text',
			'p-0': document.kind === 'code',
		}
	);

	const commonProps = {
		content: document.content ?? '',
		isCurrentVersion: true,
		currentVersionIndex: 0,
		status: artifact.status,
		saveContent: () => null,
		suggestions: [],
	};

	const handleSaveContent = () => null;

	return (
		<div className={containerClassName}>
			{document.kind === 'text' ? (
				<Editor {...commonProps} onSaveContent={handleSaveContent} />
			) : document.kind === 'code' ? (
				<div className="relative flex w-full flex-1">
					<div className="absolute inset-0">
						<CodeEditor {...commonProps} onSaveContent={handleSaveContent} />
					</div>
				</div>
			) : document.kind === 'sheet' ? (
				<div className="relative flex size-full flex-1 p-4">
					<div className="absolute inset-0">
						<SpreadsheetEditor {...commonProps} />
					</div>
				</div>
			) : document.kind === 'image' ? (
				<ImageEditor
					content={document.content ?? ''}
					currentVersionIndex={0}
					isCurrentVersion={true}
					isInline={true}
					status={artifact.status}
					title={document.title}
				/>
			) : null}
		</div>
	);
};
