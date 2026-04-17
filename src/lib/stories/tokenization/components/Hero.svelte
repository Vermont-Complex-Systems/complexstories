<script>
	import { base } from '$app/paths';
	import { ScrollyContent } from '@the-vcsi/scrolly-kit';
	import imgUrl from '../assets/julia-illos/Tbook1.png?url'
</script>

<div class="hero-banner">

	<div class="hero-content">
		<h1 class="hero-title">Tokenization: The Oft Overlooked Appetizer</h1>

		<p class="hero-meta">
			By <a href="https://vermontcomplexsystems.org/who-we-are/julia-zimmerman/">Julia Zimmerman</a> and
			<a href="https://vermontcomplexsystems.org/who-we-are/ben/">Ben Cooley</a>
		</p>

		<figure class="hero-image">
			<img src={imgUrl} alt="A book with tokens inside" />
		</figure>

		<p class="hero-subtitle">
			Language is a human skill. Computers were historically very bad at language…until LLMs came along.
		</p>

		<p class="construction-note">Note: this story is still under construction!</p>
	</div>
</div>

<style>
	.hero-banner {
		min-height: 100vh;
		width: 100%;
		padding: 2.5rem 1rem;
		position: relative;
		box-sizing: border-box;
		display: flex;
		justify-content: center;
		align-items: flex-start;
	}

	/* Mobile-first linear flow: title → meta → date → image → subtitle → note */
	.hero-content {
		max-width: 600px;
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.hero-title {
		font-size: clamp(2.7rem, 9vw, 4rem);
		font-weight: 700;
		line-height: 1.1;
		margin: 0;
		text-wrap: balance;
	}

	.hero-meta {
		margin: 0;
		font-size: var(--vcsi-font-size-small);
	}

	.hero-meta a {
		color: #5d4037;
		text-decoration: underline;
	}
	
	.hero-image {
		margin: 1rem 0;
		max-width: 260px;
		align-self: center;
		mix-blend-mode: multiply;
		opacity: 0.9;
		filter: sepia(0.15) brightness(0.95) contrast(1.05);
	}

	.hero-image img {
		width: 100%;
		height: auto;
		display: block;
	}

	.hero-subtitle {
		margin: 0;
		font-size: var(--vcsi-font-size-md);
		line-height: 1.6;
	}

	.construction-note {
		margin: 0.5rem 0 0;
		font-size: var(--vcsi-font-size-small);
		color: #d21e1e;
		font-style: italic;
	}

	/* Desktop: side-by-side with image floating right.
	   Uses grid with named areas so image occupies the right column while
	   title/meta/date/subtitle stack vertically on the left. */
	@media (min-width: 769px) {
		.hero-content {
			max-width: 900px;
			display: grid;
			grid-template-columns: 1fr 300px;
			grid-template-areas:
				"title   image"
				"meta    image"
				"date    image"
				"subtitle image"
				"note    image";
			gap: 0.75rem 3rem;
			align-items: start;
		}

		.hero-title {
			grid-area: title;
		}

		.hero-meta { grid-area: meta; }

		.hero-image {
			grid-area: image;
			max-width: 300px;
			margin: 0;
			align-self: center;
		}

		.hero-subtitle { grid-area: subtitle; margin-top: 1rem; }
		.construction-note { grid-area: note; }
	}
</style>