import { describe, expect, it } from 'vitest'
import type { EventFormValues } from './event'
import { validateEvent } from './event-validation'

function validFormValues(
  overrides: Partial<EventFormValues> = {},
): EventFormValues {
  return {
    name: 'Team standup',
    type: 'meeting',
    startDate: '2026-09-21T09:00',
    endDate: '2026-09-21T10:00',
    ...overrides,
  }
}

describe('validateEvent', () => {
  it('accepts a valid event', () => {
    expect(validateEvent(validFormValues())).toEqual({})
  })

  it('rejects a blank name', () => {
    const errors = validateEvent(validFormValues({ name: '' }))

    expect(errors.name).toBeDefined()
    expect(errors.startDate).toBeUndefined()
    expect(errors.endDate).toBeUndefined()
  })

  it('rejects a whitespace-only name', () => {
    const errors = validateEvent(validFormValues({ name: '   ' }))

    expect(errors.name).toBeDefined()
  })

  it('accepts an 80-character name', () => {
    expect(validateEvent(validFormValues({ name: 'a'.repeat(80) }))).toEqual({})
  })

  it('rejects an 81-character name', () => {
    const errors = validateEvent(validFormValues({ name: 'a'.repeat(81) }))

    expect(errors.name).toBeDefined()
  })

  it('rejects a missing start date', () => {
    const errors = validateEvent(validFormValues({ startDate: '' }))

    expect(errors.startDate).toBeDefined()
  })

  it('rejects an invalid start date without throwing', () => {
    const values = validFormValues({ startDate: 'not-a-date' })

    expect(() => validateEvent(values)).not.toThrow()
    expect(validateEvent(values).startDate).toBeDefined()
  })

  it('rejects a missing end date', () => {
    const errors = validateEvent(validFormValues({ endDate: '' }))

    expect(errors.endDate).toBeDefined()
  })

  it('rejects an invalid end date without throwing', () => {
    const values = validFormValues({ endDate: 'not-a-date' })

    expect(() => validateEvent(values)).not.toThrow()
    expect(validateEvent(values).endDate).toBeDefined()
  })

  it('rejects an end date equal to the start date', () => {
    const errors = validateEvent(
      validFormValues({
        startDate: '2026-09-21T09:00',
        endDate: '2026-09-21T09:00',
      }),
    )

    expect(errors.endDate).toBeDefined()
  })

  it('rejects an end date before the start date', () => {
    const errors = validateEvent(
      validFormValues({
        startDate: '2026-09-21T10:00',
        endDate: '2026-09-21T09:00',
      }),
    )

    expect(errors.endDate).toBeDefined()
  })

  it('does not mutate the input object', () => {
    const values = validFormValues({ name: '  Review  ' })
    const original = { ...values }

    validateEvent(values)

    expect(values).toEqual(original)
  })
})
