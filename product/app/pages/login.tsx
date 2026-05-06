import { Button } from '@lib/ui/buttons/Button'
import { VStack } from '@lib/ui/css/stack'
import { Text } from '@lib/ui/text'
import { useRouter } from 'next/router'
import { useState } from 'react'

import {
  FormCard,
  FormContainer,
  FormError,
  FormGroup,
  FormInput,
  FormLabel,
  FormTitle,
} from '../components/forms'
import { useAuth } from '../state/auth/AuthProvider'

export default function LoginPage() {
  const router = useRouter()
  const { signIn, loading } = useAuth()

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
      setError(signInError)
      setIsSubmitting(false)
      return
    }

    const next = typeof router.query.next === 'string' ? router.query.next : '/'
    router.replace(next)
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
                autoComplete="username"
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
                autoComplete="current-password"
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
      </FormCard>
    </FormContainer>
  )
}
