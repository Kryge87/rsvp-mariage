import './globals.css'

export const metadata = {
  title: 'Confirmation de présence - Notre Mariage',
  description: 'Confirmez votre présence à notre mariage',
}

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
