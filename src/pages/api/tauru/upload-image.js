import withCors from '../../../lib/cors'
import { createImageUploadHandler } from '../../../lib/blobUpload'

/**
 * POST /api/tauru/upload-image  (multipart, field "image")
 * Same storage account as /api/upload-image, but the "tauruimage" container.
 */
export const config = {
  api: {
    bodyParser: false,
  },
}

export default withCors(createImageUploadHandler(() => 'tauruimage'))
