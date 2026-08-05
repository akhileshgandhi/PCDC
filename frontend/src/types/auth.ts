import type { User } from "./user"

export interface AuthContextValue {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<string>
  loginWithGoogle: (credential: string) => Promise<string>
  logout: () => void
}
