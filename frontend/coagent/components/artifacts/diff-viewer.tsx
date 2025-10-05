'use client';

import { Code2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface DiffLine {
	type: 'added' | 'removed' | 'unchanged';
	lineNumber: number;
	content: string;
}

interface FileDiff {
	filename: string;
	language?: string;
	diff: DiffLine[];
	summary?: {
		additions: number;
		deletions: number;
	};
}

interface DiffViewerProps {
	files: FileDiff[];
	approved?: boolean;
	lintIssues?: Array<{ file: string; line: number; message: string; severity: 'error' | 'warning' }>;
	onApprove?: () => void;
	onReject?: () => void;
}

export function DiffViewer({ files, approved, lintIssues, onApprove, onReject }: DiffViewerProps) {
	const totalAdditions = files.reduce((sum, f) => sum + (f.summary?.additions || 0), 0);
	const totalDeletions = files.reduce((sum, f) => sum + (f.summary?.deletions || 0), 0);

	return (
		<Card className="border-purple-200 bg-purple-50/50">
			<CardHeader className="pb-3">
				<div className="flex items-start justify-between">
					<div className="flex items-center gap-2">
						<Code2 className="h-5 w-5 text-purple-600" />
						<CardTitle className="text-lg">Code Changes</CardTitle>
					</div>
					<div className="flex items-center gap-2">
						{approved && (
							<Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
								<CheckCircle2 className="mr-1 h-3 w-3" />
								Approved
							</Badge>
						)}
						<Badge variant="outline" className="bg-green-50 text-green-700">
							+{totalAdditions}
						</Badge>
						<Badge variant="outline" className="bg-red-50 text-red-700">
							-{totalDeletions}
						</Badge>
					</div>
				</div>
			</CardHeader>

			<CardContent className="space-y-4">
				{/* Lint Issues */}
				{lintIssues && lintIssues.length > 0 && (
					<div className="bg-amber-50 border border-amber-200 rounded p-3">
						<div className="flex items-center gap-2 text-sm font-semibold text-amber-800 mb-2">
							<AlertTriangle className="h-4 w-4" />
							Lint Issues ({lintIssues.length})
						</div>
						<div className="space-y-1">
							{lintIssues.map((issue, idx) => (
								<div key={idx} className="text-sm flex items-start gap-2">
									<Badge
										variant={issue.severity === 'error' ? 'destructive' : 'outline'}
										className="text-xs"
									>
										{issue.severity}
									</Badge>
									<span className="text-gray-700">
										{issue.file}:{issue.line} - {issue.message}
									</span>
								</div>
							))}
						</div>
					</div>
				)}

				{/* File Diffs */}
				{files.map((file, fileIdx) => (
					<div key={fileIdx} className="bg-white rounded border overflow-hidden">
						<div className="bg-gray-100 px-3 py-2 border-b flex items-center justify-between">
							<div className="flex items-center gap-2">
								<span className="font-mono text-sm font-medium">{file.filename}</span>
								{file.language && (
									<Badge variant="secondary" className="text-xs">
										{file.language}
									</Badge>
								)}
							</div>
							{file.summary && (
								<div className="flex gap-2 text-xs">
									<span className="text-green-600">+{file.summary.additions}</span>
									<span className="text-red-600">-{file.summary.deletions}</span>
								</div>
							)}
						</div>

						<div className="font-mono text-xs">
							{file.diff.map((line, lineIdx) => (
								<div
									key={lineIdx}
									className={`flex ${
										line.type === 'added'
											? 'bg-green-50'
											: line.type === 'removed'
											? 'bg-red-50'
											: 'bg-white'
									}`}
								>
									<span
										className={`w-12 text-right px-2 py-1 select-none border-r ${
											line.type === 'added'
												? 'bg-green-100 text-green-700 border-green-200'
												: line.type === 'removed'
												? 'bg-red-100 text-red-700 border-red-200'
												: 'bg-gray-50 text-gray-500 border-gray-200'
										}`}
									>
										{line.lineNumber}
									</span>
									<span
										className={`flex-1 px-3 py-1 ${
											line.type === 'added'
												? 'text-green-800'
												: line.type === 'removed'
												? 'text-red-800'
												: 'text-gray-700'
										}`}
									>
										{line.type === 'added' && '+ '}
										{line.type === 'removed' && '- '}
										{line.content}
									</span>
								</div>
							))}
						</div>
					</div>
				))}

				{/* Action Buttons */}
				{!approved && (onApprove || onReject) && (
					<div className="flex gap-2 pt-2 border-t">
						{onApprove && (
							<button
								onClick={onApprove}
								className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm py-2 px-4 rounded transition-colors"
							>
								✓ Approve Changes
							</button>
						)}
						{onReject && (
							<button
								onClick={onReject}
								className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm py-2 px-4 rounded transition-colors"
							>
								✗ Request Revision
							</button>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
