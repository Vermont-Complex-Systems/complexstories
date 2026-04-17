<script>
    import { resolve } from '$app/paths';
    import octopus from '$lib/assets/images/octopus-swim-right.png';

    let { centered = false } = $props();
</script>

<header>
    <a href={resolve(`/`)} class="home-logo" class:centered aria-label="Back to home">
        <img src={octopus} alt="" />
    </a>
</header>

<style>
.home-logo {
    position: absolute;
    top: 1rem;
    left: 1rem;
    z-index: 100;
    transition: transform 0.2s ease;
}

.home-logo:hover {
    transform: scale(1.05);
}

.home-logo img,
.home-logo :global(picture img) {
    height: 4.5rem;
    width: auto;
}

.home-logo.centered {
    position: relative;
    top: auto;
    left: auto;
    display: block;
    margin: 1rem auto 3rem auto;
    max-width: 8rem;
    text-align: center;
}

@media (max-width: 768px) {
    .home-logo {
        left: 50%;
        transform: translateX(-50%);
    }

    .home-logo:hover {
        transform: translateX(-50%) scale(1.05);
    }
}
</style>