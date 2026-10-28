import { Route, Routes } from 'react-router-dom'
import { AppFrame, TabsLayout } from './components/app'
import Home from './pages/Home'
import Create from './pages/Create'
import Order from './pages/Order'
import MyGifts from './pages/MyGifts'
import Gift from './pages/Gift'

export default function App() {
  return (
    <Routes>
      <Route element={<AppFrame />}>
        <Route element={<TabsLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/my-gifts" element={<MyGifts />} />
        </Route>
        <Route path="/create" element={<Create />} />
        <Route path="/orders/:id" element={<Order />} />
        {/* Recipient view: no tabs, no account needed. */}
        <Route path="/gift/:token" element={<Gift />} />
      </Route>
    </Routes>
  )
}
