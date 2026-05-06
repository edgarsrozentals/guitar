import { Button } from '@lib/ui/buttons/Button'
import { HStack, VStack } from '@lib/ui/css/stack'
import { Text } from '@lib/ui/text'
import { getColor } from '@lib/ui/theme/getters'
import { useState } from 'react'
import styled from 'styled-components'

import {
  FormError,
  FormGroup,
  FormInput,
  FormLabel,
  FormSuccess,
} from '../components/forms'
import { useAuth } from '../state/auth/AuthProvider'
import { useApiKeys } from '../state/settings/useApiKeys'

const Container = styled.div`
  display: flex;
  justify-content: center;
  padding: 40px 20px;
`

const ProfileCard = styled.div`
  background: ${getColor('foreground')};
  border-radius: 12px;
  padding: 32px;
  width: 100%;
  max-width: 560px;
`

const Title = styled.h1`
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 24px;
`

const Section = styled.div`
  margin-bottom: 32px;

  &:last-child {
    margin-bottom: 0;
  }
`

const SectionTitle = styled.h2`
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
  color: ${getColor('text')};
`

const Divider = styled.hr`
  border: none;
  border-top: 1px solid ${getColor('mist')};
  margin: 24px 0;
`

const HelperText = styled.p`
  font-size: 12px;
  color: ${getColor('textSupporting')};
  margin: 4px 0 0 0;
`

const KeyStatus = styled.div`
  font-size: 12px;
  color: ${getColor('textSupporting')};
  margin: 0 0 8px 0;
`

type ServiceConfig = {
  service: 'lalal_ai' | 'assemblyai'
  label: string
  helper: React.ReactNode
}

const SERVICES: ServiceConfig[] = [
  {
    service: 'lalal_ai',
    label: 'LALAL.ai API Key',
    helper: (
      <>
        Used for stem separation. Get your key at{' '}
        <a
          href="https://www.lalal.ai/account/"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'inherit', textDecoration: 'underline' }}
        >
          lalal.ai/account
        </a>
        .
      </>
    ),
  },
  {
    service: 'assemblyai',
    label: 'AssemblyAI API Key',
    helper: (
      <>
        Used for lyrics generation. Get your key at{' '}
        <a
          href="https://www.assemblyai.com/app/account"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'inherit', textDecoration: 'underline' }}
        >
          assemblyai.com/app/account
        </a>
        .
      </>
    ),
  },
]

export default function ProfilePage() {
  const { user, signOut } = useAuth()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')

  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [isSavingPassword, setIsSavingPassword] = useState(false)

  const {
    apiKeys,
    loading: apiKeysLoading,
    saving: apiKeysSaving,
    saveApiKey,
    deleteApiKey,
  } = useApiKeys()
  const [keyDraft, setKeyDraft] = useState<Record<string, string>>({})
  const [apiKeySuccess, setApiKeySuccess] = useState<Record<string, boolean>>(
    {},
  )
  const [apiKeyError, setApiKeyError] = useState<Record<string, string | null>>(
    {},
  )

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(false)

    if (newPassword !== confirmNewPassword) {
      setPasswordError('Passwords do not match')
      return
    }
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters')
      return
    }

    setIsSavingPassword(true)
    try {
      const res = await fetch('/api/profile/password', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        setPasswordError(data.error || 'Failed to update password')
      } else {
        setPasswordSuccess(true)
        setCurrentPassword('')
        setNewPassword('')
        setConfirmNewPassword('')
        setTimeout(() => setPasswordSuccess(false), 3000)
      }
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setIsSavingPassword(false)
    }
  }

  const handleSaveApiKey = async (service: 'lalal_ai' | 'assemblyai') => {
    setApiKeyError((prev) => ({ ...prev, [service]: null }))
    setApiKeySuccess((prev) => ({ ...prev, [service]: false }))

    const value = keyDraft[service] || ''
    const { error } = await saveApiKey(service, value)

    if (error) {
      setApiKeyError((prev) => ({ ...prev, [service]: error }))
    } else {
      setKeyDraft((prev) => ({ ...prev, [service]: '' }))
      setApiKeySuccess((prev) => ({ ...prev, [service]: true }))
      setTimeout(
        () => setApiKeySuccess((prev) => ({ ...prev, [service]: false })),
        3000,
      )
    }
  }

  const handleDeleteApiKey = async (service: 'lalal_ai' | 'assemblyai') => {
    setApiKeyError((prev) => ({ ...prev, [service]: null }))
    setApiKeySuccess((prev) => ({ ...prev, [service]: false }))

    const { error } = await deleteApiKey(service)
    if (error) {
      setApiKeyError((prev) => ({ ...prev, [service]: error }))
    } else {
      setApiKeySuccess((prev) => ({ ...prev, [service]: true }))
      setTimeout(
        () => setApiKeySuccess((prev) => ({ ...prev, [service]: false })),
        3000,
      )
    }
  }

  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/login'
  }

  if (!user) return null

  return (
    <Container>
      <ProfileCard>
        <Title>Profile</Title>

        <Section>
          <VStack gap={4}>
            <Text weight="600">{user.email}</Text>
            {user.isAdmin && (
              <Text color="supporting" size={12}>
                Administrator
              </Text>
            )}
          </VStack>
        </Section>

        <Divider />

        <Section>
          <SectionTitle>Change Password</SectionTitle>

          {passwordSuccess && (
            <FormSuccess>Password updated successfully!</FormSuccess>
          )}
          {passwordError && <FormError>{passwordError}</FormError>}

          <form onSubmit={handleChangePassword}>
            <VStack gap={12}>
              <FormGroup>
                <FormLabel htmlFor="currentPassword">
                  Current Password
                </FormLabel>
                <FormInput
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </FormGroup>
              <FormGroup>
                <FormLabel htmlFor="newPassword">New Password</FormLabel>
                <FormInput
                  id="newPassword"
                  type="password"
                  placeholder="At least 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={8}
                  autoComplete="new-password"
                  required
                />
              </FormGroup>
              <FormGroup>
                <FormLabel htmlFor="confirmNewPassword">
                  Confirm New Password
                </FormLabel>
                <FormInput
                  id="confirmNewPassword"
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </FormGroup>

              <Button
                type="submit"
                kind="secondary"
                disabled={
                  isSavingPassword ||
                  !currentPassword ||
                  !newPassword ||
                  !confirmNewPassword
                }
              >
                {isSavingPassword ? 'Updating...' : 'Update Password'}
              </Button>
            </VStack>
          </form>
        </Section>

        <Divider />

        <Section>
          <SectionTitle>API Keys</SectionTitle>
          <HelperText style={{ marginBottom: 16, marginTop: -8 }}>
            Add your own API keys for stem separation and lyrics generation.
            Keys are encrypted at rest.
          </HelperText>

          {SERVICES.map(({ service, label, helper }) => {
            const status = apiKeys[service]
            return (
              <FormGroup key={service}>
                <FormLabel htmlFor={service}>{label}</FormLabel>
                <HelperText style={{ marginBottom: 8 }}>{helper}</HelperText>

                {status?.hasKey && (
                  <KeyStatus>
                    Stored key: ••••{status.last4}
                    {status.updatedAt && (
                      <>
                        {' '}
                        (updated{' '}
                        {new Date(status.updatedAt).toLocaleDateString()})
                      </>
                    )}
                  </KeyStatus>
                )}

                {apiKeySuccess[service] && (
                  <FormSuccess>{label} updated.</FormSuccess>
                )}
                {apiKeyError[service] && (
                  <FormError>{apiKeyError[service]}</FormError>
                )}

                <FormInput
                  id={service}
                  type="password"
                  placeholder={
                    status?.hasKey
                      ? 'Enter a new key to replace it'
                      : 'Enter API key'
                  }
                  value={keyDraft[service] || ''}
                  onChange={(e) =>
                    setKeyDraft((prev) => ({
                      ...prev,
                      [service]: e.target.value,
                    }))
                  }
                  disabled={apiKeysLoading}
                  autoComplete="off"
                />
                <HStack gap={8} style={{ marginTop: 8 }}>
                  <Button
                    kind="secondary"
                    onClick={() => handleSaveApiKey(service)}
                    disabled={
                      apiKeysSaving || !(keyDraft[service] || '').trim()
                    }
                  >
                    {apiKeysSaving ? 'Saving...' : 'Save'}
                  </Button>
                  {status?.hasKey && (
                    <Button
                      kind="ghost"
                      onClick={() => handleDeleteApiKey(service)}
                      disabled={apiKeysSaving}
                    >
                      Remove
                    </Button>
                  )}
                </HStack>
              </FormGroup>
            )
          })}
        </Section>

        <Divider />

        <Section>
          <HStack justifyContent="space-between" alignItems="center">
            <Text color="supporting">Sign out of your account</Text>
            <Button kind="ghost" onClick={handleSignOut}>
              Sign Out
            </Button>
          </HStack>
        </Section>
      </ProfileCard>
    </Container>
  )
}
