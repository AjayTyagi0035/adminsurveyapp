import { BlobServiceClient } from '@azure/storage-blob'
import formidable from 'formidable'
import fs from 'fs'
import withCors from '../../lib/cors'

// Disable Next.js default body parser to allow formidable to handle multipart/form-data
export const config = {
  api: {
    bodyParser: false,
  },
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING
  const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'survey-images'

  if (!connectionString) {
    return res.status(500).json({ error: 'Azure Storage Connection String is not configured in .env' })
  }

  const form = formidable({ multiples: false })

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

    try {
      // Connect to Azure Storage
      const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString)
      const containerClient = blobServiceClient.getContainerClient(containerName)

      // Create container if it doesn't exist (allow public read access for images)
      await containerClient.createIfNotExists({ access: 'blob' })

      // Create a unique blob name to avoid overwriting
      const extension = uploadedFile.originalFilename?.split('.').pop() || 'jpg'
      const blobName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`
      
      const blockBlobClient = containerClient.getBlockBlobClient(blobName)

      // Read file into stream and upload
      const fileStream = fs.createReadStream(uploadedFile.filepath || uploadedFile.path)
      
      await blockBlobClient.uploadStream(fileStream, undefined, undefined, {
        blobHTTPHeaders: {
          blobContentType: uploadedFile.mimetype || 'image/jpeg'
        }
      })

      // Return the public URL to the uploaded blob
      return res.status(200).json({ 
        message: 'Image uploaded successfully',
        imageUrl: blockBlobClient.url,
        blobName: blobName
      })

    } catch (error) {
      console.error('Azure Upload Error:', error)
      return res.status(500).json({ error: 'Failed to upload image to Azure', details: error.message })
    }
  })
}

export default withCors(handler)