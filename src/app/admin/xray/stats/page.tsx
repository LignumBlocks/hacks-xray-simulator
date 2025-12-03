'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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
    timeSeries: Array<{
        bucketStart: string;
        totalEvents: number;
        avgMathScore0to10: number;
        avgRiskScore0to10: number;
        avgPracticalityScore0to10: number;
    }>;
    adherenceDistribution: Array<{ label: string; count: number }>;
    categoryDistribution: Array<{ label: string; count: number }>;
}

interface Filters {
    from?: string;
    to?: string;
    country?: string;
    sourceHost?: string;
    verdictLabel?: string;
    primaryCategory?: string;
}

export default function XRayStatsPage() {
    const [stats, setStats] = useState<BasicXRayStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filters, setFilters] = useState<Filters>({});

    useEffect(() => {
        fetchStats();
    }, [filters]);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (filters.from) params.set('from', filters.from);
            if (filters.to) params.set('to', filters.to);
            if (filters.country) params.set('country', filters.country);
            if (filters.sourceHost) params.set('sourceHost', filters.sourceHost);
            if (filters.verdictLabel) params.set('verdictLabel', filters.verdictLabel);
            if (filters.primaryCategory) params.set('primaryCategory', filters.primaryCategory);

            const response = await fetch(`/api/admin/xray/stats/basic?${params}`);
            if (!response.ok) throw new Error('Failed to fetch stats');
            const data = await response.json();
            setStats(data);
            setError(null);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const updateFilter = (key: keyof Filters, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value || undefined }));
    };

    if (loading && !stats) {
        return (
            <div className="min-h-screen bg-gray-50 p-8">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-3xl font-bold mb-8">XRay Analytics Dashboard</h1>
                    <p className="text-gray-600">Loading statistics...</p>
                </div>
            </div>
        );
    }

    if (error && !stats) {
        return (
            <div className="min-h-screen bg-gray-50 p-8">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-3xl font-bold mb-8">XRay Analytics Dashboard</h1>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-red-800">Error: {error}</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!stats) return null;

    // Format time series for charts
    const timeSeriesData = stats.timeSeries.map(bucket => ({
        date: new Date(bucket.bucketStart).toLocaleDateString(),
        events: bucket.totalEvents,
        math: bucket.avgMathScore0to10.toFixed(1),
        risk: bucket.avgRiskScore0to10.toFixed(1),
        practicality: bucket.avgPracticalityScore0to10.toFixed(1),
    }));

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">XRay Analytics Dashboard</h1>
                    <button
                        onClick={fetchStats}
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                    >
                        {loading ? 'Loading...' : 'Refresh'}
                    </button>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-lg shadow p-6 mb-8">
                    <h2 className="text-lg font-bold mb-4">Filters</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                            <input
                                type="date"
                                value={filters.from || ''}
                                onChange={(e) => updateFilter('from', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                            <input
                                type="date"
                                value={filters.to || ''}
                                onChange={(e) => updateFilter('to', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                            <input
                                type="text"
                                placeholder="e.g. US"
                                value={filters.country || ''}
                                onChange={(e) => updateFilter('country', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Source Host</label>
                            <input
                                type="text"
                                placeholder="e.g. youtube.com"
                                value={filters.sourceHost || ''}
                                onChange={(e) => updateFilter('sourceHost', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Verdict</label>
                            <input
                                type="text"
                                placeholder="e.g. solid"
                                value={filters.verdictLabel || ''}
                                onChange={(e) => updateFilter('verdictLabel', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                            <input
                                type="text"
                                placeholder="e.g. credit_cards"
                                value={filters.primaryCategory || ''}
                                onChange={(e) => updateFilter('primaryCategory', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            />
                        </div>
                    </div>
                    <button
                        onClick={() => setFilters({})}
                        className="mt-4 px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                    >
                        Clear Filters
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

                {/* Time Series Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-xl font-bold mb-4">Events Over Time</h2>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={timeSeriesData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="events" stroke="#3b82f6" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-xl font-bold mb-4">Average Scores Over Time</h2>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={timeSeriesData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis domain={[0, 10]} />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="math" stroke="#3b82f6" name="Math" />
                                <Line type="monotone" dataKey="risk" stroke="#ef4444" name="Risk" />
                                <Line type="monotone" dataKey="practicality" stroke="#10b981" name="Practicality" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Distributions */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-xl font-bold mb-4">Adherence Distribution</h2>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={stats.adherenceDistribution}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="label" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="count" fill="#8b5cf6" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-xl font-bold mb-4">Top Categories</h2>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={stats.categoryDistribution} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" />
                                <YAxis dataKey="label" type="category" width={150} />
                                <Tooltip />
                                <Bar dataKey="count" fill="#f59e0b" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Existing sections */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
                </div>
            </div>
        </div>
    );
}
