import OpenAI from 'openai'
import {
  EnvHttpProxyAgent,
  ProxyAgent,
  Socks5ProxyAgent,
  fetch as undiciFetch,
} from 'undici'

const OPENAI_TIMEOUT_MS = 30_000

function resolveProxyUrl() {
  return (
    process.env.HTTPS_PROXY ??
    process.env.https_proxy ??
    process.env.HTTP_PROXY ??
    process.env.http_proxy ??
    process.env.ALL_PROXY ??
    process.env.all_proxy
  )
}

function createDispatcher() {
  const explicitProxyUrl = resolveProxyUrl()
  if (explicitProxyUrl) {
    return new ProxyAgent(explicitProxyUrl)
  }

  const socksProxyUrl = process.env.ALL_PROXY ?? process.env.all_proxy
  if (
    socksProxyUrl &&
    (socksProxyUrl.startsWith('socks5://') ||
      socksProxyUrl.startsWith('socks://'))
  ) {
    return new Socks5ProxyAgent(socksProxyUrl)
  }

  const envProxyConfigured =
    process.env.HTTP_PROXY ??
    process.env.HTTPS_PROXY ??
    process.env.http_proxy ??
    process.env.https_proxy

  if (!envProxyConfigured) {
    return undefined
  }

  return new EnvHttpProxyAgent()
}

export function createOpenAICompatibleClient(input: {
  apiKey: string
  baseURL?: string
}) {
  const dispatcher = createDispatcher()
  const fetchWithDispatcher: typeof fetch = (url, init) =>
    undiciFetch(
      url as never,
      {
        ...(init ?? {}),
        dispatcher,
      } as never,
    ) as never

  return new OpenAI({
    apiKey: input.apiKey,
    baseURL: input.baseURL,
    timeout: OPENAI_TIMEOUT_MS,
    maxRetries: 0,
    fetch: fetchWithDispatcher,
  })
}

export function createOpenAIClient(input: { apiKey: string }) {
  return createOpenAICompatibleClient(input)
}
