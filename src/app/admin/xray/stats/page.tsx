'use client';

import { useEffect, useState } from 'react';

interface BasicXRayStats {
    totalEvents: number;
    byVerdictLabel: Record<string, number>;
    bySourceHost: { host: string; count: number }[];
    byCountry: { country: string; count: number }[];
    avgScores: {
        mathScore0to10: number;
        riskScore0to10: number;
        practicalityScore0to10: number;
    };
    timeRange: {
        from?: string;
        to?: string;
    };
}

export default function XRayStatsPage() {
    const [stats, setStats] = useState<BasicXRayStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/admin/xray/stats/basic');
            if (!response.ok) throw new Error('Failed to fetch stats');
            const data = await response.json();
            setStats(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 p-8">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-3xl font-bold mb-8">XRay Analytics Dashboard</h1>
                    <p className="text-gray-600">Loading statistics...</p>
                </div>
            </div>
        );
    }

    if (error || !stats) {
        return (
            <div className="min-h-screen bg-gray-50 p-8">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-3xl font-bold mb-8">XRay Analytics Dashboard</h1>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-red-800">Error: {error || 'No data available'}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">XRay Analytics Dashboard</h1>
                    <button
                        onClick={fetchStats}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                        Refresh
                    </button>
                </div>

                {/* Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-sm font-medium text-gray-500 mb-2">Total Events</h3>
                        <p className="text-3xl font-bold text-gray-900">{stats.totalEvents}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-sm font-medium text-gray-500 mb-2">Avg Math Score</h3>
                        <p className="text-3xl font-bold text-blue-600">
                            {stats.avgScores.mathScore0to10.toFixed(1)}
                        </p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-sm font-medium text-gray-500 mb-2">Avg Risk Score</h3>
                        <p className="text-3xl font-bold text-red-600">
                            {stats.avgScores.riskScore0to10.toFixed(1)}
                        </p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-sm font-medium text-gray-500 mb-2">Avg Practicality</h3>
                        <p className="text-3xl font-bold text-green-600">
                            {stats.avgScores.practicalityScore0to10.toFixed(1)}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Verdict Distribution */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-xl font-bold mb-4">Verdict Distribution</h2>
                        <div className="space-y-3">
                            {Object.entries(stats.byVerdictLabel).map(([label, count]) => (
                                <div key={label} className="flex justify-between items-center">
                                    <span className="text-gray-700 capitalize">{label.replace(/_/g, ' ')}</span>
                                    <div className="flex items-center gap-3">
                                        <div className="w-32 bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-blue-600 h-2 rounded-full"
                                                style={{ width: `${(count / stats.totalEvents) * 100}%` }}
                                            />
                                        </div>
                                        <span className="text-sm font-medium text-gray-900 w-12 text-right">
                                            {count}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Top Source Hosts */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-xl font-bold mb-4">Top Source Hosts</h2>
                        <div className="space-y-3">
                            {stats.bySourceHost.slice(0, 10).map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center">
                                    <span className="text-gray-700 text-sm truncate max-w-xs">
                                        {item.host}
                                    </span>
                                    <span className="text-sm font-medium text-gray-900">{item.count}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Country Distribution */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-xl font-bold mb-4">Country Distribution</h2>
                        <div className="space-y-3">
                            {stats.byCountry.slice(0, 10).map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center">
                                    <span className="text-gray-700">{item.country}</span>
                                    <div className="flex items-center gap-3">
                                        <div className="w-24 bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-green-600 h-2 rounded-full"
                                                style={{ width: `${(item.count / stats.totalEvents) * 100}%` }}
                                            />
                                        </div>
                                        <span className="text-sm font-medium text-gray-900 w-12 text-right">
                                            {item.count}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Time Range Info */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-xl font-bold mb-4">Time Range</h2>
                        <div className="space-y-2 text-sm text-gray-600">
                            <p>
                                <span className="font-medium">From:</span>{' '}
                                {stats.timeRange.from ? new Date(stats.timeRange.from).toLocaleString() : 'All time'}
                            </p>
                            <p>
                                <span className="font-medium">To:</span>{' '}
                                {stats.timeRange.to ? new Date(stats.timeRange.to).toLocaleString() : 'Now'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
