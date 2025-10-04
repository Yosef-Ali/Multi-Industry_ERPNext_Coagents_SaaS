'use client';

import { SpecViewer } from './spec-viewer';
import { DiffViewer } from './diff-viewer';
import { SchemaPlanViewer } from './schema-plan-viewer';
import { SampleOutputViewer } from './sample-output-viewer';

interface ArtifactRendererProps {
	type: 'spec' | 'diff' | 'schema_plan' | 'sample_output' | 'unknown';
	data: any;
	approved?: boolean;
	onApprove?: () => void;
	onReject?: () => void;
}

/**
 * Universal artifact renderer - routes to specific viewer based on type
 */
export function ArtifactRenderer({ type, data, approved, onApprove, onReject }: ArtifactRendererProps) {
	switch (type) {
		case 'spec':
			return <SpecViewer spec={data} approved={approved} onApprove={onApprove} onReject={onReject} />;

		case 'diff':
			return <DiffViewer files={data.files} lintIssues={data.lintIssues} approved={approved} onApprove={onApprove} onReject={onReject} />;

		case 'schema_plan':
			return (
				<SchemaPlanViewer
					changes={data.changes}
					impact={data.impact}
					approved={approved}
					onApprove={onApprove}
					onReject={onReject}
				/>
			);

		case 'sample_output':
			return (
				<SampleOutputViewer
					data={data}
					viewType={data.viewType}
					testCases={data.testCases}
					approved={approved}
					onApprove={onApprove}
					onReject={onReject}
				/>
			);

		default:
			// Fallback for unknown types - show raw JSON
			return (
				<div className="bg-gray-50 border rounded p-4">
					<div className="text-sm font-semibold text-gray-700 mb-2">Unknown Artifact Type: {type}</div>
					<pre className="text-xs text-gray-600 overflow-auto max-h-60">
						{JSON.stringify(data, null, 2)}
					</pre>
				</div>
			);
	}
}

// Export individual components for direct use
export { SpecViewer, DiffViewer, SchemaPlanViewer, SampleOutputViewer };
