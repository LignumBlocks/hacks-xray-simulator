'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { LabReport } from '@/modules/hackXray/domain/labReport';

export default function HackReportDetailPage() {
    const params = useParams();
    const id = params.id as string;
    const [report, setReport] = useState<LabReport | null>(null);
    const [sourceLink, setSourceLink] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchReport = async () => {
            try {
                const res = await fetch(`/api/hack-xray/${id}`);
                if (!res.ok) {
                    throw new Error('Report not found');
                }
                const data = await res.json();
                setReport(data.labReport);
                setSourceLink(data.sourceLink);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchReport();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 p-8 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                    <p className="mt-4 text-gray-600">Loading report...</p>
                </div>
            </div>
        );
    }

    if (error || !report) {
        return (
            <div className="min-h-screen bg-slate-50 p-8">
                <div className="max-w-3xl mx-auto">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                        <h2 className="text-xl font-bold text-red-800 mb-2">Report Not Found</h2>
                        <p className="text-red-600 mb-4">{error || 'The requested report could not be found.'}</p>
                        <Link href="/admin/hacks" className="text-indigo-600 hover:text-indigo-800 font-medium">
                            ← Back to Reports
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-8 font-sans text-slate-900">
            <div className="max-w-3xl mx-auto">
                <div className="mb-6">
                    <Link href="/admin/hacks" className="text-indigo-600 hover:text-indigo-800 font-medium">
                        ← Back to Reports
                    </Link>
                </div>

                <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-slate-200">
                    {/* Header */}
                    <div className="bg-slate-900 text-white p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-2xl font-bold mb-1">{report.hackNormalized.title}</h2>
                                <p className="text-slate-400 text-sm">{report.hackNormalized.shortSummary}</p>
                                {sourceLink && (
                                    <a
                                        href={sourceLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 mt-2 text-xs text-indigo-400 hover:text-indigo-300 underline"
                                    >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                        View Source
                                    </a>
                                )}
                            </div>
                            <div className="text-right">
                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${report.verdict.label === 'solid' || report.verdict.label === 'promising_superhack_part'
                                        ? 'bg-green-500 text-white'
                                        : report.verdict.label === 'trash' || report.verdict.label === 'dangerous_for_most'
                                            ? 'bg-red-500 text-white'
                                            : 'bg-yellow-500 text-white'
                                    }`}>
                                    {report.verdict.label.replace(/_/g, ' ')}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="p-6 space-y-8">
                        {/* Verdict Headline */}
                        <div className="text-center">
                            <p className="text-lg font-semibold text-slate-800">{report.verdict.headline}</p>
                        </div>

                        {/* Scores and Adherence */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Scores */}
                            <div>
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Scores</h3>
                                <div className="space-y-4">
                                    <ScoreBar label="Math & Real Impact" score={report.evaluationPanel.mathRealImpact.score0to10} />
                                    <ScoreBar label="Risk & Fragility" score={report.evaluationPanel.riskFragility.score0to10} inverse />
                                    <ScoreBar label="Practicality" score={report.evaluationPanel.practicalityFriction.score0to10} />
                                </div>
                            </div>

                            {/* Adherence */}
                            <div>
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Adherence Level</h3>
                                <div className="bg-slate-50 rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase ${report.adherence.level === 'easy' ? 'bg-green-100 text-green-700' :
                                                report.adherence.level === 'intermediate' ? 'bg-blue-100 text-blue-700' :
                                                    report.adherence.level === 'advanced' ? 'bg-orange-100 text-orange-700' :
                                                        'bg-red-100 text-red-700'
                                            }`}>
                                            {report.adherence.level}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-600">{report.adherence.notes}</p>
                                </div>
                            </div>
                        </div>

                        {/* Profiles */}
                        {(report.verdict.recommendedProfiles.length > 0 || report.verdict.notForProfiles.length > 0) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Recommended For */}
                                {report.verdict.recommendedProfiles.length > 0 && (
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">✓ Recommended For</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {report.verdict.recommendedProfiles.map((profile, i) => (
                                                <span key={i} className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                                    {profile}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Not For */}
                                {report.verdict.notForProfiles.length > 0 && (
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">✗ Not For</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {report.verdict.notForProfiles.map((profile, i) => (
                                                <span key={i} className="inline-block px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                                                    {profile}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* System Quirk/Loophole */}
                        {report.evaluationPanel.systemQuirkLoophole.usesSystemQuirk && (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                <h3 className="text-sm font-bold text-amber-800 uppercase tracking-wider mb-2">⚠️ System Quirk/Loophole</h3>
                                {report.evaluationPanel.systemQuirkLoophole.description && (
                                    <p className="text-sm text-amber-900 mb-2">{report.evaluationPanel.systemQuirkLoophole.description}</p>
                                )}
                                {report.evaluationPanel.systemQuirkLoophole.fragilityNotes && report.evaluationPanel.systemQuirkLoophole.fragilityNotes.length > 0 && (
                                    <div>
                                        <p className="text-xs font-semibold text-amber-800 mb-1">Fragility Notes:</p>
                                        <ul className="space-y-1">
                                            {report.evaluationPanel.systemQuirkLoophole.fragilityNotes.map((note, i) => (
                                                <li key={i} className="text-xs text-amber-900 flex items-start">
                                                    <span className="mr-2">•</span>
                                                    {note}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Key Risks */}
                        <div>
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Key Risks</h3>
                            <ul className="space-y-2">
                                {report.keyPoints.keyRisks.map((risk, i) => (
                                    <li key={i} className="flex items-start text-sm text-slate-700">
                                        <span className="mr-2 text-red-500">•</span>
                                        {risk}
                                    </li>
                                ))}
                                {report.keyPoints.keyRisks.length === 0 && (
                                    <li className="text-sm text-slate-400 italic">No major risks detected.</li>
                                )}
                            </ul>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="bg-slate-50 p-4 border-t border-slate-100 text-center text-xs text-slate-400">
                        Legality: <span className="font-semibold text-slate-600 uppercase">{report.evaluationPanel.legalityCompliance.label.replace(/_/g, ' ')}</span>
                    </div>
                </div>

                {/* Metadata */}
                <div className="mt-6 bg-white rounded-lg shadow-sm border border-slate-200 p-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Report Details</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-slate-500">Type:</span>
                            <span className="ml-2 font-medium">{report.hackNormalized.hackType.replace(/_/g, ' ')}</span>
                        </div>
                        <div>
                            <span className="text-slate-500">Category:</span>
                            <span className="ml-2 font-medium">{report.hackNormalized.primaryCategory}</span>
                        </div>
                        <div>
                            <span className="text-slate-500">Country:</span>
                            <span className="ml-2 font-medium">{report.meta.country}</span>
                        </div>
                        <div>
                            <span className="text-slate-500">Version:</span>
                            <span className="ml-2 font-medium">{report.meta.version}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ScoreBar({ label, score, inverse = false }: { label: string; score: number; inverse?: boolean }) {
    let colorClass = 'bg-indigo-500';
    if (inverse) {
        if (score > 7) colorClass = 'bg-red-500';
        else if (score > 4) colorClass = 'bg-yellow-500';
        else colorClass = 'bg-green-500';
    } else {
        if (score > 7) colorClass = 'bg-green-500';
        else if (score > 4) colorClass = 'bg-yellow-500';
        else colorClass = 'bg-red-500';
    }

    return (
        <div>
            <div className="flex justify-between text-xs font-medium text-slate-600 mb-1">
                <span>{label}</span>
                <span>{score}/10</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2.5">
                <div className={`h-2.5 rounded-full ${colorClass}`} style={{ width: `${score * 10}%` }}></div>
            </div>
        </div>
    );
}
