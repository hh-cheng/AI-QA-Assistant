import { toast } from 'sonner'
import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'

import { queryClient, trpc } from '@/utils/trpc'

export default function useSettingsPageService() {
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
    if (!selectedModelId) {
      return
    }

    await updateModel.mutateAsync({
      modelId: selectedModelId,
    })
    toast.success('Model preference updated')
    await queryClient.invalidateQueries()
  }

  return {
    saveModel,
    modelsQuery,
    selectedModelId,
    setSelectedModelId,
    isSaving: updateModel.isPending,
  }
}
