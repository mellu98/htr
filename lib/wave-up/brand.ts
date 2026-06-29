/**
 * Wave Up — Brand & product framing.
 *
 * The product used to be "HTR Training Brain" (a course player).
 * It is now "Wave Up": an AI Coach for music artists and their managers.
 *
 * HTR Training remains the *content engine* — videos, lessons, AI outputs,
 * review center. Everything below is the Wave Up product layer on top.
 */

export const BRAND = {
  name: 'Wave Up',
  tagline: 'AI Coach for music artists & managers',
  subtitle:
    '24/7 coaching between calls, anchored in the HTR Training method.',
  course: {
    name: 'HTR Training',
    description:
      'Intelligent video training system for music, branding and artist development.',
    category: 'Music / Artist Training',
  },
} as const;

export const NAV_LINKS = {
  main: [
    { href: '/', label: 'Home' },
    { href: '/coach', label: 'Coach' },
    { href: '/releases', label: 'Releases' },
    { href: '/tasks', label: 'Tasks' },
    { href: '/manager', label: 'Manager' },
  ],
  growth: [
    { href: '/releases', label: 'Prossime uscite' },
    { href: '/content', label: 'Contenuti' },
    { href: '/metrics', label: 'Numeri' },
    { href: '/contacts', label: 'Contatti' },
    { href: '/goals', label: 'Obiettivi' },
  ],
  content: [
    { href: '/artist-profile', label: 'Artist Profile' },
    { href: '/call-prep', label: 'Call Prep' },
    { href: '/library', label: 'Video Library' },
    { href: '/review', label: 'Review' },
    { href: '/notes', label: 'Note' },
  ],
} as const;

export type NavLink = (typeof NAV_LINKS.main)[number] | (typeof NAV_LINKS.content)[number];

/**
 * Mobile drawer navigation. The drawer is opened from the hamburger in
 * TopBar and contains ALL routes grouped by product bucket so users on
 * small screens can reach every page (Library, Review, AI, Notes, etc.)
 * — without scrolling through a 12-item list.
 */
export const MOBILE_NAV_SECTIONS = [
  {
    title: 'Wave Up',
    items: [
      { href: '/', label: 'Home' },
      { href: '/coach', label: 'Coach' },
      { href: '/releases', label: 'Prossime uscite' },
      { href: '/tasks', label: 'Tasks' },
      { href: '/manager', label: 'Manager' },
      { href: '/artist-profile', label: 'Artist Profile' },
      { href: '/call-prep', label: 'Call Prep' },
    ],
  },
  {
    title: 'Crescita',
    items: [
      { href: '/content', label: 'Contenuti' },
      { href: '/metrics', label: 'Numeri' },
      { href: '/contacts', label: 'Contatti' },
      { href: '/goals', label: 'Obiettivi' },
    ],
  },
  {
    title: 'Course',
    items: [
      { href: '/library', label: 'Video Library' },
      { href: '/review', label: 'Review' },
      { href: '/notes', label: 'Note' },
    ],
  },
] as const;

export type MobileNavSection = (typeof MOBILE_NAV_SECTIONS)[number];
export type MobileNavItem = MobileNavSection['items'][number];
