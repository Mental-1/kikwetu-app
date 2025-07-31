import { AuthForm } from "@/components/auth/auth-form"

/**
 * Renders a styled container displaying the authentication form.
 *
 * Serves as the main authentication page layout.
 */
export default function AuthPage() {
  return (
    <div className="container max-w-screen-md py-12">
      <AuthForm />
    </div>
  )
}
