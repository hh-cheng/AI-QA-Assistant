import { env } from '@Intelligent-QA-Assistant/env/server'
import { Client } from 'minio'

const minioClient = new Client({
  endPoint: env.OBJECT_STORAGE_ENDPOINT,
  port: env.OBJECT_STORAGE_PORT,
  accessKey: env.OBJECT_STORAGE_ACCESS_KEY,
  secretKey: env.OBJECT_STORAGE_SECRET_KEY,
  useSSL: env.OBJECT_STORAGE_USE_SSL,
})

let bucketReady: Promise<void> | null = null

export function getObjectStorageBucket() {
  return env.OBJECT_STORAGE_BUCKET
}

export async function ensureObjectStorageBucket() {
  if (bucketReady) {
    return bucketReady
  }

  bucketReady = (async () => {
    const bucket = getObjectStorageBucket()
    const exists = await minioClient.bucketExists(bucket)
    if (!exists) {
      await minioClient.makeBucket(bucket)
    }
  })()

  await bucketReady
}

export async function storeDocumentObject(input: {
  storageKey: string
  body: Buffer
  contentType: string
}) {
  await ensureObjectStorageBucket()
  await minioClient.putObject(
    getObjectStorageBucket(),
    input.storageKey,
    input.body,
    input.body.length,
    {
      'Content-Type': input.contentType,
    },
  )
}

export async function readDocumentObject(storageKey: string) {
  await ensureObjectStorageBucket()
  const stream = await minioClient.getObject(
    getObjectStorageBucket(),
    storageKey,
  )
  const chunks: Buffer[] = []

  await new Promise<void>((resolve, reject) => {
    stream.on('data', (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    })
    stream.on('error', reject)
    stream.on('end', () => resolve())
  })

  return Buffer.concat(chunks)
}

export async function removeDocumentObject(storageKey: string) {
  await ensureObjectStorageBucket()
  await minioClient.removeObject(getObjectStorageBucket(), storageKey)
}
