import { VStack, HStack } from '@lib/ui/css/stack'
import { getColor } from '@lib/ui/theme/getters'
import { ChildrenProp } from '@lib/ui/props'
import styled from 'styled-components'

const Container = styled.div`
  background: ${getColor('foreground')};
  border-radius: 12px;
  padding: 16px 20px;
`

const Title = styled.h3`
  font-size: 14px;
  font-weight: 600;
  color: ${getColor('textSupporting')};
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`

type ControlGroupProps = ChildrenProp & {
  title: string
}

export const ControlGroup = ({ title, children }: ControlGroupProps) => {
  return (
    <Container>
      <VStack gap={12}>
        <Title>{title}</Title>
        <HStack gap={24} wrap="wrap">
          {children}
        </HStack>
      </VStack>
    </Container>
  )
}
