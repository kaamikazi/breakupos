import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Breakup OS',
    short_name: 'Breakup OS',
    description: 'AI-powered relationship recovery, dating clarity, social verdicts, and private situationship tracking.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#09090b',
    theme_color: '#ec4899',
    orientation: 'portrait',
    categories: ['social', 'lifestyle', 'productivity'],
    icons: [
      {
        src: '/pwa/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/pwa/maskable-icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  }
}
