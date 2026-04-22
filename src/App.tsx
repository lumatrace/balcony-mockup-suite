import { startTransition, useEffect, useRef, useState } from 'react'
import type { DragEvent, ReactNode } from 'react'
import { VenueWorkspace } from './components/VenueWorkspace'
import { downloadBuilderProjectPackage } from './lib/submissions'

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
const clientUploadRequestUrl = 'https://www.dropbox.com/request/0vs9xzowv5enb2po6y8x'

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

function openClientUploadRequest() {
  window.open(clientUploadRequestUrl, '_blank', 'noopener,noreferrer')
}

function reserveClientUploadWindow() {
  const uploadWindow = window.open('', '_blank')

  if (!uploadWindow) {
    return null
  }

  try {
    uploadWindow.document.title = 'Preparing Dropbox Upload'
    uploadWindow.document.body.innerHTML = `
      <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #111116; color: #f5f5f8; min-height: 100vh; display: grid; place-items: center; margin: 0; padding: 24px;">
        <div style="max-width: 460px; text-align: center;">
          <p style="letter-spacing: 0.22em; text-transform: uppercase; font-size: 12px; color: #b67dff; margin: 0 0 12px;">The Balcony</p>
          <h1 style="font-size: 28px; line-height: 1.15; margin: 0 0 12px;">Preparing your Dropbox upload...</h1>
          <p style="font-size: 15px; line-height: 1.6; margin: 0; color: rgba(245, 245, 248, 0.72);">
            Leave this tab open for a moment. Your ZIP is being built and this page will continue to Dropbox automatically.
          </p>
        </div>
      </div>
    `
  } catch {
    return uploadWindow
  }

  return uploadWindow
}

function continueToClientUploadRequest(uploadWindow: Window | null) {
  if (uploadWindow && !uploadWindow.closed) {
    uploadWindow.location.replace(clientUploadRequestUrl)
    return true
  }

  return Boolean(window.open(clientUploadRequestUrl, '_blank', 'noopener,noreferrer'))
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
  statusMessage,
  statusTone,
  onBack,
  onOpenFilePicker,
  onOpenUploadLink,
  onDropFiles,
  onDragActiveChange,
}: {
  selectedZipName: string | null
  isDragActive: boolean
  statusMessage: string | null
  statusTone: 'neutral' | 'success' | 'error'
  onBack: () => void
  onOpenFilePicker: () => void
  onOpenUploadLink: () => void
  onDropFiles: (files: FileList | null) => void
  onDragActiveChange: (active: boolean) => void
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
        title="Prepare One ZIP For Corey"
        description="Bundle your media, logos, notes, and references into one ZIP file. Once it is ready, upload that ZIP through the Dropbox request link."
      >
        <div className="welcome-inline-actions">
          <button type="button" className="welcome-back-button" onClick={onOpenUploadLink}>
            Open Dropbox Upload
          </button>
          <button type="button" className="welcome-back-button welcome-back-button--ghost" onClick={onBack}>
            Back To Welcome
          </button>
        </div>
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
            <p>One clean package keeps the handoff simple.</p>
            <span className="upload-dropzone__button">Choose ZIP File</span>
            <small>
              {selectedZipName ? `Ready: ${selectedZipName}` : 'ZIP files only for now'}
            </small>
          </button>

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
  const [selectedZipName, setSelectedZipName] = useState<string | null>(null)
  const [zipDragActive, setZipDragActive] = useState(false)
  const [zipSubmissionMessage, setZipSubmissionMessage] = useState<string | null>(null)
  const [zipSubmissionTone, setZipSubmissionTone] = useState<'neutral' | 'success' | 'error'>('neutral')
  const [saveRequestId, setSaveRequestId] = useState(0)
  const [isSavingLayout, setIsSavingLayout] = useState(false)
  const [saveStatusMessage, setSaveStatusMessage] = useState<string | null>(null)
  const [submissionNotes, setSubmissionNotes] = useState('')
  const [needsManualDropboxOpen, setNeedsManualDropboxOpen] = useState(false)
  const zipInputRef = useRef<HTMLInputElement | null>(null)
  const saveExpectedCountRef = useRef(0)
  const saveAcknowledgedCountRef = useRef(0)
  const saveErrorSeenRef = useRef(false)

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

  function getVisibleVenueIds(pageId: AppPageId): VenueId[] {
    if (pageId === 'bar') {
      return ['bar', 'entrance', 'exit', 'stage']
    }

    if (pageId === 'entrance' || pageId === 'exit' || pageId === 'stage') {
      return [pageId]
    }

    return []
  }

  function handleSaveLayout() {
    const visibleVenueIds = getVisibleVenueIds(currentPageId)

    if (visibleVenueIds.length === 0) {
      return
    }

    saveExpectedCountRef.current = visibleVenueIds.length
    saveAcknowledgedCountRef.current = 0
    saveErrorSeenRef.current = false
    setIsSavingLayout(true)
    setSaveStatusMessage('Saving every angle on this browser...')
    setSaveRequestId((current) => current + 1)
  }

  function handleSaveAcknowledged(_venueId: VenueId, errorMessage?: string) {
    if (errorMessage && !saveErrorSeenRef.current) {
      saveErrorSeenRef.current = true
      setIsSavingLayout(false)
      setSaveStatusMessage(errorMessage)
      return
    }

    saveAcknowledgedCountRef.current += 1

    if (saveAcknowledgedCountRef.current >= saveExpectedCountRef.current) {
      setIsSavingLayout(false)
      setSaveStatusMessage('Saved. This layout will still be here when you come back on this browser.')
    }
  }

  async function handleSubmitPage() {
    if (!isVenuePage(currentPageId)) {
      return
    }

    const reservedUploadWindow = reserveClientUploadWindow()

    try {
      setIsBuilderSubmitting(true)
      setNeedsManualDropboxOpen(false)
      setBuilderSubmissionTone('neutral')
      setBuilderSubmissionMessage('Building your downloadable package now...')

      await new Promise((resolve) => window.setTimeout(resolve, 450))
      const result = await downloadBuilderProjectPackage(initialProjectName, submissionNotes)
      const openedUploadWindow = continueToClientUploadRequest(reservedUploadWindow)

      setSubmittedPageId(currentPageId)
      setNeedsResubmitPageId(null)
      setBuilderSubmissionTone('success')
      setBuilderSubmissionMessage(
        openedUploadWindow
          ? `Downloaded ${result.filename}. Final step: drag that ZIP from Downloads into the Dropbox tab to actually send it.`
          : `Downloaded ${result.filename}. Your browser blocked the Dropbox tab, so use the link below to open it manually and upload the ZIP from Downloads.`,
      )
      setNeedsManualDropboxOpen(!openedUploadWindow)
    } catch (error) {
      if (reservedUploadWindow && !reservedUploadWindow.closed) {
        reservedUploadWindow.close()
      }
      setBuilderSubmissionTone('error')
      setBuilderSubmissionMessage(
        error instanceof Error ? error.message : 'The mapping package could not be downloaded.',
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

    setSelectedZipName(file.name)
    setZipSubmissionTone('success')
    setZipSubmissionMessage(
      `ZIP ready. Upload ${file.name} using Corey’s Dropbox request link.`,
    )
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
            statusMessage={zipSubmissionMessage}
            statusTone={zipSubmissionTone}
            onBack={() => navigateToPage('welcome')}
            onOpenFilePicker={() => zipInputRef.current?.click()}
            onOpenUploadLink={openClientUploadRequest}
            onDropFiles={handleZipFiles}
            onDragActiveChange={setZipDragActive}
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
              aria-label="Send your design here."
            >
              {isBuilderSubmitting ? 'Preparing Your ZIP…' : 'Prepare ZIP For Dropbox'}
            </button>

            <section className="hero-upload-guidance" aria-label="Recommended upload formats">
              <span className="hero-upload-guidance__eyebrow">Easy Handoff</span>
              <p>Click the purple button above.</p>
              <p>We’ll zip and relabel everything for you, then open Dropbox.</p>
              <p>Final step: drag the ZIP from Downloads into Dropbox to send it.</p>
            </section>

            {builderSubmissionMessage ? (
              <p className={`submission-feedback submission-feedback--${builderSubmissionTone}`}>
                {builderSubmissionMessage}
              </p>
            ) : null}

            {needsManualDropboxOpen ? (
              <p className="submission-feedback submission-feedback--neutral">
                Dropbox didn’t open automatically?{' '}
                <a href={clientUploadRequestUrl} target="_blank" rel="noreferrer">
                  Open the upload page here
                </a>
                , then upload the ZIP from Downloads.
              </p>
            ) : null}
          </div>
        </div>
      </header>

      {currentPageId === 'bar' ? (
        <>
          <VenueWorkspace
            venueId="bar"
            projectName={initialProjectName}
            onDirty={handleWorkspaceDirty}
            onSaveLayout={handleSaveLayout}
            isSavingLayout={isSavingLayout}
            saveStatusMessage={saveStatusMessage}
            saveRequestId={saveRequestId}
            onSaveAcknowledged={handleSaveAcknowledged}
          />

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
            <VenueWorkspace
              venueId="entrance"
              projectName={initialProjectName}
              onDirty={handleWorkspaceDirty}
              onSaveLayout={handleSaveLayout}
              isSavingLayout={isSavingLayout}
              saveStatusMessage={saveStatusMessage}
              saveRequestId={saveRequestId}
              onSaveAcknowledged={handleSaveAcknowledged}
            />
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
            <VenueWorkspace
              venueId="exit"
              projectName={initialProjectName}
              onDirty={handleWorkspaceDirty}
              onSaveLayout={handleSaveLayout}
              isSavingLayout={isSavingLayout}
              saveStatusMessage={saveStatusMessage}
              saveRequestId={saveRequestId}
              onSaveAcknowledged={handleSaveAcknowledged}
            />
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
            <VenueWorkspace
              venueId="stage"
              projectName={initialProjectName}
              onDirty={handleWorkspaceDirty}
              onSaveLayout={handleSaveLayout}
              isSavingLayout={isSavingLayout}
              saveStatusMessage={saveStatusMessage}
              saveRequestId={saveRequestId}
              onSaveAcknowledged={handleSaveAcknowledged}
            />
          </section>

          <section className="bottom-handoff-card">
            <div className="bottom-handoff-card__copy">
              <p className="eyebrow">Final Handoff</p>
              <h2>One Last Step</h2>
              <p>
                Add any notes here, then use the button below to prepare the ZIP and upload it through Dropbox.
              </p>
              <div className="bottom-handoff-card__guidance">
                <p>
                  This mockup is the starting point. Because projection behaves differently once it is live in the room,
                  some placements may need to be adjusted after we test the content on site.
                </p>
                <p>
                  For the most cohesive and immersive result, we usually recommend carrying the same image or video
                  language across the wall surfaces instead of treating each one as a completely separate moment.
                </p>
              </div>
            </div>

            <label className="bottom-handoff-card__notes">
              <span>Notes</span>
              <textarea
                value={submissionNotes}
                onChange={(event) => setSubmissionNotes(event.target.value)}
                placeholder="Anything we should know about your content, timing, or placement?"
              />
            </label>

            <button
              type="button"
              className="hero-submit-button bottom-handoff-card__button"
              disabled={isBuilderSubmitting}
              onClick={handleSubmitPage}
            >
              {isBuilderSubmitting ? 'Preparing Your ZIP…' : 'Prepare ZIP For Dropbox'}
            </button>
          </section>
        </>
      ) : currentPageId === 'entrance' ? (
        <VenueWorkspace
          venueId="entrance"
          projectName={initialProjectName}
          onDirty={handleWorkspaceDirty}
          onSaveLayout={handleSaveLayout}
          isSavingLayout={isSavingLayout}
          saveStatusMessage={saveStatusMessage}
          saveRequestId={saveRequestId}
          onSaveAcknowledged={handleSaveAcknowledged}
        />
      ) : currentPageId === 'exit' ? (
        <VenueWorkspace
          venueId="exit"
          projectName={initialProjectName}
          onDirty={handleWorkspaceDirty}
          onSaveLayout={handleSaveLayout}
          isSavingLayout={isSavingLayout}
          saveStatusMessage={saveStatusMessage}
          saveRequestId={saveRequestId}
          onSaveAcknowledged={handleSaveAcknowledged}
        />
      ) : (
        <VenueWorkspace
          venueId="stage"
          projectName={initialProjectName}
          onDirty={handleWorkspaceDirty}
          onSaveLayout={handleSaveLayout}
          isSavingLayout={isSavingLayout}
          saveStatusMessage={saveStatusMessage}
          saveRequestId={saveRequestId}
          onSaveAcknowledged={handleSaveAcknowledged}
        />
      )}
    </main>
  )
}
