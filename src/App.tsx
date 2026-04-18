import { startTransition, useEffect, useRef, useState } from 'react'
import type { DragEvent, ReactNode } from 'react'
import { VenueWorkspace } from './components/VenueWorkspace'
import { submitBuilderProject, submitUploadedZip } from './lib/submissions'

type VenueId = 'bar' | 'entrance' | 'exit' | 'stage'
type AppPageId = 'welcome' | 'upload' | VenueId

type VenuePage = {
  id: VenueId
  label: string
  route: string
  eyebrow: string
  heading: string
  description: string
  status: string
  ready: boolean
}

const initialProjectName = 'Hard Rock Balcony v1'

const welcomeSlides = [
  {
    id: 'welcome-slide-1',
    src: '/assets/branding/welcome-slide-1.png',
    alt: 'Balcony crowd scene with lit slat canopies above the bar.',
  },
  {
    id: 'welcome-slide-2',
    src: '/assets/branding/welcome-slide-2.png',
    alt: 'Balcony stage performance with the video wall and stage sails visible.',
  },
  {
    id: 'welcome-slide-3',
    src: '/assets/branding/welcome-slide-3.png',
    alt: 'Balcony dance floor scene showing the room branding and projected surfaces.',
  },
  {
    id: 'welcome-slide-4',
    src: '/assets/branding/welcome-slide-4.jpg',
    alt: 'Balcony room overview with the bar, center logo wall, and canopies lit overhead.',
  },
]

const venuePages: VenuePage[] = [
  {
    id: 'bar',
    label: 'Bar',
    route: '/bar',
    eyebrow: 'Bar',
    heading: 'Bar',
    description: '',
    status: 'Live editor',
    ready: true,
  },
  {
    id: 'entrance',
    label: 'Entrance',
    route: '/entrance',
    eyebrow: 'Entrance',
    heading: 'Entrance',
    description: '',
    status: 'Live editor',
    ready: true,
  },
  {
    id: 'exit',
    label: 'South Wall',
    route: '/exit',
    eyebrow: 'South Wall',
    heading: 'South Wall',
    description: '',
    status: 'Live editor',
    ready: true,
  },
  {
    id: 'stage',
    label: 'Stage',
    route: '/stage',
    eyebrow: 'Stage',
    heading: 'Stage',
    description: '',
    status: 'Live editor',
    ready: true,
  },
]

function getAppPageIdFromPath(pathname: string): AppPageId {
  const normalizedPath = pathname.trim().toLowerCase()
  const routeSegment = normalizedPath.split('/').filter(Boolean)[0]

  if (!routeSegment) {
    return 'welcome'
  }

  if (routeSegment === 'upload') {
    return 'upload'
  }

  if (routeSegment === 'bar' || routeSegment === 'entrance' || routeSegment === 'exit' || routeSegment === 'stage') {
    return routeSegment
  }

  return 'welcome'
}

function isVenuePage(pageId: AppPageId): pageId is VenueId {
  return pageId === 'bar' || pageId === 'entrance' || pageId === 'exit' || pageId === 'stage'
}

function getRouteForPage(pageId: AppPageId) {
  if (pageId === 'welcome') {
    return '/'
  }

  if (pageId === 'upload') {
    return '/upload'
  }

  return venuePages.find((page) => page.id === pageId)?.route ?? '/bar'
}

function getVenuePage(venueId: VenueId) {
  return venuePages.find((page) => page.id === venueId) ?? venuePages[0]
}

function getDocumentTitle(pageId: AppPageId) {
  if (pageId === 'welcome') {
    return 'Welcome | The Balcony Mockup Suite'
  }

  if (pageId === 'upload') {
    return 'Upload Files | The Balcony Mockup Suite'
  }

  return `${getVenuePage(pageId).label} | The Balcony Mockup Suite`
}

function isZipFile(file: File) {
  const lowercaseName = file.name.toLowerCase()

  return (
    lowercaseName.endsWith('.zip') ||
    file.type === 'application/zip' ||
    file.type === 'application/x-zip-compressed'
  )
}

function BrandHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <header className="brand-hero">
      <div className="brand-hero__content">
        <div className="brand-lockup-frame">
          <div className="brand-lockup-capsule">
            <img
              className="brand-lockup"
              src="/assets/branding/balcony-hero.png"
              alt="The Balcony client design board at Hard Rock Hotel & Casino Atlantic City"
            />
          </div>
        </div>

        <div className="hero-sidebar-card welcome-sidebar-card">
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="hero-copy">{description}</p>
          {children}
        </div>
      </div>
    </header>
  )
}

function WelcomePage({
  onGoUpload,
  onGoDesign,
}: {
  onGoUpload: () => void
  onGoDesign: () => void
}) {
  const [activeSlideIndex, setActiveSlideIndex] = useState(0)

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveSlideIndex((currentIndex) => (currentIndex + 1) % welcomeSlides.length)
    }, 3000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [])

  return (
    <>
      <header className="brand-hero brand-hero--welcome">
        <div className="brand-hero__content brand-hero__content--single">
          <div className="brand-lockup-frame brand-lockup-frame--welcome">
            <div className="brand-lockup-capsule">
              <img
                className="brand-lockup"
                src="/assets/branding/balcony-hero.png"
                alt="The Balcony client design board at Hard Rock Hotel & Casino Atlantic City"
              />
            </div>
          </div>
        </div>
      </header>

      <section className="welcome-shell">
        <div className="welcome-video-card">
          <div className="welcome-actions">
            <button type="button" className="welcome-action-button" onClick={onGoDesign}>
              <strong>I Want To Design It</strong>
              <span>Open the design board and start mapping</span>
            </button>

            <button
              type="button"
              className="welcome-action-button welcome-action-button--secondary"
              onClick={onGoUpload}
            >
              <strong>I Want To Upload My Files</strong>
              <span>and have you design it for me</span>
            </button>
          </div>

          <div className="welcome-video-frame">
            <div className="welcome-carousel" aria-label="Venue preview carousel">
              {welcomeSlides.map((slide, index) => (
                <img
                  key={slide.id}
                  className={`welcome-carousel-slide ${index === activeSlideIndex ? 'is-active' : ''}`}
                  src={slide.src}
                  alt={slide.alt}
                />
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

function UploadZipPage({
  selectedZipName,
  isDragActive,
  isSubmitting,
  statusMessage,
  statusTone,
  onBack,
  onOpenFilePicker,
  onDropFiles,
  onDragActiveChange,
  onSubmitZip,
}: {
  selectedZipName: string | null
  isDragActive: boolean
  isSubmitting: boolean
  statusMessage: string | null
  statusTone: 'neutral' | 'success' | 'error'
  onBack: () => void
  onOpenFilePicker: () => void
  onDropFiles: (files: FileList | null) => void
  onDragActiveChange: (active: boolean) => void
  onSubmitZip: () => void
}) {
  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.stopPropagation()
    onDragActiveChange(false)
    onDropFiles(event.dataTransfer.files)
  }

  return (
    <>
      <BrandHeader
        eyebrow="Concierge Upload"
        title="Send One ZIP And We’ll Take It From Here"
        description="Bundle your media, logos, notes, and references into one ZIP file. This path stays out of the builder and keeps the handoff simple."
      >
        <button type="button" className="welcome-back-button" onClick={onBack}>
          Back To Welcome
        </button>
      </BrandHeader>

      <section className="upload-shell">
        <div className="upload-shell__stack">
          <button
            type="button"
            className={`upload-dropzone ${isDragActive ? 'is-drag-active' : ''}`}
            onClick={onOpenFilePicker}
            onDragEnter={(event) => {
              event.preventDefault()
              event.stopPropagation()
              onDragActiveChange(true)
            }}
            onDragOver={(event) => {
              event.preventDefault()
              event.stopPropagation()
              onDragActiveChange(true)
            }}
            onDragLeave={(event) => {
              event.preventDefault()
              event.stopPropagation()
              onDragActiveChange(false)
            }}
            onDrop={handleDrop}
          >
            <div className="upload-dropzone__badge">ZIP Upload</div>
            <h2>Drop Your ZIP File Here</h2>
            <p>One package is all we need to start designing for you.</p>
            <span className="upload-dropzone__button">Choose ZIP File</span>
            <small>
              {selectedZipName ? `Ready: ${selectedZipName}` : 'ZIP files only for now'}
            </small>
          </button>

          {selectedZipName ? (
            <button
              type="button"
              className="upload-submit-button"
              onClick={onSubmitZip}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting ZIP…' : 'Submit ZIP For Design'}
            </button>
          ) : null}

          {statusMessage ? (
            <p className={`submission-feedback submission-feedback--${statusTone}`}>{statusMessage}</p>
          ) : null}
        </div>
      </section>
    </>
  )
}

export function App() {
  const [currentPageId, setCurrentPageId] = useState<AppPageId>(() =>
    getAppPageIdFromPath(window.location.pathname),
  )
  const [submittedPageId, setSubmittedPageId] = useState<VenueId | null>(null)
  const [needsResubmitPageId, setNeedsResubmitPageId] = useState<VenueId | null>(null)
  const [isBuilderSubmitting, setIsBuilderSubmitting] = useState(false)
  const [builderSubmissionMessage, setBuilderSubmissionMessage] = useState<string | null>(null)
  const [builderSubmissionTone, setBuilderSubmissionTone] = useState<'neutral' | 'success' | 'error'>('neutral')
  const [selectedZipFile, setSelectedZipFile] = useState<File | null>(null)
  const [selectedZipName, setSelectedZipName] = useState<string | null>(null)
  const [zipDragActive, setZipDragActive] = useState(false)
  const [isZipSubmitting, setIsZipSubmitting] = useState(false)
  const [zipSubmissionMessage, setZipSubmissionMessage] = useState<string | null>(null)
  const [zipSubmissionTone, setZipSubmissionTone] = useState<'neutral' | 'success' | 'error'>('neutral')
  const zipInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    function handlePopState() {
      setCurrentPageId(getAppPageIdFromPath(window.location.pathname))
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  useEffect(() => {
    document.title = getDocumentTitle(currentPageId)
  }, [currentPageId])

  function navigateToPage(pageId: AppPageId) {
    const route = getRouteForPage(pageId)

    if (window.location.pathname !== route) {
      window.history.pushState({}, '', route)
    }

    startTransition(() => {
      setCurrentPageId(pageId)
    })
  }

  function navigateToVenue(venueId: VenueId) {
    navigateToPage(venueId)
  }

  function handleWorkspaceDirty() {
    if (!isVenuePage(currentPageId)) {
      return
    }

    setSubmittedPageId((current) => (current === currentPageId ? null : current))
    setNeedsResubmitPageId(currentPageId)
    setBuilderSubmissionMessage(null)
  }

  async function handleSubmitPage() {
    if (!isVenuePage(currentPageId)) {
      return
    }

    try {
      setIsBuilderSubmitting(true)
      setBuilderSubmissionTone('neutral')
      setBuilderSubmissionMessage('Packaging your mapped media and uploading it now...')

      await new Promise((resolve) => window.setTimeout(resolve, 450))
      const result = await submitBuilderProject(initialProjectName)

      setSubmittedPageId(currentPageId)
      setNeedsResubmitPageId(null)
      setBuilderSubmissionTone(result.warning ? 'neutral' : 'success')
      setBuilderSubmissionMessage(
        result.warning ?? 'Submission received. Your media package is in and ready for mapping.',
      )
    } catch (error) {
      setBuilderSubmissionTone('error')
      setBuilderSubmissionMessage(
        error instanceof Error ? error.message : 'The mapping package could not be submitted.',
      )
    } finally {
      setIsBuilderSubmitting(false)
    }
  }

  function handleZipFiles(files: FileList | null) {
    const file = files?.[0]

    if (!file || !isZipFile(file)) {
      return
    }

    setSelectedZipFile(file)
    setSelectedZipName(file.name)
    setZipSubmissionTone('neutral')
    setZipSubmissionMessage('ZIP ready. Submit it when you are ready for us to take over.')
  }

  async function handleSubmitZip() {
    if (!selectedZipFile) {
      return
    }

    try {
      setIsZipSubmitting(true)
      setZipSubmissionTone('neutral')
      setZipSubmissionMessage('Uploading your ZIP package now...')
      const result = await submitUploadedZip(selectedZipFile, `${initialProjectName} concierge upload`)

      setZipSubmissionTone(result.warning ? 'neutral' : 'success')
      setZipSubmissionMessage(
        result.warning ?? 'ZIP received. Your files are in and ready for design.',
      )
    } catch (error) {
      setZipSubmissionTone('error')
      setZipSubmissionMessage(
        error instanceof Error ? error.message : 'The ZIP package could not be submitted.',
      )
    } finally {
      setIsZipSubmitting(false)
    }
  }

  if (!isVenuePage(currentPageId)) {
    return (
      <main className="app-shell app-shell--welcome">
        {currentPageId === 'welcome' ? (
          <WelcomePage onGoUpload={() => navigateToPage('upload')} onGoDesign={() => navigateToVenue('bar')} />
        ) : (
          <UploadZipPage
            selectedZipName={selectedZipName}
            isDragActive={zipDragActive}
            isSubmitting={isZipSubmitting}
            statusMessage={zipSubmissionMessage}
            statusTone={zipSubmissionTone}
            onBack={() => navigateToPage('welcome')}
            onOpenFilePicker={() => zipInputRef.current?.click()}
            onDropFiles={handleZipFiles}
            onDragActiveChange={setZipDragActive}
            onSubmitZip={handleSubmitZip}
          />
        )}

        <input
          ref={zipInputRef}
          className="hidden-input"
          type="file"
          accept=".zip,application/zip,application/x-zip-compressed"
          onChange={(event) => {
            handleZipFiles(event.target.files)
            event.target.value = ''
          }}
        />
      </main>
    )
  }

  const activePageNeedsResubmit = needsResubmitPageId === currentPageId
  const activePageIsSubmitted = submittedPageId === currentPageId

  return (
    <main className="app-shell">
      <header className="brand-hero">
        <div className="brand-hero__content">
          <div className="brand-lockup-frame">
            <div className="brand-lockup-capsule">
              <img
                className="brand-lockup"
                src="/assets/branding/balcony-hero.png"
                alt="The Balcony client design board at Hard Rock Hotel & Casino Atlantic City"
              />
            </div>
          </div>

          <div className="hero-sidebar-card">
            <button
              type="button"
              className={[
                'hero-submit-button',
                activePageIsSubmitted ? 'is-ready' : '',
                activePageNeedsResubmit ? 'needs-resubmit' : '',
              ].join(' ')}
              disabled={isBuilderSubmitting}
              onClick={handleSubmitPage}
              aria-label="Submit all media to be mapped."
            >
              {isBuilderSubmitting ? 'Submitting Mapping Package…' : 'Submit All Media To Be Mapped'}
            </button>

            <section className="hero-upload-guidance" aria-label="Recommended upload formats">
              <span className="hero-upload-guidance__eyebrow">Upload Specs</span>
              <p>
                Videos work best as H.264 MP4 at 1920 x 1080. Use 2400 x 1080 for the stage video wall.
                JPEG and PNG images work too.
              </p>
            </section>

            {builderSubmissionMessage ? (
              <p className={`submission-feedback submission-feedback--${builderSubmissionTone}`}>
                {builderSubmissionMessage}
              </p>
            ) : null}
          </div>
        </div>
      </header>

      {currentPageId === 'bar' ? (
        <>
          <VenueWorkspace venueId="bar" projectName={initialProjectName} onDirty={handleWorkspaceDirty} />

          <section className="angle-divider" aria-label="Second angle divider">
            <div className="angle-divider__line" aria-hidden="true" />
            <span className="angle-divider__label">Entrance</span>
            <div className="angle-divider__line" aria-hidden="true" />
          </section>

          <section className="workspace-section">
            <div className="workspace-section__heading">
              <p className="eyebrow">Entrance</p>
              <h2>Entrance</h2>
            </div>
            <VenueWorkspace venueId="entrance" projectName={initialProjectName} onDirty={handleWorkspaceDirty} />
          </section>

          <section className="angle-divider" aria-label="Third angle divider">
            <div className="angle-divider__line" aria-hidden="true" />
            <span className="angle-divider__label">South Wall</span>
            <div className="angle-divider__line" aria-hidden="true" />
          </section>

          <section className="workspace-section">
            <div className="workspace-section__heading">
              <p className="eyebrow">South Wall</p>
              <h2>South Wall</h2>
            </div>
            <VenueWorkspace venueId="exit" projectName={initialProjectName} onDirty={handleWorkspaceDirty} />
          </section>

          <section className="angle-divider" aria-label="Fourth angle divider">
            <div className="angle-divider__line" aria-hidden="true" />
            <span className="angle-divider__label">Stage</span>
            <div className="angle-divider__line" aria-hidden="true" />
          </section>

          <section className="workspace-section">
            <div className="workspace-section__heading">
              <p className="eyebrow">Stage</p>
              <h2>Stage</h2>
            </div>
            <VenueWorkspace venueId="stage" projectName={initialProjectName} onDirty={handleWorkspaceDirty} />
          </section>
        </>
      ) : currentPageId === 'entrance' ? (
        <VenueWorkspace venueId="entrance" projectName={initialProjectName} onDirty={handleWorkspaceDirty} />
      ) : currentPageId === 'exit' ? (
        <VenueWorkspace venueId="exit" projectName={initialProjectName} onDirty={handleWorkspaceDirty} />
      ) : (
        <VenueWorkspace venueId="stage" projectName={initialProjectName} onDirty={handleWorkspaceDirty} />
      )}
    </main>
  )
}
