import { BlobServiceClient, BlobSASPermissions } from '@azure/storage-blob'

const MIME_BY_EXTENSION = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
  gif: 'image/gif', heic: 'image/heic', heif: 'image/heif',
  mp4: 'video/mp4', m4v: 'video/x-m4v', mov: 'video/quicktime', '3gp': 'video/3gpp',
  webm: 'video/webm', mkv: 'video/x-matroska', avi: 'video/x-msvideo',
  pdf: 'application/pdf',
}

const SAS_MINUTES = 30

let serviceClient = null
const ensuredContainers = new Set()

function getServiceClient() {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING
  if (!connectionString) throw new Error('AZURE_STORAGE_CONNECTION_STRING is not configured')
  // Must be built from a connection string with an AccountKey so it can sign SAS URLs.
  serviceClient ??= BlobServiceClient.fromConnectionString(connectionString)
  return serviceClient
}

/**
 * Builds an API handler that returns a short-lived, write-only SAS URL so the
 * client can PUT the file straight to Azure Blob Storage. This avoids sending
 * the file through Vercel (whose request body limit is ~4.5 MB and caused 413s).
 *
 * POST JSON { fileName: 'video.mp4', contentType?: 'video/mp4' }
 * Response: { uploadUrl, path, blobName, contentType, expiresOn }
 *
 * Client then uploads with:
 *   PUT <uploadUrl>
 *   x-ms-blob-type: BlockBlob
 *   Content-Type: <contentType>
 *   <raw file bytes>
 * and stores only `path` (e.g. 'streetvending/1732...-ab12.mp4') in the database.
 */
export function createSasUploadHandler(getContainerName) {
  return async function handler(req, res) {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    const { fileName = '', contentType: requestedType } = req.body || {}
    const extension = (String(fileName).split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '')
    if (!extension || !MIME_BY_EXTENSION[extension]) {
      return res.status(400).json({ error: 'Unsupported file type' })
    }
    const contentType = typeof requestedType === 'string' && /^[\w.+-]+\/[\w.+-]+$/.test(requestedType)
      ? requestedType
      : MIME_BY_EXTENSION[extension]

    try {
      const containerName = getContainerName()
      const containerClient = getServiceClient().getContainerClient(containerName)
      if (!ensuredContainers.has(containerName)) {
        await containerClient.createIfNotExists({ access: 'blob' })
        ensuredContainers.add(containerName)
      }

      const blobName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${extension}`
      const blobClient = containerClient.getBlockBlobClient(blobName)
      const expiresOn = new Date(Date.now() + SAS_MINUTES * 60 * 1000)

      const uploadUrl = await blobClient.generateSasUrl({
        permissions: BlobSASPermissions.parse('cw'), // create + write only, this one blob
        startsOn: new Date(Date.now() - 5 * 60 * 1000), // tolerate device clock skew
        expiresOn,
        contentType,
      })

      return res.status(200).json({
        uploadUrl,
        path: `${containerName}/${blobName}`,
        blobName,
        contentType,
        expiresOn: expiresOn.toISOString(),
      })
    } catch (err) {
      console.error('SAS generation error:', err)
      return res.status(500).json({ error: 'Failed to create upload URL', details: err.message })
    }
  }
}
