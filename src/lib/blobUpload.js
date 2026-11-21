import { BlobServiceClient } from '@azure/storage-blob'
import formidable from 'formidable'
import sharp from 'sharp'

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif', 'bmp', 'tif', 'tiff'])

const MIME_BY_EXTENSION = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
  gif: 'image/gif', heic: 'image/heic', heif: 'image/heif', bmp: 'image/bmp',
  tif: 'image/tiff', tiff: 'image/tiff',
  mp4: 'video/mp4', m4v: 'video/x-m4v', mov: 'video/quicktime', '3gp': 'video/3gpp',
  webm: 'video/webm', mkv: 'video/x-matroska', avi: 'video/x-msvideo',
  pdf: 'application/pdf',
}

/**
 * Builds an API handler that accepts a multipart upload (field "image" or
 * "file") and stores it in the given Azure Blob container.
 * Routes using it must export `config = { api: { bodyParser: false } }`.
 *
 * Images are compressed with sharp. With `allowAnyFile: true`, other files
 * (videos, PDFs) are stored as-is.
 *
 * Response: { imageUrl, blobName, path } where `path` = '<container>/<blobName>'
 * is what should be stored in the database (served from the CDN root).
 */
export function createImageUploadHandler(getContainerName, { allowAnyFile = false, maxFileSizeMb = 200 } = {}) {
  return async function handler(req, res) {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING
    const containerName = getContainerName()

    if (!connectionString) {
      return res.status(500).json({ error: 'Azure Storage Connection String is not configured in .env' })
    }

    const form = formidable({ multiples: false, maxFileSize: maxFileSizeMb * 1024 * 1024 })

    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error('Error parsing form:', err)
        return res.status(500).json({ error: 'Failed to process file upload' })
      }

      // `image` is the expected form field name containing the file
      const fileField = files.image || files.file
      if (!fileField) {
        return res.status(400).json({ error: 'No image file provided in form data under "image" or "file" key' })
      }

      // formidable parses file as array or single object depending on the version
      const uploadedFile = Array.isArray(fileField) ? fileField[0] : fileField

      const extension = (uploadedFile.originalFilename?.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin'
      let contentType = uploadedFile.mimetype
      if (!contentType || contentType === 'application/octet-stream') {
        contentType = MIME_BY_EXTENSION[extension] || 'application/octet-stream'
      }
      const isImage = contentType.startsWith('image/') || IMAGE_EXTENSIONS.has(extension)

      if (!isImage && !allowAnyFile) {
        return res.status(400).json({ error: 'Only image files are allowed' })
      }

      try {
        const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString)
        const containerClient = blobServiceClient.getContainerClient(containerName)

        // Create container if it doesn't exist (allow public read access for images)
        await containerClient.createIfNotExists({ access: 'blob' })

        // Create a unique blob name to avoid overwriting
        const blobName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`
        const blockBlobClient = containerClient.getBlockBlobClient(blobName)
        const filePath = uploadedFile.filepath || uploadedFile.path
        const blobHTTPHeaders = { blobContentType: contentType }

        let compressed = null
        if (isImage) {
          try {
            compressed = await sharp(filePath)
              .jpeg({ quality: 80, force: false })
              .png({ quality: 80, force: false })
              .webp({ quality: 80, force: false })
              .toBuffer()
          } catch (e) {
            // Format sharp can't read (e.g. HEIC without libheif): keep the original.
            if (!allowAnyFile) throw e
            console.warn('sharp could not compress, uploading original:', e.message)
          }
        }

        if (compressed) {
          await blockBlobClient.uploadData(compressed, { blobHTTPHeaders })
        } else {
          await blockBlobClient.uploadFile(filePath, { blobHTTPHeaders })
        }

        return res.status(200).json({
          message: isImage ? 'Image uploaded successfully' : 'File uploaded successfully',
          imageUrl: blockBlobClient.url,
          blobName,
          path: `${containerName}/${blobName}`,
        })
      } catch (error) {
        console.error('Azure Upload Error:', error)
        return res.status(500).json({ error: 'Failed to upload image to Azure', details: error.message })
      }
    })
  }
}
