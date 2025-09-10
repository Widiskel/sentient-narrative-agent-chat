import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sentient Agent Chat',
  description: 'Chat UI for Sentient Narrative Agent',
  icons: {
    icon: '/favicon.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  )
}
