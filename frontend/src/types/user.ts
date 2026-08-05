export type UserRole = "student" | "faculty" | "admin"

export interface User {
  id: number
  name: string
  email: string
  role: UserRole
}
