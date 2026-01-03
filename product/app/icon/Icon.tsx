import { useTheme } from 'styled-components'

export const Icon = () => {
  const { colors } = useTheme()

  return (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Acoustic guitar icon */}
      <path
        d="M19.59 3.41a2 2 0 00-2.83 0l-1.83 1.83a1 1 0 000 1.41l2.42 2.42a1 1 0 001.41 0l1.83-1.83a2 2 0 000-2.83l-1-1z"
        fill={colors.contrast.toCssValue()}
      />
      <path
        d="M14.5 7.5L9.5 12.5"
        stroke={colors.contrast.toCssValue()}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <ellipse
        cx="7"
        cy="17"
        rx="5"
        ry="4.5"
        fill={colors.contrast.toCssValue()}
      />
      <circle cx="7" cy="17" r="1.5" fill={colors.background.toCssValue()} />
    </svg>
  )
}
