import { getColor } from '@lib/ui/theme/getters'
import styled from 'styled-components'

type UserAvatarProps = {
  avatarUrl?: string
  displayName?: string
  size?: number
}

const AvatarImage = styled.img<{ $size: number }>`
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: 50%;
  object-fit: cover;
`

const AvatarInitials = styled.div<{ $size: number }>`
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: 50%;
  background: ${getColor('primary')};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: ${({ $size }) => Math.round($size * 0.4)}px;
  text-transform: uppercase;
`

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`
  }
  return name.slice(0, 2)
}

export const UserAvatar = ({
  avatarUrl,
  displayName = 'User',
  size = 32,
}: UserAvatarProps) => {
  if (avatarUrl) {
    return <AvatarImage src={avatarUrl} alt={displayName} $size={size} />
  }

  return (
    <AvatarInitials $size={size}>{getInitials(displayName)}</AvatarInitials>
  )
}
