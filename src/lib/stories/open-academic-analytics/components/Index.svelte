<script>
    import { untrack } from 'svelte';
    import { dashboardState, uiState } from '$stories/open-academic-analytics/state.svelte.ts';
    import { loadAvailableAuthors, loadPaperData, loadCoauthorData } from '$stories/open-academic-analytics/data.remote.js';
    import Spinner from '$lib/components/helpers/Spinner.svelte';
    import Dashboard from './Dashboard.svelte';
    import Nav from './Nav.svelte';
    import Sidebar from './Sidebar.svelte';

    let authors = $state(null);
    let paper = $state(null);
    let coauthor = $state(null);
    let isLoading = $state(true);

    // One-time authors load
    loadAvailableAuthors().then(result => { authors = result; });

    // Reactive data loading — handles both initial load and re-fetching
    $effect(() => {
        const author = dashboardState.selectedAuthor;
        const filter = dashboardState.filterBigPapers;
        const p = loadPaperData({ authorName: author, filterBigPapers: filter });
        const c = loadCoauthorData({ authorName: author, filterBigPapers: filter });
        // untrack the consumption to avoid tracking query internals
        untrack(() => {
            Promise.all([p, c]).then(([pr, cr]) => {
                paper = pr;
                coauthor = cr;
                isLoading = false;
            });
        });
    });

</script>

{#if isLoading}
<div class="loading-container">
    <Spinner />
</div>
{:else}
<div class="dashboard-app">
    <div class="app-container">
        <div class="layout">
                <aside class="sidebar-container {uiState.sidebarCollapsed ? 'collapsed' : ''}">
                    <Sidebar {authors} {paper} {coauthor} />
                </aside>

                <main class="main-content {uiState.sidebarCollapsed ? 'collapsed-sidebar' : ''}">
                    <Nav />
                    <Dashboard {paper} {coauthor} />
                </main>
        </div>
    </div>
</div>
{/if}


<style>

    .loading-container {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100vh;
    }

    /* Story-specific global reset */
    .dashboard-app * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
        font-family: "EB Garamond", serif;
    }

    .dashboard-app {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: var(--vcsi-bg);
        color: var(--vcsi-fg);
        z-index: 1000;
        overflow: hidden;
    }

    .app-container {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 10;
        overflow: hidden;
    }

    .layout {
        display: flex;
        height: 100vh;
        width: 100vw;
        margin: 0;
        padding: 0;
    }

    .sidebar-container {
        flex-shrink: 0;
        width: 17rem;
        background-color: var(--vcsi-gray-100);
        border-right: 1px solid var(--vcsi-border);
        transition: width 200ms ease;
        overflow: hidden;
    }

    :global(.dark) .sidebar-container {
        background-color: var(--vcsi-gray-800);
    }

    .sidebar-container.collapsed {
        width: 5rem;
    }

    .main-content {
        flex: 1;
        overflow: auto;
        background-color: var(--vcsi-bg);
        max-width: none;
        margin: 0;
        padding: 2rem;
        transition: padding-left 200ms ease;
    }

    .main-content.collapsed-sidebar {
        padding-left: 2rem;
    }
    
    /* Responsive */
    @media (max-width: 768px) {
        .layout {
            flex-direction: column;
        }
        
        .sidebar-container {
            width: 100% !important;
            height: auto;
            border-right: none;
            border-bottom: 1px solid var(--vcsi-border);
            max-height: none;
            transition: max-height 200ms ease;
        }

        .sidebar-container.collapsed {
            max-height: 80px; /* Just show the header */
            overflow: hidden;
        }

        .main-content,
        .main-content.collapsed-sidebar {
            padding: 1rem;
        }
    }
</style>