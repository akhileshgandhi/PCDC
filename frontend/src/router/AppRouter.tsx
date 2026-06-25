import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"

import { AuthProvider } from "../context/AuthContext"
import Login from "../pages/auth/Login"
import Register from "../pages/auth/Register"

export default function AppRouter() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
