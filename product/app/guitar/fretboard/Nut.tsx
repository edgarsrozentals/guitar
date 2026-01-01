import { getColor } from '@lib/ui/theme/getters'
import styled from 'styled-components'

const Container = styled.div`
  height: 100%;
  background: ${getColor('textShy')};
`

type NutProps = {
  width: number
}

export const Nut = ({ width }: NutProps) => {
  return <Container style={{ width }} />
}
