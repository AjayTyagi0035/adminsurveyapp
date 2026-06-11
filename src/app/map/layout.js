"use client"
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import styles from '../dashboard/dashboard.module.css'

export default function MapLayout({ children }) {
  const pathname = usePathname()

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarLogo}>📋 SurveyAdmin</div>
        <nav className={styles.nav}>
          <Link href="/dashboard" className={`${styles.navItem} ${pathname === '/dashboard' ? styles.navActive : ''}`}>
            👥 Surveyors
          </Link>
          <Link href="/records" className={`${styles.navItem} ${pathname === '/records' ? styles.navActive : ''}`}>
            📝 Records
          </Link>
          <Link href="/map" className={`${styles.navItem} ${pathname === '/map' ? styles.navActive : ''}`}>
            🗺️ Map View
          </Link>
        </nav>
        <button className={styles.logoutBtn} onClick={() => window.location.href = '/login'}>
          ⬅ Logout
        </button>
      </aside>
      {children}
    </div>
  )
}
