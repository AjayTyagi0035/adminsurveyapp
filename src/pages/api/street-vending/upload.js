import withCors from '../../../lib/cors'
import { createImageUploadHandler } from '../../../lib/blobUpload'
import { SV_CONTAINER } from '../../../lib/streetVending'

/**
 * POST /api/street-vending/upload  (multipart, field "file" or "image")
 * Same storage account as /api/upload-image, but the "streetvending" container.
 * Accepts photos, identity proofs, signature, video and PDF documents.
 * Store only the returned `path` (e.g. 'streetvending/1732...-ab12.jpg') in the
 * database; the full URL is https://cdn.omgauamrit.in/<path>.
 */
export const config = {
  api: {
    bodyParser: false,
  },
}

export default withCors(createImageUploadHandler(() => SV_CONTAINER, { allowAnyFile: true, maxFileSizeMb: 200 }))
