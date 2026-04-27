import { Button } from '@lib/ui/buttons/Button'
import { HStack, VStack } from '@lib/ui/css/stack'
import { Text } from '@lib/ui/text'
import { getColor } from '@lib/ui/theme/getters'
import { useRouter } from 'next/router'
import { useCallback, useEffect, useState } from 'react'
import styled from 'styled-components'

import {
  FormError,
  FormGroup,
  FormInput,
  FormLabel,
  FormSuccess,
} from '../../components/forms'
import { useAuth } from '../../state/auth/AuthProvider'

const Container = styled.div`
  display: flex;
  justify-content: center;
  padding: 40px 20px;
`

const Card = styled.div`
  background: ${getColor('foreground')};
  border-radius: 12px;
  padding: 32px;
  width: 100%;
  max-width: 720px;
`

const Title = styled.h1`
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 24px;
`

const SectionTitle = styled.h2`
  font-size: 16px;
  font-weight: 600;
  margin: 24px 0 12px 0;
  color: ${getColor('text')};
`

const UserRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 0;
  border-top: 1px solid ${getColor('mist')};

  &:last-child {
    border-bottom: 1px solid ${getColor('mist')};
  }
`

const UserMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
`

const UserEmail = styled.span`
  font-weight: 500;
  color: ${getColor('text')};
  word-break: break-all;
`

const SmallTag = styled.span`
  display: inline-block;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${getColor('textSupporting')};
`

type AdminUser = {
  id: string
  email: string
  isAdmin: boolean
  createdAt: string
}

export default function AdminUsersPage() {
  const router = useRouter()
  const { user, loading } = useAuth()

  const [users, setUsers] = useState<AdminUser[]>([])
  const [listError, setListError] = useState<string | null>(null)

  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newIsAdmin, setNewIsAdmin] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createSuccess, setCreateSuccess] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const [resetTargetId, setResetTargetId] = useState<string | null>(null)
  const [resetPassword, setResetPassword] = useState('')
  const [resetError, setResetError] = useState<string | null>(null)
  const [resetSuccess, setResetSuccess] = useState<string | null>(null)
  const [isResetting, setIsResetting] = useState(false)

  const loadUsers = useCallback(async () => {
    setListError(null)
    try {
      const res = await fetch('/api/admin/users', { credentials: 'include' })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        setListError(data.error || `Failed to load users (${res.status})`)
        return
      }
      const data = (await res.json()) as { users: AdminUser[] }
      setUsers(data.users)
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Network error')
    }
  }, [])

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace('/login')
      return
    }
    if (!user.isAdmin) {
      router.replace('/')
      return
    }
    loadUsers()
  }, [loading, user, router, loadUsers])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError(null)
    setCreateSuccess(null)
    setIsCreating(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newEmail,
          password: newPassword,
          isAdmin: newIsAdmin,
        }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        setCreateError(data.error || 'Failed to create user')
        return
      }
      setCreateSuccess(`Created ${newEmail}`)
      setNewEmail('')
      setNewPassword('')
      setNewIsAdmin(false)
      await loadUsers()
    } finally {
      setIsCreating(false)
    }
  }

  const handleDelete = async (target: AdminUser) => {
    if (target.id === user?.id) return
    if (
      !window.confirm(`Delete user ${target.email}? This cannot be undone.`)
    ) {
      return
    }
    const res = await fetch(`/api/admin/users/${target.id}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      setListError(data.error || `Failed to delete (${res.status})`)
      return
    }
    await loadUsers()
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetTargetId) return
    setResetError(null)
    setResetSuccess(null)
    setIsResetting(true)
    try {
      const res = await fetch(`/api/admin/users/${resetTargetId}/password`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: resetPassword }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        setResetError(data.error || 'Failed to reset password')
        return
      }
      setResetSuccess('Password updated')
      setResetTargetId(null)
      setResetPassword('')
      setTimeout(() => setResetSuccess(null), 3000)
    } finally {
      setIsResetting(false)
    }
  }

  if (loading || !user || !user.isAdmin) return null

  return (
    <Container>
      <Card>
        <Title>Admin: Users</Title>

        <SectionTitle>Existing users ({users.length})</SectionTitle>
        {listError && <FormError>{listError}</FormError>}
        <VStack gap={0}>
          {users.map((u) => (
            <UserRow key={u.id}>
              <UserMeta>
                <UserEmail>{u.email}</UserEmail>
                <SmallTag>
                  {u.isAdmin ? 'Admin' : 'User'} • Created{' '}
                  {new Date(u.createdAt).toLocaleDateString()}
                </SmallTag>
              </UserMeta>
              <HStack gap={8}>
                <Button
                  kind="ghost"
                  onClick={() => {
                    setResetTargetId(u.id)
                    setResetPassword('')
                    setResetError(null)
                    setResetSuccess(null)
                  }}
                >
                  Reset password
                </Button>
                <Button
                  kind="ghost"
                  onClick={() => handleDelete(u)}
                  disabled={u.id === user.id}
                >
                  {u.id === user.id ? 'You' : 'Delete'}
                </Button>
              </HStack>
            </UserRow>
          ))}
        </VStack>

        {resetTargetId && (
          <>
            <SectionTitle>
              Reset password for{' '}
              {users.find((u) => u.id === resetTargetId)?.email}
            </SectionTitle>
            {resetSuccess && <FormSuccess>{resetSuccess}</FormSuccess>}
            {resetError && <FormError>{resetError}</FormError>}
            <form onSubmit={handleReset}>
              <VStack gap={12}>
                <FormGroup>
                  <FormLabel htmlFor="resetPassword">New password</FormLabel>
                  <FormInput
                    id="resetPassword"
                    type="text"
                    placeholder="At least 8 characters"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    minLength={8}
                    autoComplete="off"
                    required
                  />
                </FormGroup>
                <HStack gap={8}>
                  <Button
                    type="submit"
                    kind="primary"
                    disabled={isResetting || resetPassword.length < 8}
                  >
                    {isResetting ? 'Updating...' : 'Set Password'}
                  </Button>
                  <Button
                    kind="ghost"
                    onClick={() => {
                      setResetTargetId(null)
                      setResetPassword('')
                    }}
                  >
                    Cancel
                  </Button>
                </HStack>
              </VStack>
            </form>
          </>
        )}

        <SectionTitle>Add a new user</SectionTitle>
        {createSuccess && <FormSuccess>{createSuccess}</FormSuccess>}
        {createError && <FormError>{createError}</FormError>}
        <form onSubmit={handleCreate}>
          <VStack gap={12}>
            <FormGroup>
              <FormLabel htmlFor="newEmail">Email</FormLabel>
              <FormInput
                id="newEmail"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
              />
            </FormGroup>
            <FormGroup>
              <FormLabel htmlFor="newPassword">Initial Password</FormLabel>
              <FormInput
                id="newPassword"
                type="text"
                placeholder="At least 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
                required
                autoComplete="off"
              />
            </FormGroup>
            <FormGroup>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={newIsAdmin}
                  onChange={(e) => setNewIsAdmin(e.target.checked)}
                />
                <Text>Make this user an admin</Text>
              </label>
            </FormGroup>
            <Button
              type="submit"
              kind="primary"
              disabled={isCreating || !newEmail || newPassword.length < 8}
            >
              {isCreating ? 'Creating...' : 'Create User'}
            </Button>
          </VStack>
        </form>
      </Card>
    </Container>
  )
}
