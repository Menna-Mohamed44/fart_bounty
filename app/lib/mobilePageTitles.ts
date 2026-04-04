const EXACT: Record<string, string> = {
  '/home': 'Home',
  '/notifications': 'Notifications',
  '/battles': 'Battles',
  '/challenges': 'Challenges',
  '/hall-of-fame': 'Hall of Fame',
  '/assets': 'Assets',
  '/media-library': 'Media Library',
  '/groups': 'Fart Groups',
  '/news': 'Fart News',
  '/stories': 'Stories',
  '/games': 'Games',
  '/generator': 'Generator',
  '/confessional': 'Confessional',
  '/help': 'Help',
  '/shop': 'Marketplace',
  '/settings': 'Settings',
  '/moderation': 'Moderation',
  '/chat': 'Chat',
  '/fart-legends': 'Fart Legends',
  '/notes': 'Notes',
  '/welcome': 'Welcome',
}

const PREFIXES: { prefix: string; title: string }[] = [
  { prefix: '/admin/bots', title: 'Bot Manager' },
  { prefix: '/admin/content', title: 'Content Manager' },
  { prefix: '/admin/roles', title: 'Role Manager' },
  { prefix: '/admin/notes', title: 'User Notes' },
]

export function getMobilePageTitle(pathname: string | null): string {
  if (!pathname) return 'Fart Bounty'
  if (EXACT[pathname]) return EXACT[pathname]
  for (const { prefix, title } of PREFIXES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return title
  }
  const parts = pathname.split('/').filter(Boolean)
  if (parts.length === 1) {
    return parts[0].replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  }
  return 'Fart Bounty'
}
