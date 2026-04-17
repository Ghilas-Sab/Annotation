export interface Annotation {
  frame_number: number
}

const FALLBACK = 10

export const getInterAnnotationStep = (
  currentFrame: number,
  annotations: Annotation[]
): number => {
  if (annotations.length < 2) return FALLBACK

  const sorted = [...annotations].sort((a, b) => a.frame_number - b.frame_number)
  const left = sorted.filter(a => a.frame_number <= currentFrame)

  if (left.length >= 2) {
    const prev = left[left.length - 1]
    const prevPrev = left[left.length - 2]
    const step = prev.frame_number - prevPrev.frame_number
    return step > 0 ? step : FALLBACK
  }

  // Moins de 2 annotations avant la position → fallback
  return FALLBACK
}
