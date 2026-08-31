/**
 * Institution color mapping for consistent visualization across components
 * Color logic: Green (intimate), Blue (professional peers), Purple (semi-institutional/educational),
 * Orange/Red (institutions with sensitive data), Amber (commercial), Gray (strangers)
 */

export const institutionColorMap = {
    // Green: Close personal
    'TP_Friend': '#10B981',
    'TP_Relative': '#059669',

    // Violet: Professional and formal
    'TP_Medical': '#C084FC',
    'TP_Researcher': '#A855F7',
    'TP_Employer': '#9333EA',
    'TP_School': '#7C3AED',
    'TP_Financial': '#6D28D9',

    // Blue: Civic
    'TP_NonProf': '#38BDF8',
    'TP_Gov': '#0EA5E9',
    'TP_Police': '#0284C7',

    // Amber: Commercial
    'TP_Company_cust': '#F59E0B',
    'TP_Platform': '#F97316',
    'TP_Company_notcust': '#D97706',

    // Gray: Weak social ties
    'TP_Co_worker': '#9CA3AF',
    'TP_Neighbor': '#6B7280',
    'TP_Acquaintance': '#4B5563',
    'TP_Stranger': '#374151'
};


export function getInstitutionColor(institution) {
    return institutionColorMap[institution] || '#6b7280'; // Default to gray
}
