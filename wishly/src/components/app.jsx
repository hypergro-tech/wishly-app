import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Logo, Spark } from './brand'

// Phone-width app frame. On small screens it is the page; on desktop it sits
// beside a brand panel as a fixed-height device with its own scroll area.
export function AppFrame() {
  const { pathname } = useLocation()
  const isGift = pathname.startsWith('/gift/')

  useEffect(() => {
    document.getElementById('app-scroll')?.scrollTo(0, 0)
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className={`min-h-[100dvh] lg:flex lg:items-center lg:justify-center lg:gap-20 lg:p-8 ${isGift ? 'bg-ink' : 'bg-[#F3ECE3]'}`}>
      {!isGift && <BrandAside />}
      <div
        id="app-frame"
        className="relative mx-auto flex min-h-[100dvh] w-full max-w-[440px] flex-col bg-ivory lg:mx-0 lg:h-[min(880px,calc(100dvh-4rem))] lg:min-h-0 lg:overflow-hidden lg:rounded-[40px] lg:shadow-[0_40px_80px_-30px_rgba(20,52,56,0.45)] lg:ring-[10px] lg:ring-ink"
      >
        <div id="app-scroll" className="flex flex-1 flex-col lg:overflow-y-auto">
          <Outlet />
        </div>
        <div id="app-overlay" />
      </div>
    </div>
  )
}

function BrandAside() {
  return (
    <aside className="hidden w-[400px] shrink-0 lg:block">
      <Logo size={34} />
      <p className="mt-10 text-5xl font-bold leading-[1.05] tracking-[-0.02em]">A little more personal. A little more theirs.</p>
      <p className="accent mt-5 text-xl leading-relaxed text-ink/75">Personal songs made from the memories that matter.</p>
      <img src="/brand/shared-moments.jpg" alt="" className="mt-8 aspect-[4/3] w-full rounded-card object-cover" />
      <p className="mt-6 flex items-start gap-3 text-[15px] text-ink/70">
        <Spark size={18} className="mt-0.5 shrink-0 text-coral" />
        Wishly works best on your phone. Open this page there and add it to your home screen.
      </p>
    </aside>
  )
}

// Screens with the bottom tab bar.
export function TabsLayout() {
  return (
    <>
      <div className="flex flex-1 flex-col">
        <Outlet />
      </div>
      <TabBar />
    </>
  )
}

function TabBar() {
  const item = ({ isActive }) => `flex flex-1 flex-col items-center gap-1 pt-2.5 text-[11px] font-bold ${isActive ? 'text-ink' : 'text-ink/45'}`
  return (
    <nav className="sticky bottom-0 z-20 border-t border-ink/10 bg-ivory/95 pb-[max(env(safe-area-inset-bottom),10px)] backdrop-blur" aria-label="Main">
      <div className="flex items-end">
        <NavLink to="/" end className={item}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1v-9.5Z" /></svg>
          Home
        </NavLink>
        <Link to="/create" className="-mt-6 flex flex-1 flex-col items-center gap-1 text-[11px] font-bold text-ink" aria-label="Start a new song">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-coral shadow-[0_8px_20px_-6px_rgba(255,107,122,0.8)] ring-4 ring-ivory">
            <Spark size={26} className="text-ink" />
          </span>
          New song
        </Link>
        <NavLink to="/my-gifts" className={item}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><rect x="3.5" y="8" width="17" height="4" rx="1" /><path d="M5 12v8h14v-8M12 8v12M12 8c-1.5-3-5-4-5-1.5S10 8 12 8Zm0 0c1.5-3 5-4 5-1.5S14 8 12 8Z" /></svg>
          My gifts
        </NavLink>
      </div>
    </nav>
  )
}

export function TopBar({ back, title, right, children }) {
  const navigate = useNavigate()
  return (
    <header className="sticky top-0 z-20 border-b border-ink/10 bg-ivory/95 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="flex h-14 items-center gap-2 px-2">
        <div className="flex w-12 justify-start">
          {back && (
            <button onClick={typeof back === 'function' ? back : () => navigate(back)} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-ink/5" aria-label="Back">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
            </button>
          )}
        </div>
        <div className="min-w-0 flex-1 truncate text-center text-[15px] font-bold">{title}</div>
        <div className="flex w-12 justify-end">{right}</div>
      </div>
      {children}
    </header>
  )
}

export function IconButton({ label, onClick, children }) {
  return (
    <button onClick={onClick} aria-label={label} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-ink/5">
      {children}
    </button>
  )
}

export const CloseIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
)

// Pinned action area at the bottom of a screen.
export function ActionBar({ children }) {
  return (
    <div className="sticky bottom-0 z-10 mt-auto border-t border-ink/10 bg-ivory/95 px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-3 backdrop-blur">
      {children}
    </div>
  )
}

// Bottom sheet rendered over the app frame.
export function Sheet({ title, sub, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  const root = document.getElementById('app-overlay')
  if (!root) return null
  return createPortal(
    <div className="fixed inset-0 z-40 flex items-end bg-ink/50 lg:absolute" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[90%] w-full overflow-y-auto rounded-t-[28px] bg-ivory px-5 pb-[max(env(safe-area-inset-bottom),20px)] pt-3 animate-[sheet_.25s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-ink/15" />
        {title && <h2 className="text-2xl leading-tight">{title}</h2>}
        {sub && <p className="mt-1.5 text-[15px] text-ink/70">{sub}</p>}
        {children}
      </div>
    </div>,
    root,
  )
}
