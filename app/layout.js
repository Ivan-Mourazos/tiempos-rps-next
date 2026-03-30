import './globals.css'

export const metadata = {
  title: 'Monitorización TGM',
  description: 'Monitorización en tiempo real RPS Next - Toldos Gómez',
}

export default function RootLayout({ children }) {
  return (
    <html lang="gl">
      <body>{children}</body>
    </html>
  )
}
