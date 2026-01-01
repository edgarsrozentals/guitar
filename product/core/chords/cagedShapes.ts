// CAGED chord shape system
// Each shape defines fret offsets relative to the root position
// null = muted string, number = fret offset from root position

export type CAGEDShapeName = 'C' | 'A' | 'G' | 'E' | 'D'

export type ChordShapeType = 'major' | 'minor' | '7' | 'maj7' | 'min7' | 'dim' | 'dim7' | '9' | 'maj9' | 'min9'

// Fret offsets for each string [6th, 5th, 4th, 3rd, 2nd, 1st]
// null means muted, number is offset from root fret position
export type ShapeDefinition = {
  name: CAGEDShapeName
  rootString: number // 0-5, which string has the root at the base position
  offsets: (number | null)[] // fret offsets for each string [low E to high E]
  // For shapes where lowest fret isn't the root, we need an adjustment
  rootOffset: number // how many frets above the lowest fret is the root
}

// Major chord shapes
export const majorShapes: ShapeDefinition[] = [
  {
    name: 'E',
    rootString: 5, // 6th string (low E) - index 5 in our system (0=high E)
    offsets: [0, 0, 1, 2, 2, 0], // high E to low E
    rootOffset: 0,
  },
  {
    name: 'A',
    rootString: 4, // 5th string (A)
    offsets: [0, 2, 2, 2, 0, null], // high E to low E
    rootOffset: 0,
  },
  {
    name: 'D',
    rootString: 3, // 4th string (D)
    offsets: [2, 3, 2, 0, null, null], // high E to low E
    rootOffset: 0,
  },
  {
    name: 'G',
    rootString: 5, // 6th string
    offsets: [3, 0, 0, 0, 2, 3], // high E to low E - open G chord shape
    rootOffset: 3, // root is 3 frets above the lowest note (open strings)
  },
  {
    name: 'C',
    rootString: 4, // 5th string
    offsets: [0, 1, 0, 2, 3, null], // high E to low E
    rootOffset: 3, // root is 3 frets above the lowest note in shape
  },
]

// Minor chord shapes
export const minorShapes: ShapeDefinition[] = [
  {
    name: 'E',
    rootString: 5,
    offsets: [0, 0, 0, 2, 2, 0], // Em shape (flatten the 3rd)
    rootOffset: 0,
  },
  {
    name: 'A',
    rootString: 4,
    offsets: [0, 1, 2, 2, 0, null], // Am shape
    rootOffset: 0,
  },
  {
    name: 'D',
    rootString: 3,
    offsets: [1, 3, 2, 0, null, null], // Dm shape
    rootOffset: 0,
  },
  {
    name: 'G',
    rootString: 5,
    offsets: [3, 1, 0, 0, 1, 3], // Gm shape - minor 3rd on B and A strings
    rootOffset: 3,
  },
]

// Dominant 7 shapes
export const dom7Shapes: ShapeDefinition[] = [
  {
    name: 'E',
    rootString: 5,
    offsets: [0, 0, 1, 0, 2, 0], // E7 shape
    rootOffset: 0,
  },
  {
    name: 'A',
    rootString: 4,
    offsets: [0, 2, 0, 2, 0, null], // A7 shape
    rootOffset: 0,
  },
  {
    name: 'D',
    rootString: 3,
    offsets: [2, 1, 2, 0, null, null], // D7 shape
    rootOffset: 0,
  },
  {
    name: 'G',
    rootString: 5,
    offsets: [1, 0, 0, 0, 2, 3], // G7 shape - b7 on high E
    rootOffset: 3,
  },
  {
    name: 'C',
    rootString: 4,
    offsets: [0, 1, 3, 2, 3, null], // C7 shape
    rootOffset: 3,
  },
]

// Major 7 shapes
export const maj7Shapes: ShapeDefinition[] = [
  {
    name: 'E',
    rootString: 5,
    offsets: [0, 0, 1, 1, 2, 0], // Emaj7 shape
    rootOffset: 0,
  },
  {
    name: 'A',
    rootString: 4,
    offsets: [0, 1, 1, 2, 0, null], // Amaj7 shape
    rootOffset: 0,
  },
  {
    name: 'D',
    rootString: 3,
    offsets: [2, 2, 2, 0, null, null], // Dmaj7 shape
    rootOffset: 0,
  },
  {
    name: 'G',
    rootString: 5,
    offsets: [2, 0, 0, 0, 2, 3], // Gmaj7 shape - maj7 on high E
    rootOffset: 3,
  },
]

// Minor 7 shapes
export const min7Shapes: ShapeDefinition[] = [
  {
    name: 'E',
    rootString: 5,
    offsets: [0, 0, 0, 0, 2, 0], // Em7 shape
    rootOffset: 0,
  },
  {
    name: 'A',
    rootString: 4,
    offsets: [0, 1, 0, 2, 0, null], // Am7 shape
    rootOffset: 0,
  },
  {
    name: 'D',
    rootString: 3,
    offsets: [1, 1, 2, 0, null, null], // Dm7 shape
    rootOffset: 0,
  },
  {
    name: 'G',
    rootString: 5,
    offsets: [1, 1, 0, 0, 1, 3], // Gm7 shape - flat 3rd + b7
    rootOffset: 3,
  },
]

// Diminished triad shapes (root, ♭3, ♭5)
export const dimShapes: ShapeDefinition[] = [
  {
    name: 'A',
    rootString: 4,
    offsets: [null, 1, 2, 1, 0, null], // Adim shape
    rootOffset: 0,
  },
  {
    name: 'D',
    rootString: 3,
    offsets: [1, 2, 1, 0, null, null], // Ddim shape
    rootOffset: 0,
  },
  {
    name: 'E',
    rootString: 5,
    offsets: [null, null, 1, 2, 1, 0], // Edim shape - partial voicing
    rootOffset: 0,
  },
]

// Diminished 7 shapes (root, ♭3, ♭5, ♭♭7)
// These are symmetrical - same shape repeats every 3 frets
export const dim7Shapes: ShapeDefinition[] = [
  {
    name: 'A',
    rootString: 4,
    offsets: [2, 1, 2, 1, 0, null], // Adim7 shape
    rootOffset: 0,
  },
  {
    name: 'D',
    rootString: 3,
    offsets: [1, 0, 1, 0, null, null], // Ddim7 shape
    rootOffset: 0,
  },
  {
    name: 'E',
    rootString: 5,
    offsets: [null, 2, 1, 2, 1, 0], // Edim7 shape
    rootOffset: 0,
  },
]

// Dominant 9 shapes (root, 3, 5, b7, 9)
export const dom9Shapes: ShapeDefinition[] = [
  {
    name: 'E',
    rootString: 5,
    offsets: [2, 0, 1, 0, 2, 0], // E9 shape: 0 2 0 1 0 2
    rootOffset: 0,
  },
  {
    name: 'A',
    rootString: 4,
    offsets: [3, 2, 4, 2, 0, null], // A9 shape: x 0 2 4 2 3
    rootOffset: 0,
  },
]

// Major 9 shapes (root, 3, 5, 7, 9)
export const maj9Shapes: ShapeDefinition[] = [
  {
    name: 'E',
    rootString: 5,
    offsets: [2, 0, 1, 1, 2, 0], // Emaj9 shape: 0 2 1 1 0 2
    rootOffset: 0,
  },
  {
    name: 'A',
    rootString: 4,
    offsets: [4, 2, 4, 2, 0, null], // Amaj9 shape: x 0 2 4 2 4
    rootOffset: 0,
  },
]

// Minor 9 shapes (root, b3, 5, b7, 9)
export const min9Shapes: ShapeDefinition[] = [
  {
    name: 'E',
    rootString: 5,
    offsets: [2, 0, 0, 0, 2, 0], // Em9 shape: 0 2 0 0 0 2
    rootOffset: 0,
  },
  {
    name: 'A',
    rootString: 4,
    offsets: [0, 0, 5, 5, 0, null], // Am9 shape: x 0 5 5 0 0 (has b3, b7, 9)
    rootOffset: 0,
  },
]

// Get shapes for a chord type
export const getShapesForType = (type: ChordShapeType): ShapeDefinition[] => {
  switch (type) {
    case 'major':
      return majorShapes
    case 'minor':
      return minorShapes
    case '7':
      return dom7Shapes
    case 'maj7':
      return maj7Shapes
    case 'min7':
      return min7Shapes
    case 'dim':
      return dimShapes
    case 'dim7':
      return dim7Shapes
    case '9':
      return dom9Shapes
    case 'maj9':
      return maj9Shapes
    case 'min9':
      return min9Shapes
    default:
      return majorShapes
  }
}

// Calculate where each CAGED shape root falls for a given note
// Returns the fret position where each shape's root would be
export const getRootPositionsForNote = (
  noteIndex: number, // 0-11, where A=0
): Record<CAGEDShapeName, number> => {
  // Standard tuning open string notes (as note indices, A=0)
  // String 5 (low E) = 7 (E)
  // String 4 (A) = 0 (A)
  // String 3 (D) = 5 (D)
  const openNotes = {
    E: 7, // 6th string open = E
    A: 0, // 5th string open = A
    D: 5, // 4th string open = D (for D shape root)
  }

  // Calculate fret position for root on each string
  const eShapeRoot = (noteIndex - openNotes.E + 12) % 12
  const aShapeRoot = (noteIndex - openNotes.A + 12) % 12
  const dShapeRoot = (noteIndex - openNotes.D + 12) % 12

  // G shape root is on 6th string, same as E shape
  // C shape root is on 5th string, same as A shape

  return {
    E: eShapeRoot === 0 ? 0 : eShapeRoot,
    A: aShapeRoot === 0 ? 0 : aShapeRoot,
    G: eShapeRoot === 0 ? 0 : eShapeRoot,
    D: dShapeRoot === 0 ? 0 : dShapeRoot,
    C: aShapeRoot === 0 ? 0 : aShapeRoot,
  }
}

// Find the best shape for a given position and note
export const findShapeForPosition = (
  noteIndex: number,
  position: number,
  chordType: ChordShapeType,
): { shape: ShapeDefinition; rootFret: number } | null => {
  const shapes = getShapesForType(chordType)
  const rootPositions = getRootPositionsForNote(noteIndex)

  // Find shapes where the root fret is close to the requested position
  const candidates: { shape: ShapeDefinition; rootFret: number; distance: number }[] = []

  for (const shape of shapes) {
    const baseRootFret = rootPositions[shape.name]

    // Check this position and one octave up (12 frets higher)
    for (const octaveOffset of [0, 12]) {
      const rootFret = baseRootFret + octaveOffset

      // Adjust for C shape where root is above the lowest fret
      const lowestFret = rootFret - shape.rootOffset

      // Skip if the shape would go below the nut
      if (lowestFret < 0) continue

      // Skip if beyond reasonable fret range
      if (rootFret > 15) continue

      const distance = Math.abs(lowestFret - position)

      // Only include if within 3 frets of requested position
      if (distance <= 3) {
        candidates.push({ shape, rootFret, distance })
      }
    }
  }

  // If no candidates found, try with extended range (for chords like G# at position 0)
  if (candidates.length === 0) {
    for (const shape of shapes) {
      const baseRootFret = rootPositions[shape.name]

      for (const octaveOffset of [0, 12]) {
        const rootFret = baseRootFret + octaveOffset
        const lowestFret = rootFret - shape.rootOffset

        if (lowestFret < 0) continue
        if (rootFret > 15) continue

        const distance = Math.abs(lowestFret - position)

        // Extended range - find nearest shape
        if (distance <= 6) {
          candidates.push({ shape, rootFret, distance })
        }
      }
    }
  }

  if (candidates.length === 0) return null

  // Sort by distance to position, prefer E and A shapes
  candidates.sort((a, b) => {
    if (a.distance !== b.distance) return a.distance - b.distance
    // Prefer E > A > D > G > C for playability
    const priority: Record<CAGEDShapeName, number> = { E: 0, A: 1, D: 2, G: 3, C: 4 }
    return priority[a.shape.name] - priority[b.shape.name]
  })

  return { shape: candidates[0].shape, rootFret: candidates[0].rootFret }
}

// Convert a shape to actual fret positions
export const shapeToFretPositions = (
  shape: ShapeDefinition,
  rootFret: number,
): (number | null)[] => {
  const lowestFret = rootFret - shape.rootOffset

  return shape.offsets.map((offset) => {
    if (offset === null) return null
    return lowestFret + offset
  })
}
