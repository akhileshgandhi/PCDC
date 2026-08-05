import { GoogleLogin } from "@react-oauth/google"
import { useNavigate } from "react-router-dom"

import { useAuth } from "../../context/AuthContext"
import { decodeJwtPayload, portalPathForRole } from "../../utils/auth"

interface GoogleSignInButtonProps {
  onError: (message: string) => void
}

export default function GoogleSignInButton({ onError }: GoogleSignInButtonProps) {
  const { loginWithGoogle } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="flex justify-center">
      <GoogleLogin
        text="continue_with"
        width="320"
        onSuccess={async (response) => {
          const credential = response.credential
          if (!credential) {
            onError("Google sign-in did not return a credential. Please try again.")
            return
          }
          try {
            const token = await loginWithGoogle(credential)
            const payload = decodeJwtPayload(token)
            const portalPath = portalPathForRole(payload?.role)
            navigate(portalPath ?? "/unauthorized", { replace: true })
          } catch (error) {
            onError(
              error instanceof Error
                ? error.message
                : "Google sign-in failed. Please try again.",
            )
          }
        }}
        onError={() => onError("Google sign-in was cancelled or failed. Please try again.")}
      />
    </div>
  )
}
