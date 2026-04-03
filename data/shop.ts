export interface ShopItem {
  id: string
  title: string
  description: string
  price: string
  type: 'mug' | 'tshirt' | 'sticker' | 'poster' | 'hoodie' | 'phone-case' | 'theme' | 'sound' | 'filter' | 'perk' | 'badge'
  image: string
  redbubbleUrl: string
  isPopular?: boolean
  // New fields for in-game purchases
  priceFbCoins?: number
  category?: 'cosmetic' | 'functional' | 'premium'
  metadata?: Record<string, any>
  isPremiumOnly?: boolean
}

export interface PremiumPlan {
  id: string
  name: string
  price: string
  period: string
  description: string
  features: string[]
  savings?: string
}

export const shopItems: ShopItem[] = [
  // External merchandise (existing)
  {
    id: 'classic-logo-tshirt',
    title: 'Fart Bounty Classic Logo T-Shirt',
    description: 'Comfortable cotton tee featuring the iconic Fart Bounty logo. Perfect for casual wear and showing your love for the platform.',
    price: '$19.99',
    type: 'tshirt',
    image: '/merch/shirt.jpg',
    redbubbleUrl: 'https://www.redbubble.com/shop/fart-bounty-tshirts'
  },
  {
    id: 'sound-wave-mug',
    title: 'Sound Wave Ceramic Mug',
    description: 'Start your day with a visual representation of your favorite fart sounds. Premium ceramic mug, microwave and dishwasher safe.',
    price: '$14.99',
    type: 'mug',
    image: '/merch/mug.jpg',
    redbubbleUrl: 'https://www.redbubble.com/shop/fart-bounty-mugs'
  },
  {
    id: 'premium-sticker-pack',
    title: 'Premium Sticker Pack (10 stickers)',
    description: 'Collection of high-quality vinyl stickers featuring various fart sound visualizations and Fart Bounty branding.',
    price: '$8.99',
    type: 'sticker',
    image: '/merch/stickers.jpg',
    redbubbleUrl: 'https://www.redbubble.com/shop/fart-bounty-stickers'
  },

  // In-game purchasable items
  {
    id: 'dark-mode-theme',
    title: 'Dark Mode Theme',
    description: 'A sleek dark theme that reduces eye strain and looks great in low-light environments.',
    price: '$4.99',
    type: 'theme',
    image: '/shop/themes/dark-mode.jpg',
    redbubbleUrl: '#',
    priceFbCoins: 500,
    category: 'cosmetic',
    metadata: {
      colors: {
        bg: '#1a1a1a',
        text: '#ffffff',
        accent: '#ff6b35'
      }
    }
  },
  {
    id: 'neon-nights-theme',
    title: 'Neon Nights Theme',
    description: 'Vibrant neon colors that make your posts pop with electric energy.',
    price: '$6.99',
    type: 'theme',
    image: '/shop/themes/neon-nights.jpg',
    redbubbleUrl: '#',
    priceFbCoins: 750,
    category: 'cosmetic',
    metadata: {
      colors: {
        bg: '#0a0a0a',
        text: '#00ffff',
        accent: '#ff00ff'
      }
    }
  },
  {
    id: 'retro-wave-theme',
    title: 'Retro Wave Theme',
    description: '80s inspired theme with synthwave aesthetics and nostalgic vibes.',
    price: '$9.99',
    type: 'theme',
    image: '/shop/themes/retro-wave.jpg',
    redbubbleUrl: '#',
    priceFbCoins: 1000,
    category: 'premium',
    isPremiumOnly: true,
    metadata: {
      colors: {
        bg: '#1a0033',
        text: '#ff0080',
        accent: '#00ffff'
      }
    }
  },
  {
    id: 'fart-sound-pack-1',
    title: 'Fart Sound Pack 1',
    description: 'Classic collection of hilarious fart sounds for your posts.',
    price: '$2.99',
    type: 'sound',
    image: '/shop/sounds/fart-pack-1.jpg',
    redbubbleUrl: '#',
    priceFbCoins: 300,
    category: 'functional',
    metadata: {
      soundCount: 10,
      duration: '5-15s'
    }
  },
  {
    id: 'premium-fart-sounds',
    title: 'Premium Fart Sounds',
    description: 'Extended collection with high-quality, funny sound effects.',
    price: '$5.99',
    type: 'sound',
    image: '/shop/sounds/premium-farts.jpg',
    redbubbleUrl: '#',
    priceFbCoins: 600,
    category: 'premium',
    isPremiumOnly: true,
    metadata: {
      soundCount: 25,
      duration: '3-20s'
    }
  },
  {
    id: 'confessional-filter-pack',
    title: 'Confessional Filter Pack',
    description: 'Special blur and voice effects for your confessional videos.',
    price: '$3.99',
    type: 'filter',
    image: '/shop/filters/confessional-pack.jpg',
    redbubbleUrl: '#',
    priceFbCoins: 400,
    category: 'functional',
    metadata: {
      filters: ['heavy-blur', 'voice-deep', 'voice-high', 'echo']
    }
  },
  {
    id: 'premium-filters',
    title: 'Premium Filters',
    description: 'Advanced visual effects including pixelation, color grading, and more.',
    price: '$7.99',
    type: 'filter',
    image: '/shop/filters/premium-filters.jpg',
    redbubbleUrl: '#',
    priceFbCoins: 800,
    category: 'premium',
    isPremiumOnly: true,
    metadata: {
      filters: ['pixelate', 'sepia', 'vintage', 'neon', 'glitch']
    }
  },
  {
    id: 'golden-badge',
    title: 'Golden Badge',
    description: 'Show off your premium status with this exclusive golden badge.',
    price: '$1.99',
    type: 'badge',
    image: '/shop/badges/golden.jpg',
    redbubbleUrl: '#',
    priceFbCoins: 200,
    category: 'cosmetic',
    metadata: {
      rarity: 'rare'
    }
  },
  {
    id: 'diamond-badge',
    title: 'Diamond Badge',
    description: 'Ultra-rare diamond badge for the most dedicated users.',
    price: '$14.99',
    type: 'badge',
    image: '/shop/badges/diamond.jpg',
    redbubbleUrl: '#',
    priceFbCoins: 1500,
    category: 'premium',
    isPremiumOnly: true,
    metadata: {
      rarity: 'legendary'
    }
  },
  {
    id: 'extended-post-length',
    title: 'Extended Post Length',
    description: 'Unlock the ability to write longer posts (up to 1000 characters).',
    price: '$2.49',
    type: 'perk',
    image: '/shop/perks/extended-posts.jpg',
    redbubbleUrl: '#',
    priceFbCoins: 250,
    category: 'functional',
    metadata: {
      postLimit: 1000
    }
  }
]

export const premiumPlans: PremiumPlan[] = [
  {
    id: 'monthly',
    name: 'Monthly Premium',
    price: '$8.49',
    period: 'per month',
    description: 'Perfect for trying out premium features',
    features: [
      'Post up to 1500 characters (vs 250)',
      'Access to BountyBlaster Pro sound generator',
      'Upload custom profile banners',
      'Extra confessional video effects',
      'Premium theme options',
      'Premium sound packs and filters',
      'Exclusive badges and cosmetics',
      'Earn 2x FB coins from activities'
    ]
  },
  {
    id: 'yearly',
    name: 'Yearly Premium',
    price: '$84.90',
    period: 'per year',
    description: 'Best value - save 2 months!',
    features: [
      'Everything in Monthly Premium',
      '2 months free compared to monthly',
      'Priority support',
      'Early access to new features',
      'Bonus 1000 FB coins on signup'
    ],
    savings: 'Save $16.98'
  }
]

// Helper functions for the shop
export const getInGameItems = () => {
  return shopItems.filter(item => item.priceFbCoins !== undefined)
}

export const getExternalItems = () => {
  return shopItems.filter(item => !item.priceFbCoins)
}

export const getItemsByCategory = (category: string) => {
  return shopItems.filter(item => item.category === category)
}

export const getItemsByType = (type: string) => {
  return shopItems.filter(item => item.type === type)
}

export const getPremiumItems = () => {
  return shopItems.filter(item => item.isPremiumOnly)
}
