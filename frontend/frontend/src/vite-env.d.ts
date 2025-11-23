/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_API_VERSION: string
  readonly VITE_API_TIMEOUT: string
  readonly VITE_MAX_FILE_SIZE: string
  readonly VITE_MAX_AUDIO_SIZE: string
  readonly VITE_MAX_VIDEO_SIZE: string
  readonly VITE_ALLOWED_IMAGE_TYPES: string
  readonly VITE_ALLOWED_AUDIO_TYPES: string
  readonly VITE_ALLOWED_VIDEO_TYPES: string
  readonly VITE_ALLOWED_DOCUMENT_TYPES: string
  readonly VITE_ALLOWED_APK_TYPES: string
  readonly VITE_ENABLE_VOICE_COMPLAINTS: string
  readonly VITE_ENABLE_IDENTITY_VERIFICATION: string
  readonly VITE_ENABLE_APP_VERIFICATION: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
