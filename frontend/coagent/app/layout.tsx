import './globals.css';

export const metadata = {
  title: 'ERPNext CoAgent Assistant',
  description: 'AI-powered ERPNext assistant with CopilotKit',
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
