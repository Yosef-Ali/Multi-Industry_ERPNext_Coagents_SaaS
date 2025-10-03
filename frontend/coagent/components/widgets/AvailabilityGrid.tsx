'use client';

import { Card } from '../ui/card';
import { useMemo } from 'react';
import { CheckCircle, XCircle, AlertCircle, Wrench } from 'lucide-react';

export interface Room {
    room_number: string;
    room_type: string;
    status: 'Available' | 'Occupied' | 'Reserved' | 'Maintenance';
    floor: number;
    rate: number;
    guest_name?: string;
    check_out_date?: string;
}

interface AvailabilityGridProps {
    rooms: Room[];
    onRoomClick?: (room: Room) => void;
    selectedDate?: string;
    showFilters?: boolean;
}

/**
 * T100: AvailabilityGrid - Hotel room availability widget
 *
 * Displays room availability in a visual grid format:
 * - Color-coded by status (Available, Occupied, Reserved, Maintenance)
 * - Grouped by floor or room type
 * - Quick room details on hover
 * - Click to open detailed view or reservation form
 *
 * Usage:
 * ```tsx
 * <AvailabilityGrid
 *   rooms={roomsData}
 *   onRoomClick={(room) => handleRoomSelection(room)}
 *   selectedDate="2024-10-15"
 * />
 * ```
 */
export function AvailabilityGrid({
    rooms,
    onRoomClick,
    selectedDate,
    showFilters = true,
}: AvailabilityGridProps) {
    // Group rooms by floor
    const roomsByFloor = useMemo(() => {
        const grouped = new Map<number, Room[]>();
        rooms.forEach(room => {
            if (!grouped.has(room.floor)) {
                grouped.set(room.floor, []);
            }
            grouped.get(room.floor)!.push(room);
        });
        // Sort by floor number descending (top floor first)
        return Array.from(grouped.entries()).sort(([a], [b]) => b - a);
    }, [rooms]);

    // Calculate availability statistics
    const stats = useMemo(() => {
        const total = rooms.length;
        const available = rooms.filter(r => r.status === 'Available').length;
        const occupied = rooms.filter(r => r.status === 'Occupied').length;
        const reserved = rooms.filter(r => r.status === 'Reserved').length;
        const maintenance = rooms.filter(r => r.status === 'Maintenance').length;

        return {
            total,
            available,
            occupied,
            reserved,
            maintenance,
            occupancy: total > 0 ? Math.round((occupied / total) * 100) : 0,
        };
    }, [rooms]);

    const getStatusColor = (status: Room['status']) => {
        switch (status) {
            case 'Available':
                return 'bg-green-100 border-green-300 hover:bg-green-200';
            case 'Occupied':
                return 'bg-red-100 border-red-300 hover:bg-red-200';
            case 'Reserved':
                return 'bg-yellow-100 border-yellow-300 hover:bg-yellow-200';
            case 'Maintenance':
                return 'bg-gray-100 border-gray-300 hover:bg-gray-200';
            default:
                return 'bg-white border-gray-200';
        }
    };

    const getStatusIcon = (status: Room['status']) => {
        switch (status) {
            case 'Available':
                return <CheckCircle className="w-4 h-4 text-green-600" />;
            case 'Occupied':
                return <XCircle className="w-4 h-4 text-red-600" />;
            case 'Reserved':
                return <AlertCircle className="w-4 h-4 text-yellow-600" />;
            case 'Maintenance':
                return <Wrench className="w-4 h-4 text-gray-600" />;
        }
    };

    return (
        <div className="w-full space-y-4">
            {/* Statistics Summary */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Card className="p-3">
                    <div className="text-xs text-gray-500">Total Rooms</div>
                    <div className="text-2xl font-bold">{stats.total}</div>
                </Card>
                <Card className="p-3 bg-green-50">
                    <div className="text-xs text-gray-500">Available</div>
                    <div className="text-2xl font-bold text-green-600">{stats.available}</div>
                </Card>
                <Card className="p-3 bg-red-50">
                    <div className="text-xs text-gray-500">Occupied</div>
                    <div className="text-2xl font-bold text-red-600">{stats.occupied}</div>
                </Card>
                <Card className="p-3 bg-yellow-50">
                    <div className="text-xs text-gray-500">Reserved</div>
                    <div className="text-2xl font-bold text-yellow-600">{stats.reserved}</div>
                </Card>
                <Card className="p-3 bg-gray-50">
                    <div className="text-xs text-gray-500">Occupancy</div>
                    <div className="text-2xl font-bold text-gray-800">{stats.occupancy}%</div>
                </Card>
            </div>

            {/* Date Display */}
            {selectedDate && (
                <div className="text-sm text-gray-600">
                    Showing availability for: <span className="font-semibold">{selectedDate}</span>
                </div>
            )}

            {/* Room Grid by Floor */}
            <div className="space-y-6">
                {roomsByFloor.map(([floor, floorRooms]) => (
                    <div key={floor}>
                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                                Floor {floor}
                            </span>
                            <span className="text-sm text-gray-500">
                                ({floorRooms.filter(r => r.status === 'Available').length} available)
                            </span>
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                            {floorRooms.map(room => (
                                <button
                                    key={room.room_number}
                                    onClick={() => onRoomClick?.(room)}
                                    className={`
                                        p-3 rounded-lg border-2 transition-all duration-200
                                        ${getStatusColor(room.status)}
                                        transform hover:scale-105 cursor-pointer
                                    `}
                                    title={`${room.room_number} - ${room.room_type} - ${room.status}${room.guest_name ? ` (${room.guest_name})` : ''}`}
                                >
                                    <div className="flex flex-col items-center gap-1">
                                        {getStatusIcon(room.status)}
                                        <span className="font-bold text-sm">{room.room_number}</span>
                                        <span className="text-xs text-gray-600 truncate w-full text-center">
                                            {room.room_type}
                                        </span>
                                        {room.guest_name && (
                                            <span className="text-xs text-gray-500 truncate w-full text-center">
                                                {room.guest_name}
                                            </span>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-sm border-t pt-4">
                <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Available</span>
                </div>
                <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-600" />
                    <span>Occupied</span>
                </div>
                <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-yellow-600" />
                    <span>Reserved</span>
                </div>
                <div className="flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-gray-600" />
                    <span>Maintenance</span>
                </div>
            </div>
        </div>
    );
}
