export type UserRole = "student" | "faculty" | "admin" | "superadmin"

export interface User {
  id: number
  name: string
  email: string
  role: UserRole
}
