import { Routes, Route } from 'react-router-dom'
import PageContainer    from './components/layout/PageContainer'
import DashboardPage    from './pages/DashboardPage'
import InvestmentsPage  from './pages/InvestmentsPage'
import AssetsPage       from './pages/AssetsPage'
import LiabilitiesPage  from './pages/LiabilitiesPage'
import BudgetPage       from './pages/BudgetPage'
import ProfilePage      from './pages/ProfilePage'
import SettingsPage     from './pages/SettingsPage'

function App() {
  return (
    <PageContainer>
      <Routes>
        <Route path="/"            element={<DashboardPage />}   />
        <Route path="/investments" element={<InvestmentsPage />} />
        <Route path="/assets"      element={<AssetsPage />}      />
        <Route path="/liabilities" element={<LiabilitiesPage />} />
        <Route path="/budget"      element={<BudgetPage />}      />
        <Route path="/profile"     element={<ProfilePage />}     />
        <Route path="/settings"    element={<SettingsPage />}    />
      </Routes>
    </PageContainer>
  )
}

export default App
