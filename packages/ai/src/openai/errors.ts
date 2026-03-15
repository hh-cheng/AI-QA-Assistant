function describeCause(cause: unknown) {
  if (cause instanceof Error) {
    const code =
      'code' in cause && typeof cause.code === 'string' ? cause.code : undefined
    return code ? `${code}: ${cause.message}` : cause.message
  }

  return typeof cause === 'string' ? cause : undefined
}

export function describeProviderError(input: {
  provider: string
  host: string
  operation: string
  error: unknown
}) {
  const proxyDetails =
    process.env.HTTPS_PROXY ??
    process.env.https_proxy ??
    process.env.HTTP_PROXY ??
    process.env.http_proxy ??
    process.env.ALL_PROXY ??
    process.env.all_proxy

  if (input.error instanceof Error) {
    const cause =
      'cause' in input.error ? describeCause(input.error.cause) : undefined

    if (
      input.error.message === 'Connection error.' ||
      cause?.includes('ENOTFOUND')
    ) {
      return proxyDetails
        ? `${input.provider} ${input.operation} failed: network connection to ${input.host} could not be established while using proxy ${proxyDetails}. ${cause ?? input.error.message}`
        : `${input.provider} ${input.operation} failed: network connection to ${input.host} could not be established. ${cause ?? input.error.message}`
    }

    if (input.error.message === 'Request timed out.') {
      return proxyDetails
        ? `${input.provider} ${input.operation} failed: request timed out after 30000ms while using proxy ${proxyDetails}. This indicates the proxy path accepted the request but did not complete the upstream call to ${input.host} in time.`
        : `${input.provider} ${input.operation} failed: request timed out after 30000ms.`
    }

    if (input.error.message) {
      return cause
        ? `${input.provider} ${input.operation} failed: ${input.error.message} (${cause})`
        : `${input.provider} ${input.operation} failed: ${input.error.message}`
    }
  }

  return `${input.provider} ${input.operation} failed: ${String(input.error)}`
}

export function describeOpenAIError(error: unknown, operation: string) {
  return describeProviderError({
    provider: 'OpenAI',
    host: 'api.openai.com',
    operation,
    error,
  })
}
