import './globals.css'

export const metadata = {
  title: 'Monitorización TGM',
  description: 'Monitorización en tiempo real RPS Next - Toldos Gómez',
}

export default function RootLayout({ children }) {
  return (
    <html lang="gl">
      <head>
        <script
          type="speculationrules"
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
      </head>
      <body>{children}</body>
    </html>
  )
}
