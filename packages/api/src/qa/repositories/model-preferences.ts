import { db } from '@Intelligent-QA-Assistant/db'
import { qaUserModelPreferences } from '@Intelligent-QA-Assistant/db/schema'

import type { UserModelPreferencesRepository } from '@Intelligent-QA-Assistant/ai'
import { getDefaultModelEntry, requireSupportedModel } from '../../qa-models'

export const userModelPreferencesRepository: UserModelPreferencesRepository = {
  async getSelectedModelId(userId) {
    const preference = await db.query.qaUserModelPreferences.findFirst({
      where: (table, { eq }) => eq(table.userId, userId),
    })

    if (preference) {
      return `${preference.provider}:${preference.model}`
    }

    return getDefaultModelEntry().id
  },
}

export async function updateUserModelPreference(input: {
  userId: string
  modelId: string
}) {
  const option = requireSupportedModel(input.modelId)
  const now = new Date()

  await db
    .insert(qaUserModelPreferences)
    .values({
      userId: input.userId,
      provider: option.provider,
      model: option.model,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: qaUserModelPreferences.userId,
      set: {
        provider: option.provider,
        model: option.model,
        updatedAt: now,
      },
    })

  return {
    option,
    updatedAt: now,
  }
}
