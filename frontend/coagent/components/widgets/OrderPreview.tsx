'use client';

import { AlertCircle, Clock, FileText, Pill, User } from 'lucide-react';
import { Card } from '../ui/card';

export interface OrderItem {
	item_type: 'medication' | 'procedure' | 'lab' | 'imaging';
	item_code: string;
	item_name: string;
	instructions?: string;
	frequency?: string;
	duration?: string;
	priority?: 'routine' | 'urgent' | 'stat';
	notes?: string;
}

export interface OrderSet {
	set_name: string;
	patient_name: string;
	patient_id: string;
	ordering_physician: string;
	order_date: string;
	items: OrderItem[];
	status: 'draft' | 'pending_approval' | 'approved' | 'active';
}

interface OrderPreviewProps {
	orderSet: OrderSet;
	onApprove?: () => void;
	onReject?: () => void;
	onEdit?: () => void;
	showActions?: boolean;
}

/**
 * T102: OrderPreview - Hospital order set preview widget
 *
 * Displays medical order sets for review and approval:
 * - Medications with dosing instructions
 * - Procedures and labs
 * - Priority indicators (routine, urgent, STAT)
 * - Approval workflow actions
 *
 * Usage:
 * ```tsx
 * <OrderPreview
 *   orderSet={orderSetData}
 *   onApprove={() => approveOrders()}
 *   showActions={true}
 * />
 * ```
 */
export function OrderPreview({
	orderSet,
	onApprove,
	onReject,
	onEdit,
	showActions = true,
}: OrderPreviewProps) {
	const getItemIcon = (type: OrderItem['item_type']) => {
		switch (type) {
			case 'medication':
				return <Pill className="w-5 h-5 text-blue-600" />;
			case 'procedure':
				return <FileText className="w-5 h-5 text-purple-600" />;
			case 'lab':
				return <AlertCircle className="w-5 h-5 text-green-600" />;
			case 'imaging':
				return <FileText className="w-5 h-5 text-orange-600" />;
		}
	};

	const getPriorityBadge = (priority?: OrderItem['priority']) => {
		if (!priority) return null;
		const styles = {
			routine: 'bg-gray-100 text-gray-700',
			urgent: 'bg-yellow-100 text-yellow-700',
			stat: 'bg-red-100 text-red-700',
		};
		return (
			<span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[priority]}`}>
				{priority.toUpperCase()}
			</span>
		);
	};

	const getStatusBadge = (status: OrderSet['status']) => {
		const styles = {
			draft: 'bg-gray-100 text-gray-700',
			pending_approval: 'bg-yellow-100 text-yellow-700',
			approved: 'bg-green-100 text-green-700',
			active: 'bg-blue-100 text-blue-700',
		};
		const labels = {
			draft: 'Draft',
			pending_approval: 'Pending Approval',
			approved: 'Approved',
			active: 'Active',
		};
		return (
			<span className={`px-3 py-1 rounded-full text-sm font-medium ${styles[status]}`}>
				{labels[status]}
			</span>
		);
	};

	const groupedItems = orderSet.items.reduce(
		(acc, item) => {
			if (!acc[item.item_type]) {
				acc[item.item_type] = [];
			}
			acc[item.item_type].push(item);
			return acc;
		},
		{} as Record<string, OrderItem[]>
	);

	const typeLabels = {
		medication: 'Medications',
		procedure: 'Procedures',
		lab: 'Laboratory Tests',
		imaging: 'Imaging Studies',
	};

	return (
		<Card className="w-full">
			{/* Header */}
			<div className="bg-blue-50 p-4 border-b">
				<div className="flex items-start justify-between">
					<div>
						<h2 className="text-xl font-bold text-gray-900">{orderSet.set_name}</h2>
						<div className="mt-2 space-y-1 text-sm">
							<div className="flex items-center gap-2 text-gray-600">
								<User className="w-4 h-4" />
								<span>
									Patient: <span className="font-medium">{orderSet.patient_name}</span> (
									{orderSet.patient_id})
								</span>
							</div>
							<div className="flex items-center gap-2 text-gray-600">
								<User className="w-4 h-4" />
								<span>
									Ordering: <span className="font-medium">Dr. {orderSet.ordering_physician}</span>
								</span>
							</div>
							<div className="flex items-center gap-2 text-gray-600">
								<Clock className="w-4 h-4" />
								<span>
									Date:{' '}
									<span className="font-medium">
										{new Date(orderSet.order_date).toLocaleString()}
									</span>
								</span>
							</div>
						</div>
					</div>
					<div>{getStatusBadge(orderSet.status)}</div>
				</div>
			</div>

			{/* Order Items by Category */}
			<div className="p-4 space-y-6">
				{Object.entries(groupedItems).map(([type, items]) => (
					<div key={type}>
						<h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
							{getItemIcon(type as OrderItem['item_type'])}
							<span>{typeLabels[type as keyof typeof typeLabels]}</span>
							<span className="text-sm text-gray-500">({items.length})</span>
						</h3>
						<div className="space-y-3">
							{items.map((item, index) => (
								<div
									key={index}
									className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
								>
									<div className="flex items-start justify-between">
										<div className="flex-1">
											<div className="flex items-center gap-2 mb-1">
												<h4 className="font-semibold">{item.item_name}</h4>
												{getPriorityBadge(item.priority)}
											</div>
											<p className="text-sm text-gray-600 mb-2">{item.item_code}</p>
											{item.instructions && (
												<p className="text-sm text-gray-700 mb-1">
													<span className="font-medium">Instructions:</span> {item.instructions}
												</p>
											)}
											{item.frequency && (
												<p className="text-sm text-gray-600">
													<span className="font-medium">Frequency:</span> {item.frequency}
													{item.duration && <span> for {item.duration}</span>}
												</p>
											)}
											{item.notes && (
												<p className="text-sm text-gray-500 mt-2 italic">Note: {item.notes}</p>
											)}
										</div>
									</div>
								</div>
							))}
						</div>
					</div>
				))}
			</div>

			{/* Action Buttons */}
			{showActions && orderSet.status === 'pending_approval' && (
				<div className="border-t p-4 bg-gray-50 flex gap-3">
					{onReject && (
						<button
							onClick={onReject}
							className="flex-1 px-4 py-2 border-2 border-red-300 text-red-700 rounded-lg hover:bg-red-50 font-medium transition-colors"
						>
							Reject
						</button>
					)}
					{onEdit && (
						<button
							onClick={onEdit}
							className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium transition-colors"
						>
							Edit
						</button>
					)}
					{onApprove && (
						<button
							onClick={onApprove}
							className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
						>
							Approve Order Set
						</button>
					)}
				</div>
			)}

			{/* Summary */}
			<div className="border-t p-4 bg-gray-50 text-sm text-gray-600">
				<div className="flex justify-between">
					<span>Total Items:</span>
					<span className="font-semibold">{orderSet.items.length}</span>
				</div>
				{orderSet.items.some((i) => i.priority === 'stat') && (
					<div className="mt-2 flex items-center gap-2 text-red-600">
						<AlertCircle className="w-4 h-4" />
						<span className="font-medium">Contains STAT orders - Immediate attention required</span>
					</div>
				)}
			</div>
		</Card>
	);
}
