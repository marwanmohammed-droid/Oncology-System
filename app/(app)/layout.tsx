import { Sidebar } from '@/components/layout/sidebar'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', direction: 'rtl' }}>
      <Sidebar />
      <main style={{ marginRight: 226, flex: 1, background: '#f7f8fc' }}>
        {children}
      </main>
    </div>
  )
}