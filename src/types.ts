export type SurfaceId = string

export type FitMode = 'fit' | 'fill'

export type MediaKind = 'image' | 'video'

export type MediaValidationStatus = 'ready'

export type SlatStrokeSettings = {
  enabled: boolean
  color: string
  hueCycleEnabled: boolean
  hueCycleSpeed: number
  width: number
  feather: number
}

export type WallProjectionBlendMode = 'multiply' | 'soft-light' | 'overlay' | 'screen'

export type SlatLayoutMode = 'individual' | 'combined'

export type LayoutId = 'layout-1' | 'layout-2' | 'layout-3'

export type WallProjectionSettings = {
  mode: WallProjectionBlendMode
  brightness: number
  texture: number
}

export type Bounds = {
  x: number
  y: number
  width: number
  height: number
}

export type PromptAnchor = {
  x: number
  y: number
  maxWidth: number
  fontSize: number
}

export type SurfaceDefinition = {
  id: SurfaceId
  sourceId: string
  label: string
  tileLabel: string
  tileOrder: number
  pathD: string
  bounds: Bounds
  promptAnchor?: PromptAnchor
  renderOrder: number
  kind: 'wall' | 'surface' | 'group'
  editable: boolean
  memberIds?: SurfaceId[]
}

export type VenueTip = {
  eyebrow: string
  body: string
}

export type VenueAssetManifest = {
  version: string
  backgroundAssetPath: string
  topOverlayAssetPath?: string
  rawSvgPath: string
  stageWidth: number
  stageHeight: number
  defaultSelectedSurfaceId: SurfaceId
  venueTip?: VenueTip
  surfaces: SurfaceDefinition[]
  groupedSurfaces: SurfaceDefinition[]
}

export type RuntimeMediaAsset = {
  id: string
  filename: string
  mimeType: string
  kind: MediaKind
  width: number
  height: number
  blob: Blob
  objectUrl: string
  validationStatus: MediaValidationStatus
}

export type StoredMediaAssetRecord = Omit<RuntimeMediaAsset, 'objectUrl'>

export type SurfaceAssignment = {
  surfaceId: SurfaceId
  mediaAssetId: string
  fitMode: FitMode
  offsetX: number
  offsetY: number
  scale: number
}

export type LayoutState = {
  id: LayoutId
  label: string
  selectedSurfaceId: SurfaceId
  assignments: SurfaceAssignment[]
  slatStrokeSettings: SlatStrokeSettings
  slatLayoutMode: SlatLayoutMode
}

export type ProjectDocument = {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  assetManifestVersion: string
  activeLayoutId: LayoutId
  submittedLayoutId?: LayoutId | null
  layouts: LayoutState[]
  mediaAssetIds: string[]
  wallProjectionSettings?: WallProjectionSettings
  isDraft: boolean
  sourceProjectId?: string
}

export type LoadedProjectSnapshot = {
  project: ProjectDocument
  mediaRecords: StoredMediaAssetRecord[]
}

export type SavedProjectSummary = {
  id: string
  name: string
  updatedAt: string
}
