'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/app/context/AuthContext'
import { usePremium } from '@/app/context/PremiumContext'
import { useCurrency } from '@/app/context/CurrencyContext'
import AuthGate from '@/app/components/AuthGate/AuthGate'
import {
  Briefcase, Trophy, Coins, CreditCard, Gift, Package,
  Star, Calendar, ShoppingCart, Crown, Sparkles,
  Send, Clock, Award, Gem
} from 'lucide-react'
import Link from 'next/link'
import { TIER_CONFIGS, type PremiumTier } from '@/app/context/PremiumContext'
import { createClient } from '@/app/lib/supabaseClient'
import styles from './assets.module.css'

type AssetTab = 'awards' | 'currency' | 'subscription' | 'greetings' | 'items'

interface InventoryItem {
  item_id: string
  item_name: string
  item_description: string
  item_type: string
  item_category: string
  quantity: number
  purchased_at: string
  first_used_at: string | null
  last_used_at: string | null
  use_count: number
  item_data: any
}

interface GreetingEntry {
  id: string
  created_at: string
  recipient_username: string
  message: string
  audio_url: string | null
}

const TABS: { id: AssetTab; label: string; icon: React.ReactNode }[] = [
  { id: 'awards', label: 'Awards', icon: <Trophy size={18} /> },
  { id: 'currency', label: 'Currency', icon: <Coins size={18} /> },
  { id: 'subscription', label: 'Subscription', icon: <CreditCard size={18} /> },
  { id: 'greetings', label: 'Greetings', icon: <Gift size={18} /> },
  { id: 'items', label: 'Items', icon: <Package size={18} /> },
]

function AssetsPage() {
  const { user } = useAuth()
  const { premiumTier } = usePremium()
  const { fbCoins, fbGold, loading: coinsLoading } = useCurrency()
  const [activeTab, setActiveTab] = useState<AssetTab>('awards')
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [greetings, setGreetings] = useState<GreetingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [filter, setFilter] = useState('all')
  const supabase = createClient()

  useEffect(() => {
    if (user) {
      fetchInventory()
      fetchGreetings()
    }
  }, [user])

  const fetchInventory = async () => {
    if (!user) return
    try {
      const { data, error } = await (supabase.rpc as any)('get_user_inventory', {
        p_user_id: user.id
      })
      if (error) throw error
      setInventory(data || [])
    } catch (error) {
      console.error('Failed to fetch inventory:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchGreetings = async () => {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, created_at, title, message, related_user_id')
        .eq('user_id', user.id)
        .eq('type', 'greeting')
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        console.warn('Greetings query failed, possibly no greeting notifications yet.')
        return
      }

      const mapped: GreetingEntry[] = (data || []).map((n: any) => ({
        id: n.id,
        created_at: n.created_at,
        recipient_username: n.title || 'Someone',
        message: n.message || '',
        audio_url: null,
      }))
      setGreetings(mapped)
    } catch (error) {
      console.warn('Could not load greetings:', error)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString()
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'theme': return '🎨'
      case 'sound': return '🔊'
      case 'filter': return '✨'
      case 'perk': return '⚡'
      case 'badge': return '🏆'
      default: return '📦'
    }
  }

  const filteredInventory = inventory.filter(item => {
    if (filter === 'all') return true
    return item.item_type === filter
  })

  const groupedInventory = filteredInventory.reduce((groups: { [key: string]: InventoryItem[] }, item) => {
    const category = item.item_category
    if (!groups[category]) groups[category] = []
    groups[category].push(item)
    return groups
  }, {})

  const itemCategories = [
    { id: 'all', name: 'All', count: inventory.length },
    { id: 'theme', name: 'Themes', count: inventory.filter(i => i.item_type === 'theme').length },
    { id: 'sound', name: 'Sounds', count: inventory.filter(i => i.item_type === 'sound').length },
    { id: 'filter', name: 'Filters', count: inventory.filter(i => i.item_type === 'filter').length },
    { id: 'perk', name: 'Perks', count: inventory.filter(i => i.item_type === 'perk').length },
    { id: 'badge', name: 'Badges', count: inventory.filter(i => i.item_type === 'badge').length },
  ]

  const currentTier = TIER_CONFIGS[premiumTier] || TIER_CONFIGS.free

  const tierColors: Record<PremiumTier, string> = {
    free: '#888',
    premium: '#3b82f6',
    premium_pro: '#8b5cf6',
    unlimited: '#f59e0b',
  }

  return (
    <AuthGate requireAuth={true} promptMessage="Sign in to view your assets">
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <Briefcase className={styles.headerIcon} />
            <div>
              <h1>My Assets</h1>
              <p>Awards, currency, subscriptions, greetings &amp; more</p>
            </div>
          </div>
          <div className={styles.balancePills}>
            <div className={styles.coinsDisplay}>
              <Coins size={16} />
              <span>{coinsLoading ? '...' : fbCoins.toLocaleString()} Coins</span>
            </div>
            <div className={styles.goldDisplay}>
              <Gem size={16} />
              <span>{coinsLoading ? '...' : fbGold.toLocaleString()} Gold</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className={styles.tabs}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* === AWARDS TAB === */}
        {activeTab === 'awards' && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <Trophy size={22} className={styles.sectionIcon} />
              <h2>Awards &amp; Achievements</h2>
            </div>

            <div className={styles.awardsGrid}>
              {[
                { icon: '🏆', title: 'First Fart', desc: 'Generate your first fart sound' },
                { icon: '🔥', title: 'Hot Streak', desc: 'Generate 10 sounds in one day' },
                { icon: '💎', title: 'Sound Collector', desc: 'Save 25 sounds to your library' },
                { icon: '🎯', title: 'Battle Champion', desc: 'Win 5 fart battles' },
                { icon: '👑', title: 'Fart Royalty', desc: 'Reach the top of the leaderboard' },
                { icon: '🎵', title: 'Mix Master', desc: 'Use all 12 sliders in a single mix' },
                { icon: '💌', title: 'Greeting Guru', desc: 'Send 10 fart greetings' },
                { icon: '📰', title: 'Reporter', desc: 'Publish your first news article' },
                { icon: '👥', title: 'Social Butterfly', desc: 'Join 3 fart groups' },
                { icon: '🎮', title: 'Gamer', desc: 'Play all available fart games' },
                { icon: '💰', title: 'Big Spender', desc: 'Spend 1,000 FB Coins in the shop' },
                { icon: '⭐', title: 'Premium Member', desc: 'Subscribe to any premium plan' },
              ].map((award, i) => (
                <div key={i} className={`${styles.awardCard} ${styles.awardLocked}`}>
                  <div className={styles.awardIcon}>{award.icon}</div>
                  <h3>{award.title}</h3>
                  <p>{award.desc}</p>
                  <span className={styles.lockedBadge}>Locked</span>
                </div>
              ))}
            </div>
            <p className={styles.comingSoonNote}>Award tracking is coming soon. Keep generating, battling, and sharing!</p>
          </div>
        )}

        {/* === CURRENCY TAB === */}
        {activeTab === 'currency' && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <Coins size={22} className={styles.sectionIcon} />
              <h2>Your Currencies</h2>
            </div>

            <div className={styles.currencyCards}>
              <div className={styles.currencyCard}>
                <div className={styles.currencyBalance}>
                  <Coins size={36} />
                  <div>
                    <span className={styles.balanceAmount}>
                      {coinsLoading ? '...' : fbCoins.toLocaleString()}
                    </span>
                    <span className={styles.balanceLabel}>FB Coins</span>
                  </div>
                </div>
                <p className={styles.currencyDesc}>
                  The primary currency. Use FB Coins to purchase themes, sounds, filters, perks, and badges in the shop.
                </p>
              </div>

              <div className={styles.currencyCard}>
                <div className={styles.currencyBalance}>
                  <Gem size={36} />
                  <div>
                    <span className={styles.balanceAmount} style={{ color: '#f59e0b' }}>
                      {coinsLoading ? '...' : fbGold.toLocaleString()}
                    </span>
                    <span className={styles.balanceLabel}>FB Gold</span>
                  </div>
                </div>
                <p className={styles.currencyDesc}>
                  Premium currency. FB Gold is used for exclusive items, rare collectibles, and special shop offerings.
                </p>
              </div>
            </div>

            <div className={styles.currencyActions}>
              <Link href="/shop" className={styles.currencyBtn}>
                <ShoppingCart size={16} /> Visit Shop
              </Link>
            </div>

          </div>
        )}

        {/* === SUBSCRIPTION TAB === */}
        {activeTab === 'subscription' && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <CreditCard size={22} className={styles.sectionIcon} />
              <h2>Subscription</h2>
            </div>

            <div className={styles.subscriptionCard}>
              <div className={styles.subTierBadge} style={{ background: tierColors[premiumTier] || '#888' }}>
                <Crown size={20} />
                <span>{currentTier.name} &mdash; {currentTier.price}</span>
              </div>

              <div className={styles.subPerks}>
                <h3>Your Plan Includes:</h3>
                <ul className={styles.perksList}>
                  <li><Sparkles size={14} /> Creations per day: <strong>{currentTier.dailyCreations === 'Unlimited' ? 'Unlimited' : currentTier.dailyCreations}</strong></li>
                  <li><Star size={14} /> Sound library: <strong>{currentTier.soundLibrary}</strong></li>
                  <li><Award size={14} /> Editing tools: <strong>{currentTier.editingTools === 'none' ? 'Basic controls only' : currentTier.editingTools.charAt(0).toUpperCase() + currentTier.editingTools.slice(1)}</strong></li>
                  <li><Calendar size={14} /> Max post length: <strong>{currentTier.maxPostLength} chars</strong></li>
                  <li><Sparkles size={14} /> Ads: <strong>{currentTier.ads === 'full' ? 'Standard ads' : currentTier.ads === 'fewer' ? 'Fewer ads' : 'No ads'}</strong></li>
                  {currentTier.canUseGifAvatar && <li><Star size={14} /> GIF avatars: <strong>Enabled</strong></li>}
                  {currentTier.canUploadBanner && <li><Star size={14} /> Custom profile banner: <strong>Enabled</strong></li>}
                  {currentTier.canUsePremiumThemes && <li><Sparkles size={14} /> Premium themes: <strong>Enabled</strong></li>}
                  {currentTier.canUsePremiumEffects && <li><Sparkles size={14} /> Premium effects: <strong>Enabled</strong></li>}
                  {currentTier.hasMonthlyGifts && <li><Gift size={14} /> Monthly digital gifts: <strong>Included</strong></li>}
                  {currentTier.extras.length > 0 && currentTier.extras.map((extra, i) => (
                    <li key={i}><Star size={14} /> <strong>{extra}</strong></li>
                  ))}
                </ul>
              </div>

              {premiumTier !== 'unlimited' && (
                <Link href="/shop" className={styles.upgradeBtn}>
                  <Crown size={16} /> {premiumTier === 'free' ? 'Subscribe Now' : 'Upgrade Plan'}
                </Link>
              )}
            </div>

            {premiumTier !== 'unlimited' && (
              <div className={styles.allPlans}>
                <h3>All Plans</h3>
                <div className={styles.plansGrid}>
                  {(Object.values(TIER_CONFIGS) as typeof TIER_CONFIGS[PremiumTier][]).map(tier => (
                    <div
                      key={tier.id}
                      className={`${styles.planCard} ${tier.id === premiumTier ? styles.planCardCurrent : ''}`}
                    >
                      <div className={styles.planBadge} style={{ background: tierColors[tier.id] || '#888' }}>
                        {tier.name}
                      </div>
                      <span className={styles.planPrice}>{tier.price}</span>
                      <ul className={styles.planFeatures}>
                        <li>{tier.dailyCreations === 'Unlimited' ? 'Unlimited' : tier.dailyCreations} creations/day</li>
                        <li>{tier.soundLibrary}</li>
                        <li>{tier.editingTools === 'none' ? 'Basic controls' : tier.editingTools.charAt(0).toUpperCase() + tier.editingTools.slice(1) + ' editing'}</li>
                        <li>{tier.ads === 'full' ? 'Standard ads' : tier.ads === 'fewer' ? 'Fewer ads' : 'No ads'}</li>
                      </ul>
                      {tier.id === premiumTier ? (
                        <span className={styles.currentPlanLabel}>Current Plan</span>
                      ) : (
                        <Link href="/shop" className={styles.planSelectBtn}>
                          Select
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* === GREETINGS TAB === */}
        {activeTab === 'greetings' && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <Gift size={22} className={styles.sectionIcon} />
              <h2>Fart Greetings</h2>
            </div>

            <div className={styles.greetingIntro}>
              <Gift size={32} className={styles.greetingIntroIcon} />
              <div>
                <h3>Send Daily Fart Greetings</h3>
                <p>Record a fart sound in the Generator and send it to friends as a shareable greeting!</p>
              </div>
              <Link href="/generator" className={styles.greetingGoBtn}>
                <Send size={16} /> Go to Generator
              </Link>
            </div>

            {greetings.length === 0 ? (
              <div className={styles.empty}>
                <Gift size={48} className={styles.emptyIcon} />
                <h3>No greetings yet</h3>
                <p>Send your first fart greeting from the Generator!</p>
              </div>
            ) : (
              <div className={styles.greetingsList}>
                {greetings.map(g => (
                  <div key={g.id} className={styles.greetingCard}>
                    <div className={styles.greetingFrom}>
                      <Gift size={16} />
                      <strong>From @{g.recipient_username}</strong>
                    </div>
                    <p className={styles.greetingMsg}>{g.message}</p>
                    <span className={styles.greetingDate}>
                      <Clock size={12} /> {formatDate(g.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* === ITEMS TAB === */}
        {activeTab === 'items' && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <Package size={22} className={styles.sectionIcon} />
              <h2>Purchased Items</h2>
            </div>

            <div className={styles.filters}>
              {itemCategories.map(category => (
                <button
                  key={category.id}
                  className={`${styles.filterButton} ${filter === category.id ? styles.active : ''}`}
                  onClick={() => setFilter(category.id)}
                >
                  {category.name}
                  <span className={styles.filterCount}>{category.count}</span>
                </button>
              ))}
            </div>

            {loading && (
              <div className={styles.loading}>
                <div className={styles.loadingSpinner}></div>
                <p>Loading items...</p>
              </div>
            )}

            {!loading && inventory.length === 0 && (
              <div className={styles.empty}>
                <Package size={48} className={styles.emptyIcon} />
                <h3>No items yet</h3>
                <p>Visit the shop to purchase themes, sounds, and more!</p>
                <Link href="/shop" className={styles.shopButton}>
                  <ShoppingCart size={20} /> Browse Shop
                </Link>
              </div>
            )}

            {!loading && inventory.length > 0 && (
              <div className={styles.inventoryGrid}>
                {Object.entries(groupedInventory).map(([category, items]) => (
                  <div key={category} className={styles.categorySection}>
                    <h3 className={styles.categoryTitle}>
                      {category.charAt(0).toUpperCase() + category.slice(1)} Items
                    </h3>
                    <div className={styles.itemsGrid}>
                      {items.map((item) => (
                        <div
                          key={item.item_id}
                          className={styles.itemCard}
                          onClick={() => setSelectedItem(item)}
                        >
                          <div className={styles.itemHeader}>
                            <div className={styles.itemType}>
                              <span className={styles.typeIcon}>{getTypeIcon(item.item_type)}</span>
                              <span className={styles.typeLabel}>{item.item_type}</span>
                            </div>
                            {item.quantity > 1 && (
                              <span className={styles.quantityBadge}>x{item.quantity}</span>
                            )}
                          </div>
                          <h3 className={styles.itemName}>{item.item_name}</h3>
                          <p className={styles.itemDescription}>{item.item_description}</p>
                          <div className={styles.itemMeta}>
                            <Calendar size={12} />
                            <span>{formatDate(item.purchased_at)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Item Detail Modal */}
        {selectedItem && (
          <div className={styles.modal} onClick={() => setSelectedItem(null)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <div className={styles.modalTitle}>
                  <span className={styles.titleIcon}>{getTypeIcon(selectedItem.item_type)}</span>
                  <h2>{selectedItem.item_name}</h2>
                </div>
                <button className={styles.closeButton} onClick={() => setSelectedItem(null)}>x</button>
              </div>
              <div className={styles.modalBody}>
                <p className={styles.modalDesc}>{selectedItem.item_description}</p>
                <div className={styles.detailRows}>
                  <div className={styles.detailRow}><span>Type:</span><span>{selectedItem.item_type}</span></div>
                  <div className={styles.detailRow}><span>Category:</span><span>{selectedItem.item_category}</span></div>
                  <div className={styles.detailRow}><span>Quantity:</span><span>{selectedItem.quantity}</span></div>
                  <div className={styles.detailRow}><span>Purchased:</span><span>{formatDate(selectedItem.purchased_at)}</span></div>
                  <div className={styles.detailRow}><span>Used:</span><span>{selectedItem.use_count} times</span></div>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button className={styles.useButton} onClick={() => setSelectedItem(null)}>Use Item</button>
                <button className={styles.closeModalButton} onClick={() => setSelectedItem(null)}>Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGate>
  )
}

export default AssetsPage
