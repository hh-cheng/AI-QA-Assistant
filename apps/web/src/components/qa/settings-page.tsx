'use client'

import { Button } from '@Intelligent-QA-Assistant/ui/components/button'
import { Label } from '@Intelligent-QA-Assistant/ui/components/label'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Brain, CheckCircle2, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { queryClient, trpc } from '@/utils/trpc'

import { Badge } from './badge'

function providerBadge(status: 'connected' | 'not_configured') {
  switch (status) {
    case 'connected':
      return 'success'
    default:
      return 'secondary'
  }
}

export default function QaSettingsPage() {
  const modelsQuery = useQuery(trpc.qa.settings.getModels.queryOptions())
  const updateModel = useMutation(
    trpc.qa.settings.updateModel.mutationOptions(),
  )
  const [selectedModelId, setSelectedModelId] = useState('')

  useEffect(() => {
    if (modelsQuery.data?.selectedModelId) {
      setSelectedModelId(modelsQuery.data.selectedModelId)
    }
  }, [modelsQuery.data?.selectedModelId])

  const saveModel = async () => {
    if (!selectedModelId) return
    await updateModel.mutateAsync({
      modelId: selectedModelId,
    })
    toast.success('Model preference updated')
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
                Supported models
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Model choices come from the backend allowlist. Provider keys and
                advanced parameters stay server-side.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {modelsQuery.data?.options.map((option) => (
            <label
              key={option.id}
              className="qa-glass-card-hover flex cursor-pointer gap-4 rounded-[2rem] p-5 text-left"
            >
              <input
                type="radio"
                name="model"
                value={option.id}
                checked={selectedModelId === option.id}
                onChange={() => setSelectedModelId(option.id)}
                className="mt-1 size-4 accent-primary"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="rounded-3xl bg-secondary/40 p-3">
                    <Brain className="size-5" />
                  </div>
                  <Badge variant={providerBadge(option.status)}>
                    {option.status}
                  </Badge>
                </div>
                <h3 className="mt-4 text-lg font-medium">{option.model}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {option.provider}
                </p>
              </div>
            </label>
          ))}
        </div>
      </section>

      <section className="qa-glass-card rounded-[2rem] p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-3xl bg-accent/12 p-3 text-accent">
            <Brain className="size-5" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Active model
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Your selected model will be used for document-grounded answers.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="selected-model">Selected model</Label>
            <select
              id="selected-model"
              value={selectedModelId}
              onChange={(event) => setSelectedModelId(event.target.value)}
              className="h-12 w-full rounded-2xl border border-border/70 bg-secondary/20 px-4 text-sm"
            >
              {modelsQuery.data?.options.map((option) => (
                <option
                  key={option.id}
                  value={option.id}
                  disabled={option.status !== 'connected'}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-[1.5rem] border border-border/70 bg-secondary/20 px-4 py-3 text-sm text-muted-foreground">
            Temperature, timeout, token limit, base URL, and API key controls
            are intentionally hidden. The backend owns those settings.
          </div>

          <Button
            type="button"
            className="w-full rounded-full"
            onClick={() => void saveModel()}
            disabled={updateModel.isPending || !selectedModelId}
          >
            {updateModel.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CheckCircle2 className="size-4" />
            )}
            Save model preference
          </Button>
        </div>
      </section>
    </div>
  )
}
