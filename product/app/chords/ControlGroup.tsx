import { VStack, HStack } from '@lib/ui/css/stack'
import { ChildrenProp } from '@lib/ui/props'
import { getColor } from '@lib/ui/theme/getters'
import styled from 'styled-components'

const Container = styled.div`
  background: ${getColor('foreground')};
  border-radius: 8px;
  padding: 12px 16px;
`

const TitleRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`

const Title = styled.h3`
  font-size: 12px;
  font-weight: 600;
  color: ${getColor('textSupporting')};
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`

type ControlGroupProps = ChildrenProp & {
  title: string
  action?: React.ReactNode
}

export const ControlGroup = ({
  title,
  children,
  action,
}: ControlGroupProps) => {
  return (
    <Container>
      <VStack gap={8}>
        <TitleRow>
          <Title>{title}</Title>
          {action}
        </TitleRow>
        <HStack gap={16} wrap="wrap">
          {children}
        </HStack>
      </VStack>
    </Container>
  )
}
