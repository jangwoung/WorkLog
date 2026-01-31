import type { Metadata } from 'next'
import './styles/globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'WorkLog - GitHub Career Asset Generator',
  description: 'Transform GitHub development activity into reusable, evaluation-ready career assets.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
