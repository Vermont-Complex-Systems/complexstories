<script>
    let {
        limit = $bindable(10000),
        label = "Top N tokens",
        min = 0,
        max = 10_000_000,
        step = 1000
    } = $props();

    let inputValue = $state(String(limit));

    // Sync display when limit changes externally
    $effect(() => {
        inputValue = String(limit);
    });

    function handleBlur() {
        const newValue = parseInt(inputValue);
        if (!isNaN(newValue)) {
            limit = Math.max(min, Math.min(max, newValue));
        }
        inputValue = String(limit);
    }
</script>

<div class="topn-selector">
    <div class="selector-header">
        <span class="selector-label">{label}</span>
    </div>

    <div class="selector-control">
        <input
            type="number"
            bind:value={inputValue}
            onblur={handleBlur}
            {min}
            {max}
            {step}
            class="topn-input"
        />
    </div>
</div>

<style>
    .topn-selector {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        width: 100%;
    }

    .selector-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.25rem;
    }

    .selector-label {
        font-size: 0.75rem;
        font-weight: 500;
        color: var(--vcsi-fg);
    }

    .selector-control {
        position: relative;
    }

    .topn-input {
        width: 100%;
        padding: 0.75rem 1rem;
        border: 1px solid var(--vcsi-border);
        border-radius: 6px;
        font-size: 0.875rem;
        background-color: var(--vcsi-bg);
        color: var(--vcsi-fg);
        transition: all 0.15s ease;
        font-family: var(--vcsi-font-sans);
    }

    .topn-input:hover {
        border-color: rgb(0, 91, 187);
        box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.1);
    }

    .topn-input:focus {
        outline: none;
        border-color: rgb(0, 91, 187);
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    /* Remove spinner arrows in Chrome, Safari, Edge, Opera */
    .topn-input::-webkit-outer-spin-button,
    .topn-input::-webkit-inner-spin-button {
        -webkit-appearance: none;
        appearance: none;
        margin: 0;
    }

    /* Remove spinner arrows in Firefox */
    .topn-input[type=number] {
        -moz-appearance: textfield;
        appearance: textfield;
    }

    /* Mobile responsive */
    @media (max-width: 768px) {
        .topn-input {
            padding: 1rem;
            font-size: 1rem;
        }
    }
</style>
