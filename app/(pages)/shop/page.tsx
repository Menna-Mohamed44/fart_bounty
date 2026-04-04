'use client'

import { useCurrency } from '@/app/context/CurrencyContext'
import AuthGate from '@/app/components/AuthGate/AuthGate'
import { ShoppingCart, Coins } from 'lucide-react'
import styles from './store.module.css'

function ShopPage() {
  const { fbCoins } = useCurrency()

  return (
    <AuthGate requireAuth={true} promptMessage="Sign in to browse our shop">
      <div className={`${styles.container} ${styles.shopPage}`}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <ShoppingCart className={styles.headerIcon} />
            <div>
              <h1>Fart Bounty Shop</h1>
            </div>
          </div>

          <div className={styles.coinsDisplay}>
            <Coins size={20} />
            <span>{fbCoins.toLocaleString()} FB Coins</span>
          </div>
        </div>

        <div className={styles.comingSoonWrap}>
          <p className={styles.comingSoon}>
            Coming soon - we&apos;re connecting merch and Printify. Products will show up here when
            everything is live.
          </p>
        </div>
      </div>
    </AuthGate>
  )
}

export default ShopPage
