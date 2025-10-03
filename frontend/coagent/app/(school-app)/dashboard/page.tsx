'use client';

import { useAppCopilot } from '@/hooks/use-app-copilot';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Users,
    BookOpen,
    Calendar,
    TrendingUp,
    AlertTriangle,
    CheckCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';

/**
 * School Management Dashboard
 * 
 * Features:
 * - Overview statistics
 * - Context-aware AI recommendations
 * - Quick access cards
 * - Real-time data
 */
export default function SchoolDashboard() {
    const { updateContext } = useAppCopilot('school');
    const [stats, setStats] = useState({
        totalStudents: 450,
        activeTeachers: 35,
        coursesThisSemester: 28,
        averageAttendance: 87.5,
        pendingTasks: 12,
    });

    useEffect(() => {
        // Update CopilotKit context with dashboard data
        updateContext('dashboard', {
            stats,
            alerts: [
                { type: 'warning', message: '12 students with low attendance' },
                { type: 'info', message: 'Exam schedule for next month available' },
            ],
        });
    }, [stats, updateContext]);

    return (
        <div className="space-y-6">
            {/* Welcome Message */}
            <div className="rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
                <h1 className="text-3xl font-bold mb-2">
                    Welcome back, Admin! 👋
                </h1>
                <p className="text-blue-100">
                    Your AI assistant is ready to help you manage the school efficiently.
                    Try asking: "Show me students with low attendance" or "Generate monthly report"
                </p>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Students"
                    value={stats.totalStudents.toString()}
                    icon={<Users className="h-6 w-6" />}
                    trend="+12 this month"
                    trendUp
                />
                <StatCard
                    title="Active Teachers"
                    value={stats.activeTeachers.toString()}
                    icon={<BookOpen className="h-6 w-6" />}
                    trend="5 departments"
                />
                <StatCard
                    title="Courses"
                    value={stats.coursesThisSemester.toString()}
                    icon={<Calendar className="h-6 w-6" />}
                    trend="This semester"
                />
                <StatCard
                    title="Avg Attendance"
                    value={`${stats.averageAttendance}%`}
                    icon={<TrendingUp className="h-6 w-6" />}
                    trend="+2.3% from last month"
                    trendUp
                />
            </div>

            {/* Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="border-yellow-200 bg-yellow-50">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-yellow-600" />
                            <CardTitle className="text-yellow-900">
                                Attention Required
                            </CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-2 text-sm text-yellow-800">
                            <li>• 12 students with attendance below 75%</li>
                            <li>• 5 pending grade submissions</li>
                            <li>• Fee payment reminders for 28 students</li>
                        </ul>
                    </CardContent>
                </Card>

                <Card className="border-green-200 bg-green-50">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            <CardTitle className="text-green-900">
                                Recent Achievements
                            </CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-2 text-sm text-green-800">
                            <li>• 98% parent-teacher meeting attendance</li>
                            <li>• All exam schedules published</li>
                            <li>• Library system updated with 150 new books</li>
                        </ul>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions */}
            <Card>
                <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>
                        Common tasks you can perform. Or just ask the AI assistant! 💬
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <QuickActionCard
                            title="Enroll Student"
                            description="Add a new student to the system"
                            onClick={() => alert('Opening enrollment form...')}
                        />
                        <QuickActionCard
                            title="Mark Attendance"
                            description="Record today's attendance"
                            onClick={() => alert('Opening attendance form...')}
                        />
                        <QuickActionCard
                            title="Generate Report"
                            description="Create monthly summary report"
                            onClick={() => alert('Generating report...')}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* AI Assistant Hint */}
            <div className="rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 p-6 text-center">
                <h3 className="text-lg font-semibold mb-2 text-primary">
                    💡 Try the AI Assistant
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                    Click the chat icon in the bottom right to open your AI assistant.
                    It understands this dashboard and can help you with any task!
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                    <ExamplePrompt text='"Enroll John Doe in 5th grade"' />
                    <ExamplePrompt text='"Show students with low attendance"' />
                    <ExamplePrompt text='"Generate attendance report for October"' />
                </div>
            </div>
        </div>
    );
}

// Stat Card Component
function StatCard({
    title,
    value,
    icon,
    trend,
    trendUp,
}: {
    title: string;
    value: string;
    icon: React.ReactNode;
    trend?: string;
    trendUp?: boolean;
}) {
    return (
        <Card>
            <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="text-primary">{icon}</div>
                    {trend && (
                        <span className={`text-xs font-medium ${trendUp ? 'text-green-600' : 'text-gray-600'
                            }`}>
                            {trend}
                        </span>
                    )}
                </div>
                <div>
                    <p className="text-2xl font-bold">{value}</p>
                    <p className="text-sm text-muted-foreground">{title}</p>
                </div>
            </CardContent>
        </Card>
    );
}

// Quick Action Card Component
function QuickActionCard({
    title,
    description,
    onClick,
}: {
    title: string;
    description: string;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className="rounded-lg border bg-white p-4 text-left transition-all hover:border-primary hover:shadow-md"
        >
            <h4 className="font-semibold mb-1">{title}</h4>
            <p className="text-sm text-muted-foreground">{description}</p>
        </button>
    );
}

// Example Prompt Component
function ExamplePrompt({ text }: { text: string }) {
    return (
        <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-700 border">
            {text}
        </span>
    );
}
