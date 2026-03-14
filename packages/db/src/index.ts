import { env } from '@Intelligent-QA-Assistant/env/server'
import { drizzle } from 'drizzle-orm/node-postgres'

import * as schema from './schema/index'

export const db = drizzle(env.DATABASE_URL, { schema })
