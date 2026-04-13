export interface Annotation {
  frame_number: number
}

const FALLBACK = 10

export const getInterAnnotationStep = (
  currentFrame: number,
  annotations: Annotation[]
): number => {
  const sorted = [...annotations].sort((a, b) => a.frame_number - b.frame_number)
  const left = sorted.filter(a => a.frame_number < currentFrame)
  if (left.length < 2) return FALLBACK
  const prev = left[left.length - 1]
  const prevPrev = left[left.length - 2]
  return prev.frame_number - prevPrev.frame_number
}
