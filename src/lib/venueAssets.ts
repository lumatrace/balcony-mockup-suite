import type {
  Bounds,
  PromptAnchor,
  SurfaceDefinition,
  SurfaceId,
  VenueAssetManifest,
  VenueTip,
} from '../types'

type LiveVenueId = 'bar' | 'entrance' | 'exit' | 'stage'

type SurfaceSpec = {
  id: SurfaceId
  sourceId: string
  label: string
  tileLabel: string
  tileOrder: number
  renderOrder: number
  kind: 'wall' | 'surface'
}

type GroupSurfaceSpec = {
  id: SurfaceId
  sourceId: string
  label: string
  tileLabel: string
  tileOrder: number
  renderOrder: number
  memberIds: SurfaceId[]
}

type VenueManifestConfig = {
  version: string
  backgroundAssetPath: string
  topOverlayAssetPath?: string
  rawSvgPath: string
  defaultSelectedSurfaceId: SurfaceId
  surfaceSpecs: SurfaceSpec[]
  groupSurfaceSpecs: GroupSurfaceSpec[]
  venueTip?: VenueTip
}

const svgNamespace = 'http://www.w3.org/2000/svg'

const venueManifestConfigs: Record<LiveVenueId, VenueManifestConfig> = {
  bar: {
    version: 'balcony-web-bar-v1',
    backgroundAssetPath: '/assets/Bar.png',
    topOverlayAssetPath: '/assets/Bar_Logo.png',
    rawSvgPath: '/assets/Balcony_web_bar.svg',
    defaultSelectedSurfaceId: 'center',
    surfaceSpecs: [
      {
        id: 'l3',
        sourceId: 'L3',
        label: 'L3 Left Wing',
        tileLabel: 'L3',
        tileOrder: 1,
        renderOrder: 20,
        kind: 'surface',
      },
      {
        id: 'l2',
        sourceId: 'L2',
        label: 'L2 Left Sail',
        tileLabel: 'L2',
        tileOrder: 2,
        renderOrder: 60,
        kind: 'surface',
      },
      {
        id: 'l1',
        sourceId: 'L1',
        label: 'L1 Left Inner',
        tileLabel: 'L1',
        tileOrder: 3,
        renderOrder: 30,
        kind: 'surface',
      },
      {
        id: 'center',
        sourceId: 'Center',
        label: 'Center Canopy',
        tileLabel: 'Center',
        tileOrder: 4,
        renderOrder: 70,
        kind: 'surface',
      },
      {
        id: 'r1',
        sourceId: 'R_1',
        label: 'R1 Right Inner',
        tileLabel: 'R1',
        tileOrder: 5,
        renderOrder: 40,
        kind: 'surface',
      },
      {
        id: 'r2',
        sourceId: 'R2',
        label: 'R2 Right Sail',
        tileLabel: 'R2',
        tileOrder: 6,
        renderOrder: 80,
        kind: 'surface',
      },
      {
        id: 'r3',
        sourceId: 'R3',
        label: 'R3 Right Wing',
        tileLabel: 'R3',
        tileOrder: 7,
        renderOrder: 50,
        kind: 'surface',
      },
      {
        id: 'wall',
        sourceId: 'Wall',
        label: 'Lower Wall',
        tileLabel: 'Wall',
        tileOrder: 8,
        renderOrder: 10,
        kind: 'wall',
      },
    ],
    groupSurfaceSpecs: [
      {
        id: 'slat-group',
        sourceId: 'SlatGroup',
        label: 'Combined',
        tileLabel: 'Combined',
        tileOrder: 0,
        renderOrder: 0,
        memberIds: ['l3', 'l2', 'l1', 'center', 'r1', 'r2', 'r3'],
      },
    ],
    venueTip: {
      eyebrow: 'Bar Hero Shot',
      body: 'This is the cocktail-line money shot. If one brand moment has to do the heavy lifting, let the center canopy be the star.',
    },
  },
  entrance: {
    version: 'balcony-web-entrance-v1',
    backgroundAssetPath: '/assets/Entrance.png',
    rawSvgPath: '/assets/Entrance.svg',
    defaultSelectedSurfaceId: 'entrance-center',
    surfaceSpecs: [
      {
        id: 'entrance-center',
        sourceId: 'Center',
        label: 'Center Canopy',
        tileLabel: 'Center',
        tileOrder: 1,
        renderOrder: 40,
        kind: 'surface',
      },
      {
        id: 'entrance-left',
        sourceId: 'Left',
        label: 'Left Wing',
        tileLabel: 'Left',
        tileOrder: 2,
        renderOrder: 20,
        kind: 'surface',
      },
      {
        id: 'entrance-right',
        sourceId: 'Right',
        label: 'Right Wing',
        tileLabel: 'Right',
        tileOrder: 3,
        renderOrder: 30,
        kind: 'surface',
      },
      {
        id: 'entrance-wall',
        sourceId: 'Layer_5',
        label: 'Lower Wall',
        tileLabel: 'Wall',
        tileOrder: 4,
        renderOrder: 10,
        kind: 'wall',
      },
    ],
    groupSurfaceSpecs: [
      {
        id: 'entrance-group',
        sourceId: 'EntranceGroup',
        label: 'Combined',
        tileLabel: 'Combined',
        tileOrder: 0,
        renderOrder: 0,
        memberIds: ['entrance-left', 'entrance-center', 'entrance-right'],
      },
    ],
    venueTip: {
      eyebrow: 'Entrance Reveal',
      body: 'This is the first hello. Let the center canopy set the tone fast, then let the side sails support the welcome moment.',
    },
  },
  exit: {
    version: 'balcony-web-exit-v1',
    backgroundAssetPath: '/assets/Exit.png',
    rawSvgPath: '/assets/Exit.svg',
    defaultSelectedSurfaceId: 'exit-center',
    surfaceSpecs: [
      {
        id: 'exit-far-left',
        sourceId: 'Layer_2',
        label: 'Far Left Wing',
        tileLabel: 'Far Left',
        tileOrder: 1,
        renderOrder: 20,
        kind: 'surface',
      },
      {
        id: 'exit-left',
        sourceId: 'Layer_3',
        label: 'Left Sail',
        tileLabel: 'Left',
        tileOrder: 2,
        renderOrder: 50,
        kind: 'surface',
      },
      {
        id: 'exit-center',
        sourceId: 'Layer_4',
        label: 'Center Canopy',
        tileLabel: 'Center',
        tileOrder: 3,
        renderOrder: 30,
        kind: 'surface',
      },
      {
        id: 'exit-right',
        sourceId: 'Layer_5',
        label: 'Right Sail',
        tileLabel: 'Right',
        tileOrder: 4,
        renderOrder: 60,
        kind: 'surface',
      },
      {
        id: 'exit-far-right',
        sourceId: 'Layer_6',
        label: 'Far Right Wing',
        tileLabel: 'Far Right',
        tileOrder: 5,
        renderOrder: 40,
        kind: 'surface',
      },
      {
        id: 'exit-wall',
        sourceId: 'Layer_7',
        label: 'Lower Wall',
        tileLabel: 'Wall',
        tileOrder: 6,
        renderOrder: 10,
        kind: 'wall',
      },
    ],
    groupSurfaceSpecs: [
      {
        id: 'exit-group',
        sourceId: 'ExitGroup',
        label: 'Center',
        tileLabel: 'Center',
        tileOrder: 1,
        renderOrder: 0,
        memberIds: ['exit-left', 'exit-center', 'exit-right'],
      },
      {
        id: 'exit-far-left-group',
        sourceId: 'ExitFarLeftGroup',
        label: 'Far Left Wing',
        tileLabel: 'Far Left',
        tileOrder: 2,
        renderOrder: 0,
        memberIds: ['exit-far-left'],
      },
      {
        id: 'exit-far-right-group',
        sourceId: 'ExitFarRightGroup',
        label: 'Far Right Wing',
        tileLabel: 'Far Right',
        tileOrder: 3,
        renderOrder: 0,
        memberIds: ['exit-far-right'],
      },
    ],
    venueTip: {
      eyebrow: 'South Wall First Look',
      body: 'Guests walk in through the entrance, but this is the first wall they actually face. If the arrival moment needs a logo hit, press Combined and let the center do the work here.',
    },
  },
  stage: {
    version: 'balcony-web-stage-v2',
    backgroundAssetPath: '/assets/Stage.png',
    rawSvgPath: '/assets/Stage.svg',
    defaultSelectedSurfaceId: 'stage-center-left',
    surfaceSpecs: [
      {
        id: 'stage-far-left',
        sourceId: 'Layer_2',
        label: 'Far Left Wing',
        tileLabel: 'Far Left',
        tileOrder: 1,
        renderOrder: 20,
        kind: 'surface',
      },
      {
        id: 'stage-left',
        sourceId: 'Middle_L',
        label: 'Middle Left',
        tileLabel: 'Mid Left',
        tileOrder: 2,
        renderOrder: 15,
        kind: 'surface',
      },
      {
        id: 'stage-center-left',
        sourceId: 'Layer_4',
        label: 'Center Left',
        tileLabel: 'Ctr Left',
        tileOrder: 3,
        renderOrder: 40,
        kind: 'surface',
      },
      {
        id: 'stage-video-wall',
        sourceId: 'video_Wall',
        label: 'Video Wall',
        tileLabel: 'Video Wall',
        tileOrder: 4,
        renderOrder: 30,
        kind: 'surface',
      },
      {
        id: 'stage-center-right',
        sourceId: 'Layer_5',
        label: 'Center Right',
        tileLabel: 'Ctr Right',
        tileOrder: 5,
        renderOrder: 45,
        kind: 'surface',
      },
      {
        id: 'stage-right',
        sourceId: 'Middle_R',
        label: 'Middle Right',
        tileLabel: 'Mid Right',
        tileOrder: 6,
        renderOrder: 16,
        kind: 'surface',
      },
      {
        id: 'stage-far-right',
        sourceId: 'Layer_7',
        label: 'Far Right Wing',
        tileLabel: 'Far Right',
        tileOrder: 7,
        renderOrder: 25,
        kind: 'surface',
      },
      {
        id: 'stage-wall',
        sourceId: 'Layer_8',
        label: 'Lower Wall',
        tileLabel: 'Wall',
        tileOrder: 8,
        renderOrder: 10,
        kind: 'wall',
      },
    ],
    groupSurfaceSpecs: [
      {
        id: 'stage-group',
        sourceId: 'StageGroup',
        label: 'Combined',
        tileLabel: 'Combined',
        tileOrder: 0,
        renderOrder: 0,
        memberIds: [
          'stage-far-left',
          'stage-left',
          'stage-center-left',
          'stage-center-right',
          'stage-right',
          'stage-far-right',
        ],
      },
    ],
    venueTip: {
      eyebrow: 'Stage Impact',
      body: 'The 2400 x 1080 video wall is the cleanest home for the branding logo. Let the sails handle abstract motion and atmosphere around it.',
    },
  },
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}

function getRequiredAttribute(element: Element, attribute: string) {
  const value = element.getAttribute(attribute)

  if (!value) {
    throw new Error(`Missing required SVG attribute "${attribute}".`)
  }

  return value
}

function normalizeCoordinatePair(value: string) {
  return value
    .trim()
    .split(/[,\s]+/)
    .filter(Boolean)
}

function pointsToPathData(points: string, options: { closePath: boolean }) {
  const coordinates = normalizeCoordinatePair(points)

  if (coordinates.length < 4 || coordinates.length % 2 !== 0) {
    throw new Error('The SVG points attribute could not be parsed into coordinate pairs.')
  }

  const commands: string[] = []

  for (let index = 0; index < coordinates.length; index += 2) {
    const x = coordinates[index]
    const y = coordinates[index + 1]
    commands.push(`${index === 0 ? 'M' : 'L'} ${x} ${y}`)
  }

  if (options.closePath) {
    commands.push('Z')
  }

  return commands.join(' ')
}

function getShapePathData(group: Element) {
  const supportedShape = group.querySelector('path, polygon, polyline')

  if (!supportedShape) {
    throw new Error(`Could not find a supported SVG shape inside "${group.id}".`)
  }

  if (supportedShape.tagName === 'path') {
    return getRequiredAttribute(supportedShape, 'd')
  }

  const points = getRequiredAttribute(supportedShape, 'points')

  return pointsToPathData(points, {
    closePath: supportedShape.tagName === 'polygon' || supportedShape.tagName === 'polyline',
  })
}

function createDetachedPath(pathD: string, stageWidth: number, stageHeight: number) {
  const svg = document.createElementNS(svgNamespace, 'svg')
  svg.setAttribute('viewBox', `0 0 ${stageWidth} ${stageHeight}`)
  svg.setAttribute('width', `${stageWidth}`)
  svg.setAttribute('height', `${stageHeight}`)
  svg.setAttribute('aria-hidden', 'true')
  svg.style.position = 'absolute'
  svg.style.opacity = '0'
  svg.style.pointerEvents = 'none'
  svg.style.overflow = 'hidden'

  const path = document.createElementNS(svgNamespace, 'path')
  path.setAttribute('d', pathD)
  svg.appendChild(path)
  document.body.appendChild(svg)

  return { svg, path }
}

function getFallbackPromptAnchor(bounds: Bounds): PromptAnchor {
  const width = clamp(bounds.width * 0.52, 112, 240)

  return {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
    maxWidth: width,
    fontSize: clamp(width * 0.092, 10, 16),
  }
}

function getWidestHorizontalSegment(path: SVGPathElement, bounds: Bounds, y: number, step: number) {
  let segmentStart: number | null = null
  let lastInsideX = bounds.x
  let widestStart = bounds.x + bounds.width / 2
  let widestEnd = widestStart

  for (let x = bounds.x; x <= bounds.x + bounds.width; x += step) {
    const inside = path.isPointInFill(new DOMPoint(x, y))

    if (inside) {
      if (segmentStart === null) {
        segmentStart = x
      }

      lastInsideX = x
      continue
    }

    if (segmentStart !== null) {
      if (lastInsideX - segmentStart > widestEnd - widestStart) {
        widestStart = segmentStart
        widestEnd = lastInsideX
      }

      segmentStart = null
    }
  }

  if (segmentStart !== null && lastInsideX - segmentStart > widestEnd - widestStart) {
    widestStart = segmentStart
    widestEnd = lastInsideX
  }

  return {
    start: widestStart,
    end: widestEnd,
    width: Math.max(step, widestEnd - widestStart),
  }
}

function getPromptAnchor(path: SVGPathElement, bounds: Bounds): PromptAnchor {
  if (typeof path.isPointInFill !== 'function') {
    return getFallbackPromptAnchor(bounds)
  }

  const sampleColumns = clamp(Math.round(bounds.width / 24), 12, 28)
  const sampleRows = clamp(Math.round(bounds.height / 24), 12, 28)
  let sumX = 0
  let sumY = 0
  let pointCount = 0

  for (let row = 0; row < sampleRows; row += 1) {
    const y = bounds.y + ((row + 0.5) / sampleRows) * bounds.height

    for (let column = 0; column < sampleColumns; column += 1) {
      const x = bounds.x + ((column + 0.5) / sampleColumns) * bounds.width

      if (path.isPointInFill(new DOMPoint(x, y))) {
        sumX += x
        sumY += y
        pointCount += 1
      }
    }
  }

  if (pointCount === 0) {
    return getFallbackPromptAnchor(bounds)
  }

  const centroidY = sumY / pointCount
  const scanStep = clamp(Math.min(bounds.width, bounds.height) / 26, 4, 10)
  const yCandidates = [
    clamp(centroidY, bounds.y + scanStep, bounds.y + bounds.height - scanStep),
    clamp(centroidY - bounds.height * 0.12, bounds.y + scanStep, bounds.y + bounds.height - scanStep),
    clamp(centroidY + bounds.height * 0.12, bounds.y + scanStep, bounds.y + bounds.height - scanStep),
    clamp(bounds.y + bounds.height * 0.66, bounds.y + scanStep, bounds.y + bounds.height - scanStep),
  ]

  const bestSegment = yCandidates.reduce(
    (best, candidateY) => {
      const segment = getWidestHorizontalSegment(path, bounds, candidateY, scanStep)

      if (segment.width > best.width) {
        return {
          width: segment.width,
          start: segment.start,
          end: segment.end,
          y: candidateY,
        }
      }

      return best
    },
    {
      ...getWidestHorizontalSegment(path, bounds, centroidY, scanStep),
      y: centroidY,
    },
  )

  const maxWidth = clamp(bestSegment.width * 0.74, 112, 240)

  return {
    x: (bestSegment.start + bestSegment.end) / 2,
    y: bestSegment.y,
    maxWidth,
    fontSize: clamp(maxWidth * 0.09, 10, 16),
  }
}

function getPathMetrics(pathD: string, stageWidth: number, stageHeight: number): {
  bounds: Bounds
  promptAnchor: PromptAnchor
} {
  const { svg, path } = createDetachedPath(pathD, stageWidth, stageHeight)

  const box = path.getBBox()
  const bounds = {
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
  }
  const promptAnchor = getPromptAnchor(path, bounds)
  svg.remove()

  return {
    bounds,
    promptAnchor,
  }
}

function combinePathData(paths: string[]) {
  return paths.join(' ')
}

function getStageSize(svgDocument: Document) {
  const embeddedImage = svgDocument.querySelector('image')

  if (embeddedImage) {
    return {
      stageWidth: Number(getRequiredAttribute(embeddedImage, 'width')),
      stageHeight: Number(getRequiredAttribute(embeddedImage, 'height')),
    }
  }

  const root = svgDocument.documentElement
  const viewBox = root.getAttribute('viewBox')

  if (!viewBox) {
    throw new Error('The SVG is missing both an embedded reference image and a viewBox.')
  }

  const [, , width, height] = viewBox.split(/\s+/).map(Number)

  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    throw new Error('The SVG viewBox could not be parsed.')
  }

  return {
    stageWidth: width,
    stageHeight: height,
  }
}

function normalizeSurfaceDefinitions(
  svgDocument: Document,
  stageWidth: number,
  stageHeight: number,
  surfaceSpecs: SurfaceSpec[],
): SurfaceDefinition[] {
  return surfaceSpecs.map((surface) => {
    const group = svgDocument.getElementById(surface.sourceId)

    if (!group) {
      throw new Error(`Could not find SVG group "${surface.sourceId}".`)
    }
    const pathD = getShapePathData(group)
    const metrics = getPathMetrics(pathD, stageWidth, stageHeight)

    return {
      id: surface.id,
      sourceId: surface.sourceId,
      label: surface.label,
      tileLabel: surface.tileLabel,
      tileOrder: surface.tileOrder,
      pathD,
      bounds: metrics.bounds,
      promptAnchor: metrics.promptAnchor,
      renderOrder: surface.renderOrder,
      kind: surface.kind,
      editable: true,
    }
  })
}

export async function loadVenueAssetManifest(venueId: LiveVenueId): Promise<VenueAssetManifest> {
  const config = venueManifestConfigs[venueId]
  const response = await fetch(config.rawSvgPath)

  if (!response.ok) {
    throw new Error(`Could not load the ${venueId} SVG asset.`)
  }

  const svgText = await response.text()
  const parsed = new DOMParser().parseFromString(svgText, 'image/svg+xml')
  const { stageWidth, stageHeight } = getStageSize(parsed)
  const surfaces = normalizeSurfaceDefinitions(parsed, stageWidth, stageHeight, config.surfaceSpecs)
  const groupedSurfaces = config.groupSurfaceSpecs.map((groupSurfaceSpec) => {
    const groupedPath = combinePathData(
      groupSurfaceSpec.memberIds.map((surfaceId) => {
        const surface = surfaces.find((candidate) => candidate.id === surfaceId)

        if (!surface) {
          throw new Error(`Missing grouped surface member "${surfaceId}".`)
        }

        return surface.pathD
      }),
    )
    const groupedMetrics = getPathMetrics(groupedPath, stageWidth, stageHeight)

    return {
      id: groupSurfaceSpec.id,
      sourceId: groupSurfaceSpec.sourceId,
      label: groupSurfaceSpec.label,
      tileLabel: groupSurfaceSpec.tileLabel,
      tileOrder: groupSurfaceSpec.tileOrder,
      pathD: groupedPath,
      bounds: groupedMetrics.bounds,
      promptAnchor: groupedMetrics.promptAnchor,
      renderOrder: groupSurfaceSpec.renderOrder,
      kind: 'group' as const,
      editable: true,
      memberIds: groupSurfaceSpec.memberIds,
    }
  })

  return {
    version: config.version,
    backgroundAssetPath: config.backgroundAssetPath,
    topOverlayAssetPath: config.topOverlayAssetPath,
    rawSvgPath: config.rawSvgPath,
    stageWidth,
    stageHeight,
    defaultSelectedSurfaceId: config.defaultSelectedSurfaceId,
    venueTip: config.venueTip,
    surfaces,
    groupedSurfaces,
  }
}
