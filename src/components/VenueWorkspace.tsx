import { useEffect, useRef, useState } from 'react'
import { ProjectSidebar } from './ProjectSidebar'
import { StageView } from './StageView'
import { importMediaFile, releaseMediaAssets } from '../lib/media'
import { saveProjectSnapshot } from '../lib/projectStorage'
import { loadVenueAssetManifest } from '../lib/venueAssets'
import type {
  LayoutId,
  LayoutState,
  RuntimeMediaAsset,
  SlatLayoutMode,
  SlatStrokeSettings,
  SurfaceAssignment,
  SurfaceId,
  VenueAssetManifest,
  WallProjectionSettings,
} from '../types'

type LiveVenueId = 'bar' | 'entrance' | 'exit' | 'stage'

type VenueWorkspaceProps = {
  venueId: LiveVenueId
  projectName: string
  onDirty: () => void
}

const lockedSlatStrokeWidth = 6
const lockedSlatStrokeFeather = 4
const defaultSlatHueCycleSpeed = 1
const defaultActiveLayoutId: LayoutId = 'layout-1'
const layoutDefinitions: Array<{ id: LayoutId; label: string }> = [{ id: 'layout-1', label: 'Layout 1' }]
const lockedWallProjectionSettings: WallProjectionSettings = {
  mode: 'multiply',
  brightness: 0.74,
  texture: 0.62,
}

const venueLabels: Record<LiveVenueId, string> = {
  bar: 'Bar',
  entrance: 'Entrance',
  exit: 'South Wall',
  stage: 'Stage',
}

function normalizeSlatStrokeSettings(settings?: Partial<SlatStrokeSettings>): SlatStrokeSettings {
  const safeHueCycleSpeed = Math.min(3, Math.max(0.2, settings?.hueCycleSpeed ?? defaultSlatHueCycleSpeed))

  return {
    enabled: settings?.enabled ?? false,
    color: settings?.color ?? '#ffffff',
    hueCycleEnabled: settings?.hueCycleEnabled ?? false,
    hueCycleSpeed: safeHueCycleSpeed,
    width: lockedSlatStrokeWidth,
    feather: lockedSlatStrokeFeather,
  }
}

const defaultSlatStrokeSettings: SlatStrokeSettings = {
  enabled: false,
  color: '#ffffff',
  hueCycleEnabled: false,
  hueCycleSpeed: defaultSlatHueCycleSpeed,
  width: lockedSlatStrokeWidth,
  feather: lockedSlatStrokeFeather,
}

function createDefaultLayout(id: LayoutId, label: string, defaultSelectedSurfaceId: SurfaceId): LayoutState {
  return {
    id,
    label,
    selectedSurfaceId: defaultSelectedSurfaceId,
    assignments: [],
    slatStrokeSettings: defaultSlatStrokeSettings,
    slatLayoutMode: 'individual',
  }
}

function updateLayoutState(
  layouts: LayoutState[],
  layoutId: LayoutId,
  updater: (layout: LayoutState) => LayoutState,
): LayoutState[] {
  return layouts.map((layout) => (layout.id === layoutId ? updater(layout) : layout))
}

function upsertAssignment(assignments: SurfaceAssignment[], assignment: SurfaceAssignment): SurfaceAssignment[] {
  return [...assignments.filter((item) => item.surfaceId !== assignment.surfaceId), assignment]
}

function createDefaultAssignment(surfaceId: SurfaceId, mediaAssetId: string): SurfaceAssignment {
  return {
    surfaceId,
    mediaAssetId,
    fitMode: 'fill',
    offsetX: 0,
    offsetY: 0,
    scale: 1,
  }
}

function createProjectPayload(
  name: string,
  manifest: VenueAssetManifest,
  layouts: LayoutState[],
  activeLayoutId: LayoutId,
  mediaAssets: RuntimeMediaAsset[],
  wallProjectionSettings: WallProjectionSettings,
) {
  const timestamp = new Date().toISOString()

  return {
    name,
    createdAt: timestamp,
    updatedAt: timestamp,
    assetManifestVersion: manifest.version,
    activeLayoutId,
    submittedLayoutId: null,
    layouts,
    mediaAssetIds: mediaAssets.map((mediaAsset) => mediaAsset.id),
    wallProjectionSettings,
  }
}

export function VenueWorkspace({ venueId, projectName, onDirty }: VenueWorkspaceProps) {
  const [manifest, setManifest] = useState<VenueAssetManifest | null>(null)
  const [layouts, setLayouts] = useState<LayoutState[]>([])
  const [mediaAssets, setMediaAssets] = useState<RuntimeMediaAsset[]>([])
  const [statusMessage, setStatusMessage] = useState('Loading Balcony assets...')
  const [dragTargetId, setDragTargetId] = useState<SurfaceId | null>(null)
  const [isBusy, setIsBusy] = useState(true)

  const activeLayoutId = defaultActiveLayoutId
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const pendingSurfaceIdRef = useRef<SurfaceId>('center')
  const mediaAssetsRef = useRef<RuntimeMediaAsset[]>([])

  useEffect(() => {
    mediaAssetsRef.current = mediaAssets
  }, [mediaAssets])

  useEffect(() => {
    return () => {
      releaseMediaAssets(mediaAssetsRef.current)
    }
  }, [])

  useEffect(() => {
    let isCancelled = false
    const venueLabel = venueLabels[venueId]

    releaseMediaAssets(mediaAssetsRef.current)
    mediaAssetsRef.current = []
    setMediaAssets([])
    setManifest(null)
    setDragTargetId(null)
    setIsBusy(true)
    setStatusMessage(`Loading ${venueLabel} assets...`)

    async function initialize() {
      try {
        const loadedManifest = await loadVenueAssetManifest(venueId)

        if (isCancelled) {
          return
        }

        setManifest(loadedManifest)
        setLayouts(
          layoutDefinitions.map((layout) =>
            createDefaultLayout(layout.id, layout.label, loadedManifest.defaultSelectedSurfaceId),
          ),
        )
        pendingSurfaceIdRef.current = loadedManifest.defaultSelectedSurfaceId
        setStatusMessage('Ready')
      } catch (error) {
        setStatusMessage(
          error instanceof Error ? error.message : 'Could not initialize the Balcony mockup app.',
        )
      } finally {
        if (!isCancelled) {
          setIsBusy(false)
        }
      }
    }

    void initialize()

    return () => {
      isCancelled = true
    }
  }, [venueId])

  useEffect(() => {
    if (!manifest || isBusy || layouts.length === 0) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      const draftPayload = createProjectPayload(
        projectName,
        manifest,
        layouts,
        activeLayoutId,
        mediaAssets,
        lockedWallProjectionSettings,
      )

      void saveProjectSnapshot(draftPayload, mediaAssets, {
        draft: true,
        draftId: `__draft__::${venueId}`,
      })
    }, 350)

    return () => window.clearTimeout(timeoutId)
  }, [activeLayoutId, isBusy, layouts, manifest, mediaAssets, projectName, venueId])

  const activeLayout = layouts.find((layout) => layout.id === activeLayoutId) ?? null
  const slatLayoutMode = activeLayout?.slatLayoutMode ?? 'individual'
  const selectedSurfaceId = activeLayout?.selectedSurfaceId ?? manifest?.defaultSelectedSurfaceId ?? 'center'
  const assignments = activeLayout?.assignments ?? []
  const slatStrokeSettings = activeLayout?.slatStrokeSettings ?? defaultSlatStrokeSettings
  const allSurfaces = manifest ? [...manifest.groupedSurfaces, ...manifest.surfaces] : []
  const selectedSurface = allSurfaces.find((surface) => surface.id === selectedSurfaceId) ?? null

  useEffect(() => {
    if (!layouts.some((layout) => layout.assignments.some((assignment) => assignment.fitMode !== 'fill'))) {
      return
    }

    setLayouts((current) =>
      current.map((layout) => ({
        ...layout,
        assignments: layout.assignments.map((assignment) =>
          assignment.fitMode === 'fill' ? assignment : { ...assignment, fitMode: 'fill' },
        ),
      })),
    )
  }, [layouts])

  function handleSelectSurface(surfaceId: SurfaceId) {
    setLayouts((current) =>
      updateLayoutState(current, activeLayoutId, (layout) => ({
        ...layout,
        selectedSurfaceId: surfaceId,
      })),
    )
  }

  function handleChangeSlatLayoutMode(nextMode: SlatLayoutMode) {
    const groupedSurfaces = manifest?.groupedSurfaces ?? []
    const wallSurface = manifest?.surfaces.find((surface) => surface.kind === 'wall')

    if (!manifest || groupedSurfaces.length === 0 || nextMode === slatLayoutMode) {
      return
    }

    onDirty()
    setLayouts((current) =>
      updateLayoutState(current, activeLayoutId, (layout) => {
        let nextSelectedSurfaceId = layout.selectedSurfaceId
        const selectedGroupedSurface = groupedSurfaces.find((surface) => surface.id === nextSelectedSurfaceId)
        const groupedSurfaceForMember = groupedSurfaces.find((surface) =>
          surface.memberIds?.includes(nextSelectedSurfaceId),
        )

        if (nextMode === 'combined') {
          if (!wallSurface || nextSelectedSurfaceId !== wallSurface.id) {
            nextSelectedSurfaceId =
              selectedGroupedSurface?.id ?? groupedSurfaceForMember?.id ?? groupedSurfaces[0].id
          }
        } else if (selectedGroupedSurface) {
          nextSelectedSurfaceId =
            selectedGroupedSurface.memberIds?.[0] ?? manifest.defaultSelectedSurfaceId
        }

        return {
          ...layout,
          slatLayoutMode: nextMode,
          selectedSurfaceId: nextSelectedSurfaceId,
        }
      }),
    )
  }

  function openFilePicker(surfaceId: SurfaceId) {
    handleSelectSurface(surfaceId)
    pendingSurfaceIdRef.current = surfaceId
    fileInputRef.current?.click()
  }

  async function handleImport(surfaceId: SurfaceId, files: FileList | null) {
    const file = files?.[0]

    if (!file || !manifest) {
      return
    }

    const surface = allSurfaces.find((item) => item.id === surfaceId)

    try {
      setIsBusy(true)
      setStatusMessage(`Importing ${file.name}...`)
      const mediaAsset = await importMediaFile(file)
      onDirty()
      setMediaAssets((current) => [mediaAsset, ...current])
      setLayouts((current) =>
        updateLayoutState(current, activeLayoutId, (layout) => {
          const existing = layout.assignments.find((item) => item.surfaceId === surfaceId)
          const nextAssignment = existing
            ? {
                ...existing,
                mediaAssetId: mediaAsset.id,
                fitMode: 'fill' as const,
                offsetX: 0,
                offsetY: 0,
                scale: 1,
              }
            : createDefaultAssignment(surfaceId, mediaAsset.id)

          return {
            ...layout,
            assignments: upsertAssignment(layout.assignments, nextAssignment),
            selectedSurfaceId: surfaceId,
          }
        }),
      )
      setStatusMessage(`Assigned ${file.name} to ${surface?.label ?? surfaceId}.`)
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : 'This file could not be imported into the mockup.',
      )
    } finally {
      setIsBusy(false)
    }
  }

  function handlePatchSlatStrokeSettings(patch: Partial<SlatStrokeSettings>) {
    const hasChanged = Object.entries(patch).some(([key, value]) => {
      const settingsKey = key as keyof SlatStrokeSettings
      return slatStrokeSettings[settingsKey] !== value
    })

    if (!hasChanged) {
      return
    }

    onDirty()
    setLayouts((current) =>
      updateLayoutState(current, activeLayoutId, (layout) => ({
        ...layout,
        slatStrokeSettings: normalizeSlatStrokeSettings({
          ...layout.slatStrokeSettings,
          ...patch,
        }),
      })),
    )
  }

  function handlePatchAssignment(surfaceId: SurfaceId, patch: Partial<SurfaceAssignment>) {
    const currentAssignment = assignments.find((assignment) => assignment.surfaceId === surfaceId)

    if (!currentAssignment) {
      return
    }

    const hasChanged = Object.entries(patch).some(([key, value]) => {
      const assignmentKey = key as keyof SurfaceAssignment
      return currentAssignment[assignmentKey] !== value
    })

    if (!hasChanged) {
      return
    }

    onDirty()
    setLayouts((current) =>
      updateLayoutState(current, activeLayoutId, (layout) => ({
        ...layout,
        assignments: upsertAssignment(layout.assignments, {
          ...currentAssignment,
          ...patch,
        }),
      })),
    )
  }

  function handleClearAssignment(surfaceId: SurfaceId) {
    const hasAssignment = assignments.some((assignment) => assignment.surfaceId === surfaceId)

    if (!hasAssignment) {
      return
    }

    onDirty()
    setLayouts((current) =>
      updateLayoutState(current, activeLayoutId, (layout) => ({
        ...layout,
        assignments: layout.assignments.filter((assignment) => assignment.surfaceId !== surfaceId),
      })),
    )
    setStatusMessage(`Cleared media from ${selectedSurface?.label ?? surfaceId}.`)
  }

  if (!manifest || !selectedSurface || !activeLayout) {
    return (
      <section className="workspace-loading-card">
        <p className="eyebrow">The Balcony Mockup Suite</p>
        <h2>Preparing the venue assets</h2>
        <p>{statusMessage}</p>
      </section>
    )
  }

  return (
    <>
      <div className="workspace-grid">
        <ProjectSidebar
          surfaces={manifest.surfaces}
          groupedSurfaces={manifest.groupedSurfaces}
          assignments={assignments}
          mediaAssets={mediaAssets}
          slatLayoutMode={slatLayoutMode}
          selectedSurfaceId={selectedSurfaceId}
          dragTargetId={dragTargetId}
          slatStrokeSettings={slatStrokeSettings}
          venueTip={manifest.venueTip}
          onSlatLayoutModeChange={handleChangeSlatLayoutMode}
          onSelectSurface={handleSelectSurface}
          onOpenFilePicker={openFilePicker}
          onDropFiles={handleImport}
          onDragTargetChange={setDragTargetId}
          onPatchSlatStrokeSettings={handlePatchSlatStrokeSettings}
          onPatchAssignment={handlePatchAssignment}
          onClearAssignment={handleClearAssignment}
        />

        <StageView
          manifest={manifest}
          mediaAssets={mediaAssets}
          assignments={assignments}
          slatLayoutMode={slatLayoutMode}
          selectedSurfaceId={selectedSurfaceId}
          dragTargetId={dragTargetId}
          slatStrokeSettings={slatStrokeSettings}
          wallProjectionSettings={lockedWallProjectionSettings}
          onSelectSurface={handleSelectSurface}
          onDropFiles={handleImport}
          onDragTargetChange={setDragTargetId}
        />
      </div>

      <input
        ref={fileInputRef}
        className="hidden-input"
        type="file"
        accept="image/*,video/*,.mov,.mp4,.webm,.m4v"
        onChange={(event) => {
          void handleImport(pendingSurfaceIdRef.current, event.target.files)
          event.target.value = ''
        }}
      />
    </>
  )
}
