'use client';

import { AlertCircle, Download, Filter, Search, UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAppCopilot } from '@/hooks/use-app-copilot';

/**
 * Students List Page
 *
 * Features:
 * - List of all students
 * - Context-aware recommendations (powered by useAppCopilot)
 * - Search and filter
 * - AI assistant understands current page
 */
export default function StudentsPage() {
	const { updateContext } = useAppCopilot('school');
	const [students, _setStudents] = useState([
		{
			id: 'STU-001',
			name: 'John Doe',
			grade: '5th Grade',
			attendance: 92,
			status: 'Active',
		},
		{
			id: 'STU-002',
			name: 'Jane Smith',
			grade: '5th Grade',
			attendance: 88,
			status: 'Active',
		},
		{
			id: 'STU-003',
			name: 'Mike Johnson',
			grade: '6th Grade',
			attendance: 72,
			status: 'Active',
		},
		{
			id: 'STU-004',
			name: 'Emily Brown',
			grade: '6th Grade',
			attendance: 95,
			status: 'Active',
		},
		{
			id: 'STU-005',
			name: 'David Wilson',
			grade: '7th Grade',
			attendance: 68,
			status: 'Active',
		},
	]);

	const [searchQuery, setSearchQuery] = useState('');
	const [filterStatus, setFilterStatus] = useState<'all' | 'low-attendance'>('all');

	// Check for low attendance
	const lowAttendanceCount = students.filter((s) => s.attendance < 75).length;

	useEffect(() => {
		// Update CopilotKit context
		updateContext('students', {
			totalStudents: students.length,
			hasLowAttendance: lowAttendanceCount > 0,
			lowAttendanceCount,
			studentIds: students.map((s) => s.id),
		});
	}, [students, lowAttendanceCount, updateContext]);

	// Listen for filter events from recommendations
	useEffect(() => {
		const handleFilter = (e: CustomEvent) => {
			if (e.detail === 'low-attendance') {
				setFilterStatus('low-attendance');
			}
		};

		window.addEventListener('apply-filter', handleFilter as EventListener);
		return () => window.removeEventListener('apply-filter', handleFilter as EventListener);
	}, []);

	// Filter students
	const filteredStudents = students.filter((student) => {
		const matchesSearch =
			student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			student.id.toLowerCase().includes(searchQuery.toLowerCase());

		const matchesFilter =
			filterStatus === 'all' || (filterStatus === 'low-attendance' && student.attendance < 75);

		return matchesSearch && matchesFilter;
	});

	return (
		<div className="space-y-6">
			{/* Header Actions */}
			<div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
				<div>
					<h2 className="text-2xl font-bold">Students</h2>
					<p className="text-sm text-muted-foreground">
						Manage all student records ({students.length} total)
					</p>
				</div>

				<div className="flex gap-2">
					<Button variant="outline" size="sm">
						<Download className="h-4 w-4 mr-2" />
						Export
					</Button>
					<Button size="sm">
						<UserPlus className="h-4 w-4 mr-2" />
						Add Student
					</Button>
				</div>
			</div>

			{/* Low Attendance Alert */}
			{lowAttendanceCount > 0 && filterStatus === 'all' && (
				<Card className="border-yellow-200 bg-yellow-50">
					<CardContent className="pt-6">
						<div className="flex items-start gap-3">
							<AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
							<div className="flex-1">
								<h3 className="font-semibold text-yellow-900 mb-1">Attendance Alert</h3>
								<p className="text-sm text-yellow-800 mb-3">
									{lowAttendanceCount} student{lowAttendanceCount > 1 ? 's have' : ' has'}{' '}
									attendance below 75%. Consider reaching out to parents or scheduling a meeting.
								</p>
								<Button
									size="sm"
									variant="outline"
									onClick={() => setFilterStatus('low-attendance')}
									className="bg-white hover:bg-yellow-100 border-yellow-300"
								>
									View Low Attendance Students
								</Button>
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Search and Filter */}
			<div className="flex flex-col md:flex-row gap-4">
				<div className="flex-1 relative">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<input
						type="text"
						placeholder="Search students by name or ID..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
					/>
				</div>

				<div className="flex gap-2">
					<Button
						variant={filterStatus === 'all' ? 'default' : 'outline'}
						size="sm"
						onClick={() => setFilterStatus('all')}
					>
						All Students
					</Button>
					<Button
						variant={filterStatus === 'low-attendance' ? 'default' : 'outline'}
						size="sm"
						onClick={() => setFilterStatus('low-attendance')}
					>
						<Filter className="h-4 w-4 mr-2" />
						Low Attendance
					</Button>
				</div>
			</div>

			{/* Students Table */}
			<Card>
				<CardContent className="pt-6">
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead>
								<tr className="border-b">
									<th className="text-left py-3 px-4 font-semibold text-sm">Student ID</th>
									<th className="text-left py-3 px-4 font-semibold text-sm">Name</th>
									<th className="text-left py-3 px-4 font-semibold text-sm">Grade</th>
									<th className="text-left py-3 px-4 font-semibold text-sm">Attendance</th>
									<th className="text-left py-3 px-4 font-semibold text-sm">Status</th>
									<th className="text-left py-3 px-4 font-semibold text-sm">Actions</th>
								</tr>
							</thead>
							<tbody>
								{filteredStudents.map((student) => (
									<tr key={student.id} className="border-b hover:bg-gray-50">
										<td className="py-3 px-4 text-sm font-medium">{student.id}</td>
										<td className="py-3 px-4 text-sm">{student.name}</td>
										<td className="py-3 px-4 text-sm">{student.grade}</td>
										<td className="py-3 px-4 text-sm">
											<div className="flex items-center gap-2">
												<div className="flex-1 max-w-[100px] bg-gray-200 rounded-full h-2">
													<div
														className={`h-2 rounded-full ${
															student.attendance >= 85
																? 'bg-green-500'
																: student.attendance >= 75
																	? 'bg-yellow-500'
																	: 'bg-red-500'
														}`}
														style={{ width: `${student.attendance}%` }}
													/>
												</div>
												<span className="text-xs font-medium">{student.attendance}%</span>
											</div>
										</td>
										<td className="py-3 px-4">
											<span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
												{student.status}
											</span>
										</td>
										<td className="py-3 px-4">
											<Button variant="ghost" size="sm">
												View Details
											</Button>
										</td>
									</tr>
								))}
							</tbody>
						</table>

						{filteredStudents.length === 0 && (
							<div className="text-center py-12">
								<p className="text-muted-foreground">No students found matching your criteria.</p>
							</div>
						)}
					</div>
				</CardContent>
			</Card>

			{/* AI Assistant Hint */}
			<div className="rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 p-4">
				<p className="text-sm text-center text-muted-foreground">
					💬 <strong>Ask the AI:</strong> "Enroll a new student named John Doe in 5th grade" or
					"Show me students with attendance below 70%"
				</p>
			</div>
		</div>
	);
}
