import Script from 'next/script'
import './globals.css'

export const metadata = {
  title: 'Monitorización TGM',
  description: 'Monitorización en tiempo real RPS Next - Toldos Gómez',
}

export default function RootLayout({ children }) {
  return (
    <html lang="gl">
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
