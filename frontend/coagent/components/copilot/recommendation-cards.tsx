'use client';

import {
	AlertTriangle,
	ArrowRight,
	Calendar,
	CheckSquare,
	ClipboardList,
	DollarSign,
	FileText,
	Package,
	TrendingUp,
	UserPlus,
	Users,
} from 'lucide-react';
import { Card } from '../ui/card';

export interface Recommendation {
	title: string;
	description: string;
	action: string;
	icon: string;
	priority?: 'low' | 'medium' | 'high';
}

interface RecommendationCardsProps {
	recommendations: Recommendation[];
	onActionClick: (action: string) => void;
}

/**
 * RecommendationCards - Display active suggestions above chat input
 *
 * Shows context-aware recommendations based on:
 * - Current page (e.g., student list → "Add new student")
 * - Page data (e.g., low attendance → "Check low attendance students")
 * - User role (e.g., admin sees different options than teacher)
 * - Recent actions
 *
 * Examples:
 * - On student list: "Add New Student", "Import Students from CSV"
 * - On student detail: "Mark Attendance", "Generate Report Card"
 * - On dashboard: "Review Pending Tasks", "Generate Monthly Report"
 */
export function RecommendationCards({ recommendations, onActionClick }: RecommendationCardsProps) {
	if (recommendations.length === 0) return null;

	const iconMap: Record<string, any> = {
		UserPlus,
		AlertTriangle,
		CheckSquare,
		FileText,
		Calendar,
		DollarSign,
		Package,
		Users,
		ClipboardList,
		TrendingUp,
	};

	const priorityStyles = {
		low: 'border-gray-200 hover:border-gray-300',
		medium: 'border-blue-200 bg-blue-50/50 hover:border-blue-300',
		high: 'border-red-200 bg-red-50/50 hover:border-red-300',
	};

	return (
		<div className="mb-4 space-y-2 px-4">
			<p className="text-sm font-medium text-muted-foreground">💡 Suggested actions:</p>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
				{recommendations.map((rec, index) => {
					const Icon = iconMap[rec.icon] || UserPlus;
					const priorityStyle = priorityStyles[rec.priority || 'low'];

					return (
						<Card
							key={index}
							className={`p-3 cursor-pointer hover:shadow-md transition-all duration-200 ${priorityStyle}`}
							onClick={() => onActionClick(rec.action)}
						>
							<div className="flex items-start gap-3">
								<div className="mt-0.5 flex-shrink-0">
									<Icon className="h-5 w-5 text-primary" />
								</div>
								<div className="flex-1 min-w-0">
									<h4 className="text-sm font-medium truncate">{rec.title}</h4>
									<p className="text-xs text-muted-foreground mt-1 line-clamp-2">
										{rec.description}
									</p>
								</div>
								<ArrowRight className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
							</div>
						</Card>
					);
				})}
			</div>
		</div>
	);
}
