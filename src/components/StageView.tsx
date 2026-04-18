import { useState } from 'react'
import type { CSSProperties, DragEvent, KeyboardEvent } from 'react'
import type {
  RuntimeMediaAsset,
  SlatLayoutMode,
  SlatStrokeSettings,
  SurfaceAssignment,
  SurfaceDefinition,
  SurfaceId,
  VenueAssetManifest,
  WallProjectionSettings,
} from '../types'

const purpleHighlightStroke = 'rgba(233, 212, 255, 0.98)'
const purpleHighlightFill = 'rgba(201, 146, 255, 0.12)'

type StageViewProps = {
  manifest: VenueAssetManifest
  mediaAssets: RuntimeMediaAsset[]
  assignments: SurfaceAssignment[]
  slatLayoutMode: SlatLayoutMode
  selectedSurfaceId: SurfaceId
  dragTargetId: SurfaceId | null
  slatStrokeSettings: SlatStrokeSettings
  wallProjectionSettings: WallProjectionSettings
  onSelectSurface: (surfaceId: SurfaceId) => void
  onDropFiles: (surfaceId: SurfaceId, files: FileList | null) => void
  onDragTargetChange: (surfaceId: SurfaceId | null) => void
}

type Placement = {
  x: number
  y: number
  width: number
  height: number
}

function getPlacement(
  placementSurface: SurfaceDefinition,
  mediaAsset: RuntimeMediaAsset,
  assignment: SurfaceAssignment,
): Placement {
  const widthRatio = placementSurface.bounds.width / mediaAsset.width
  const heightRatio = placementSurface.bounds.height / mediaAsset.height
  const baseRatio =
    assignment.fitMode === 'fill' ? Math.max(widthRatio, heightRatio) : Math.min(widthRatio, heightRatio)
  const scaledRatio = baseRatio * assignment.scale
  const width = mediaAsset.width * scaledRatio
  const height = mediaAsset.height * scaledRatio

  return {
    x: placementSurface.bounds.x + (placementSurface.bounds.width - width) / 2 + assignment.offsetX,
    y: placementSurface.bounds.y + (placementSurface.bounds.height - height) / 2 + assignment.offsetY,
    width,
    height,
  }
}

function createEventHandler(surfaceId: SurfaceId, callback: (surfaceId: SurfaceId) => void) {
  return (event: DragEvent<SVGPathElement>) => {
    event.preventDefault()
    event.stopPropagation()
    callback(surfaceId)
  }
}

function handleSurfaceKeyDown(
  event: KeyboardEvent<SVGPathElement>,
  surfaceId: SurfaceId,
  onSelectSurface: (surfaceId: SurfaceId) => void,
) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    onSelectSurface(surfaceId)
  }
}

function renderMediaLayer(
  clipSurface: SurfaceDefinition,
  placementSurface: SurfaceDefinition,
  assignment: SurfaceAssignment | undefined,
  mediaAsset: RuntimeMediaAsset | undefined,
  wallProjectionSettings: WallProjectionSettings,
  layerKey: string,
) {
  if (!assignment || !mediaAsset) {
    return null
  }

  const clipPathId = `clip-${clipSurface.id}`
  const placement = getPlacement(placementSurface, mediaAsset, assignment)
  const isWall = clipSurface.kind === 'wall'
  const mediaStyle = isWall
    ? {
        filter: `brightness(${wallProjectionSettings.brightness}) saturate(0.84) contrast(0.9)`,
      }
    : undefined

  if (mediaAsset.kind === 'image') {
    return (
      <g key={layerKey} clipPath={`url(#${clipPathId})`}>
        <image
          href={mediaAsset.objectUrl}
          x={placement.x}
          y={placement.y}
          width={placement.width}
          height={placement.height}
          preserveAspectRatio="none"
          style={mediaStyle ? { ...mediaStyle, pointerEvents: 'none' } : { pointerEvents: 'none' }}
        />
      </g>
    )
  }

  return (
    <g key={layerKey} clipPath={`url(#${clipPathId})`}>
      <foreignObject
        x={placement.x}
        y={placement.y}
        width={placement.width}
        height={placement.height}
        style={{ pointerEvents: 'none' }}
      >
        <video
          className="stage-video"
          src={mediaAsset.objectUrl}
          autoPlay
          muted
          loop
          playsInline
          style={mediaStyle ? { ...mediaStyle, pointerEvents: 'none' } : { pointerEvents: 'none' }}
        />
      </foreignObject>
    </g>
  )
}

function renderPhotoLayer(
  surface: SurfaceDefinition,
  backgroundAssetPath: string,
  stageWidth: number,
  stageHeight: number,
) {
  return (
    <g key={`photo-${surface.id}`} clipPath={`url(#clip-${surface.id})`}>
      <image
        href={backgroundAssetPath}
        width={stageWidth}
        height={stageHeight}
        preserveAspectRatio="none"
      />
    </g>
  )
}

function getSlatOcclusionMaskId(surfaceId: SurfaceId) {
  return `slat-occlusion-mask-${surfaceId}`
}

function renderStrokeLayer(
  surface: SurfaceDefinition,
  slatStrokeSettings: SlatStrokeSettings,
  maskId?: string,
) {
  const strokeStyle = slatStrokeSettings.hueCycleEnabled
    ? ({
        '--stroke-hue-duration': `${Math.max(4, 18 / slatStrokeSettings.hueCycleSpeed).toFixed(2)}s`,
      } as CSSProperties)
    : undefined

  return (
    <g
      key={`stroke-${surface.id}`}
      className={`slat-stroke-layer ${slatStrokeSettings.hueCycleEnabled ? 'is-hue-cycling' : ''}`}
      aria-hidden="true"
      mask={maskId ? `url(#${maskId})` : undefined}
      style={strokeStyle}
    >
      <path
        d={surface.pathD}
        fill="none"
        stroke={slatStrokeSettings.color}
        strokeWidth={slatStrokeSettings.width}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
        filter={slatStrokeSettings.feather > 0 ? 'url(#slat-stroke-feather)' : undefined}
      />
      <path
        d={surface.pathD}
        fill="none"
        stroke={slatStrokeSettings.color}
        strokeWidth={Math.max(1, slatStrokeSettings.width * 0.72)}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.95"
      />
    </g>
  )
}

function renderCombinedGroupDragOverlay(surface: SurfaceDefinition, maskId?: string) {
  return (
    <g
      key={`group-overlay-${surface.id}`}
      className="combined-group-overlay"
      aria-hidden="true"
      mask={maskId ? `url(#${maskId})` : undefined}
    >
      <path
        d={surface.pathD}
        fill="none"
        stroke={purpleHighlightStroke}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  )
}

function renderWallTextureLayer(
  surface: SurfaceDefinition,
  wallProjectionSettings: WallProjectionSettings,
  backgroundAssetPath: string,
  stageWidth: number,
  stageHeight: number,
) {
  return (
    <g
      key={`wall-texture-${surface.id}`}
      clipPath={`url(#clip-${surface.id})`}
      style={{
        mixBlendMode: wallProjectionSettings.mode,
        opacity: wallProjectionSettings.texture,
      }}
      aria-hidden="true"
    >
      <image
        href={backgroundAssetPath}
        width={stageWidth}
        height={stageHeight}
        preserveAspectRatio="none"
      />
    </g>
  )
}

function renderDropPrompt(surface: SurfaceDefinition, maskId?: string) {
  const promptAnchor = surface.promptAnchor ?? {
    x: surface.bounds.x + surface.bounds.width / 2,
    y: surface.bounds.y + surface.bounds.height / 2,
    maxWidth: Math.min(240, Math.max(112, surface.bounds.width * 0.52)),
    fontSize: 14,
  }
  const promptWidth = promptAnchor.maxWidth + 28
  const promptHeight = 92
  const promptStyle = {
    '--prompt-width': `${promptAnchor.maxWidth}px`,
    '--prompt-font-size': `${promptAnchor.fontSize}px`,
  } as CSSProperties

  return (
    <g
      key={`drop-prompt-${surface.id}`}
      clipPath={`url(#clip-${surface.id})`}
      aria-hidden="true"
      mask={maskId ? `url(#${maskId})` : undefined}
    >
      <foreignObject
        x={promptAnchor.x - promptWidth / 2}
        y={promptAnchor.y - promptHeight / 2}
        width={promptWidth}
        height={promptHeight}
        style={{ pointerEvents: 'none' }}
      >
        <div className="stage-drop-prompt" style={promptStyle}>
          <span className="stage-drop-prompt__badge">Drag Media Here</span>
        </div>
      </foreignObject>
    </g>
  )
}

export function StageView({
  manifest,
  mediaAssets,
  assignments,
  slatLayoutMode,
  selectedSurfaceId,
  dragTargetId,
  slatStrokeSettings,
  wallProjectionSettings,
  onSelectSurface,
  onDropFiles,
  onDragTargetChange,
}: StageViewProps) {
  const surfaceDefinitions = [...manifest.surfaces, ...manifest.groupedSurfaces]
  const renderSurfaces = [...manifest.surfaces].sort((left, right) => left.renderOrder - right.renderOrder)
  const groupedSurfaces = [...manifest.groupedSurfaces].sort((left, right) => left.tileOrder - right.tileOrder)
  const [hoveredSurfaceId, setHoveredSurfaceId] = useState<SurfaceId | null>(null)
  const mediaById = new Map(mediaAssets.map((mediaAsset) => [mediaAsset.id, mediaAsset]))
  const assignmentsBySurfaceId = new Map(assignments.map((assignment) => [assignment.surfaceId, assignment]))
  const groupedSurfaceByMemberId = new Map<SurfaceId, SurfaceDefinition>()
  groupedSurfaces.forEach((groupedSurface) => {
    groupedSurface.memberIds?.forEach((memberId) => {
      groupedSurfaceByMemberId.set(memberId, groupedSurface)
    })
  })
  const groupMembers = new Set(groupedSurfaceByMemberId.keys())
  const slatSurfaces = renderSurfaces.filter((surface) => groupMembers.has(surface.id))
  const slatOccludersBySurfaceId = new Map(
    slatSurfaces.map((surface) => [
      surface.id,
      slatSurfaces.filter((candidate) => candidate.renderOrder > surface.renderOrder),
    ]),
  )
  const hoveredSurface = hoveredSurfaceId
    ? surfaceDefinitions.find((surface) => surface.id === hoveredSurfaceId) ?? null
    : null
  const hoveredAssignment = hoveredSurfaceId ? assignmentsBySurfaceId.get(hoveredSurfaceId) : undefined
  const selectedSurface = surfaceDefinitions.find((surface) => surface.id === selectedSurfaceId) ?? null
  const selectedAssignment = assignmentsBySurfaceId.get(selectedSurfaceId)
  const promptSurface = hoveredSurface && !hoveredAssignment ? hoveredSurface : selectedSurface
  const shouldRenderPrompt = Boolean(promptSurface) && !(hoveredSurface ? hoveredAssignment : selectedAssignment)

  function handleStageDragOver(event: DragEvent<HTMLElement>) {
    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = 'copy'
  }

  function handleStageDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault()
    event.stopPropagation()

    const targetSurfaceId = dragTargetId ?? hoveredSurfaceId ?? selectedSurfaceId
    onDropFiles(targetSurfaceId, event.dataTransfer.files)
    onDragTargetChange(null)
    setHoveredSurfaceId(null)
  }

  function getMaskIdForSurface(surfaceId: SurfaceId) {
    const occluders = slatOccludersBySurfaceId.get(surfaceId) ?? []

    return occluders.length > 0 ? getSlatOcclusionMaskId(surfaceId) : undefined
  }

  const promptSurfaceMaskId =
    promptSurface?.kind === 'group'
      ? promptSurface.memberIds?.length === 1
        ? getMaskIdForSurface(promptSurface.memberIds[0])
        : undefined
      : promptSurface && groupMembers.has(promptSurface.id)
        ? getMaskIdForSurface(promptSurface.id)
        : undefined

  function renderSurfaceStack(surface: SurfaceDefinition) {
    const individualAssignment = assignmentsBySurfaceId.get(surface.id)
    const individualMediaAsset = mediaById.get(individualAssignment?.mediaAssetId ?? '')
    const combinedTarget = groupedSurfaceByMemberId.get(surface.id)
    const layerNodes = [
      renderPhotoLayer(surface, manifest.backgroundAssetPath, manifest.stageWidth, manifest.stageHeight),
    ]

    if (combinedTarget && slatLayoutMode === 'combined') {
      const groupAssignment = assignmentsBySurfaceId.get(combinedTarget.id)
      const groupMediaAsset = mediaById.get(groupAssignment?.mediaAssetId ?? '')
        const groupedMediaLayer = renderMediaLayer(
          surface,
          combinedTarget,
          groupAssignment,
          groupMediaAsset,
          wallProjectionSettings,
          `media-group-${surface.id}`,
        )

      if (groupedMediaLayer) {
        layerNodes.push(groupedMediaLayer)
      }
    }

    const individualMediaLayer =
      surface.kind === 'wall' || !combinedTarget || slatLayoutMode === 'individual'
        ? renderMediaLayer(
            surface,
            surface,
            individualAssignment,
            individualMediaAsset,
            wallProjectionSettings,
            `media-individual-${surface.id}`,
          )
        : null

    if (individualMediaLayer) {
      layerNodes.push(individualMediaLayer)
    }

    if (surface.kind === 'wall' && individualMediaLayer) {
      layerNodes.push(
        renderWallTextureLayer(
          surface,
          wallProjectionSettings,
          manifest.backgroundAssetPath,
          manifest.stageWidth,
          manifest.stageHeight,
        ),
      )
    }

    if (slatStrokeSettings.enabled && groupMembers.has(surface.id)) {
      const occluders = slatOccludersBySurfaceId.get(surface.id) ?? []

      layerNodes.push(
        renderStrokeLayer(
          surface,
          slatStrokeSettings,
          occluders.length > 0 ? getSlatOcclusionMaskId(surface.id) : undefined,
        ),
      )
    }

    return <g key={`surface-stack-${surface.id}`}>{layerNodes}</g>
  }

  return (
    <section className="stage-shell">
      <div
        className="stage-frame"
        onDragEnter={handleStageDragOver}
        onDragOver={handleStageDragOver}
        onDrop={handleStageDrop}
      >
        <svg
          className="stage-canvas"
          viewBox={`0 0 ${manifest.stageWidth} ${manifest.stageHeight}`}
          role="img"
          aria-label="Balcony venue media mockup stage"
        >
          <defs>
            {surfaceDefinitions.map((surface) => (
              <clipPath key={`clip-${surface.id}`} id={`clip-${surface.id}`} clipPathUnits="userSpaceOnUse">
                <path d={surface.pathD} />
              </clipPath>
            ))}
            {slatSurfaces.map((surface) => {
              const occluders = slatOccludersBySurfaceId.get(surface.id) ?? []

              if (occluders.length === 0) {
                return null
              }

              return (
                <mask
                  key={getSlatOcclusionMaskId(surface.id)}
                  id={getSlatOcclusionMaskId(surface.id)}
                  maskUnits="userSpaceOnUse"
                  maskContentUnits="userSpaceOnUse"
                >
                  <rect width={manifest.stageWidth} height={manifest.stageHeight} fill="white" />
                  {occluders.map((occluder) => (
                    <path
                      key={`${surface.id}-occluder-${occluder.id}`}
                      d={occluder.pathD}
                      fill="black"
                      stroke="black"
                      strokeWidth={slatStrokeSettings.width + 3}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ))}
                </mask>
              )
            })}
            <filter id="slat-stroke-feather" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation={slatStrokeSettings.feather} />
            </filter>
          </defs>

          <image
            href={manifest.backgroundAssetPath}
            width={manifest.stageWidth}
            height={manifest.stageHeight}
            preserveAspectRatio="none"
          />

          {renderSurfaces.map((surface) => renderSurfaceStack(surface))}

          {promptSurface && shouldRenderPrompt
            ? renderDropPrompt(promptSurface, promptSurfaceMaskId)
            : null}

          {renderSurfaces.map((surface) => {
            const combinedTarget =
              slatLayoutMode === 'combined' ? groupedSurfaceByMemberId.get(surface.id) ?? null : null
            const targetSurfaceId = combinedTarget?.id ?? surface.id
            const isCombinedGroupMember =
              Boolean(combinedTarget) && (combinedTarget?.memberIds?.length ?? 0) > 1
            const targetAssignment = assignmentsBySurfaceId.get(targetSurfaceId)
            const isSelected =
              !isCombinedGroupMember &&
              !targetAssignment &&
              (targetSurfaceId === surface.id
                ? selectedSurfaceId === surface.id
                : selectedSurfaceId === targetSurfaceId)
            const isDragTarget = !isCombinedGroupMember && dragTargetId === targetSurfaceId
            const overlayLabel =
              combinedTarget && targetSurfaceId === combinedTarget.id ? combinedTarget.label : surface.label
            const overlayMaskId = groupMembers.has(surface.id) ? getMaskIdForSurface(surface.id) : undefined

            return (
              <path
                key={`overlay-${surface.id}`}
                d={surface.pathD}
                className={[
                  'surface-overlay',
                  isCombinedGroupMember ? 'surface-overlay--group-hit' : '',
                  isSelected ? 'is-selected' : '',
                  isDragTarget ? 'is-drag-target' : '',
                ].join(' ')}
                role="button"
                tabIndex={0}
                aria-label={`Select ${overlayLabel}`}
                mask={overlayMaskId ? `url(#${overlayMaskId})` : undefined}
                onClick={() => onSelectSurface(targetSurfaceId)}
                onKeyDown={(event) => handleSurfaceKeyDown(event, targetSurfaceId, onSelectSurface)}
                onMouseEnter={() => setHoveredSurfaceId(targetSurfaceId)}
                onMouseLeave={() => setHoveredSurfaceId(null)}
                onFocus={() => setHoveredSurfaceId(targetSurfaceId)}
                onBlur={() => setHoveredSurfaceId(null)}
                onDragEnter={createEventHandler(targetSurfaceId, onDragTargetChange)}
                onDragOver={createEventHandler(targetSurfaceId, onDragTargetChange)}
                onDragLeave={() => {
                  onDragTargetChange(null)
                  setHoveredSurfaceId(null)
                }}
                onDrop={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  onDropFiles(targetSurfaceId, event.dataTransfer.files)
                  onDragTargetChange(null)
                  setHoveredSurfaceId(null)
                }}
              />
            )
          })}

          {groupedSurfaces.map((groupedSurface) => {
            const isMultiMemberGroup = (groupedSurface.memberIds?.length ?? 0) > 1
            const isSelected = selectedSurfaceId === groupedSurface.id

            if (!isMultiMemberGroup || !(slatLayoutMode === 'combined' || isSelected)) {
              return null
            }

            return (
              <path
                key={`group-capture-${groupedSurface.id}`}
                d={groupedSurface.pathD}
                className={[
                  'surface-overlay',
                  'surface-overlay--group-hit',
                  'surface-overlay--group-capture',
                ].join(' ')}
                role="button"
                tabIndex={0}
                aria-label={`Select ${groupedSurface.label}`}
                onClick={() => onSelectSurface(groupedSurface.id)}
                onKeyDown={(event) => handleSurfaceKeyDown(event, groupedSurface.id, onSelectSurface)}
                onMouseEnter={() => setHoveredSurfaceId(groupedSurface.id)}
                onMouseLeave={() => setHoveredSurfaceId(null)}
                onFocus={() => setHoveredSurfaceId(groupedSurface.id)}
                onBlur={() => setHoveredSurfaceId(null)}
                onDragEnter={createEventHandler(groupedSurface.id, onDragTargetChange)}
                onDragOver={createEventHandler(groupedSurface.id, onDragTargetChange)}
                onDragLeave={() => {
                  onDragTargetChange(null)
                  setHoveredSurfaceId(null)
                }}
                onDrop={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  onDropFiles(groupedSurface.id, event.dataTransfer.files)
                  onDragTargetChange(null)
                  setHoveredSurfaceId(null)
                }}
              />
            )
          })}

          {groupedSurfaces.map((groupedSurface) => {
            const isMultiMemberGroup = (groupedSurface.memberIds?.length ?? 0) > 1
            const groupIsSelected = selectedSurfaceId === groupedSurface.id
            const groupAssignment = assignmentsBySurfaceId.get(groupedSurface.id)

            if (
              !isMultiMemberGroup ||
              slatLayoutMode !== 'combined' ||
              !(dragTargetId === groupedSurface.id || (groupIsSelected && !groupAssignment))
            ) {
              return null
            }

            return (
              <g key={`group-feedback-${groupedSurface.id}`} className="combined-group-feedback" aria-hidden="true">
                <path
                  d={groupedSurface.pathD}
                  fill={
                    dragTargetId === groupedSurface.id
                      ? purpleHighlightFill
                      : 'rgba(95, 150, 255, 0.08)'
                  }
                />
                {dragTargetId === groupedSurface.id
                  ? groupedSurface.memberIds?.map((memberId) => {
                      const memberSurface = manifest.surfaces.find((surface) => surface.id === memberId)

                      if (!memberSurface) {
                        return null
                      }

                      return renderCombinedGroupDragOverlay(
                        memberSurface,
                        getMaskIdForSurface(memberSurface.id),
                      )
                    })
                  : null}
              </g>
            )
          })}

          {manifest.topOverlayAssetPath ? (
            <image
              href={manifest.topOverlayAssetPath}
              width={manifest.stageWidth}
              height={manifest.stageHeight}
              preserveAspectRatio="none"
              aria-hidden="true"
              style={{ pointerEvents: 'none' }}
            />
          ) : null}
        </svg>
      </div>
    </section>
  )
}
