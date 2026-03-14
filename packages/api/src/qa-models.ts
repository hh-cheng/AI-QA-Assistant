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

export function getConfiguredModelOptions(): ModelOption[] {
  return getAllowedModelEntries().map((entry) => {
    const enabled =
      entry.provider === 'openai'
        ? Boolean(env.OPENAI_API_KEY)
        : entry.provider === 'anthropic'
          ? Boolean(env.ANTHROPIC_API_KEY)
          : false

    return {
      id: entry.id,
      provider: entry.provider,
      model: entry.model,
      label: `${titleCase(entry.provider)} · ${entry.model}`,
      status: enabled ? 'connected' : 'not_configured',
    }
  })
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
