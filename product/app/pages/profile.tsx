import { Button } from '@lib/ui/buttons/Button'
import { HStack, VStack } from '@lib/ui/css/stack'
import { Text } from '@lib/ui/text'
import { getColor } from '@lib/ui/theme/getters'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import styled from 'styled-components'

import {
  FormError,
  FormGroup,
  FormInput,
  FormLabel,
  FormSuccess,
} from '../components/forms'
import { UserAvatar } from '../components/UserAvatar'
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
  max-width: 500px;
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

const AvatarSection = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
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

const ApiKeyInputWrapper = styled.div`
  position: relative;
  display: flex;
  gap: 8px;
`

const ToggleVisibilityButton = styled.button`
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: ${getColor('textSupporting')};
  cursor: pointer;
  padding: 4px;
  font-size: 13px;

  &:hover {
    color: ${getColor('text')};
  }
`

const ApiKeyInput = styled(FormInput)`
  padding-right: 60px;
`

export default function ProfilePage() {
  const router = useRouter()
  const { user, profile, loading, updateProfile, updatePassword, signOut } =
    useAuth()

  const [displayName, setDisplayName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')

  const [profileSuccess, setProfileSuccess] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavingPassword, setIsSavingPassword] = useState(false)

  const {
    apiKeys,
    loading: apiKeysLoading,
    saving: apiKeysSaving,
    updateApiKey,
    saveApiKey,
    deleteApiKey,
  } = useApiKeys()
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({})
  const [apiKeySuccess, setApiKeySuccess] = useState<Record<string, boolean>>(
    {},
  )
  const [apiKeyError, setApiKeyError] = useState<Record<string, string | null>>(
    {},
  )

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [loading, user, router])

  useEffect(() => {
    if (profile?.display_name) {
      setDisplayName(profile.display_name)
    }
  }, [profile])

  const handleSaveProfile = async () => {
    setProfileError(null)
    setProfileSuccess(false)
    setIsSavingProfile(true)

    const { error } = await updateProfile({ display_name: displayName })

    if (error) {
      setProfileError(error.message)
    } else {
      setProfileSuccess(true)
      setTimeout(() => setProfileSuccess(false), 3000)
    }

    setIsSavingProfile(false)
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(false)

    if (newPassword !== confirmNewPassword) {
      setPasswordError('Passwords do not match')
      return
    }

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters')
      return
    }

    setIsSavingPassword(true)

    const { error } = await updatePassword(newPassword)

    if (error) {
      setPasswordError(error.message)
    } else {
      setPasswordSuccess(true)
      setNewPassword('')
      setConfirmNewPassword('')
      setTimeout(() => setPasswordSuccess(false), 3000)
    }

    setIsSavingPassword(false)
  }

  const handleSaveApiKey = async (service: 'lalal_ai' | 'assemblyai') => {
    setApiKeyError((prev) => ({ ...prev, [service]: null }))
    setApiKeySuccess((prev) => ({ ...prev, [service]: false }))

    const { error } = await saveApiKey(service)

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
    window.location.href = '/'
  }

  if (loading || !user) {
    return (
      <Container>
        <Text>Loading...</Text>
      </Container>
    )
  }

  return (
    <Container>
      <ProfileCard>
        <Title>Profile</Title>

        <AvatarSection>
          <UserAvatar
            avatarUrl={profile?.avatar_url ?? undefined}
            displayName={profile?.display_name ?? user.email ?? 'User'}
            size={64}
          />
          <VStack gap={4}>
            <Text weight="600">{profile?.display_name || 'No name set'}</Text>
            <Text color="supporting" size={14}>
              {user.email}
            </Text>
          </VStack>
        </AvatarSection>

        <Divider />

        <Section>
          <SectionTitle>Profile Information</SectionTitle>

          {profileSuccess && (
            <FormSuccess>Profile updated successfully!</FormSuccess>
          )}
          {profileError && <FormError>{profileError}</FormError>}

          <FormGroup>
            <FormLabel htmlFor="displayName">Display Name</FormLabel>
            <FormInput
              id="displayName"
              type="text"
              placeholder="Your display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </FormGroup>

          <FormGroup>
            <FormLabel htmlFor="email">Email</FormLabel>
            <FormInput
              id="email"
              type="email"
              value={user.email || ''}
              disabled
            />
          </FormGroup>

          <Button
            kind="primary"
            onClick={handleSaveProfile}
            disabled={isSavingProfile}
          >
            {isSavingProfile ? 'Saving...' : 'Save Changes'}
          </Button>
        </Section>

        <Divider />

        <Section>
          <SectionTitle>Change Password</SectionTitle>

          {passwordSuccess && (
            <FormSuccess>Password updated successfully!</FormSuccess>
          )}
          {passwordError && <FormError>{passwordError}</FormError>}

          <form onSubmit={handleChangePassword}>
            <FormGroup>
              <FormLabel htmlFor="newPassword">New Password</FormLabel>
              <FormInput
                id="newPassword"
                type="password"
                placeholder="At least 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={6}
              />
            </FormGroup>

            <FormGroup>
              <FormLabel htmlFor="confirmNewPassword">
                Confirm New Password
              </FormLabel>
              <FormInput
                id="confirmNewPassword"
                type="password"
                placeholder="Confirm new password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
              />
            </FormGroup>

            <Button
              type="submit"
              kind="secondary"
              disabled={isSavingPassword || !newPassword || !confirmNewPassword}
            >
              {isSavingPassword ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
        </Section>

        <Divider />

        <Section>
          <SectionTitle>API Keys</SectionTitle>
          <HelperText style={{ marginBottom: 16, marginTop: -8 }}>
            Add your own API keys for stem separation and lyrics generation.
            Keys are encrypted and stored securely.
          </HelperText>

          <FormGroup>
            <FormLabel htmlFor="lalalApiKey">LALAL.ai API Key</FormLabel>
            <HelperText style={{ marginBottom: 8 }}>
              Used for stem separation. Get your key at{' '}
              <a
                href="https://www.lalal.ai/account/"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'inherit', textDecoration: 'underline' }}
              >
                lalal.ai/account
              </a>
            </HelperText>
            {apiKeySuccess.lalal_ai && (
              <FormSuccess>LALAL.ai key saved!</FormSuccess>
            )}
            {apiKeyError.lalal_ai && (
              <FormError>{apiKeyError.lalal_ai}</FormError>
            )}
            <ApiKeyInputWrapper>
              <ApiKeyInput
                id="lalalApiKey"
                type={showApiKey.lalal_ai ? 'text' : 'password'}
                placeholder="Enter LALAL.ai API key"
                value={apiKeys.lalal_ai}
                onChange={(e) => updateApiKey('lalal_ai', e.target.value)}
                disabled={apiKeysLoading}
              />
              <ToggleVisibilityButton
                type="button"
                onClick={() =>
                  setShowApiKey((prev) => ({
                    ...prev,
                    lalal_ai: !prev.lalal_ai,
                  }))
                }
              >
                {showApiKey.lalal_ai ? 'Hide' : 'Show'}
              </ToggleVisibilityButton>
            </ApiKeyInputWrapper>
            <HStack gap={8} style={{ marginTop: 8 }}>
              <Button
                kind="secondary"
                onClick={() => handleSaveApiKey('lalal_ai')}
                disabled={apiKeysSaving || !apiKeys.lalal_ai.trim()}
              >
                {apiKeysSaving ? 'Saving...' : 'Save'}
              </Button>
              {apiKeys.lalal_ai && (
                <Button
                  kind="ghost"
                  onClick={() => handleDeleteApiKey('lalal_ai')}
                  disabled={apiKeysSaving}
                >
                  Remove
                </Button>
              )}
            </HStack>
          </FormGroup>

          <FormGroup>
            <FormLabel htmlFor="assemblyaiApiKey">AssemblyAI API Key</FormLabel>
            <HelperText style={{ marginBottom: 8 }}>
              Used for lyrics generation. Get your key at{' '}
              <a
                href="https://www.assemblyai.com/app/account"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'inherit', textDecoration: 'underline' }}
              >
                assemblyai.com/app/account
              </a>
            </HelperText>
            {apiKeySuccess.assemblyai && (
              <FormSuccess>AssemblyAI key saved!</FormSuccess>
            )}
            {apiKeyError.assemblyai && (
              <FormError>{apiKeyError.assemblyai}</FormError>
            )}
            <ApiKeyInputWrapper>
              <ApiKeyInput
                id="assemblyaiApiKey"
                type={showApiKey.assemblyai ? 'text' : 'password'}
                placeholder="Enter AssemblyAI API key"
                value={apiKeys.assemblyai}
                onChange={(e) => updateApiKey('assemblyai', e.target.value)}
                disabled={apiKeysLoading}
              />
              <ToggleVisibilityButton
                type="button"
                onClick={() =>
                  setShowApiKey((prev) => ({
                    ...prev,
                    assemblyai: !prev.assemblyai,
                  }))
                }
              >
                {showApiKey.assemblyai ? 'Hide' : 'Show'}
              </ToggleVisibilityButton>
            </ApiKeyInputWrapper>
            <HStack gap={8} style={{ marginTop: 8 }}>
              <Button
                kind="secondary"
                onClick={() => handleSaveApiKey('assemblyai')}
                disabled={apiKeysSaving || !apiKeys.assemblyai.trim()}
              >
                {apiKeysSaving ? 'Saving...' : 'Save'}
              </Button>
              {apiKeys.assemblyai && (
                <Button
                  kind="ghost"
                  onClick={() => handleDeleteApiKey('assemblyai')}
                  disabled={apiKeysSaving}
                >
                  Remove
                </Button>
              )}
            </HStack>
          </FormGroup>
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
