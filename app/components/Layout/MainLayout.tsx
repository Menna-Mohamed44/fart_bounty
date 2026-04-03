
'use client'

import { ReactNode } from 'react'
import Sidebar from '../Sidebar/Sidebar'
import RightSidebar from '../RightSidebar/RightSidebar'
import PageNotes from '../PageNotes/PageNotes'
import styles from './MainLayout.module.css'
import { usePathname } from 'next/navigation'

interface MainLayoutProps {
  children: ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
  const pathname = usePathname()
  // Hide sidebars on landing page and welcome page
  const showSidebar = pathname !== '/' && pathname !== '/welcome' && !pathname.startsWith('/auth')
  const showRightSidebar = showSidebar && pathname !== '/hall-of-fame'
  return (
    <div className={styles.container}>
      {showSidebar && <Sidebar />}
      <main className={`${styles.main} ${!showSidebar ? styles.noSidebar : ''} ${!showRightSidebar ? styles.noRightSidebar : ''}`}>
        {children}
      </main>
      {showRightSidebar && <RightSidebar />}
      {showSidebar && <PageNotes />}
    </div>
  )
}