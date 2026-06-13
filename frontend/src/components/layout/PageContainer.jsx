import Navbar from './Navbar'
import Sidebar from './Sidebar'

export default function PageContainer({ children }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-area">
        <Navbar />
        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  )
}
