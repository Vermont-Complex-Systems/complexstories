<script lang="ts">
	import { Select, Popover, Calendar } from 'bits-ui';
	import { Calendar as CalendarIcon, ChevronDown, ChevronLeft, ChevronRight, Check } from '@lucide/svelte';
	import {
		DateFormatter,
		getLocalTimeZone,
		parseDate,
		type DateValue
	} from '@internationalized/date';
	import WeekRangePicker from './WeekRangePicker.svelte';
	import MonthRangePicker from './MonthRangePicker.svelte';
	import { COUNTRIES } from '../constants';
	import type { Platform } from '../constants';
	import {
		getAvailableWeeksFromRange,
		getAvailableMonthsFromRange,
		snapToMonthEnd,
		type Granularity
	} from '../dates';
	import type { SystemSelection } from '../types';

	let {
		value = $bindable(),
		label,
		platform,
		granularity
	}: { value: SystemSelection; label: string; platform: Platform; granularity: Granularity } =
		$props();

	const FIELD_LABEL: Record<Granularity, string> = { day: 'Date', week: 'Week', month: 'Month' };

	// --- Day granularity: bits-ui calendar (single day) ---
	const df = new DateFormatter('en-US', { dateStyle: 'medium' });
	const minValue = $derived(parseDate(platform.min));
	const maxValue = $derived(parseDate(platform.max));
	const dayValue = $derived<DateValue>(parseDate(value.start));
	let open = $state(false);

	function commitDay(next: DateValue | undefined) {
		if (next) {
			const s = next.toString();
			value.start = s;
			value.end = s;
		}
	}

	// --- Week / Month granularity: range pickers in single-select mode ---
	const availableWeeks = $derived(getAvailableWeeksFromRange(platform.min, platform.max));
	const availableMonths = $derived(getAvailableMonthsFromRange(platform.min, platform.max));
	// The pickers highlight one unit by its start; the query span is filled below.
	const unitValue = $derived({ start: value.start, end: value.start });

	function commitWeek(next: { start: string; end: string }) {
		value.start = next.start;
		value.end = next.end; // WeekRangePicker already returns Mon→Sun
	}
	function commitMonth(next: { start: string; end: string }) {
		value.start = next.start; // MonthRangePicker returns the month-first for both
		value.end = snapToMonthEnd(next.start);
	}
</script>

<fieldset class="picker">
	<legend>{label}</legend>

	{#if platform.hasEntity}
		<div class="field">
			<span class="field-label">Country</span>
			<Select.Root type="single" bind:value={value.country}>
				<Select.Trigger class="ws-select-trigger">
					{value.country}
					<ChevronDown class="ws-chevron" size={16} />
				</Select.Trigger>
				<Select.Portal>
					<Select.Content class="ws-select-content" sideOffset={4}>
						<Select.Viewport>
							{#each COUNTRIES as country (country)}
								<Select.Item class="ws-select-item" value={country} label={country}>
									{#snippet children({ selected })}
										<span class="ws-check">{#if selected}<Check size={14} />{/if}</span>
										{country}
									{/snippet}
								</Select.Item>
							{/each}
						</Select.Viewport>
					</Select.Content>
				</Select.Portal>
			</Select.Root>
		</div>
	{/if}

	<div class="field">
		<span class="field-label">{FIELD_LABEL[granularity]}</span>
		{#if granularity === 'week'}
			<WeekRangePicker single value={unitValue} {availableWeeks} onchange={commitWeek} />
		{:else if granularity === 'month'}
			<MonthRangePicker single value={unitValue} {availableMonths} onchange={commitMonth} />
		{:else}
			<Popover.Root bind:open>
			<Popover.Trigger class="ws-date-trigger">
				<CalendarIcon size={16} />
				{df.format(dayValue.toDate(getLocalTimeZone()))}
			</Popover.Trigger>
			<Popover.Portal>
				<Popover.Content
					class="ws-popover-content"
					sideOffset={4}
					align="start"
					onOpenAutoFocus={(e) => {
						// By default the popover grabs the first focusable node (the prev-month
						// button), so the calendar's keyboard focus never lands on a day and the
						// arrow keys do nothing. Suppress that and focus the selected day instead,
						// so ←/→/↑/↓ drive the calendar immediately on open.
						e.preventDefault();
						requestAnimationFrame(() => {
							const root = document.querySelector('.ws-cal');
							const day =
								root?.querySelector<HTMLElement>('[data-bits-day][data-focused]') ??
								root?.querySelector<HTMLElement>('[data-bits-day][tabindex="0"]');
							day?.focus();
						});
					}}
				>
					<Calendar.Root
						class="ws-cal"
						type="single"
						value={dayValue}
						{minValue}
						{maxValue}
						weekdayFormat="short"
						initialFocus
						onPlaceholderChange={commitDay}
						onValueChange={commitDay}
					>
						{#snippet children({ months, weekdays })}
							<div class="ws-cal-header">
								<Calendar.PrevButton class="ws-cal-nav"><ChevronLeft size={16} /></Calendar.PrevButton>
								<Calendar.Heading class="ws-cal-heading" />
								<Calendar.NextButton class="ws-cal-nav"><ChevronRight size={16} /></Calendar.NextButton>
							</div>
							{#each months as month (month.value)}
								<Calendar.Grid class="ws-cal-grid">
									<Calendar.GridHead>
										<Calendar.GridRow class="ws-cal-weekdays">
											{#each weekdays as weekday (weekday)}
												<Calendar.HeadCell class="ws-cal-headcell">
													{weekday.slice(0, 2)}
												</Calendar.HeadCell>
											{/each}
										</Calendar.GridRow>
									</Calendar.GridHead>
									<Calendar.GridBody>
										{#each month.weeks as weekDates (weekDates)}
											<Calendar.GridRow class="ws-cal-week">
												{#each weekDates as date (date)}
													<Calendar.Cell class="ws-cal-cell" {date} month={month.value}>
														<Calendar.Day class="ws-cal-day" />
													</Calendar.Cell>
												{/each}
											</Calendar.GridRow>
										{/each}
									</Calendar.GridBody>
								</Calendar.Grid>
							{/each}
						{/snippet}
					</Calendar.Root>
				</Popover.Content>
			</Popover.Portal>
		</Popover.Root>
		{/if}
	</div>
</fieldset>

<style>
	.picker {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		border: 1px solid var(--vcsi-border);
		border-radius: var(--vcsi-radius-md);
		padding: 1rem;
	}
	legend {
		font-size: 0.8rem;
		font-weight: 600;
		padding: 0 0.35rem;
	}
	.field {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}
	.field-label {
		font-size: 0.8rem;
		font-weight: 500;
		color: var(--vcsi-muted);
	}

	/* --- bits-ui primitives (portalled → styled globally, all prefixed ws-) --- */
	:global(.ws-select-trigger),
	:global(.ws-date-trigger) {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		width: 100%;
		padding: 0.5rem 0.75rem;
		font-size: 0.875rem;
		font-family: inherit;
		color: var(--vcsi-fg);
		background: var(--vcsi-bg);
		border: 1px solid var(--vcsi-border);
		border-radius: var(--vcsi-radius-sm);
		cursor: pointer;
		transition: border-color var(--vcsi-transition-fast, 0.15s);
	}
	:global(.ws-date-trigger) {
		justify-content: flex-start;
	}
	:global(.ws-select-trigger:hover),
	:global(.ws-date-trigger:hover) {
		border-color: var(--vcsi-muted);
	}
	:global(.ws-select-trigger:focus-visible),
	:global(.ws-date-trigger:focus-visible) {
		outline: none;
		border-color: var(--vcsi-fg);
		box-shadow: 0 0 0 3px color-mix(in oklch, var(--vcsi-fg) 12%, transparent);
	}
	:global(.ws-chevron) {
		color: var(--vcsi-muted);
		flex-shrink: 0;
	}

	:global(.ws-select-content),
	:global(.ws-popover-content) {
		z-index: 60;
		background: var(--vcsi-bg);
		border: 1px solid var(--vcsi-border);
		border-radius: var(--vcsi-radius-md);
		box-shadow: 0 4px 16px color-mix(in oklch, var(--vcsi-fg) 12%, transparent);
	}
	:global(.ws-select-content) {
		min-width: var(--bits-select-anchor-width);
		max-height: 18rem;
		overflow-y: auto;
		padding: 0.25rem;
	}
	:global(.ws-popover-content) {
		padding: 0.75rem;
	}
	:global(.ws-select-item) {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.4rem 0.5rem;
		font-size: 0.875rem;
		color: var(--vcsi-fg);
		border-radius: var(--vcsi-radius-sm);
		cursor: pointer;
		user-select: none;
	}
	:global(.ws-select-item[data-highlighted]) {
		background: var(--vcsi-code-bg);
	}
	:global(.ws-check) {
		display: inline-flex;
		width: 14px;
		flex-shrink: 0;
		color: var(--vcsi-fg);
	}

	/* --- calendar --- */
	:global(.ws-cal) {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	:global(.ws-cal-header) {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	:global(.ws-cal-heading) {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--vcsi-fg);
	}
	:global(.ws-cal-nav) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.75rem;
		height: 1.75rem;
		color: var(--vcsi-fg);
		background: transparent;
		border: 1px solid transparent;
		border-radius: var(--vcsi-radius-sm);
		cursor: pointer;
	}
	:global(.ws-cal-nav:hover) {
		background: var(--vcsi-code-bg);
	}
	:global(.ws-cal-nav[data-disabled]) {
		opacity: 0.4;
		cursor: default;
	}
	:global(.ws-cal-grid) {
		width: 100%;
		border-collapse: collapse;
	}
	:global(.ws-cal-headcell) {
		width: 2rem;
		font-size: 0.7rem;
		font-weight: 500;
		color: var(--vcsi-muted);
		text-align: center;
		padding-bottom: 0.25rem;
	}
	:global(.ws-cal-cell) {
		text-align: center;
		padding: 0;
	}
	:global(.ws-cal-day) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		font-size: 0.8rem;
		color: var(--vcsi-fg);
		border-radius: var(--vcsi-radius-sm);
		cursor: pointer;
		user-select: none;
	}
	:global(.ws-cal-day:hover) {
		background: var(--vcsi-code-bg);
	}
	/* Roving keyboard focus: bits-ui sets data-focused on the day the arrow keys
	   land on; mirror it with :focus-visible so navigation is always visible. */
	:global(.ws-cal-day[data-focused]),
	:global(.ws-cal-day:focus-visible) {
		outline: 2px solid var(--vcsi-fg);
		outline-offset: -1px;
	}
	:global(.ws-cal-day[data-selected]) {
		background: var(--vcsi-fg);
		color: var(--vcsi-bg);
		font-weight: 600;
	}
	:global(.ws-cal-day[data-today]:not([data-selected])) {
		border: 1px solid var(--vcsi-border);
	}
	:global(.ws-cal-day[data-outside-month]) {
		color: var(--vcsi-muted);
		opacity: 0.5;
	}
	:global(.ws-cal-day[data-disabled]),
	:global(.ws-cal-day[data-unavailable]) {
		opacity: 0.3;
		cursor: default;
		pointer-events: none;
	}
</style>
