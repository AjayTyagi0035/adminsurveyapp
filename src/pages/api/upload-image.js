import withCors from '../../lib/cors'
import { createImageUploadHandler } from '../../lib/blobUpload'

// Disable Next.js default body parser to allow formidable to handle multipart/form-data
export const config = {
  api: {
    bodyParser: false,
  },
}

export default withCors(
  createImageUploadHandler(() => process.env.AZURE_STORAGE_CONTAINER_NAME || 'survey-images')
)
