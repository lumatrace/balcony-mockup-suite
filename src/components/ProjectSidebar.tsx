import type { DragEvent } from 'react'
import type {
  RuntimeMediaAsset,
  SlatLayoutMode,
  SlatStrokeSettings,
  SurfaceAssignment,
  SurfaceDefinition,
  SurfaceId,
  VenueTip,
} from '../types'

type ProjectSidebarProps = {
  surfaces: SurfaceDefinition[]
  groupedSurfaces: SurfaceDefinition[]
  assignments: SurfaceAssignment[]
  mediaAssets: RuntimeMediaAsset[]
  slatLayoutMode: SlatLayoutMode
  selectedSurfaceId: SurfaceId
  dragTargetId: SurfaceId | null
  slatStrokeSettings: SlatStrokeSettings
  venueTip?: VenueTip
  onSlatLayoutModeChange: (mode: SlatLayoutMode) => void
  onSelectSurface: (surfaceId: SurfaceId) => void
  onOpenFilePicker: (surfaceId: SurfaceId) => void
  onDropFiles: (surfaceId: SurfaceId, files: FileList | null) => void
  onDragTargetChange: (surfaceId: SurfaceId | null) => void
  onPatchSlatStrokeSettings: (patch: Partial<SlatStrokeSettings>) => void
  onPatchAssignment: (surfaceId: SurfaceId, patch: Partial<SurfaceAssignment>) => void
  onClearAssignment: (surfaceId: SurfaceId) => void
}

function getCompactLabel(surface: SurfaceDefinition) {
  return surface.tileLabel
}

function getSlotHelperText(surface: SurfaceDefinition, slatLayoutMode: SlatLayoutMode) {
  if (slatLayoutMode === 'combined' && surface.id === 'stage-video-wall') {
    return '2400 x 1080 pixels'
  }

  return null
}

function handleTileDrop(
  event: DragEvent<HTMLDivElement>,
  surfaceId: SurfaceId,
  onDropFiles: (surfaceId: SurfaceId, files: FileList | null) => void,
  onDragTargetChange: (surfaceId: SurfaceId | null) => void,
) {
  event.preventDefault()
  event.stopPropagation()
  onDropFiles(surfaceId, event.dataTransfer.files)
  onDragTargetChange(null)
}

function handleTileDragState(
  event: DragEvent<HTMLElement>,
  surfaceId: SurfaceId,
  onDragTargetChange: (surfaceId: SurfaceId | null) => void,
) {
  event.preventDefault()
  event.stopPropagation()
  onDragTargetChange(surfaceId)
}

function renderPreview(mediaAsset: RuntimeMediaAsset | undefined) {
  if (!mediaAsset) {
    return <div className="slot-empty-mark" aria-hidden="true">+</div>
  }

  if (mediaAsset.kind === 'image') {
    return <img className="slot-preview-image" src={mediaAsset.objectUrl} alt="" />
  }

  return (
    <video
      className="slot-preview-video"
      src={mediaAsset.objectUrl}
      muted
      loop
      autoPlay
      playsInline
      aria-hidden="true"
    />
  )
}

export function ProjectSidebar({
  surfaces,
  groupedSurfaces,
  assignments,
  mediaAssets,
  slatLayoutMode,
  selectedSurfaceId,
  dragTargetId,
  slatStrokeSettings,
  venueTip,
  onSlatLayoutModeChange,
  onSelectSurface,
  onOpenFilePicker,
  onDropFiles,
  onDragTargetChange,
  onPatchSlatStrokeSettings,
  onPatchAssignment,
  onClearAssignment,
}: ProjectSidebarProps) {
  const assignmentsBySurface = new Map(assignments.map((assignment) => [assignment.surfaceId, assignment]))
  const mediaById = new Map(mediaAssets.map((mediaAsset) => [mediaAsset.id, mediaAsset]))
  const wallSurface = surfaces.find((surface) => surface.kind === 'wall')
  const individualSurfaces = [...surfaces].sort((left, right) => left.tileOrder - right.tileOrder)
  const orderedGroupedSurfaces = [...groupedSurfaces].sort((left, right) => left.tileOrder - right.tileOrder)
  const groupedMemberIds = new Set(
    groupedSurfaces.flatMap((groupedSurface) => groupedSurface.memberIds ?? []),
  )
  const standaloneCombinedSurfaces = individualSurfaces.filter(
    (surface) => surface.kind !== 'wall' && !groupedMemberIds.has(surface.id),
  )
  const orderedSurfaces =
    slatLayoutMode === 'combined'
      ? [...orderedGroupedSurfaces, ...standaloneCombinedSurfaces, ...(wallSurface ? [wallSurface] : [])]
      : individualSurfaces
  const selectedSurface = orderedSurfaces.find((surface) => surface.id === selectedSurfaceId) ?? orderedSurfaces[0]
  const selectedAssignment = assignmentsBySurface.get(selectedSurface.id)

  return (
    <aside className="client-sidebar">
      <section className="slat-mode-card">
        <button
          type="button"
          className={`slat-mode-button ${slatLayoutMode === 'individual' ? 'is-active' : ''}`}
          onClick={() => onSlatLayoutModeChange('individual')}
        >
          Individual
        </button>
        <button
          type="button"
          className={`slat-mode-button ${slatLayoutMode === 'combined' ? 'is-active' : ''}`}
          onClick={() => onSlatLayoutModeChange('combined')}
        >
          Combined
        </button>
      </section>

      <section className="slot-grid-card">
        <div className={`slot-grid ${slatLayoutMode === 'combined' ? 'is-combined' : ''}`}>
          {orderedSurfaces.map((surface) => {
            const assignment = assignmentsBySurface.get(surface.id)
            const mediaAsset = mediaById.get(assignment?.mediaAssetId ?? '')
            const isSelected = selectedSurfaceId === surface.id
            const isDragTarget = dragTargetId === surface.id
            const helperText = getSlotHelperText(surface, slatLayoutMode)

            return (
              <div
                key={surface.id}
                className={[
                  'slot-tile',
                  surface.kind === 'group' && (surface.memberIds?.length ?? 0) > 1 ? 'slot-tile--group' : '',
                  mediaAsset ? 'has-media' : 'is-empty',
                  isSelected ? 'is-selected' : '',
                  isDragTarget ? 'is-drag-target' : '',
                ].join(' ')}
                aria-label={surface.label}
                onClick={() => {
                  onSelectSurface(surface.id)

                  if (!assignment) {
                    onOpenFilePicker(surface.id)
                  }
                }}
                onDragEnter={(event) => handleTileDragState(event, surface.id, onDragTargetChange)}
                onDragOver={(event) => handleTileDragState(event, surface.id, onDragTargetChange)}
                onDragLeave={() => onDragTargetChange(null)}
                onDrop={(event) => handleTileDrop(event, surface.id, onDropFiles, onDragTargetChange)}
              >
                <button
                  type="button"
                  className="slot-tile__button"
                  aria-label={surface.label}
                  onClick={() => {
                    onSelectSurface(surface.id)

                    if (!assignment) {
                      onOpenFilePicker(surface.id)
                    }
                  }}
                  onDragEnter={(event) => handleTileDragState(event, surface.id, onDragTargetChange)}
                  onDragOver={(event) => handleTileDragState(event, surface.id, onDragTargetChange)}
                  onDragLeave={() => onDragTargetChange(null)}
                  onDrop={(event) => {
                    handleTileDrop(event as unknown as DragEvent<HTMLDivElement>, surface.id, onDropFiles, onDragTargetChange)
                  }}
                >
                  <div className="slot-preview">
                    {renderPreview(mediaAsset)}
                    {helperText && !mediaAsset ? (
                      <span className="slot-helper">{helperText}</span>
                    ) : null}
                  </div>
                  <span className="slot-label">{getCompactLabel(surface)}</span>
                </button>

                {assignment ? (
                  <button
                    type="button"
                    className="slot-clear-button"
                    aria-label={`Remove media from ${surface.label}`}
                    onClick={(event) => {
                      event.stopPropagation()
                      onClearAssignment(surface.id)
                    }}
                  >
                    ×
                  </button>
                ) : null}
              </div>
            )
          })}
        </div>
      </section>

      {selectedAssignment ? (
        <section className="surface-adjust-card">
          <div className="adjust-header">
            <span className="adjust-surface-name">{getCompactLabel(selectedSurface)}</span>
          </div>

          <label className="mini-slider">
            <span>Scale</span>
            <input
              type="range"
              min="0.5"
              max="2.5"
              step="0.01"
              value={selectedAssignment.scale}
              onChange={(event) =>
                onPatchAssignment(selectedSurface.id, { scale: Number(event.target.value) })
              }
            />
          </label>

          <label className="mini-slider">
            <span>Left / Right</span>
            <input
              type="range"
              min="-240"
              max="240"
              step="1"
              value={selectedAssignment.offsetX}
              onChange={(event) =>
                onPatchAssignment(selectedSurface.id, { offsetX: Number(event.target.value) })
              }
            />
          </label>

          <label className="mini-slider">
            <span>Up / Down</span>
            <input
              type="range"
              min="-240"
              max="240"
              step="1"
              value={selectedAssignment.offsetY}
              onChange={(event) =>
                onPatchAssignment(selectedSurface.id, { offsetY: Number(event.target.value) })
              }
            />
          </label>
        </section>
      ) : null}

      <section className="outline-card">
        <label className="outline-toggle">
          <span>Outline</span>
          <input
            type="checkbox"
            checked={slatStrokeSettings.enabled}
            onChange={(event) => onPatchSlatStrokeSettings({ enabled: event.target.checked })}
          />
        </label>

        <label className="outline-color-field">
          <span>Color</span>
          <input
            className="color-input"
            type="color"
            value={slatStrokeSettings.color}
            onChange={(event) => onPatchSlatStrokeSettings({ color: event.target.value })}
          />
        </label>

        <label className="outline-toggle">
          <span>Hue Cycle</span>
          <input
            type="checkbox"
            checked={slatStrokeSettings.hueCycleEnabled}
            onChange={(event) =>
              onPatchSlatStrokeSettings({ hueCycleEnabled: event.target.checked })
            }
          />
        </label>

        {slatStrokeSettings.hueCycleEnabled ? (
          <label className="mini-slider mini-slider--outline">
            <span>Speed</span>
            <input
              type="range"
              min="0.2"
              max="3"
              step="0.05"
              value={slatStrokeSettings.hueCycleSpeed}
              onChange={(event) =>
                onPatchSlatStrokeSettings({ hueCycleSpeed: Number(event.target.value) })
              }
            />
          </label>
        ) : null}
      </section>

      {venueTip ? (
        <section className="venue-tip-card">
          <span className="venue-tip-card__eyebrow">{venueTip.eyebrow}</span>
          <p>{venueTip.body}</p>
        </section>
      ) : null}
    </aside>
  )
}
