function describeCause(cause: unknown) {
  if (cause instanceof Error) {
    const code =
      'code' in cause && typeof cause.code === 'string' ? cause.code : undefined
    return code ? `${code}: ${cause.message}` : cause.message
  }

  return typeof cause === 'string' ? cause : undefined
}

export function describeOpenAIError(error: unknown, operation: string) {
  const proxyDetails =
    process.env.HTTPS_PROXY ??
    process.env.https_proxy ??
    process.env.HTTP_PROXY ??
    process.env.http_proxy ??
    process.env.ALL_PROXY ??
    process.env.all_proxy

  if (error instanceof Error) {
    const cause = 'cause' in error ? describeCause(error.cause) : undefined

    if (error.message === 'Connection error.' || cause?.includes('ENOTFOUND')) {
      return proxyDetails
        ? `OpenAI ${operation} failed: network connection to api.openai.com could not be established while using proxy ${proxyDetails}. ${cause ?? error.message}`
        : `OpenAI ${operation} failed: network connection to api.openai.com could not be established. ${cause ?? error.message}`
    }

    if (error.message === 'Request timed out.') {
      return proxyDetails
        ? `OpenAI ${operation} failed: request timed out after 30000ms while using proxy ${proxyDetails}. This indicates the proxy path accepted the request but did not complete the upstream call to api.openai.com in time.`
        : `OpenAI ${operation} failed: request timed out after 30000ms.`
    }

    if (error.message) {
      return cause
        ? `OpenAI ${operation} failed: ${error.message} (${cause})`
        : `OpenAI ${operation} failed: ${error.message}`
    }
  }

  return `OpenAI ${operation} failed: ${String(error)}`
}
