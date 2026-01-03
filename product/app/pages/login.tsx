import { Button } from '@lib/ui/buttons/Button'
import { VStack } from '@lib/ui/css/stack'
import { Text } from '@lib/ui/text'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState } from 'react'
import styled from 'styled-components'

import {
  FormCard,
  FormContainer,
  FormDivider,
  FormError,
  FormGroup,
  FormInput,
  FormLabel,
  FormLink,
  FormTitle,
} from '../components/forms'
import { useAuth } from '../state/auth/AuthProvider'

const GoogleButton = styled(Button)`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
`

export default function LoginPage() {
  const router = useRouter()
  const { signIn, signInWithGoogle, loading } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const { error: signInError } = await signIn(email, password)

    if (signInError) {
      setError(signInError.message)
      setIsSubmitting(false)
    } else {
      router.push('/')
    }
  }

  const handleGoogleSignIn = async () => {
    setError(null)
    const { error: googleError } = await signInWithGoogle()
    if (googleError) {
      setError(googleError.message)
    }
  }

  if (loading) {
    return (
      <FormContainer>
        <Text>Loading...</Text>
      </FormContainer>
    )
  }

  return (
    <FormContainer>
      <FormCard>
        <FormTitle>Sign In</FormTitle>

        {error && <FormError>{error}</FormError>}

        {router.query.error === 'auth' && (
          <FormError>Authentication failed. Please try again.</FormError>
        )}

        <form onSubmit={handleSubmit}>
          <VStack gap={16}>
            <FormGroup>
              <FormLabel htmlFor="email">Email</FormLabel>
              <FormInput
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </FormGroup>

            <FormGroup>
              <FormLabel htmlFor="password">Password</FormLabel>
              <FormInput
                id="password"
                type="password"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </FormGroup>

            <Button
              type="submit"
              kind="primary"
              style={{ width: '100%' }}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </Button>
          </VStack>
        </form>

        <FormDivider>
          <span>or</span>
        </FormDivider>

        <GoogleButton kind="secondary" onClick={handleGoogleSignIn}>
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Sign in with Google
        </GoogleButton>

        <FormLink>
          Don&apos;t have an account? <Link href="/signup">Sign up</Link>
        </FormLink>
      </FormCard>
    </FormContainer>
  )
}
