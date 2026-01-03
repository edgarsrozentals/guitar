import { Button } from '@lib/ui/buttons/Button'
import { interactive } from '@lib/ui/css/interactive'
import { HStack, VStack } from '@lib/ui/css/stack'
import { SeparatedByLine } from '@lib/ui/layout/SeparatedByLine'
import { ChildrenProp } from '@lib/ui/props'
import { OverlayNavigationItem } from '@lib/ui/website/navigation/OverlayNavigationItem'
import { WebsiteNavigation } from '@lib/ui/website/navigation/WebsiteNavigation'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useRef } from 'react'
import styled from 'styled-components'

import { makeCagedPath } from '../caged/state/caged'
import { makeChordsPath } from '../chords/state/chords'
import { UserDropdown } from '../components/UserDropdown'
import { ProductLogo } from '../product/ProductLogo'
import { makeScalePath } from '../scale/state/scale'
import { useAuth } from '../state/auth/AuthProvider'
import { makeTriadPath } from '../triad/state/triad'

const LogoWrapper = styled(Link)`
  ${interactive};
  font-size: 20px;
  display: flex;
`

const items = [
  {
    name: 'Notes',
    href: '/',
  },
  {
    name: 'Chords',
    href: makeChordsPath({ rootNote: 0, quality: 'major' }),
  },
  {
    name: 'CAGED',
    href: makeCagedPath({ view: 'chord', tonality: 'major' }),
  },
  {
    name: 'Triads',
    href: makeTriadPath({ rootNote: 10, index: 0, tonality: 'major' }),
  },
  {
    name: 'Scales',
    href: makeScalePath({
      rootNote: 7,
      type: 'pentatonic',
      tonality: 'minor',
    }),
  },
  {
    name: 'Songs',
    href: '/songs',
  },
] as const

export const WebsiteLayout = ({ children }: ChildrenProp) => {
  const { events } = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const { user, loading } = useAuth()

  useEffect(() => {
    const handleRouteChange = () => {
      if (containerRef.current) {
        containerRef.current.scrollTo(0, 0)
      }
    }

    events.on('routeChangeComplete', handleRouteChange)

    return () => {
      events.off('routeChangeComplete', handleRouteChange)
    }
  }, [events])

  return (
    <WebsiteNavigation
      ref={containerRef}
      logo={
        <LogoWrapper href="/">
          <ProductLogo />
        </LogoWrapper>
      }
      renderTopbarItems={() => (
        <>
          <div />
          <HStack alignItems="center" gap={8}>
            {items.map(({ name, href }) => (
              <Link key={name} href={href}>
                <Button kind="ghost" as="div">
                  {name}
                </Button>
              </Link>
            ))}
            {!loading &&
              (user ? (
                <UserDropdown />
              ) : (
                <Link href="/login">
                  <Button kind="ghost" as="div">
                    Login
                  </Button>
                </Link>
              ))}
          </HStack>
        </>
      )}
      renderOverlayItems={({ onClose }) => (
        <SeparatedByLine>
          <VStack>
            {items.map(({ name, href }) => (
              <Link key={name} onClick={onClose} href={href}>
                <OverlayNavigationItem as="div">{name}</OverlayNavigationItem>
              </Link>
            ))}
            {!loading && !user && (
              <Link onClick={onClose} href="/login">
                <OverlayNavigationItem as="div">Login</OverlayNavigationItem>
              </Link>
            )}
            {!loading && user && (
              <Link onClick={onClose} href="/profile">
                <OverlayNavigationItem as="div">Profile</OverlayNavigationItem>
              </Link>
            )}
          </VStack>
        </SeparatedByLine>
      )}
    >
      {children}
    </WebsiteNavigation>
  )
}
