'use client'

import { ReactNode } from 'react'
import Sidebar from '../Sidebar/Sidebar'
import RightSidebar from '../RightSidebar/RightSidebar'
import PageNotes from '../PageNotes/PageNotes'
import { MobileShellProvider } from '@/app/context/MobileShellContext'
import MobileTopBar from './MobileTopBar'
import styles from './MainLayout.module.css'
import { usePathname } from 'next/navigation'

interface MainLayoutProps {
  children: ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
  const pathname = usePathname()
  const showSidebar =
    pathname !== '/' && pathname !== '/welcome' && !pathname.startsWith('/auth')
  const showRightSidebar = showSidebar && pathname !== '/hall-of-fame'

  if (!showSidebar) {
    return (
      <div className={styles.container}>
        <main
          className={`${styles.main} ${styles.noSidebar} ${styles.noRightSidebar}`}
        >
          {children}
        </main>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <MobileShellProvider>
        <MobileTopBar />
        <Sidebar />
        <main
          className={`${styles.main} ${!showRightSidebar ? styles.noRightSidebar : ''}`}
        >
          {children}
        </main>
        {showRightSidebar && <RightSidebar />}
        <PageNotes />
      </MobileShellProvider>
    </div>
  )
}
