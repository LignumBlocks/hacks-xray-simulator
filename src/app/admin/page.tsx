import Link from 'next/link';

export default function AdminDashboardPage() {
    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Hintsly Admin Panel</h1>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Hack Reports Card */}
                    <Link href="/admin/hacks" className="block group">
                        <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-200">
                            <div className="px-4 py-5 sm:p-6">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0 bg-indigo-500 rounded-md p-3">
                                        <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    <div className="ml-5 w-0 flex-1">
                                        <dt className="text-lg font-medium text-gray-900 truncate">
                                            Hack Reports
                                        </dt>
                                        <dd className="mt-1 text-sm text-gray-500">
                                            View and review individual hack analysis reports.
                                        </dd>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-50 px-4 py-4 sm:px-6">
                                <div className="text-sm">
                                    <span className="font-medium text-indigo-600 group-hover:text-indigo-500">
                                        View reports <span aria-hidden="true">&rarr;</span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </Link>

                    {/* XRay Analytics Card */}
                    <Link href="/admin/xray/stats" className="block group">
                        <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-200">
                            <div className="px-4 py-5 sm:p-6">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                                        <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                    </div>
                                    <div className="ml-5 w-0 flex-1">
                                        <dt className="text-lg font-medium text-gray-900 truncate">
                                            XRay Analytics
                                        </dt>
                                        <dd className="mt-1 text-sm text-gray-500">
                                            View aggregated metrics and usage trends.
                                        </dd>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-50 px-4 py-4 sm:px-6">
                                <div className="text-sm">
                                    <span className="font-medium text-green-600 group-hover:text-green-500">
                                        View analytics <span aria-hidden="true">&rarr;</span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
}
