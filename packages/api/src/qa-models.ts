import { env } from '@Intelligent-QA-Assistant/env/server'

import type { ModelOption } from './qa'

type ParsedModel = {
  id: string
  provider: string
  model: string
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function formatProviderLabel(provider: string) {
  switch (provider) {
    case 'openai':
      return 'OpenAI'
    case 'deepseek':
      return 'DeepSeek'
    default:
      return titleCase(provider)
  }
}

function parseModel(raw: string): ParsedModel {
  const [provider, ...modelParts] = raw.split(':')
  const model = modelParts.join(':').trim()
  if (!provider || !model) {
    throw new Error(`Invalid QA_ALLOWED_MODELS entry: ${raw}`)
  }
  return {
    id: `${provider}:${model}`,
    provider,
    model,
  }
}

export function getAllowedModelEntries() {
  return env.QA_ALLOWED_MODELS.split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .map(parseModel)
}

export function getDefaultModelEntry() {
  return parseModel(env.QA_DEFAULT_MODEL)
}

function getProviderCapabilities(provider: string) {
  switch (provider) {
    case 'openai':
      return {
        streaming: true,
        embeddings: true,
      }
    case 'deepseek':
      return {
        streaming: true,
        embeddings: false,
      }
    default:
      return {
        streaming: false,
        embeddings: false,
      }
  }
}

function isProviderConfigured(provider: string) {
  switch (provider) {
    case 'openai':
      return Boolean(env.OPENAI_API_KEY)
    case 'deepseek':
      return Boolean(env.DEEPSEEK_API_KEY)
    default:
      return false
  }
}

export function getConfiguredModelOptions(): ModelOption[] {
  return getAllowedModelEntries().map((entry) => ({
    id: entry.id,
    provider: entry.provider,
    model: entry.model,
    label: `${formatProviderLabel(entry.provider)} · ${entry.model}`,
    status: isProviderConfigured(entry.provider)
      ? 'connected'
      : 'not_configured',
    capabilities: getProviderCapabilities(entry.provider),
  }))
}

export function requireSupportedModel(modelId: string) {
  const option = getConfiguredModelOptions().find((item) => item.id === modelId)
  if (!option) {
    throw new Error(`Unsupported model: ${modelId}`)
  }
  if (option.status !== 'connected') {
    throw new Error(`Model is not configured: ${modelId}`)
  }
  return option
}
