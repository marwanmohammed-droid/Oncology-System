import Link from 'next/link'

export default function RootPage() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <Link href="/dashboard">Go to Dashboard</Link>
    </div>
  )
}