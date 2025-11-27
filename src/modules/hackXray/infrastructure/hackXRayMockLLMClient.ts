import { HackXRayLLMClient } from '../domain/ports';
import { LabReport } from '../domain/labReport';

export class HackXRayMockLLMClient implements HackXRayLLMClient {
    async generateLabReport(hackText: string, country: string): Promise<LabReport> {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Generate a mock report based on the hack text
        const isCreditCard = hackText.toLowerCase().includes('credit') || hackText.toLowerCase().includes('card');
        const isTravel = hackText.toLowerCase().includes('travel') || hackText.toLowerCase().includes('flight');
        const isRisky = hackText.toLowerCase().includes('loophole') || hackText.toLowerCase().includes('trick');

        return {
            meta: {
                version: '1.0',
                language: 'en',
                country: country,
            },
            hackNormalized: {
                title: isCreditCard ? 'Credit Card Rewards Strategy' : isTravel ? 'Travel Hack' : 'Money Hack',
                shortSummary: hackText.substring(0, 100) + (hackText.length > 100 ? '...' : ''),
                detailedSummary: `This hack involves ${isCreditCard ? 'maximizing credit card rewards' : isTravel ? 'optimizing travel expenses' : 'a financial strategy'}. ${isRisky ? 'It may involve some gray areas.' : 'It appears to be a standard optimization technique.'}`,
                hackType: isCreditCard ? 'income_booster' : isTravel ? 'behavioral_tweak' : 'quick_fix',
                primaryCategory: isCreditCard ? 'Credit Cards' : isTravel ? 'Travel' : 'General Finance',
            },
            evaluationPanel: {
                legalityCompliance: {
                    label: isRisky ? 'gray_area' : 'clean',
                    notes: isRisky ? 'Some aspects may be in a gray area legally' : 'Appears to be fully compliant with regulations',
                },
                mathRealImpact: { score0to10: isCreditCard ? 8 : isTravel ? 7 : 6 },
                riskFragility: { score0to10: isRisky ? 7 : 3 },
                practicalityFriction: { score0to10: isCreditCard ? 8 : 6 },
                systemQuirkLoophole: { usesSystemQuirk: isRisky },
            },
            verdict: {
                label: isRisky ? 'works_only_if' : isCreditCard ? 'solid' : 'promising',
                headline: isRisky
                    ? 'Works only if you follow the rules carefully'
                    : isCreditCard
                        ? 'Solid strategy for maximizing rewards'
                        : 'Promising approach worth exploring',
            },
            keyPoints: {
                keyRisks: isRisky
                    ? [
                        'May violate terms of service if not done carefully',
                        'Could result in account closure or penalties',
                        'Requires constant monitoring of rule changes',
                    ]
                    : isCreditCard
                        ? [
                            'Requires good credit score to qualify',
                            'Annual fees may offset benefits for low spenders',
                            'Rewards programs can change without notice',
                        ]
                        : [
                            'Results may vary based on individual circumstances',
                            'Requires discipline and consistent execution',
                            'Market conditions can affect effectiveness',
                        ],
            },
        };
    }
}
