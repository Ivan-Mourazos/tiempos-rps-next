import Script from 'next/script'
import './globals.css'
import { THEME_INIT_SCRIPT } from './lib/theme'

export const metadata = {
  title: 'Monitorización TGM',
  description: 'Monitorización en tiempo real RPS Next - Toldos Gómez',
  icons: {
    icon: '/faviconTGM.png',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="gl" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        {children}
        <Script
          id="speculation-rules"
          type="speculationrules"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              prerender: [
                {
                  where: {
                    and: [
                      { href_matches: '/*' },
                      { not: { href_matches: '/logout' } },
                      { not: { href_matches: '/*\\?*' } },
                      { not: { selector_matches: '[rel~=nofollow]' } },
                      { not: { selector_matches: '[data-no-prerender]' } }
                    ]
                  },
                  eagerness: 'moderate'
                }
              ]
            })
          }}
        />
      </body>
    </html>
  )
}
