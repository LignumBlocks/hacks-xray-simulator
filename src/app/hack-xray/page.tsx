'use client';

import { useState } from 'react';
import { LabReport } from '@/modules/hackXray/domain/labReport';

const MIN_LENGTH = 20;

interface FormErrors {
    hackText?: string;
    sourceLink?: string;
}

function validateHackXRayForm(values: { hackText: string; sourceLink?: string | null }): { isValid: boolean; errors: FormErrors } {
    const errors: FormErrors = {};

    const text = values.hackText?.trim() ?? '';
    const url = values.sourceLink?.trim() ?? '';
    const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');

    // If it's NOT a YouTube link, we require text
    if (!isYouTube) {
        if (!text) {
            errors.hackText = 'Please paste a money hack first.';
        } else if (text.length < MIN_LENGTH) {
            errors.hackText = 'Please paste a bit more context so we can analyze it.';
        }
    }

    if (values.sourceLink) {
        const looksLikeUrl = url.startsWith('http://') || url.startsWith('https://');
        if (!looksLikeUrl) {
            errors.sourceLink = "This doesn't look like a valid link. You can leave it empty.";
        }
    }

    return { isValid: Object.keys(errors).length === 0, errors };
}

export default function HackXRayPage() {
    const [hackText, setHackText] = useState('');
    const [sourceLink, setSourceLink] = useState('');
    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState<LabReport | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [formErrors, setFormErrors] = useState<FormErrors>({});

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Frontend validation
        const validation = validateHackXRayForm({ hackText, sourceLink: sourceLink || null });
        if (!validation.isValid) {
            setFormErrors(validation.errors);
            return;
        }

        setFormErrors({});
        setLoading(true);
        setError(null);
        setReport(null);

        try {
            const res = await fetch('/api/hack-xray', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    hackText,
                    sourceLink: sourceLink || null,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Failed to analyze hack');
            }

            setReport(data.labReport);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-8 font-sans text-slate-900">
            <div className="max-w-3xl mx-auto">
                <header className="mb-10 text-center">
                    <h1 className="text-4xl font-bold text-indigo-600 mb-2">Hintsly Hack X-Ray</h1>
                    <p className="text-slate-600">Paste a money hack. Get the brutal truth.</p>
                    <a
                        href="/admin/hacks"
                        className="inline-block mt-3 text-sm text-indigo-600 hover:text-indigo-800 underline"
                    >
                        View All Analyzed Hacks →
                    </a>
                </header>

                <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8">
                    <div className="mb-4">
                        <label htmlFor="hackText" className="block text-sm font-medium text-slate-700 mb-2">
                            The Hack (Text or Link)
                        </label>
                        <textarea
                            id="hackText"
                            rows={4}
                            className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition ${formErrors.hackText ? 'border-red-500' : 'border-slate-300'
                                }`}
                            placeholder="e.g. 'Use this credit card to get 5% back on everything...'"
                            value={hackText}
                            onChange={(e) => {
                                setHackText(e.target.value);
                                if (formErrors.hackText) setFormErrors({ ...formErrors, hackText: undefined });
                            }}
                        />
                        {formErrors.hackText && (
                            <p className="mt-1 text-sm text-red-600">{formErrors.hackText}</p>
                        )}
                    </div>

                    <div className="mb-4">
                        <label htmlFor="sourceLink" className="block text-sm font-medium text-slate-700 mb-2">
                            Source Link (optional)
                        </label>
                        <input
                            id="sourceLink"
                            type="text"
                            className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition ${formErrors.sourceLink ? 'border-red-500' : 'border-slate-300'
                                }`}
                            placeholder="https://..."
                            value={sourceLink}
                            onChange={(e) => {
                                setSourceLink(e.target.value);
                                if (formErrors.sourceLink) setFormErrors({ ...formErrors, sourceLink: undefined });
                            }}
                        />
                        {formErrors.sourceLink && (
                            <p className="mt-1 text-sm text-red-600">{formErrors.sourceLink}</p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                        {loading ? 'Analyzing...' : 'Run X-Ray'}
                    </button>
                    {error && (
                        <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                            {error}
                        </div>
                    )}
                </form>

                {report && (
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
                                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${report.verdict.label === 'solid' || report.verdict.label === 'promising_superhack_part' ? 'bg-green-500 text-white' :
                                            report.verdict.label === 'trash' || report.verdict.label === 'dangerous_for_most' ? 'bg-red-500 text-white' : 'bg-yellow-500 text-white'
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
                            {' • '}
                            Version: <span className="font-semibold text-slate-600">{report.meta.version}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function ScoreBar({ label, score, inverse = false }: { label: string; score: number; inverse?: boolean }) {
    // Inverse: High score is bad (e.g. Risk)
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
