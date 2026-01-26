import type { Metadata } from 'next'
import './styles/globals.css'

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
      <body>{children}</body>
    </html>
  )
}
