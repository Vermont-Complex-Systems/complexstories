// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}

	// Umami tracker, injected by the script tag in +layout.svelte.
	// Optional: absent during SSR or when blocked by the browser.
	interface Window {
		umami?: {
			track: (event: string, data?: Record<string, string | number>) => void;
		};
	}

// prevent typescript error when importing csv with plugin-dsv
declare module '*.csv' {
  const data: any[]; 
  export default data;
}}

export {};
