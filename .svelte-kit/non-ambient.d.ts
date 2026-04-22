
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	type MatcherParam<M> = M extends (param : string) => param is (infer U extends string) ? U : string;

	export interface AppTypes {
		RouteId(): "/(app)" | "/" | "/(app)/about" | "/(app)/about/[name]" | "/blog" | "/(app)/blog" | "/blog/[slug]" | "/(app)/work-with-us" | "/[slug=dynamic]" | "/[slug]";
		RouteParams(): {
			"/(app)/about/[name]": { name: string };
			"/blog/[slug]": { slug: string };
			"/[slug=dynamic]": { slug: MatcherParam<typeof import('../src/params/dynamic.js').match> };
			"/[slug]": { slug: string }
		};
		LayoutParams(): {
			"/(app)": { name?: string };
			"/": { name?: string; slug?: string };
			"/(app)/about": { name?: string };
			"/(app)/about/[name]": { name: string };
			"/blog": { slug?: string };
			"/(app)/blog": Record<string, never>;
			"/blog/[slug]": { slug: string };
			"/(app)/work-with-us": Record<string, never>;
			"/[slug=dynamic]": { slug: MatcherParam<typeof import('../src/params/dynamic.js').match> };
			"/[slug]": { slug: string }
		};
		Pathname(): "/" | "/about/" | `/about/${string}/` & {} | "/blog/" | `/blog/${string}/` & {} | "/work-with-us/" | `/${string}/` & {};
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/Allotax.jpg" | "/UVM_Seal_Gr.png" | "/assets/fonts/atlas/AtlasGrotesk-Bold-Web.woff" | "/assets/fonts/atlas/AtlasGrotesk-Bold-Web.woff2" | "/assets/fonts/atlas/AtlasGrotesk-Light-Web.woff" | "/assets/fonts/atlas/AtlasGrotesk-Light-Web.woff2" | "/assets/fonts/atlas/AtlasGrotesk-Medium-Web.woff" | "/assets/fonts/atlas/AtlasGrotesk-Medium-Web.woff2" | "/assets/fonts/atlas/AtlasGrotesk-Regular-Web.woff" | "/assets/fonts/atlas/AtlasGrotesk-Regular-Web.woff2" | "/assets/fonts/atlas/AtlasGrotesk-Thin-Web.woff" | "/assets/fonts/atlas/AtlasGrotesk-Thin-Web.woff2" | "/assets/fonts/atlas/AtlasTypewriter-Medium-Web.woff2" | "/assets/fonts/baskerville/Baskervville-Bold.ttf" | "/assets/fonts/baskerville/Baskervville-BoldItalic.ttf" | "/assets/fonts/baskerville/Baskervville-Italic-VariableFont_wght.ttf" | "/assets/fonts/baskerville/Baskervville-Italic.ttf" | "/assets/fonts/baskerville/Baskervville-Medium.ttf" | "/assets/fonts/baskerville/Baskervville-MediumItalic.ttf" | "/assets/fonts/baskerville/Baskervville-Regular.ttf" | "/assets/fonts/baskerville/Baskervville-SemiBold.ttf" | "/assets/fonts/baskerville/Baskervville-SemiBoldItalic.ttf" | "/assets/fonts/baskerville/Baskervville-VariableFont_wght.ttf" | "/assets/fonts/baskerville/OFL.txt" | "/assets/fonts/baskerville/README.txt" | "/assets/fonts/tiempos/TiemposHeadlineWeb-Regular.woff" | "/assets/fonts/tiempos/TiemposHeadlineWeb-Regular.woff2" | "/assets/fonts/tiempos/TiemposTextWeb-Bold.woff" | "/assets/fonts/tiempos/TiemposTextWeb-Bold.woff2" | "/assets/fonts/tiempos/TiemposTextWeb-Regular.woff" | "/assets/fonts/tiempos/TiemposTextWeb-Regular.woff2" | "/assets/fonts/tiempos/TiemposTextWeb-RegularItalic.woff" | "/assets/fonts/tiempos/TiemposTextWeb-RegularItalic.woff2" | "/back-to-the-future.png" | "/common/assets/authors/jso.jpg" | "/common/assets/members/avatar.jpg" | "/common/assets/screenshots/allotax-scrolly-boy-0.jpg" | "/common/assets/screenshots/allotax-scrolly-boy-1.jpg" | "/common/assets/screenshots/allotax-scrolly-boy-2.jpg" | "/common/assets/screenshots/allotax-scrolly-boy-dashboard.jpg" | "/common/assets/screenshots/allotax-scrolly-girl-0.jpg" | "/common/assets/screenshots/allotax-scrolly-girl-1.jpg" | "/common/assets/screenshots/allotax-scrolly-girl-2.jpg" | "/common/assets/screenshots/allotax-scrolly-girl-dashboard.jpg" | "/common/thumbnails/screenshots/allotax-scrolly.jpg" | "/common/thumbnails/screenshots/allotaxonometry.jpg" | "/common/thumbnails/screenshots/cnww.png" | "/common/thumbnails/screenshots/explore-the-cat-project.jpg" | "/common/thumbnails/screenshots/friends-funnier-than-you-are.jpg" | "/common/thumbnails/screenshots/open-academic-analytics.jpg" | "/common/thumbnails/screenshots/vermont-livability-map.jpg" | "/common/thumbnails/screenshots/wikiwrangler.png" | "/community-69fc3b40333659ebf12e64e787bf03e4.jpg" | "/favicon.jpg" | "/octopus-swim-left.png" | "/octopus-swim-right.png" | "/paper_asset.jpg" | "/paper_layers.jpg" | "/paper_timeline.jpg" | "/papers.jpg" | "/py_allotax_example005-crop.jpg" | "/robots.txt" | "/uvm_departments_assets.jpg" | string & {};
	}
}