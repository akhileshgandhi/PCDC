import { createContext, useContext, useMemo, useState } from "react"
import type { ReactNode } from "react"

import type { AuthContextValue } from "../types/auth"
import type { User } from "../types/user"

const TOKEN_KEY = "pcdc_token"
const MOCK_TOKEN = "mock-pcdc-token"

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_KEY),
  )
  const [user, setUser] = useState<User | null>(() =>
    localStorage.getItem(TOKEN_KEY)
      ? {
          id: 1,
          name: "Student User",
          email: "student@example.com",
          role: "student",
        }
      : null,
  )

  const login = async (email: string, password: string) => {
    if (!email.trim() || !password.trim()) {
      throw new Error("Email and password are required")
    }

    localStorage.setItem(TOKEN_KEY, MOCK_TOKEN)
    setToken(MOCK_TOKEN)
    setUser({
      id: 1,
      name: "Student User",
      email,
      role: "student",
    })
  }

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token && user),
      login,
      logout,
    }),
    [token, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }

  return context
}
