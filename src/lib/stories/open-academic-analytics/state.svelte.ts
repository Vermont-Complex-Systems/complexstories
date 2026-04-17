// UI State - Controls layout and appearance
export const uiState = $state({
    sidebarCollapsed: false,
    isDarkMode: false,
    debug: false
});

export const dashboardState = $state({
    selectedAuthor: 'Peter Sheridan Dodds',
    selectedCollege: 'College of Engineering and Mathematical Sciences',
    coauthorNodeColor: 'age_diff',
    paperNodeSize: 'cited_by_count',
    authorAgeFilter: null,
    clickedCoauthor: null,
    filterBigPapers: true,
    highlightedCoauthor: null,
    researchGroupFilter: 'all' // 'all', 'with_group', 'without_group'
});

// ------------------
// UI ACTIONS
// ------------------

import { breakpoints } from './utils/layout.js';

if (typeof window !== 'undefined') {
    function handleResize() {
        if (window.innerWidth <= breakpoints.mobile) {
            uiState.sidebarCollapsed = true;
        } else {
            uiState.sidebarCollapsed = false;
        }
    }

    handleResize();
    window.addEventListener('resize', handleResize);
}

export function toggleSidebar() {
    uiState.sidebarCollapsed = !uiState.sidebarCollapsed;
}

export function setAgeFilter(minAge, maxAge) {
    dashboardState.authorAgeFilter = minAge !== null && maxAge !== null ? [minAge, maxAge] : null;
}

export function selectAuthor(authorName) {
    if (dashboardState.selectedAuthor !== authorName) {
        dashboardState.selectedAuthor = authorName;
        dashboardState.clickedCoauthor = null;
        dashboardState.highlightedCoauthor = null;
    }
}
