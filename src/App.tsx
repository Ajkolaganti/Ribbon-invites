import { useEffect } from 'react'
import { Link, Route, Routes, useLocation } from 'react-router-dom'
import { HostGate } from './components/HostGate'
import { Missing } from './components/Missing'
import { useSession } from './lib/session'
import { supabase } from './lib/supabase'
import { AccountPage } from './pages/AccountPage'
import { BillingPage } from './pages/BillingPage'
import { EditorPage } from './pages/EditorPage'
import { HomePage } from './pages/HomePage'
import { HostPage } from './pages/HostPage'
import { InvitePage } from './pages/InvitePage'
import { PricingPage } from './pages/PricingPage'

export function App() {
  const location = useLocation()
  const session = useSession()
  const quiet = location.pathname.startsWith('/i/')

  useEffect(() => {
    if (location.pathname === '/') document.title = 'Ribbon'
  }, [location.pathname])

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <Link className="brand" to="/">
            Ribbon
          </Link>
          {quiet ? (
            <span className="top-note">A short film, then a reply</span>
          ) : (
            <nav className="nav">
              <Link to="/pricing">Pricing</Link>
              {session ? (
                <>
                  <Link to="/">Invites</Link>
                  <Link className="btn" to="/new">
                    New invite
                  </Link>
                  <button className="btn secondary" type="button" onClick={() => void supabase.auth.signOut()}>
                    Sign out
                  </button>
                </>
              ) : session === null ? (
                <>
                  <Link to="/join?mode=sign-in">Sign in</Link>
                  <Link className="btn" to="/join">
                    Create account
                  </Link>
                </>
              ) : null}
            </nav>
          )}
        </div>
      </header>
      <main className="container">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/join" element={<AccountPage />} />
          <Route path="/billing" element={<BillingPage />} />
          <Route
            path="/new"
            element={
              <HostGate>
                <EditorPage />
              </HostGate>
            }
          />
          <Route
            path="/event/:id"
            element={
              <HostGate>
                <HostPage />
              </HostGate>
            }
          />
          <Route
            path="/event/:id/edit"
            element={
              <HostGate>
                <EditorPage />
              </HostGate>
            }
          />
          <Route path="/i/:id" element={<InvitePage />} />
          <Route
            path="*"
            element={<Missing title="That page isn't here." body="Head back and start from your invites." />}
          />
        </Routes>
      </main>
    </>
  )
}
