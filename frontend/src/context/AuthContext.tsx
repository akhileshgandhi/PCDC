import { createContext, useContext, useMemo, useState } from "react"
import type { ReactNode } from "react"
import axios from "axios"

import api from "../api/axios"
import type { AuthContextValue } from "../types/auth"
import type { User } from "../types/user"
import { clearToken, decodeToken, getToken, setToken as storeToken } from "../utils/auth"

interface LoginResponse {
  access_token: string
  token_type: string
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [token, setToken] = useState<string | null>(() => getToken())
  const [user, setUser] = useState<User | null>(() => userFromToken(getToken()))

  const login = async (email: string, password: string) => {
    if (!email.trim() || !password.trim()) {
      throw new Error("Email and password are required")
    }

    try {
      const response = await api.post<LoginResponse>("/auth/login", {
        email,
        password,
      })
      const accessToken = response.data.access_token

      storeToken(accessToken)
      setToken(accessToken)
      setUser(userFromToken(accessToken))

      return accessToken
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (!error.response) {
          throw new Error("Unable to connect. Please try again.")
        }

        const detail = error.response.data?.detail
        throw new Error(typeof detail === "string" ? detail : "Login failed. Please try again.")
      }

      throw new Error("Login failed. Please try again.")
    }
  }

  const loginWithGoogle = async (credential: string) => {
    try {
      const response = await api.post<LoginResponse>("/auth/google", { credential })
      const accessToken = response.data.access_token

      storeToken(accessToken)
      setToken(accessToken)
      setUser(userFromToken(accessToken))

      return accessToken
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (!error.response) {
          throw new Error("Unable to connect. Please try again.")
        }
        const detail = error.response.data?.detail
        throw new Error(
          typeof detail === "string" ? detail : "Google sign-in failed. Please try again.",
        )
      }
      throw new Error("Google sign-in failed. Please try again.")
    }
  }

  const logout = () => {
    clearToken()
    setToken(null)
    setUser(null)
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token && user),
      login,
      loginWithGoogle,
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

function userFromToken(token: string | null): User | null {
  if (!token) {
    return null
  }

  const payload = decodeToken(token)

  if (!payload?.role) {
    return null
  }

  return {
    id: Number(payload.sub ?? 0),
    name: payload.name ?? payload.email ?? "PCDC User",
    email: payload.email ?? "",
    role: payload.role,
  }
}
