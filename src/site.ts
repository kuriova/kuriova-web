/** Site-wide settings. Per-channel settings live in src/content/units/*.json. */
export const site = {
  name: 'Kuriova',
  url: 'https://kuriova.com',
  email: 'hello@kuriova.com',
  title: 'Kuriova: curiosity, with rigor',
  description:
    'Documentaries on the strangest, biggest and most surprising things in our universe. Home of Kuriova Science.',
  slogan: 'Curiosity, with rigor.',
  /**
   * Cloudflare Web Analytics site token. It is public (it ships in every page),
   * so it is safe in the repo. Leave empty to load no analytics at all.
   */
  analyticsToken: '5bdcc4c5752743369e1f269a0f0c94c6',
  /** Profiles that belong to Kuriova itself rather than a unit, for JSON-LD sameAs. */
  sameAs: [
    'https://www.youtube.com/@kuriova',
    'https://www.instagram.com/kuriovahq',
    'https://www.facebook.com/kuriovahq',
    'https://x.com/kuriova',
  ],
  /** Shown on /privacy and /terms. */
  legalUpdated: '2026-10-03',
};
