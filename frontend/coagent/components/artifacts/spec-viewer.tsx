'use client';

import { CheckCircle2, FileText, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DesignSpec {
	title: string;
	description?: string;
	fields?: Array<{
		name: string;
		type: string;
		required?: boolean;
		description?: string;
	}>;
	layout?: {
		type: 'table' | 'chart' | 'form';
		columns?: string[];
		groupBy?: string;
	};
	filters?: Array<{
		field: string;
		type: string;
		default?: string;
	}>;
	permissions?: {
		roles: string[];
		restrictions?: string[];
	};
	requirements?: string[];
	edgeCases?: string[];
}

interface SpecViewerProps {
	spec: DesignSpec;
	approved?: boolean;
	onApprove?: () => void;
	onReject?: () => void;
	onEdit?: (spec: DesignSpec) => void;
}

export function SpecViewer({ spec, approved, onApprove, onReject }: SpecViewerProps) {
	return (
		<Card className="border-blue-200 bg-blue-50/50">
			<CardHeader className="pb-3">
				<div className="flex items-start justify-between">
					<div className="flex items-center gap-2">
						<FileText className="h-5 w-5 text-blue-600" />
						<CardTitle className="text-lg">{spec.title}</CardTitle>
					</div>
					{approved && (
						<Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
							<CheckCircle2 className="mr-1 h-3 w-3" />
							Approved
						</Badge>
					)}
				</div>
				{spec.description && (
					<p className="text-sm text-muted-foreground mt-2">{spec.description}</p>
				)}
			</CardHeader>

			<CardContent className="space-y-4">
				{/* Fields */}
				{spec.fields && spec.fields.length > 0 && (
					<div>
						<h4 className="text-sm font-semibold mb-2 text-gray-700">Fields</h4>
						<div className="space-y-2">
							{spec.fields.map((field, idx) => (
								<div
									key={idx}
									className="flex items-start gap-2 text-sm bg-white p-2 rounded border"
								>
									<div className="flex-1">
										<span className="font-medium text-gray-900">{field.name}</span>
										<Badge variant="secondary" className="ml-2 text-xs">
											{field.type}
										</Badge>
										{field.required && (
											<Badge variant="destructive" className="ml-1 text-xs">
												Required
											</Badge>
										)}
										{field.description && (
											<p className="text-xs text-gray-600 mt-1">{field.description}</p>
										)}
									</div>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Layout */}
				{spec.layout && (
					<div>
						<h4 className="text-sm font-semibold mb-2 text-gray-700">Layout</h4>
						<div className="bg-white p-3 rounded border text-sm">
							<div className="flex gap-4">
								<span className="text-gray-600">Type:</span>
								<Badge variant="outline">{spec.layout.type}</Badge>
							</div>
							{spec.layout.groupBy && (
								<div className="flex gap-4 mt-2">
									<span className="text-gray-600">Group By:</span>
									<span className="font-medium">{spec.layout.groupBy}</span>
								</div>
							)}
							{spec.layout.columns && (
								<div className="mt-2">
									<span className="text-gray-600">Columns:</span>
									<div className="flex flex-wrap gap-1 mt-1">
										{spec.layout.columns.map((col, idx) => (
											<Badge key={idx} variant="secondary" className="text-xs">
												{col}
											</Badge>
										))}
									</div>
								</div>
							)}
						</div>
					</div>
				)}

				{/* Filters */}
				{spec.filters && spec.filters.length > 0 && (
					<div>
						<h4 className="text-sm font-semibold mb-2 text-gray-700">Filters</h4>
						<div className="space-y-1">
							{spec.filters.map((filter, idx) => (
								<div key={idx} className="flex items-center gap-2 text-sm bg-white p-2 rounded border">
									<span className="font-medium">{filter.field}</span>
									<Badge variant="outline" className="text-xs">
										{filter.type}
									</Badge>
									{filter.default && (
										<span className="text-gray-600 text-xs">default: {filter.default}</span>
									)}
								</div>
							))}
						</div>
					</div>
				)}

				{/* Permissions */}
				{spec.permissions && (
					<div>
						<h4 className="text-sm font-semibold mb-2 text-gray-700">Permissions</h4>
						<div className="bg-white p-3 rounded border text-sm">
							<div className="flex gap-2 flex-wrap">
								{spec.permissions.roles.map((role, idx) => (
									<Badge key={idx} variant="secondary">
										{role}
									</Badge>
								))}
							</div>
							{spec.permissions.restrictions && spec.permissions.restrictions.length > 0 && (
								<div className="mt-2">
									<span className="text-xs text-gray-600">Restrictions:</span>
									<ul className="list-disc list-inside text-xs text-gray-600 mt-1">
										{spec.permissions.restrictions.map((r, idx) => (
											<li key={idx}>{r}</li>
										))}
									</ul>
								</div>
							)}
						</div>
					</div>
				)}

				{/* Edge Cases */}
				{spec.edgeCases && spec.edgeCases.length > 0 && (
					<div>
						<h4 className="text-sm font-semibold mb-2 text-gray-700 flex items-center gap-1">
							<AlertCircle className="h-4 w-4" />
							Edge Cases
						</h4>
						<ul className="list-disc list-inside text-sm text-gray-600 bg-amber-50 p-3 rounded border border-amber-200">
							{spec.edgeCases.map((edge, idx) => (
								<li key={idx}>{edge}</li>
							))}
						</ul>
					</div>
				)}

				{/* Action Buttons */}
				{!approved && (onApprove || onReject) && (
					<div className="flex gap-2 pt-2 border-t">
						{onApprove && (
							<button
								onClick={onApprove}
								className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm py-2 px-4 rounded transition-colors"
							>
								✓ Approve Spec
							</button>
						)}
						{onReject && (
							<button
								onClick={onReject}
								className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm py-2 px-4 rounded transition-colors"
							>
								✗ Reject & Regenerate
							</button>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
