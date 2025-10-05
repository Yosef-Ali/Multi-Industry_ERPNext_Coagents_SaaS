'use client';

import { Activity, AlertCircle, BedDouble, Calendar, User } from 'lucide-react';
import { useMemo } from 'react';
import { Card } from '../ui/card';

export interface Patient {
	patient_id: string;
	patient_name: string;
	admission_date: string;
	bed_number: string;
	primary_diagnosis: string;
	age?: number;
	gender?: 'Male' | 'Female' | 'Other';
	attending_physician?: string;
}

export interface WardCensus {
	ward: string;
	unit: string;
	occupied_beds: number;
	total_beds: number;
	occupancy_rate: number;
	patients: Patient[];
}

interface BedCensusProps {
	censusData: WardCensus[];
	reportDate: string;
	onPatientClick?: (patient: Patient) => void;
	showDetails?: boolean;
}

/**
 * T101: BedCensus - Hospital bed census display widget
 *
 * Displays hospital bed occupancy and patient census:
 * - Ward/unit occupancy rates with visual indicators
 * - Patient list with key information
 * - Color-coded occupancy levels (low, medium, high)
 * - Quick patient details access
 *
 * Usage:
 * ```tsx
 * <BedCensus
 *   censusData={wards}
 *   reportDate="2024-10-15"
 *   onPatientClick={(patient) => openPatientRecord(patient)}
 * />
 * ```
 */
export function BedCensus({
	censusData,
	reportDate,
	onPatientClick,
	showDetails = true,
}: BedCensusProps) {
	// Calculate overall statistics
	const overallStats = useMemo(() => {
		const totalBeds = censusData.reduce((sum, ward) => sum + ward.total_beds, 0);
		const totalOccupied = censusData.reduce((sum, ward) => sum + ward.occupied_beds, 0);
		const totalPatients = censusData.reduce((sum, ward) => sum + ward.patients.length, 0);
		const overallOccupancy = totalBeds > 0 ? Math.round((totalOccupied / totalBeds) * 100) : 0;

		return {
			totalBeds,
			totalOccupied,
			totalPatients,
			overallOccupancy,
			availableBeds: totalBeds - totalOccupied,
		};
	}, [censusData]);

	const getOccupancyColor = (rate: number) => {
		if (rate >= 90) return 'text-red-600 bg-red-50';
		if (rate >= 75) return 'text-yellow-600 bg-yellow-50';
		return 'text-green-600 bg-green-50';
	};

	const getOccupancyBadge = (rate: number) => {
		if (rate >= 90) return { label: 'High', color: 'bg-red-500' };
		if (rate >= 75) return { label: 'Medium', color: 'bg-yellow-500' };
		return { label: 'Low', color: 'bg-green-500' };
	};

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	};

	const calculateLengthOfStay = (admissionDate: string) => {
		const admission = new Date(admissionDate);
		const today = new Date();
		const days = Math.floor((today.getTime() - admission.getTime()) / (1000 * 60 * 60 * 24));
		return days;
	};

	return (
		<div className="w-full space-y-4">
			{/* Overall Statistics */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
				<Card className="p-4">
					<div className="flex items-center gap-2">
						<BedDouble className="w-5 h-5 text-blue-600" />
						<div>
							<div className="text-xs text-gray-500">Total Beds</div>
							<div className="text-2xl font-bold">{overallStats.totalBeds}</div>
						</div>
					</div>
				</Card>
				<Card className="p-4 bg-blue-50">
					<div className="flex items-center gap-2">
						<Activity className="w-5 h-5 text-blue-600" />
						<div>
							<div className="text-xs text-gray-500">Occupied</div>
							<div className="text-2xl font-bold text-blue-600">{overallStats.totalOccupied}</div>
						</div>
					</div>
				</Card>
				<Card className="p-4 bg-green-50">
					<div className="flex items-center gap-2">
						<BedDouble className="w-5 h-5 text-green-600" />
						<div>
							<div className="text-xs text-gray-500">Available</div>
							<div className="text-2xl font-bold text-green-600">{overallStats.availableBeds}</div>
						</div>
					</div>
				</Card>
				<Card className={`p-4 ${getOccupancyColor(overallStats.overallOccupancy)}`}>
					<div className="flex items-center gap-2">
						<AlertCircle className="w-5 h-5" />
						<div>
							<div className="text-xs text-gray-500">Occupancy</div>
							<div className="text-2xl font-bold">{overallStats.overallOccupancy}%</div>
						</div>
					</div>
				</Card>
			</div>

			{/* Report Date */}
			<div className="text-sm text-gray-600 flex items-center gap-2">
				<Calendar className="w-4 h-4" />
				<span>
					Census Report: <span className="font-semibold">{formatDate(reportDate)}</span>
				</span>
			</div>

			{/* Ward Census Cards */}
			<div className="space-y-4">
				{censusData.map((ward) => {
					const occupancyBadge = getOccupancyBadge(ward.occupancy_rate);
					return (
						<Card key={`${ward.ward}-${ward.unit}`} className="overflow-hidden">
							{/* Ward Header */}
							<div className="bg-gray-50 p-4 border-b">
								<div className="flex items-center justify-between">
									<div>
										<h3 className="text-lg font-semibold">{ward.ward}</h3>
										<p className="text-sm text-gray-600">{ward.unit}</p>
									</div>
									<div className="flex items-center gap-4">
										<div className="text-right">
											<div className="text-sm text-gray-500">Beds</div>
											<div className="text-xl font-bold">
												{ward.occupied_beds}/{ward.total_beds}
											</div>
										</div>
										<div className="flex flex-col items-end gap-1">
											<span
												className={`px-3 py-1 rounded-full text-white text-sm font-medium ${occupancyBadge.color}`}
											>
												{ward.occupancy_rate}%
											</span>
											<span className="text-xs text-gray-500">
												{occupancyBadge.label} Occupancy
											</span>
										</div>
									</div>
								</div>
							</div>

							{/* Patient List */}
							{showDetails && ward.patients.length > 0 && (
								<div className="divide-y">
									{ward.patients.map((patient) => (
										<button
											key={patient.patient_id}
											onClick={() => onPatientClick?.(patient)}
											className="w-full p-4 hover:bg-gray-50 transition-colors text-left"
										>
											<div className="flex items-start justify-between gap-4">
												<div className="flex items-start gap-3">
													<div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
														<User className="w-5 h-5 text-blue-600" />
													</div>
													<div>
														<h4 className="font-semibold">{patient.patient_name}</h4>
														<p className="text-sm text-gray-600">{patient.primary_diagnosis}</p>
														{patient.attending_physician && (
															<p className="text-xs text-gray-500 mt-1">
																Dr. {patient.attending_physician}
															</p>
														)}
													</div>
												</div>
												<div className="text-right text-sm">
													<div className="font-medium text-blue-600">Bed {patient.bed_number}</div>
													<div className="text-gray-500 mt-1">
														{patient.age && patient.gender && (
															<div>
																{patient.age}y, {patient.gender[0]}
															</div>
														)}
														<div>LOS: {calculateLengthOfStay(patient.admission_date)}d</div>
													</div>
												</div>
											</div>
										</button>
									))}
								</div>
							)}

							{/* Empty State */}
							{ward.patients.length === 0 && (
								<div className="p-8 text-center text-gray-500">
									<BedDouble className="w-12 h-12 mx-auto mb-2 text-gray-300" />
									<p>No patients currently admitted to this ward</p>
								</div>
							)}
						</Card>
					);
				})}
			</div>

			{/* Legend */}
			<div className="flex flex-wrap gap-6 text-sm border-t pt-4 text-gray-600">
				<div>
					<span className="font-semibold">LOS:</span> Length of Stay
				</div>
				<div className="flex items-center gap-2">
					<span className="w-3 h-3 rounded bg-green-500"></span>
					<span>Low (&lt;75%)</span>
				</div>
				<div className="flex items-center gap-2">
					<span className="w-3 h-3 rounded bg-yellow-500"></span>
					<span>Medium (75-89%)</span>
				</div>
				<div className="flex items-center gap-2">
					<span className="w-3 h-3 rounded bg-red-500"></span>
					<span>High (≥90%)</span>
				</div>
			</div>
		</div>
	);
}
