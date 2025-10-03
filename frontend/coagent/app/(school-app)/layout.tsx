'use client';

import { AppCopilotProvider } from '@/components/providers/copilot-provider';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
    LayoutDashboard, 
    Users, 
    BookOpen, 
    Calendar,
    FileText,
    Settings,
    Menu,
} from 'lucide-react';
import { useState } from 'react';

/**
 * School Management App Layout
 * 
 * Every generated ERPNext app will have a layout like this with:
 * - AppCopilotProvider wrapping everything
 * - Sidebar navigation
 * - Context-aware AI assistance
 * - Active recommendation cards
 */
export default function SchoolAppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const currentPage = pathname.split('/').filter(Boolean).pop() || 'dashboard';
    const [sidebarOpen, setSidebarOpen] = useState(true);

    return (
        <AppCopilotProvider
            appContext={{
                appType: 'school',
                currentPage,
                userRole: 'admin',
                appData: {},
            }}
        >
            <div className="flex h-screen bg-gray-50">
                {/* Sidebar */}
                <aside 
                    className={`${
                        sidebarOpen ? 'w-64' : 'w-20'
                    } border-r bg-white shadow-sm transition-all duration-300`}
                >
                    <div className="flex h-full flex-col">
                        {/* Logo */}
                        <div className="flex h-16 items-center justify-between border-b px-6">
                            {sidebarOpen && (
                                <h1 className="text-xl font-bold text-primary">
                                    🎓 School Manager
                                </h1>
                            )}
                            <button
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                className="rounded-md p-2 hover:bg-gray-100"
                            >
                                <Menu className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Navigation */}
                        <nav className="flex-1 space-y-1 p-4">
                            <NavItem
                                href="/school-app/dashboard"
                                icon={<LayoutDashboard />}
                                label="Dashboard"
                                active={currentPage === 'dashboard'}
                                collapsed={!sidebarOpen}
                            />
                            <NavItem
                                href="/school-app/students"
                                icon={<Users />}
                                label="Students"
                                active={currentPage === 'students'}
                                collapsed={!sidebarOpen}
                            />
                            <NavItem
                                href="/school-app/courses"
                                icon={<BookOpen />}
                                label="Courses"
                                active={currentPage === 'courses'}
                                collapsed={!sidebarOpen}
                            />
                            <NavItem
                                href="/school-app/attendance"
                                icon={<Calendar />}
                                label="Attendance"
                                active={currentPage === 'attendance'}
                                collapsed={!sidebarOpen}
                            />
                            <NavItem
                                href="/school-app/reports"
                                icon={<FileText />}
                                label="Reports"
                                active={currentPage === 'reports'}
                                collapsed={!sidebarOpen}
                            />
                            <NavItem
                                href="/school-app/settings"
                                icon={<Settings />}
                                label="Settings"
                                active={currentPage === 'settings'}
                                collapsed={!sidebarOpen}
                            />
                        </nav>

                        {/* User Info */}
                        {sidebarOpen && (
                            <div className="border-t p-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white">
                                        AD
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium">Admin User</p>
                                        <p className="text-xs text-gray-500">admin@school.edu</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 flex flex-col overflow-hidden">
                    {/* Header */}
                    <header className="h-16 border-b bg-white px-6 flex items-center justify-between shadow-sm">
                        <div>
                            <h2 className="text-2xl font-bold capitalize">
                                {currentPage.replace('-', ' ')}
                            </h2>
                            <p className="text-sm text-gray-500">
                                AI-powered school management system
                            </p>
                        </div>

                        {/* AI Status Indicator */}
                        <div className="flex items-center gap-2 rounded-full bg-green-50 px-4 py-2">
                            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-sm font-medium text-green-700">
                                AI Assistant Active
                            </span>
                        </div>
                    </header>

                    {/* Page Content */}
                    <div className="flex-1 overflow-auto p-6">
                        {children}
                    </div>
                </main>

                {/* CopilotKit Sidebar renders here automatically */}
            </div>
        </AppCopilotProvider>
    );
}

// Navigation Item Component
function NavItem({
    href,
    icon,
    label,
    active,
    collapsed,
}: {
    href: string;
    icon: React.ReactNode;
    label: string;
    active: boolean;
    collapsed: boolean;
}) {
    return (
        <Link
            href={href}
            className={`flex items-center gap-3 rounded-md px-3 py-2 transition-colors ${
                active
                    ? 'bg-primary text-white'
                    : 'text-gray-700 hover:bg-gray-100'
            }`}
            title={collapsed ? label : undefined}
        >
            <div className="h-5 w-5 flex-shrink-0">{icon}</div>
            {!collapsed && <span className="text-sm font-medium">{label}</span>}
        </Link>
    );
}
