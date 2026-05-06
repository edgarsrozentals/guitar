import { getColor } from '@lib/ui/theme/getters'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import styled from 'styled-components'

import { useAuth } from '../state/auth/AuthProvider'

const Container = styled.div`
  position: relative;
`

const TriggerButton = styled.button`
  background: none;
  border: 1px solid ${getColor('mist')};
  padding: 6px 12px;
  cursor: pointer;
  border-radius: 999px;
  color: ${getColor('text')};
  font-size: 14px;
  transition: opacity 0.2s;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &:hover {
    opacity: 0.8;
  }
`

const Dropdown = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: ${getColor('foreground')};
  border: 1px solid ${getColor('mist')};
  border-radius: 8px;
  min-width: 200px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  overflow: hidden;
`

const DropdownItem = styled.button`
  display: block;
  width: 100%;
  padding: 12px 16px;
  text-align: left;
  background: none;
  border: none;
  color: ${getColor('text')};
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: ${getColor('mist')};
  }
`

const DropdownLink = styled(Link)`
  display: block;
  padding: 12px 16px;
  text-decoration: none;
  color: ${getColor('text')};
  font-size: 14px;
  transition: background 0.2s;

  &:hover {
    background: ${getColor('mist')};
  }
`

const Divider = styled.div`
  height: 1px;
  background: ${getColor('mist')};
`

const UserInfo = styled.div`
  padding: 12px 16px;
  border-bottom: 1px solid ${getColor('mist')};
`

const UserEmail = styled.div`
  font-size: 13px;
  color: ${getColor('text')};
  word-break: break-all;
`

const AdminTag = styled.div`
  font-size: 11px;
  color: ${getColor('textSupporting')};
  margin-top: 2px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`

export const UserDropdown = () => {
  const { user, signOut } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    if (isSigningOut) return
    setIsSigningOut(true)
    setIsOpen(false)
    try {
      await signOut()
    } catch (e) {
      console.error('Sign out error:', e)
    }
    window.location.href = '/login'
  }

  if (!user) return null

  return (
    <Container ref={containerRef}>
      <TriggerButton onClick={() => setIsOpen(!isOpen)}>
        {user.email}
      </TriggerButton>

      {isOpen && (
        <Dropdown>
          <UserInfo>
            <UserEmail>{user.email}</UserEmail>
            {user.isAdmin && <AdminTag>Admin</AdminTag>}
          </UserInfo>
          <DropdownLink href="/profile" onClick={() => setIsOpen(false)}>
            Profile
          </DropdownLink>
          {user.isAdmin && (
            <DropdownLink href="/admin/users" onClick={() => setIsOpen(false)}>
              Admin: Users
            </DropdownLink>
          )}
          <Divider />
          <DropdownItem onClick={handleSignOut} disabled={isSigningOut}>
            {isSigningOut ? 'Signing out...' : 'Sign Out'}
          </DropdownItem>
        </Dropdown>
      )}
    </Container>
  )
}
