const TEXT_INPUT_TYPES = new Set([
  'date',
  'datetime-local',
  'email',
  'month',
  'number',
  'password',
  'search',
  'tel',
  'text',
  'time',
  'url',
  'week',
])

export const isTextEditingTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true

  const tag = target.tagName
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (tag !== 'INPUT') return false

  const type = (target as HTMLInputElement).type || 'text'
  return TEXT_INPUT_TYPES.has(type)
}

export const blurNonTextFocus = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return
  if (isTextEditingTarget(target)) return
  if (target === document.body || target === document.documentElement) return
  target.blur()
}
