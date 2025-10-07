'use client';

import { AlertCircle, CheckCircle2, Database, Edit3, Minus, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface FieldChange {
	action: 'add' | 'modify' | 'remove';
	fieldName: string;
	fieldType?: string;
	properties?: Record<string, any>;
	reason?: string;
}

interface DocTypeChange {
	doctype: string;
	fields: FieldChange[];
	joins?: Array<{
		targetDocType: string;
		linkField: string;
		type: string;
	}>;
}

interface SchemaPlanViewerProps {
	changes: DocTypeChange[];
	impact?: {
		affectedDocs: number;
		migrationRequired: boolean;
		breakingChanges: boolean;
	};
	approved?: boolean;
	onApprove?: () => void;
	onReject?: () => void;
}

export function SchemaPlanViewer({
	changes,
	impact,
	approved,
	onApprove,
	onReject,
}: SchemaPlanViewerProps) {
	const totalChanges = changes.reduce((sum, doc) => sum + doc.fields.length, 0);

	return (
		<Card className="border-indigo-200 bg-indigo-50/50">
			<CardHeader className="pb-3">
				<div className="flex items-start justify-between">
					<div className="flex items-center gap-2">
						<Database className="h-5 w-5 text-indigo-600" />
						<CardTitle className="text-lg">Schema Changes</CardTitle>
					</div>
					<div className="flex items-center gap-2">
						{approved && (
							<Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
								<CheckCircle2 className="mr-1 h-3 w-3" />
								Approved
							</Badge>
						)}
						<Badge variant="outline">{totalChanges} changes</Badge>
					</div>
				</div>
			</CardHeader>

			<CardContent className="space-y-4">
				{/* Impact Summary */}
				{impact && (
					<div
						className={`border rounded p-3 ${
							impact.breakingChanges
								? 'bg-red-50 border-red-200'
								: impact.migrationRequired
									? 'bg-amber-50 border-amber-200'
									: 'bg-blue-50 border-blue-200'
						}`}
					>
						<div className="flex items-center gap-2 text-sm font-semibold mb-2">
							<AlertCircle className="h-4 w-4" />
							Impact Assessment
						</div>
						<div className="space-y-1 text-sm">
							<div className="flex justify-between">
								<span className="text-gray-600">Affected Documents:</span>
								<span className="font-medium">{impact.affectedDocs.toLocaleString()}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-600">Migration Required:</span>
								<Badge variant={impact.migrationRequired ? 'destructive' : 'secondary'}>
									{impact.migrationRequired ? 'Yes' : 'No'}
								</Badge>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-600">Breaking Changes:</span>
								<Badge variant={impact.breakingChanges ? 'destructive' : 'secondary'}>
									{impact.breakingChanges ? 'Yes' : 'No'}
								</Badge>
							</div>
						</div>
					</div>
				)}

				{/* DocType Changes */}
				{changes.map((docChange, idx) => (
					<div key={idx} className="bg-white rounded border overflow-hidden">
						<div className="bg-gray-100 px-3 py-2 border-b">
							<span className="font-semibold text-sm">DocType: {docChange.doctype}</span>
						</div>

						<div className="divide-y">
							{/* Field Changes */}
							{docChange.fields.map((field, fieldIdx) => (
								<div key={fieldIdx} className="p-3 hover:bg-gray-50 transition-colors">
									<div className="flex items-start gap-3">
										{/* Action Icon */}
										<div className="mt-0.5">
											{field.action === 'add' && (
												<div className="bg-green-100 p-1.5 rounded">
													<Plus className="h-4 w-4 text-green-700" />
												</div>
											)}
											{field.action === 'modify' && (
												<div className="bg-blue-100 p-1.5 rounded">
													<Edit3 className="h-4 w-4 text-blue-700" />
												</div>
											)}
											{field.action === 'remove' && (
												<div className="bg-red-100 p-1.5 rounded">
													<Minus className="h-4 w-4 text-red-700" />
												</div>
											)}
										</div>

										{/* Field Details */}
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2 flex-wrap">
												<span className="font-medium text-gray-900">{field.fieldName}</span>
												{field.fieldType && (
													<Badge variant="secondary" className="text-xs">
														{field.fieldType}
													</Badge>
												)}
												<Badge
													variant={
														field.action === 'add'
															? 'default'
															: field.action === 'remove'
																? 'destructive'
																: 'outline'
													}
													className="text-xs"
												>
													{field.action}
												</Badge>
											</div>

											{field.reason && <p className="text-sm text-gray-600 mt-1">{field.reason}</p>}

											{field.properties && Object.keys(field.properties).length > 0 && (
												<div className="mt-2 text-xs space-y-1">
													{Object.entries(field.properties).map(([key, value]) => (
														<div key={key} className="flex gap-2">
															<span className="text-gray-500">{key}:</span>
															<span className="text-gray-700 font-mono">
																{JSON.stringify(value)}
															</span>
														</div>
													))}
												</div>
											)}
										</div>
									</div>
								</div>
							))}

							{/* Joins */}
							{docChange.joins && docChange.joins.length > 0 && (
								<div className="p-3 bg-blue-50">
									<div className="text-sm font-semibold text-blue-800 mb-2">Joins</div>
									<div className="space-y-1">
										{docChange.joins.map((join, joinIdx) => (
											<div key={joinIdx} className="text-sm flex items-center gap-2">
												<Badge variant="outline" className="text-xs">
													{join.type}
												</Badge>
												<span className="text-gray-700">
													→ {join.targetDocType} via {join.linkField}
												</span>
											</div>
										))}
									</div>
								</div>
							)}
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
								✓ Approve Schema
							</button>
						)}
						{onReject && (
							<button
								onClick={onReject}
								className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm py-2 px-4 rounded transition-colors"
							>
								✗ Reject Changes
							</button>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
