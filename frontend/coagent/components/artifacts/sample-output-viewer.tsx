'use client';

import { BarChart3, CheckCircle2, Download, Table2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SampleData {
	columns: string[];
	rows: Array<Record<string, any>>;
	summary?: {
		totalRows: number;
		dataSource: string;
		generatedAt?: string;
	};
}

interface SampleOutputViewerProps {
	data: SampleData;
	viewType?: 'table' | 'chart';
	approved?: boolean;
	testCases?: Array<{
		name: string;
		passed: boolean;
		message?: string;
	}>;
	onApprove?: () => void;
	onReject?: () => void;
	onDownload?: () => void;
}

export function SampleOutputViewer({
	data,
	viewType = 'table',
	approved,
	testCases,
	onApprove,
	onReject,
	onDownload,
}: SampleOutputViewerProps) {
	return (
		<Card className="border-teal-200 bg-teal-50/50">
			<CardHeader className="pb-3">
				<div className="flex items-start justify-between">
					<div className="flex items-center gap-2">
						{viewType === 'table' ? (
							<Table2 className="h-5 w-5 text-teal-600" />
						) : (
							<BarChart3 className="h-5 w-5 text-teal-600" />
						)}
						<CardTitle className="text-lg">Sample Output</CardTitle>
					</div>
					<div className="flex items-center gap-2">
						{approved && (
							<Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
								<CheckCircle2 className="mr-1 h-3 w-3" />
								Validated
							</Badge>
						)}
						{onDownload && (
							<button
								onClick={onDownload}
								className="text-teal-600 hover:text-teal-700 p-1.5 hover:bg-teal-100 rounded transition-colors"
								title="Download Sample Data"
							>
								<Download className="h-4 w-4" />
							</button>
						)}
					</div>
				</div>

				{/* Summary */}
				{data.summary && (
					<div className="text-xs text-gray-600 mt-2 flex gap-3">
						<span>
							<strong>{data.summary.totalRows}</strong> rows
						</span>
						<span className="border-l pl-3">Source: {data.summary.dataSource}</span>
						{data.summary.generatedAt && (
							<span className="border-l pl-3">Generated: {data.summary.generatedAt}</span>
						)}
					</div>
				)}
			</CardHeader>

			<CardContent className="space-y-4">
				{/* Test Cases */}
				{testCases && testCases.length > 0 && (
					<div className="bg-white rounded border p-3">
						<div className="text-sm font-semibold mb-2">Test Cases</div>
						<div className="space-y-1">
							{testCases.map((test, idx) => (
								<div key={idx} className="flex items-start gap-2 text-sm">
									<Badge variant={test.passed ? 'default' : 'destructive'} className="text-xs">
										{test.passed ? '✓' : '✗'}
									</Badge>
									<div className="flex-1">
										<div className="font-medium">{test.name}</div>
										{test.message && (
											<div className="text-xs text-gray-600 mt-0.5">{test.message}</div>
										)}
									</div>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Data Table */}
				{viewType === 'table' && (
					<div className="bg-white rounded border overflow-hidden">
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead className="bg-gray-100 border-b">
									<tr>
										{data.columns.map((col, idx) => (
											<th
												key={idx}
												className="px-4 py-2 text-left font-semibold text-gray-700 whitespace-nowrap"
											>
												{col}
											</th>
										))}
									</tr>
								</thead>
								<tbody className="divide-y">
									{data.rows.map((row, rowIdx) => (
										<tr key={rowIdx} className="hover:bg-gray-50 transition-colors">
											{data.columns.map((col, colIdx) => (
												<td key={colIdx} className="px-4 py-2 text-gray-700">
													{typeof row[col] === 'object'
														? JSON.stringify(row[col])
														: String(row[col] ?? '-')}
												</td>
											))}
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				)}

				{/* Chart View */}
				{viewType === 'chart' && (
					<div className="bg-white rounded border p-6">
						<div className="text-center text-gray-500 py-8">
							<BarChart3 className="h-12 w-12 mx-auto mb-3 text-gray-400" />
							<p className="text-sm">Chart visualization would appear here</p>
							<p className="text-xs text-gray-400 mt-1">
								Integration with chart library (Chart.js, Recharts) needed
							</p>
						</div>
					</div>
				)}

				{/* Row Preview Summary */}
				{data.rows.length > 5 && (
					<div className="text-xs text-gray-500 text-center">
						Showing {Math.min(data.rows.length, 5)} of {data.rows.length} rows
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
								✓ Validate Output
							</button>
						)}
						{onReject && (
							<button
								onClick={onReject}
								className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm py-2 px-4 rounded transition-colors"
							>
								✗ Regenerate Data
							</button>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
