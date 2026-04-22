'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import { createClient } from '@/app/lib/supabaseClient'

interface CurrencyContextType {
  fbCoins: number
  fbGold: number
  loading: boolean
  refreshBalance: () => Promise<void>
  purchaseItem: (itemId: string) => Promise<{ success: boolean; message?: string }>
  addCoins: (amount: number) => Promise<void>
  addGold: (amount: number) => Promise<void>
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined)

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [fbCoins, setFbCoins] = useState(0)
  const [fbGold, setFbGold] = useState(0)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const refreshBalance = async () => {
    if (!user) {
      setFbCoins(0)
      setFbGold(0)
      setLoading(false)
      return
    }

    // Read from user object first (already fetched by AuthContext with select('*'))
    const userAny = user as any
    if (userAny.fb_coins !== undefined || userAny.fb_gold !== undefined) {
      setFbCoins(userAny.fb_coins || 0)
      setFbGold(userAny.fb_gold || 0)
      setLoading(false)
      return
    }

    // Fallback: fetch from DB only if user object doesn't have the fields
    try {
      const { data, error } = await supabase
        .from('users')
        .select('fb_coins, fb_gold')
        .eq('id', user.id)
        .single()

      if (error) throw error

      setFbCoins(data.fb_coins || 0)
      setFbGold(data.fb_gold || 0)
    } catch (error) {
      console.error('Failed to fetch currency:', error)
      setFbCoins(0)
      setFbGold(0)
    } finally {
      setLoading(false)
    }
  }

  const purchaseItem = async (itemId: string): Promise<{ success: boolean; message?: string }> => {
    if (!user) {
      return { success: false, message: 'Please sign in to make purchases' }
    }

    try {
      const { data, error } = await (supabase.rpc as any)('purchase_shop_item', {
        p_user_id: user.id,
        p_shop_item_id: itemId
      })

      if (error) throw error

      // Refresh balance after successful purchase
      await refreshBalance()

      return {
        success: true,
        message: `Successfully purchased ${data.item_name}!`
      }
    } catch (error: any) {
      console.error('Purchase failed:', error)
      return {
        success: false,
        message: error.message || 'Purchase failed. Please try again.'
      }
    }
  }

  const addCoins = async (amount: number) => {
    if (!user) return

    try {
      const { error } = await (supabase.rpc as any)('add_fb_coins', {
        p_user_id: user.id,
        p_amount: amount
      })

      if (error) throw error

      // Refresh balance after adding coins
      await refreshBalance()
    } catch (error) {
      console.error('Failed to add coins:', error)
    }
  }

  const addGold = async (amount: number) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('users')
        .update({ fb_gold: fbGold + amount })
        .eq('id', user.id)

      if (error) throw error

      // Refresh balance after adding gold
      await refreshBalance()
    } catch (error) {
      console.error('Failed to add gold:', error)
    }
  }

  useEffect(() => {
    refreshBalance()
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const value = {
    fbCoins,
    fbGold,
    loading,
    refreshBalance,
    purchaseItem,
    addCoins,
    addGold
  }

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  const context = useContext(CurrencyContext)
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider')
    
  }
  return context
}
