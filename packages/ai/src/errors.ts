function readStringField(value: unknown, field: string) {
  if (
    typeof value === 'object' &&
    value !== null &&
    field in value &&
    typeof value[field as keyof typeof value] === 'string'
  ) {
    return value[field as keyof typeof value] as string
  }

  return undefined
}

function stringifyFallback(error: unknown) {
  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return error.message
  }

  const directMessage = readStringField(error, 'message')
  if (directMessage) {
    return directMessage
  }

  const nestedError =
    typeof error === 'object' && error !== null && 'error' in error
      ? error.error
      : undefined
  if (nestedError instanceof Error) {
    return nestedError.message
  }

  const nestedMessage = readStringField(nestedError, 'message')
  if (nestedMessage) {
    return nestedMessage
  }

  const serialized = stringifyFallback(error)
  return serialized && serialized !== '{}' ? serialized : fallback
}
