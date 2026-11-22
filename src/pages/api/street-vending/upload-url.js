import withCors from '../../../lib/cors'
import { createSasUploadHandler } from '../../../lib/blobSas'
import { SV_CONTAINER } from '../../../lib/streetVending'

/**
 * POST /api/street-vending/upload-url  JSON { fileName, contentType? }
 * Returns a short-lived SAS URL; the app PUTs the file directly to Azure
 * (no Vercel body-size limit), then saves the returned `path` on the record.
 * See src/lib/blobSas.js for the upload protocol.
 */
export default withCors(createSasUploadHandler(() => SV_CONTAINER))
