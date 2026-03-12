'use client'

import { Button } from '@Intelligent-QA-Assistant/ui/components/button'
import { Input } from '@Intelligent-QA-Assistant/ui/components/input'
import { Label } from '@Intelligent-QA-Assistant/ui/components/label'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  Brain,
  CheckCircle2,
  Loader2,
  Settings,
  SlidersHorizontal,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { queryClient, trpc } from '@/utils/trpc'

import { Badge } from './badge'
import { Sheet } from './sheet'

type ProviderDraft = {
  id: string
  name: string
  desc: string
  status: 'connected' | 'not_configured' | 'failed'
  config: {
    apiKey?: string
    baseUrl?: string
    model?: string
    temperature?: number
    maxTokens?: number
    timeout?: number
    isDefault?: boolean
  }
}

function providerBadge(status: ProviderDraft['status']) {
  switch (status) {
    case 'connected':
      return 'success'
    case 'failed':
      return 'destructive'
    default:
      return 'secondary'
  }
}

export default function QaSettingsPage() {
  const providersQuery = useQuery(trpc.qa.settings.getProviders.queryOptions())
  const defaultsQuery = useQuery(trpc.qa.settings.getDefaults.queryOptions())
  const updateProvider = useMutation(
    trpc.qa.settings.updateProvider.mutationOptions(),
  )
  const updateDefaults = useMutation(
    trpc.qa.settings.updateDefaults.mutationOptions(),
  )

  const [selectedProvider, setSelectedProvider] =
    useState<ProviderDraft | null>(null)
  const [defaults, setDefaults] = useState({
    defaultModel: 'gpt-4o',
    contextTurns: '10',
    showCitations: true,
    defaultLength: 'standard' as 'concise' | 'standard' | 'detailed',
    chunkStrategy: 'recursive' as 'recursive' | 'sentence' | 'paragraph',
    chunkSize: 512,
    embeddingModel: 'text-embedding-3-small',
    topK: 5,
  })

  useEffect(() => {
    if (defaultsQuery.data) {
      setDefaults(defaultsQuery.data)
    }
  }, [defaultsQuery.data])

  const saveProvider = async () => {
    if (!selectedProvider) return
    await updateProvider.mutateAsync({
      id: selectedProvider.id,
      status: selectedProvider.status,
      config: selectedProvider.config,
    })
    toast.success(`${selectedProvider.name} updated`)
    setSelectedProvider(null)
    await queryClient.invalidateQueries()
  }

  const saveDefaults = async () => {
    await updateDefaults.mutateAsync(defaults)
    toast.success('Default settings saved')
    await queryClient.invalidateQueries()
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
      <section className="space-y-4">
        <div className="qa-glass-card rounded-[2rem] p-6">
          <div className="flex items-start gap-3">
            <div className="rounded-3xl bg-primary/10 p-3 text-primary">
              <Brain className="size-5" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">
                AI providers
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                These settings come from <code>qa.settings</code> mock
                procedures, so the UI is no longer coupled to local component
                constants.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {providersQuery.data?.map((provider) => (
            <button
              key={provider.id}
              type="button"
              className="qa-glass-card-hover rounded-[2rem] p-5 text-left"
              onClick={() => setSelectedProvider(provider)}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="rounded-3xl bg-secondary/40 p-3">
                  <Brain className="size-5" />
                </div>
                <Badge variant={providerBadge(provider.status)}>
                  {provider.status}
                </Badge>
              </div>
              <h3 className="mt-4 text-lg font-medium">{provider.name}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {provider.desc}
              </p>
            </button>
          ))}
        </div>
      </section>

      <section className="qa-glass-card rounded-[2rem] p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-3xl bg-accent/12 p-3 text-accent">
            <SlidersHorizontal className="size-5" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Defaults</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Retrieval and response defaults for the migrated experience.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="default-model">Default model</Label>
            <Input
              id="default-model"
              value={defaults.defaultModel}
              onChange={(event) =>
                setDefaults((current) => ({
                  ...current,
                  defaultModel: event.target.value,
                }))
              }
              className="rounded-2xl border-border/70 bg-secondary/20"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="context-turns">Context turns</Label>
              <Input
                id="context-turns"
                value={defaults.contextTurns}
                onChange={(event) =>
                  setDefaults((current) => ({
                    ...current,
                    contextTurns: event.target.value,
                  }))
                }
                className="rounded-2xl border-border/70 bg-secondary/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="response-length">Default response length</Label>
              <select
                id="response-length"
                value={defaults.defaultLength}
                onChange={(event) =>
                  setDefaults((current) => ({
                    ...current,
                    defaultLength: event.target
                      .value as typeof defaults.defaultLength,
                  }))
                }
                className="h-10 w-full rounded-2xl border border-border/70 bg-secondary/20 px-4 text-sm"
              >
                <option value="concise">Concise</option>
                <option value="standard">Standard</option>
                <option value="detailed">Detailed</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="chunk-strategy">Chunk strategy</Label>
              <select
                id="chunk-strategy"
                value={defaults.chunkStrategy}
                onChange={(event) =>
                  setDefaults((current) => ({
                    ...current,
                    chunkStrategy: event.target
                      .value as typeof defaults.chunkStrategy,
                  }))
                }
                className="h-10 w-full rounded-2xl border border-border/70 bg-secondary/20 px-4 text-sm"
              >
                <option value="recursive">Recursive</option>
                <option value="sentence">Sentence</option>
                <option value="paragraph">Paragraph</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="embedding-model">Embedding model</Label>
              <Input
                id="embedding-model"
                value={defaults.embeddingModel}
                onChange={(event) =>
                  setDefaults((current) => ({
                    ...current,
                    embeddingModel: event.target.value,
                  }))
                }
                className="rounded-2xl border-border/70 bg-secondary/20"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="chunk-size">Chunk size</Label>
              <Input
                id="chunk-size"
                type="number"
                value={defaults.chunkSize}
                onChange={(event) =>
                  setDefaults((current) => ({
                    ...current,
                    chunkSize: Number(event.target.value),
                  }))
                }
                className="rounded-2xl border-border/70 bg-secondary/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="top-k">Top K</Label>
              <Input
                id="top-k"
                type="number"
                value={defaults.topK}
                onChange={(event) =>
                  setDefaults((current) => ({
                    ...current,
                    topK: Number(event.target.value),
                  }))
                }
                className="rounded-2xl border-border/70 bg-secondary/20"
              />
            </div>
          </div>

          <label className="flex items-center justify-between rounded-[1.5rem] border border-border/70 bg-secondary/20 px-4 py-3">
            <span className="text-sm font-medium">
              Show citations by default
            </span>
            <input
              type="checkbox"
              checked={defaults.showCitations}
              onChange={(event) =>
                setDefaults((current) => ({
                  ...current,
                  showCitations: event.target.checked,
                }))
              }
              className="size-4 accent-primary"
            />
          </label>

          <Button
            type="button"
            className="w-full rounded-full"
            onClick={() => void saveDefaults()}
            disabled={updateDefaults.isPending}
          >
            {updateDefaults.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CheckCircle2 className="size-4" />
            )}
            Save defaults
          </Button>
        </div>
      </section>

      <Sheet
        open={Boolean(selectedProvider)}
        title={selectedProvider?.name ?? 'Provider'}
        description={selectedProvider?.desc}
        onClose={() => setSelectedProvider(null)}
      >
        {selectedProvider ? (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="provider-model">Model</Label>
              <Input
                id="provider-model"
                value={selectedProvider.config.model ?? ''}
                onChange={(event) =>
                  setSelectedProvider((current) =>
                    current
                      ? {
                          ...current,
                          config: {
                            ...current.config,
                            model: event.target.value,
                          },
                        }
                      : current,
                  )
                }
                className="rounded-2xl border-border/70 bg-secondary/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="provider-base-url">Base URL</Label>
              <Input
                id="provider-base-url"
                value={selectedProvider.config.baseUrl ?? ''}
                onChange={(event) =>
                  setSelectedProvider((current) =>
                    current
                      ? {
                          ...current,
                          config: {
                            ...current.config,
                            baseUrl: event.target.value,
                          },
                        }
                      : current,
                  )
                }
                className="rounded-2xl border-border/70 bg-secondary/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="provider-api-key">API key</Label>
              <Input
                id="provider-api-key"
                value={selectedProvider.config.apiKey ?? ''}
                onChange={(event) =>
                  setSelectedProvider((current) =>
                    current
                      ? {
                          ...current,
                          config: {
                            ...current.config,
                            apiKey: event.target.value,
                          },
                        }
                      : current,
                  )
                }
                className="rounded-2xl border-border/70 bg-secondary/20"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="provider-temperature">Temperature</Label>
                <Input
                  id="provider-temperature"
                  type="number"
                  step="0.1"
                  value={selectedProvider.config.temperature ?? 0}
                  onChange={(event) =>
                    setSelectedProvider((current) =>
                      current
                        ? {
                            ...current,
                            config: {
                              ...current.config,
                              temperature: Number(event.target.value),
                            },
                          }
                        : current,
                    )
                  }
                  className="rounded-2xl border-border/70 bg-secondary/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="provider-timeout">Timeout</Label>
                <Input
                  id="provider-timeout"
                  type="number"
                  value={selectedProvider.config.timeout ?? 0}
                  onChange={(event) =>
                    setSelectedProvider((current) =>
                      current
                        ? {
                            ...current,
                            config: {
                              ...current.config,
                              timeout: Number(event.target.value),
                            },
                          }
                        : current,
                    )
                  }
                  className="rounded-2xl border-border/70 bg-secondary/20"
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-[1.5rem] border border-border/70 bg-secondary/20 px-4 py-3">
              <div>
                <p className="text-sm font-medium">Connection state</p>
                <p className="text-xs text-muted-foreground">
                  Controls the badge shown in the provider grid.
                </p>
              </div>
              <select
                value={selectedProvider.status}
                onChange={(event) =>
                  setSelectedProvider((current) =>
                    current
                      ? {
                          ...current,
                          status: event.target.value as ProviderDraft['status'],
                        }
                      : current,
                  )
                }
                className="h-10 rounded-full border border-border/70 bg-background/60 px-4 text-sm"
              >
                <option value="connected">Connected</option>
                <option value="not_configured">Not configured</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            <Button
              type="button"
              className="w-full rounded-full"
              onClick={() => void saveProvider()}
              disabled={updateProvider.isPending}
            >
              {updateProvider.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Settings className="size-4" />
              )}
              Save provider
            </Button>
          </div>
        ) : null}
      </Sheet>
    </div>
  )
}
