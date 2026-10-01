export type GameDefinition = {
  id: string
  name: string
  category: string
  description: string
  payout_label: string
  choices: string[]
  icon: string
  accent: string
  /** Poster gradient stops for lobby tiles */
  artFrom: string
  artTo: string
  tagline: string
  /** Local stub bet vs live provider iframe launch */
  kind?: 'local' | 'provider'
  image?: string
  provider?: string
  providerKey?: string
  providerImage?: string
}

/** Client-side display metadata; server validates all bets / launches. */
export const GAME_CATALOG: GameDefinition[] = [
  {
    id: 'aviator',
    name: 'Aviator',
    category: 'Hot',
    description: 'Spribe Aviator — live crash game.',
    payout_label: 'Live',
    choices: [],
    icon: '✈️',
    accent: '#ef4444',
    artFrom: '#7f1d1d',
    artTo: '#0f172a',
    tagline: 'Spribe',
    kind: 'provider',
    image: '/lobby/aviator.svg',
    provider: 'Spribe',
    providerKey: 'spribe',
  },
  {
    id: 'lucky_6',
    name: 'Lucky 6',
    category: 'Hot',
    description: 'ExcellentReel Lucky 6 — live provider game.',
    payout_label: 'Live',
    choices: [],
    icon: '🎱',
    accent: '#f97316',
    artFrom: '#9a3412',
    artTo: '#1c1917',
    tagline: 'ExcellentReel',
    kind: 'provider',
    image: '/lobby/lucky6.svg',
    provider: 'ExcellentReel',
    providerKey: 'excellentreel',
  },
  {
    id: 'sports',
    name: 'Sports',
    category: 'Hot',
    description: 'Turbo Sportsbook — live sports betting.',
    payout_label: 'Live',
    choices: [],
    icon: '🏆',
    accent: '#22c55e',
    artFrom: '#14532d',
    artTo: '#0f172a',
    tagline: 'Turbo Sports',
    kind: 'provider',
    image: '/lobby/sports.svg',
    provider: 'Turbo Sports',
    providerKey: 'turbosportsbook',
  },
  {
    id: 'red_black',
    name: 'Red or Black',
    category: 'Cards',
    description: 'Pick a colour. Win doubles your stake.',
    payout_label: '2×',
    choices: ['RED', 'BLACK'],
    icon: '🂡',
    accent: '#ef4444',
    artFrom: '#7f1d1d',
    artTo: '#111827',
    tagline: 'Local',
    image: '/lobby/red-black.svg',
    provider: 'DummyGame',
    providerKey: 'dummy',
  },
  {
    id: 'coin_flip',
    name: 'Coin Flip',
    category: 'Classic',
    description: 'Heads or tails — 50/50 chance.',
    payout_label: '2×',
    choices: ['HEADS', 'TAILS'],
    icon: '🪙',
    accent: '#f59e0b',
    artFrom: '#92400e',
    artTo: '#1c1917',
    tagline: 'Call it',
  },
  {
    id: 'dice_roll',
    name: 'Lucky Dice',
    category: 'Dice',
    description: 'Pick a number 1–6. Match the roll to win big.',
    payout_label: '5×',
    choices: ['1', '2', '3', '4', '5', '6'],
    icon: '🎲',
    accent: '#a855f7',
    artFrom: '#581c87',
    artTo: '#0f172a',
    tagline: 'Roll for gold',
  },
  {
    id: 'hi_lo',
    name: 'Hi-Lo Dice',
    category: 'Dice',
    description: 'Will the dice land high (4–6) or low (1–3)?',
    payout_label: '2×',
    choices: ['HI', 'LO'],
    icon: '🎯',
    accent: '#06b6d4',
    artFrom: '#155e75',
    artTo: '#082f49',
    tagline: 'High or low',
  },
  {
    id: 'odd_even',
    name: 'Odd or Even',
    category: 'Numbers',
    description: 'Roll 1–10. Predict odd or even.',
    payout_label: '2×',
    choices: ['ODD', 'EVEN'],
    icon: '✦',
    accent: '#818cf8',
    artFrom: '#312e81',
    artTo: '#0f172a',
    tagline: 'Pick the parity',
  },
  {
    id: 'roulette',
    name: 'Mini Roulette',
    category: 'Roulette',
    description: 'Red, black, or green. Green pays more.',
    payout_label: '8×',
    choices: ['RED', 'BLACK', 'GREEN'],
    icon: '◉',
    accent: '#22c55e',
    artFrom: '#14532d',
    artTo: '#450a0a',
    tagline: 'Spin the wheel',
  },
  {
    id: 'card_suit',
    name: 'Card Suit',
    category: 'Cards',
    description: 'Pick the suit of the hidden card.',
    payout_label: '3.5×',
    choices: ['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES'],
    icon: '🂠',
    accent: '#ec4899',
    artFrom: '#9d174d',
    artTo: '#1e1b4b',
    tagline: 'Guess the suit',
  },
  {
    id: 'goal_kick',
    name: 'Goal Kick',
    category: 'Sports',
    description: 'Where will the striker shoot?',
    payout_label: '3×',
    choices: ['LEFT', 'CENTER', 'RIGHT'],
    icon: '⚽',
    accent: '#14b8a6',
    artFrom: '#115e59',
    artTo: '#052e16',
    tagline: 'Pick the corner',
  },
  {
    id: 'lucky_wheel',
    name: 'Lucky Wheel',
    category: 'Wheel',
    description: 'Pick a segment A–E on the wheel.',
    payout_label: '4×',
    choices: ['A', 'B', 'C', 'D', 'E'],
    icon: '✴',
    accent: '#c084fc',
    artFrom: '#6b21a8',
    artTo: '#1e1b4b',
    tagline: 'Fortune spin',
  },
  {
    id: 'lucky_nine',
    name: 'Lucky 9',
    category: 'Jackpot',
    description: 'Pick a digit 0–9. Hit it for jackpot.',
    payout_label: '8×',
    choices: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
    icon: '💎',
    accent: '#eab308',
    artFrom: '#854d0e',
    artTo: '#1c1917',
    tagline: 'Hit the digit',
  },
]

/** Home tiles — assigned shop games + local Red or Black. */
export const HOME_GAME_IDS = ['aviator', 'lucky_6', 'sports', 'red_black'] as const

/** All Games / Provider — assigned shop games only (no dummy). */
export const ALL_GAME_IDS = ['aviator', 'lucky_6', 'sports'] as const

/** Lobby display order — unused stubs stay in GAME_CATALOG for later. */
export const LOBBY_GAME_IDS = HOME_GAME_IDS

export type LobbyProvider = {
  key: string
  name: string
  logo: string
  tone: 'dark' | 'light'
  gameIds: readonly string[]
  games?: GameDefinition[]
}

export const LOBBY_PROVIDERS: LobbyProvider[] = [
  {
    key: 'spribe',
    name: 'Spribe',
    logo: '/lobby/spribe.svg',
    tone: 'dark',
    gameIds: ['aviator'],
  },
  {
    key: 'excellentreel',
    name: 'ExcellentReel',
    logo: '/lobby/excellentreel.svg',
    tone: 'light',
    gameIds: ['lucky_6'],
  },
  {
    key: 'turbosportsbook',
    name: 'Turbo Sports',
    logo: '/lobby/turbo.svg',
    tone: 'light',
    gameIds: ['sports'],
  },
]

function requireGames(ids: readonly string[]): GameDefinition[] {
  return ids.map((id) => {
    const game = GAME_CATALOG.find((g) => g.id === id)
    if (!game) {
      throw new Error(`Lobby game missing from catalog: ${id}`)
    }
    return game
  })
}

export const LOBBY_GAMES: GameDefinition[] = requireGames(HOME_GAME_IDS)
export const HOME_GAMES: GameDefinition[] = LOBBY_GAMES
export const ALL_GAMES: GameDefinition[] = requireGames(ALL_GAME_IDS)

export function getGameById(id: string): GameDefinition | undefined {
  return GAME_CATALOG.find((g) => g.id === id)
}

export function gamesForProvider(provider: LobbyProvider): GameDefinition[] {
  if (provider.games?.length) {
    return provider.games
  }
  return requireGames(provider.gameIds)
}

export function providerKeyFromName(name: string): string {
  const key = name.toLowerCase().replace(/[^a-z0-9]+/g, '')
  if (key.includes('spribe')) return 'spribe'
  if (key.includes('excellent')) return 'excellentreel'
  if (key.includes('turbo')) return 'turbosportsbook'
  return key || 'provider'
}

export function hydrateCatalogGame(item: {
  id: string
  name: string
  category?: string
  description?: string
  payout_label?: string
  choices?: string[]
  kind?: 'local' | 'provider'
  provider?: string
  image?: string | null
  provider_image?: string | null
}): GameDefinition {
  const local = getGameById(item.id)
  const provider = item.provider ?? local?.provider ?? item.category ?? 'Provider'
  return {
    id: item.id,
    name: item.name || local?.name || item.id,
    category: item.category ?? local?.category ?? 'Provider',
    description: item.description ?? local?.description ?? '',
    payout_label: item.payout_label ?? local?.payout_label ?? 'Live',
    choices: item.choices ?? local?.choices ?? [],
    icon: local?.icon ?? '▶',
    accent: local?.accent ?? '#e11d48',
    artFrom: local?.artFrom ?? '#111827',
    artTo: local?.artTo ?? '#0f172a',
    tagline: local?.tagline ?? provider,
    kind: item.kind ?? local?.kind ?? 'provider',
    image: item.image || local?.image,
    provider,
    providerKey: local?.providerKey ?? providerKeyFromName(provider),
    providerImage: item.provider_image || undefined,
  }
}

export function lobbyProviderFromApi(item: {
  id: number
  provider: string
  images?: { logo?: string | null; name?: string | null }
}): LobbyProvider {
  const key = `${providerKeyFromName(item.provider)}-${item.id}`
  const meta = LOBBY_PROVIDERS.find((row) => row.key === providerKeyFromName(item.provider))
  return {
    key,
    name: item.provider,
    logo: item.images?.logo || item.images?.name || meta?.logo || '/lobby/turbo.svg',
    tone: meta?.tone ?? (providerKeyFromName(item.provider) === 'spribe' ? 'dark' : 'light'),
    gameIds: [],
    games: [],
  }
}

export function providersFromAssignedGames(games: GameDefinition[]): LobbyProvider[] {
  const grouped = new Map<string, LobbyProvider>()

  for (const game of games) {
    if (game.kind === 'local') continue
    const key = game.providerKey ?? providerKeyFromName(game.provider ?? game.name)
    const meta = LOBBY_PROVIDERS.find((item) => item.key === key)
    const existing = grouped.get(key)
    if (existing) {
      existing.games = [...(existing.games ?? []), game]
      continue
    }
    grouped.set(key, {
      key,
      name: meta?.name ?? game.provider ?? game.name,
      logo: game.providerImage || meta?.logo || '/lobby/turbo.svg',
      tone: meta?.tone ?? 'light',
      gameIds: [game.id],
      games: [game],
    })
  }

  return LOBBY_PROVIDERS.map((meta) => grouped.get(meta.key)).filter(
    (item): item is LobbyProvider => Boolean(item),
  ).concat(
    [...grouped.values()].filter((item) => !LOBBY_PROVIDERS.some((meta) => meta.key === item.key)),
  )
}

export function choiceLabel(choice: string): string {
  const labels: Record<string, string> = {
    HEADS: 'Heads',
    TAILS: 'Tails',
    HI: 'High (4–6)',
    LO: 'Low (1–3)',
    HEARTS: '♥ Hearts',
    DIAMONDS: '♦ Diamonds',
    CLUBS: '♣ Clubs',
    SPADES: '♠ Spades',
    LEFT: '← Left',
    CENTER: 'Center',
    RIGHT: 'Right →',
    RED: 'Red',
    BLACK: 'Black',
    GREEN: 'Green',
    ODD: 'Odd',
    EVEN: 'Even',
  }
  return labels[choice] ?? choice
}
