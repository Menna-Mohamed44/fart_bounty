'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

type MobileShellContextType = {
  navOpen: boolean
  openNav: () => void
  closeNav: () => void
  toggleNav: () => void
}

const MobileShellContext = createContext<MobileShellContextType | null>(null)

export function MobileShellProvider({ children }: { children: ReactNode }) {
  const [navOpen, setNavOpen] = useState(false)

  const openNav = useCallback(() => setNavOpen(true), [])
  const closeNav = useCallback(() => setNavOpen(false), [])
  const toggleNav = useCallback(() => setNavOpen((o) => !o), [])

  useEffect(() => {
    const onResize = () => {
      if (typeof window !== 'undefined' && window.innerWidth > 768) {
        setNavOpen(false)
      }
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const value = useMemo(
    () => ({ navOpen, openNav, closeNav, toggleNav }),
    [navOpen, openNav, closeNav, toggleNav]
  )

  return (
    <MobileShellContext.Provider value={value}>{children}</MobileShellContext.Provider>
  )
}

export function useMobileShell(): MobileShellContextType {
  const ctx = useContext(MobileShellContext)
  if (!ctx) {
    throw new Error('useMobileShell must be used within MobileShellProvider')
  }
  return ctx
}
