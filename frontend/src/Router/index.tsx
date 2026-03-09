import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AuthGuard } from './AuthGuard'
import { Login } from '../view/pages/Login'
import { Register } from '../view/pages/Register'
import { AuthLayout } from '../view/layouts/AuthLayout'
import { ResetPassword } from '../view/pages/ResetPassword'
import { ForgetPassword } from '../view/pages/ForgetPassword'
import { NotFound } from '../view/pages/NotFound'
import { Settings } from '../view/pages/Settings'
import { SavingsBoxes } from '../view/pages/SavingsBoxes'
import { Spinner } from '../view/components/Spinner'

const Dashboard = lazy(() => import('../view/pages/Dashboard').then((module) => ({ default: module.Dashboard })))
const Vehicles = lazy(() => import('../view/pages/Vehicles').then((module) => ({ default: module.Vehicles })))
const Reports = lazy(() => import('../view/pages/Reports').then((module) => ({ default: module.Reports })))

function PageLoader() {
  return (
    <div className="h-dvh w-full flex items-center justify-center bg-gray-100">
      <Spinner className="w-10 h-10" />
    </div>
  )
}

export function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AuthGuard isPrivate={false} />}>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forget-password" element={<ForgetPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>

        <Route element={<AuthGuard isPrivate={true} />}>
          <Route
            path="/"
            element={(
              <Suspense fallback={<PageLoader />}>
                <Dashboard />
              </Suspense>
            )}
          />
          <Route path="/settings" element={<Settings />} />
          <Route path="/savings-boxes" element={<SavingsBoxes />} />
          <Route
            path="/vehicles"
            element={(
              <Suspense fallback={<PageLoader />}>
                <Vehicles />
              </Suspense>
            )}
          />
          <Route
            path="/reports"
            element={(
              <Suspense fallback={<PageLoader />}>
                <Reports />
              </Suspense>
            )}
          />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
