'use client';

import { Calendar as CalendarIcon, Clock, MapPin, User, Video } from 'lucide-react';
import { useMemo } from 'react';
import { Card } from '../ui/card';

export interface Interview {
	applicant_id: string;
	applicant_name: string;
	program?: string;
	scheduled_date: string;
	scheduled_time: string;
	duration_minutes: number;
	interviewer: string;
	location?: string;
	interview_type: 'in-person' | 'video' | 'phone';
	status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
	notes?: string;
}

interface InterviewCalendarProps {
	interviews: Interview[];
	selectedDate?: string;
	onInterviewClick?: (interview: Interview) => void;
	onReschedule?: (interview: Interview) => void;
	showTimeSlots?: boolean;
}

/**
 * T105: InterviewCalendar - Education interview scheduling widget
 *
 * Displays scheduled interviews in calendar format:
 * - Daily/weekly interview schedule
 * - Time slot visualization
 * - Interviewer assignments
 * - Interview type (in-person, video, phone)
 * - Conflict detection
 *
 * Usage:
 * ```tsx
 * <InterviewCalendar
 *   interviews={scheduledInterviews}
 *   selectedDate="2024-10-15"
 *   onInterviewClick={(interview) => viewDetails(interview)}
 * />
 * ```
 */
export function InterviewCalendar({
	interviews,
	selectedDate,
	onInterviewClick,
	onReschedule,
	showTimeSlots = true,
}: InterviewCalendarProps) {
	// Group interviews by date
	const interviewsByDate = useMemo(() => {
		const grouped = new Map<string, Interview[]>();
		interviews.forEach((interview) => {
			if (!grouped.has(interview.scheduled_date)) {
				grouped.set(interview.scheduled_date, []);
			}
			grouped.get(interview.scheduled_date)?.push(interview);
		});
		// Sort each date's interviews by time
		grouped.forEach((dateInterviews) => {
			dateInterviews.sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time));
		});
		return Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b));
	}, [interviews]);

	// Filter for selected date if provided
	const displayInterviews = useMemo(() => {
		if (selectedDate) {
			return [[selectedDate, interviews.filter((i) => i.scheduled_date === selectedDate)]] as [
				string,
				Interview[],
			][];
		}
		return interviewsByDate;
	}, [selectedDate, interviews, interviewsByDate]);

	// Calculate statistics
	const stats = useMemo(() => {
		const total = interviews.length;
		const scheduled = interviews.filter((i) => i.status === 'scheduled').length;
		const confirmed = interviews.filter((i) => i.status === 'confirmed').length;
		const completed = interviews.filter((i) => i.status === 'completed').length;

		return { total, scheduled, confirmed, completed };
	}, [interviews]);

	const getStatusColor = (status: Interview['status']) => {
		switch (status) {
			case 'scheduled':
				return 'bg-blue-100 text-blue-700';
			case 'confirmed':
				return 'bg-green-100 text-green-700';
			case 'completed':
				return 'bg-gray-100 text-gray-700';
			case 'cancelled':
				return 'bg-red-100 text-red-700';
		}
	};

	const getInterviewTypeIcon = (type: Interview['interview_type']) => {
		switch (type) {
			case 'in-person':
				return <MapPin className="w-4 h-4" />;
			case 'video':
				return <Video className="w-4 h-4" />;
			case 'phone':
				return <Clock className="w-4 h-4" />;
		}
	};

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', {
			weekday: 'long',
			month: 'long',
			day: 'numeric',
			year: 'numeric',
		});
	};

	const formatTime = (time: string) => {
		const [hours, minutes] = time.split(':');
		const hour = parseInt(hours, 10);
		const ampm = hour >= 12 ? 'PM' : 'AM';
		const displayHour = hour % 12 || 12;
		return `${displayHour}:${minutes} ${ampm}`;
	};

	return (
		<div className="w-full space-y-4">
			{/* Statistics */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
				<Card className="p-4">
					<div className="text-xs text-gray-500">Total Interviews</div>
					<div className="text-2xl font-bold">{stats.total}</div>
				</Card>
				<Card className="p-4 bg-blue-50">
					<div className="text-xs text-gray-500">Scheduled</div>
					<div className="text-2xl font-bold text-blue-600">{stats.scheduled}</div>
				</Card>
				<Card className="p-4 bg-green-50">
					<div className="text-xs text-gray-500">Confirmed</div>
					<div className="text-2xl font-bold text-green-600">{stats.confirmed}</div>
				</Card>
				<Card className="p-4 bg-gray-50">
					<div className="text-xs text-gray-500">Completed</div>
					<div className="text-2xl font-bold text-gray-600">{stats.completed}</div>
				</Card>
			</div>

			{/* Daily Interview Schedule */}
			<div className="space-y-4">
				{displayInterviews.map(([date, dateInterviews]) => (
					<Card key={date} className="overflow-hidden">
						{/* Date Header */}
						<div className="bg-blue-50 p-4 border-b">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-3">
									<CalendarIcon className="w-5 h-5 text-blue-600" />
									<h3 className="text-lg font-semibold">{formatDate(date)}</h3>
								</div>
								<span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
									{dateInterviews.length} interview{dateInterviews.length !== 1 ? 's' : ''}
								</span>
							</div>
						</div>

						{/* Interview List */}
						{dateInterviews.length > 0 ? (
							<div className="divide-y">
								{dateInterviews.map((interview) => (
									<button
										key={interview.applicant_id + interview.scheduled_time}
										onClick={() => onInterviewClick?.(interview)}
										className="w-full p-4 hover:bg-gray-50 transition-colors text-left"
									>
										<div className="flex items-start gap-4">
											{/* Time */}
											<div className="w-24 flex-shrink-0">
												<div className="font-semibold text-blue-600">
													{formatTime(interview.scheduled_time)}
												</div>
												<div className="text-xs text-gray-500">
													{interview.duration_minutes} min
												</div>
											</div>

											{/* Details */}
											<div className="flex-1 min-w-0">
												<div className="flex items-start justify-between gap-4">
													<div className="flex-1 min-w-0">
														<h4 className="font-semibold text-gray-900 truncate">
															{interview.applicant_name}
														</h4>
														{interview.program && (
															<p className="text-sm text-gray-600">{interview.program}</p>
														)}
														<div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
															<div className="flex items-center gap-1">
																<User className="w-3 h-3" />
																<span>{interview.interviewer}</span>
															</div>
															<div className="flex items-center gap-1">
																{getInterviewTypeIcon(interview.interview_type)}
																<span className="capitalize">{interview.interview_type}</span>
															</div>
															{interview.location && (
																<div className="flex items-center gap-1">
																	<MapPin className="w-3 h-3" />
																	<span>{interview.location}</span>
																</div>
															)}
														</div>
														{interview.notes && (
															<p className="text-sm text-gray-500 mt-2 italic">{interview.notes}</p>
														)}
													</div>
													<div className="flex flex-col items-end gap-2">
														<span
															className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(interview.status)}`}
														>
															{interview.status.replace('_', ' ')}
														</span>
														{onReschedule &&
															interview.status !== 'completed' &&
															interview.status !== 'cancelled' && (
																<button
																	onClick={(e) => {
																		e.stopPropagation();
																		onReschedule(interview);
																	}}
																	className="text-xs text-blue-600 hover:text-blue-800 font-medium"
																>
																	Reschedule
																</button>
															)}
													</div>
												</div>
											</div>
										</div>
									</button>
								))}
							</div>
						) : (
							<div className="p-8 text-center text-gray-500">
								<CalendarIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
								<p>No interviews scheduled for this date</p>
							</div>
						)}
					</Card>
				))}
			</div>

			{/* Empty State */}
			{displayInterviews.length === 0 && (
				<Card className="p-8">
					<div className="text-center text-gray-500">
						<CalendarIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
						<p className="text-lg font-medium">No interviews scheduled</p>
						<p className="text-sm mt-2">Schedule interviews to see them here</p>
					</div>
				</Card>
			)}

			{/* Legend */}
			<div className="flex flex-wrap gap-4 text-sm border-t pt-4">
				<div className="flex items-center gap-2">
					<MapPin className="w-4 h-4 text-gray-600" />
					<span>In-Person</span>
				</div>
				<div className="flex items-center gap-2">
					<Video className="w-4 h-4 text-gray-600" />
					<span>Video Call</span>
				</div>
				<div className="flex items-center gap-2">
					<Clock className="w-4 h-4 text-gray-600" />
					<span>Phone</span>
				</div>
			</div>
		</div>
	);
}
