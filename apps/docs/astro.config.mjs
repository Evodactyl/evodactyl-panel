import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';
import starlightLinksValidator from 'starlight-links-validator';

export default defineConfig({
    // Deployed as a GitHub Pages project site at
    // https://evodactyl.github.io/evodactyl-panel/. The `base` has to match
    // the repo-name subpath so asset URLs and internal links resolve.
    site: 'https://evodactyl.github.io',
    base: '/evodactyl-panel',
    // In dev, auto-open the browser at /evodactyl-panel/ so visiting bare
    // localhost:4321 doesn't show Astro's 404 (the site lives under the base
    // path).
    server: {
        open: '/evodactyl-panel/',
    },
    integrations: [
        starlight({
            title: 'Evodactyl',
            description:
                'Documentation for the Evodactyl Panel — the modern, Bun + TypeScript rewrite of the Pterodactyl game server management panel.',
            logo: {
                src: './src/assets/logo.svg',
                replacesTitle: false,
            },
            favicon: '/favicon.svg',
            social: {
                github: 'https://github.com/Evodactyl/evodactyl-panel',
            },
            editLink: {
                baseUrl: 'https://github.com/Evodactyl/evodactyl-panel/edit/main/apps/docs/',
            },
            lastUpdated: true,
            pagination: true,
            plugins: [starlightLinksValidator({ errorOnFallbackPages: false })],
            head: [
                {
                    tag: 'meta',
                    attrs: {
                        property: 'og:image',
                        content: 'https://avatars.githubusercontent.com/u/274653358?s=400&v=4',
                    },
                },
                {
                    tag: 'meta',
                    attrs: {
                        name: 'twitter:image',
                        content: 'https://avatars.githubusercontent.com/u/274653358?s=400&v=4',
                    },
                },
                {
                    tag: 'meta',
                    attrs: { name: 'twitter:card', content: 'summary' },
                },
            ],
            sidebar: [
                {
                    label: 'Introduction',
                    items: [
                        { label: 'What is Evodactyl?', slug: 'introduction' },
                        { label: 'Architecture', slug: 'introduction/architecture' },
                    ],
                },
                {
                    label: 'Install',
                    items: [
                        { label: 'Install the panel', slug: 'start' },
                        { label: 'Reverse proxy + TLS', slug: 'start/webserver' },
                        { label: 'Next: Wings', slug: 'start/next-wings' },
                    ],
                },
                {
                    label: 'Wings',
                    autogenerate: { directory: 'wings' },
                },
            ],
            customCss: ['./src/styles/custom.css'],
        }),
    ],
});
