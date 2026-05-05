import './globals.css'

export const metadata = {
  title: 'Admin Survey App',
  description: 'Minimal scaffold in src/app'
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}
