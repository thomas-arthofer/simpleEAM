import React, { useMemo, useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useLocale, useTranslations } from 'next-intl'
import { useApolloClient } from '@apollo/client'
import { CaptureUpdateAction } from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'
import { ExcalidrawComponentProps } from '../types/DiagramTypes'
import { useThemeMode } from '@/contexts/ThemeContext'
import { useCompanyContext } from '@/contexts/CompanyContext'
import { useThemeConfig } from '@/lib/runtime-config'
import { useFeatureFlags } from '@/lib/feature-flags'
import ExcalidrawLoading from './ExcalidrawLoading'
import { useExcalidrawCollaboration } from '../hooks/useExcalidrawCollaboration'
import { CollaborationDialog } from '../dialogs/CollaborationDialog'
import LinkRelatedElementDialog from '../dialogs/LinkRelatedElementDialog'
import { FullCustomContextMenu } from './FullCustomContextMenu'
import ElementFormDialog from '../dialogs/ElementFormDialog'
import { ExcalidrawElement } from '../types/relationshipTypes'
import { useAuth } from '@/lib/auth'
import {
  repositionAllMarkerEllipses,
  removeOrphanedMarkersLive,
  syncSovereigntyMarkers,
  hasAnyMarkerRoot,
} from '../utils/sovereigntyMarkers'

// Dynamic import of Excalidraw to avoid server-side rendering
const ExcalidrawWrapper = dynamic(
  async () => {
    // Import dynamic theme system - this handles ALL styling including structure and colors
    const { injectExcalidrawThemeCSS } = await import('@/styles/excalidraw-dynamic-theme')

    const { Excalidraw, MainMenu } = await import('@excalidraw/excalidraw')

    const ExcalidrawComponent = ({
      onOpenDialog,
      onSaveDialog,
      onSaveAsDialog,
      onNewDiagram,
      onDeleteDialog,
      onExportJSON,
      onExportDrawIO,
      onExportArchi,
      onImportJSON,
      onExportPNG: _onExportPNG,
      onManualSync,
      onCapabilityMapGenerator,
      excalidrawAPI,
      onChange,
      uiOptions,
      initialData: _initialData, // Not used - scene updates happen via excalidrawAPI
      viewModeEnabled,
      currentDiagram,
      onDiagramUpdate,
      onCollaborationStatusChange,
      onStopCollaboration,
      onBroadcastReady,
      isLoadingRef,
      suppressOnChangeRef,
      authorizeAccess,
      selectedElementForRelatedElements,
      onOpenAddRelatedElementsDialog,
      onCloseAddRelatedElementsDialog,
      isAddRelatedElementsDialogOpen,
    }: ExcalidrawComponentProps) => {
      const ExcalidrawTyped = Excalidraw as any
      const MainMenuTyped = MainMenu as any

      // Store the API reference for internal use
      const apiRef = React.useRef<any>(null)
      // Track if API is ready
      const [isAPIReady, setIsAPIReady] = useState(false)
      // D-02: ids of main elements seen on the previous handleChange pass, used
      // to diff-detect genuinely new main elements (library drop, duplicate,
      // copy/paste) so the sovereignty-markers fetch fires only for those.
      const previouslySeenMainElementIdsRef = React.useRef<Set<string>>(new Set())

      // Collaboration state
      const [isCollaborationDialogOpen, setIsCollaborationDialogOpen] = useState(false)

      // Element Form Dialog state
      const [elementFormDialog, setElementFormDialog] = useState<{
        element: ExcalidrawElement | null
        mode: 'view' | 'edit'
        isOpen: boolean
      }>({
        element: null,
        mode: 'view',
        isOpen: false,
      })

      // Hook for theme mode (used within component)
      const { mode: themeMode } = useThemeMode()
      const { selectedCompany, selectedCompanyId } = useCompanyContext()
      const themeConfig = useThemeConfig()
      const { keycloak } = useAuth()
      const apolloClient = useApolloClient()
      const { featureFlags } = useFeatureFlags()

      // Get username from Keycloak token
      const username = useMemo(() => {
        if (keycloak?.tokenParsed) {
          const firstName = keycloak.tokenParsed.given_name || ''
          const lastName = keycloak.tokenParsed.family_name || ''
          const fullName = `${firstName} ${lastName}`.trim()
          return fullName || keycloak.tokenParsed.preferred_username || 'Anonymous User'
        }
        return 'Anonymous User'
      }, [keycloak?.tokenParsed])

      const excalidrawBranding = useMemo(
        () => ({
          primaryColor: selectedCompany?.primaryColor || undefined,
          secondaryColor: selectedCompany?.secondaryColor || undefined,
        }),
        [selectedCompany?.primaryColor, selectedCompany?.secondaryColor]
      )

      // Hook for current language
      const locale = useLocale()
      const t = useTranslations('diagrams')

      // Collaboration Hook
      const {
        startCollaboration,
        stopCollaboration,
        isCollaborating,
        collaborators,
        roomId,
        broadcastSceneUpdate,
        isReceivingUpdateRef,
      } = useExcalidrawCollaboration({
        excalidrawAPI: apiRef.current,
        username,
        currentDiagram,
        onDiagramUpdate,
        authorizeAccess,
      })

      // Expose stopCollaboration to parent via window for permission checking
      React.useEffect(() => {
        if (onStopCollaboration) {
          const win = window as any
          win.__stopCollaboration = stopCollaboration
        }
      }, [stopCollaboration, onStopCollaboration])

      // Check URL for room parameter and start collaboration when API is ready
      useEffect(() => {
        if (typeof window !== 'undefined' && isAPIReady && apiRef.current) {
          const urlParams = new URLSearchParams(window.location.search)
          const roomParam = urlParams.get('room')
          if (roomParam && !isCollaborating) {
            // Note: Permission checking will happen via onDiagramUpdate callback
            // when diagram metadata is received from the collaboration initiator
            startCollaboration(roomParam)
          }
        }
      }, [startCollaboration, isCollaborating, isAPIReady])

      // Notify parent component when collaboration status changes
      useEffect(() => {
        if (onCollaborationStatusChange) {
          onCollaborationStatusChange(isCollaborating)
        }
      }, [isCollaborating, onCollaborationStatusChange])

      // Expose broadcastSceneUpdate to parent component
      useEffect(() => {
        if (onBroadcastReady && broadcastSceneUpdate) {
          onBroadcastReady(broadcastSceneUpdate)
        }
      }, [onBroadcastReady, broadcastSceneUpdate])

      // Safe collaboration start function that ensures API is ready
      const startCollaborationSafe = useCallback(
        async (roomId: string) => {
          if (isAPIReady && apiRef.current) {
            return await startCollaboration(roomId)
          } else {
            console.warn('API not ready yet, cannot start collaboration')
          }
        },
        [isAPIReady, startCollaboration]
      )

      // Enhanced onChange handler to broadcast changes during collaboration
      const handleChange = React.useCallback(
        (elements: any[], appState: any) => {
          // CRITICAL: Check suppressOnChange ref FIRST before doing anything
          // This prevents onChange from running after programmatic scene updates
          if (suppressOnChangeRef?.current) {
            suppressOnChangeRef.current = false
            return // Exit early - don't call onChange, don't broadcast, don't do anything
          }

          // D-02/D-03: live-reposition sovereignty marker ellipses in place on
          // every onChange (incl. drag) for main elements that currently carry
          // a fill/ring pair (D-04). No-op (changed: false, same elements
          // reference) for the common case of an element/diagram with no
          // markers attached.
          const { elements: repositionedElements, changed } = repositionAllMarkerEllipses(elements)
          if (changed) {
            if (suppressOnChangeRef) {
              suppressOnChangeRef.current = true
            }
            apiRef.current?.updateScene({
              elements: repositionedElements,
              captureUpdate: CaptureUpdateAction.EVENTUALLY,
            })
          }
          let effectiveElements = changed ? repositionedElements : elements

          // D-01/D-03: live, isDeleted-aware orphan-marker cleanup for the
          // native-keyboard-delete path. Runs on every onChange; no-op
          // (changed: false, same elements reference) unless a main element
          // was actually tombstoned since the last pass.
          const { elements: cleanedElements, changed: orphansRemoved } =
            removeOrphanedMarkersLive(effectiveElements)
          if (orphansRemoved) {
            if (suppressOnChangeRef) {
              suppressOnChangeRef.current = true
            }
            apiRef.current?.updateScene({
              elements: cleanedElements,
              captureUpdate: CaptureUpdateAction.IMMEDIATELY,
            })
            effectiveElements = cleanedElements
          }

          // D-02: diff-based new-main-element detection (auto-add on drop).
          // Only fires the sovereigntyMarkers fetch+apply pipeline for main
          // elements not seen on the previous onChange pass — never on every
          // drag/pan/edit of already-seen elements.
          const currentMainElementIds = new Set<string>()
          for (const el of effectiveElements) {
            if (el.isDeleted) continue
            if (el.customData?.isMainElement && el.customData?.databaseId) {
              currentMainElementIds.add(el.id)
            }
          }
          const newMainElementIds = Array.from(currentMainElementIds).filter(
            id => !previouslySeenMainElementIdsRef.current.has(id)
          )
          // Retry-safe commit (G-02.2-3/G-02.2-6 fix): retain already-confirmed
          // ids that are still present, drop ids no longer present, but do NOT
          // yet add newly-seen ids here — they are only added below once their
          // sync attempt confirms a marker was applied or is impossible, so an
          // empty/failed single attempt is retried on the next handleChange.
          previouslySeenMainElementIdsRef.current = new Set(
            Array.from(currentMainElementIds).filter(id => !newMainElementIds.includes(id))
          )

          if (newMainElementIds.length > 0 && featureFlags.Sovereignty && selectedCompanyId) {
            void (async () => {
              try {
                const syncedElements = await syncSovereigntyMarkers(
                  apolloClient,
                  effectiveElements,
                  {
                    enabled: true,
                    companyId: selectedCompanyId,
                  }
                )

                const markedMainElementIds = new Set<string>()
                for (const el of syncedElements) {
                  if (
                    (el.customData?.sovereigntyMarker === 'fill' ||
                      el.customData?.sovereigntyMarker === 'ring') &&
                    el.customData?.mainElementId
                  ) {
                    markedMainElementIds.add(el.customData.mainElementId)
                  }
                }
                const noMarkersPossible = !hasAnyMarkerRoot(syncedElements)

                for (const id of newMainElementIds) {
                  if (markedMainElementIds.has(id) || noMarkersPossible) {
                    previouslySeenMainElementIdsRef.current.add(id)
                  }
                }

                if (syncedElements !== effectiveElements) {
                  if (suppressOnChangeRef) {
                    suppressOnChangeRef.current = true
                  }
                  apiRef.current?.updateScene({
                    elements: syncedElements,
                    captureUpdate: CaptureUpdateAction.EVENTUALLY,
                  })
                }
              } catch (error) {
                console.warn('syncSovereigntyMarkers failed, will retry on next change:', error)
              }
            })()
          }

          // Call original onChange handler
          if (onChange) {
            onChange(effectiveElements, appState)
          }

          // Don't broadcast if we're receiving an update from collaborators (prevents loops)
          if (isReceivingUpdateRef?.current) {
            return
          }

          // Don't broadcast if we're loading a diagram (prevents broadcast storm)
          if (isLoadingRef?.current) {
            return
          }

          // Broadcast changes if collaborating - use the function directly from the hook
          if (isCollaborating && broadcastSceneUpdate) {
            broadcastSceneUpdate(effectiveElements, appState)
          }
        },
        [
          onChange,
          isCollaborating,
          broadcastSceneUpdate,
          isLoadingRef,
          isReceivingUpdateRef,
          suppressOnChangeRef,
          apiRef,
          apolloClient,
          featureFlags.Sovereignty,
          selectedCompanyId,
        ]
      )

      // Konvertiere locale zu Excalidraw langCode Format
      const excalidrawLangCode = useMemo(() => {
        switch (locale) {
          case 'de':
            return 'de-DE'
          case 'en':
            return 'en'
          default:
            return 'de-DE'
        }
      }, [locale])

      // Handle excalidrawAPI prop - store the API reference
      React.useEffect(() => {
        if (excalidrawAPI && apiRef.current) {
          // Store suppressOnChangeRef in API object so collaboration hook can access it
          const api = apiRef.current as any
          api.suppressOnChangeRef = suppressOnChangeRef
          excalidrawAPI(apiRef.current)
        }
      }, [excalidrawAPI, suppressOnChangeRef])

      // Inject dynamic theme CSS based on selected company branding and current mode
      React.useEffect(() => {
        injectExcalidrawThemeCSS(themeMode, excalidrawBranding, themeConfig)
      }, [themeMode, excalidrawBranding, themeConfig])

      // Process initialData - use provided data or fallback to safe defaults
      const safeInitialData = useMemo(() => {
        if (_initialData && typeof _initialData === 'object') {
          // Use provided initialData but ensure safe structure
          const processedData = {
            elements: _initialData.elements || [],
            appState: {
              viewBackgroundColor: themeMode === 'dark' ? '#121212' : '#ffffff',
              collaborators: new Map(),
              selectedElementIds: {},
              hoveredElementIds: {},
              selectedGroupIds: {},
              selectedLinearElement: null,
              editingLinearElement: null,
              activeTool: { type: 'selection' },
              isLoading: false,
              errorMessage: null,
              zenModeEnabled: false,
              gridModeEnabled: false,
              viewModeEnabled: false,
              // Preserve scrollX, scrollY, and zoom from initialData
              ..._initialData.appState,
              // Override theme to ensure it matches current mode
              theme: themeMode,
            },
            // Important: scrollToContent must be false to preserve viewport position
            scrollToContent: false,
          }

          return processedData
        }

        // Fallback to empty scene
        const defaultData = {
          elements: [],
          appState: {
            viewBackgroundColor: themeMode === 'dark' ? '#121212' : '#ffffff',
            collaborators: new Map(),
            selectedElementIds: {},
            hoveredElementIds: {},
            selectedGroupIds: {},
            selectedLinearElement: null,
            editingLinearElement: null,
            activeTool: { type: 'selection' },
            isLoading: false,
            errorMessage: null,
            theme: themeMode,
            zenModeEnabled: false,
            gridModeEnabled: false,
            viewModeEnabled: false,
          },
          scrollToContent: false,
        }

        return defaultData
      }, [_initialData, themeMode]) // Depend on actual initialData prop and theme mode

      // Inject CSS to disable the default Excalidraw context menu completely
      // We use our own FullCustomContextMenu instead
      React.useEffect(() => {
        const style = document.createElement('style')
        style.textContent = `
          .context-menu {
            display: none !important;
          }
          .ContextMenu {
            display: none !important;
          }
          .excalidraw .context-menu {
            display: none !important;
          }
        `
        document.head.appendChild(style)

        return () => {
          document.head.removeChild(style)
        }
      }, [])

      return (
        <div style={{ height: '100%', width: '100%' }}>
          <style>{`
            /* Hide the default library button completely - multiple selectors for robustness */
            .excalidraw button[title*="Library"],
            .excalidraw button[title*="library"],
            .excalidraw button[aria-label*="Library"],
            .excalidraw button[aria-label*="library"],
            .excalidraw .library-button,
            .excalidraw [data-testid*="library"],
            .excalidraw .Island button:has(svg[width="1em"]):has(svg[height="1em"]),
            .excalidraw button.ToolIcon_type_button--show:has(.library-icon),
            .excalidraw button[data-testid="library-button"],
            .excalidraw .App-toolbar__extra-tools-trigger,
            .excalidraw .library-menu-trigger,
            .excalidraw .layer-ui__wrapper__top-right {
              display: none !important;
              visibility: hidden !important;
              opacity: 0 !important;
              pointer-events: none !important;
            }
          `}</style>
          <ExcalidrawTyped
            theme={themeMode}
            langCode={excalidrawLangCode}
            name="nextgen-eam-diagram"
            UIOptions={uiOptions}
            initialData={safeInitialData}
            excalidrawAPI={(api: any) => {
              // Store the API reference and mark as ready
              apiRef.current = api
              setIsAPIReady(true)

              // Note: We do NOT use the built-in Excalidraw context menu
              // Instead, we use our own FullCustomContextMenu component
              // The built-in context menu is disabled via CSS

              // Call the original excalidrawAPI callback if provided
              if (excalidrawAPI) {
                excalidrawAPI(api)
              }
            }}
            onChange={handleChange}
            viewModeEnabled={viewModeEnabled}
          >
            <MainMenuTyped>
              {/* Custom New Diagram Menu Item - only for non-viewer users */}
              {!viewModeEnabled && (
                <MainMenuTyped.Item
                  onSelect={onNewDiagram}
                  icon={
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
                    </svg>
                  }
                  shortcut="Ctrl+N"
                >
                  {t('actions.new')}
                </MainMenuTyped.Item>
              )}

              {/* Custom Add Related Elements Menu Item - Entfernt, da ohne Selektion nicht sinnvoll */}

              {/* Custom Open Menu Item - available for all users */}
              <MainMenuTyped.Item
                onSelect={onOpenDialog}
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                  </svg>
                }
                shortcut="Ctrl+O"
              >
                {t('actions.open')}
              </MainMenuTyped.Item>

              {/* Custom Save Menu Item - only for non-viewer users */}
              {!viewModeEnabled && (
                <MainMenuTyped.Item
                  onSelect={onSaveDialog}
                  icon={
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M15,9H5V5H15M12,19A3,3 0 0,1 9,16A3,3 0 0,1 12,13A3,3 0 0,1 15,16A3,3 0 0,1 12,19M17,3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V7L17,3Z" />
                    </svg>
                  }
                  shortcut="Ctrl+S"
                >
                  {currentDiagram ? t('actions.save') : t('actions.saveAs')}
                </MainMenuTyped.Item>
              )}

              {/* Custom Save As Menu Item - only for non-viewer users and when a diagram is loaded */}
              {!viewModeEnabled && currentDiagram && (
                <MainMenuTyped.Item
                  onSelect={onSaveAsDialog}
                  icon={
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17,3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V7L17,3M17,7H19V19H5V5H14V7H17M10,17L14,13L10.5,9.5L9.08,10.92L11.5,13.33L12.92,11.92L17,16V17H10Z" />
                    </svg>
                  }
                  shortcut="Ctrl+Shift+S"
                >
                  {t('actions.saveAs')}
                </MainMenuTyped.Item>
              )}

              {/* Custom Delete Menu Item - only for non-viewer users and when a diagram is loaded */}
              {!viewModeEnabled && currentDiagram && (
                <MainMenuTyped.Item
                  onSelect={onDeleteDialog}
                  icon={
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" />
                    </svg>
                  }
                  shortcut="Shift+Del"
                >
                  {t('actions.delete')}
                </MainMenuTyped.Item>
              )}

              {/* Manual Database Sync Menu Item - only for non-viewer users */}
              {!viewModeEnabled && (
                <MainMenuTyped.Item
                  onSelect={onManualSync}
                  icon={
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12,18A6,6 0 0,1 6,12C6,11 6.25,10.03 6.7,9.2L5.24,7.74C4.46,8.97 4,10.43 4,12A8,8 0 0,0 12,20V23L16,19L12,15M12,4V1L8,5L12,9V6A6,6 0 0,1 18,12C18,13 17.75,13.97 17.3,14.8L18.76,16.26C19.54,15.03 20,13.57 20,12A8,8 0 0,0 12,4Z" />
                    </svg>
                  }
                  shortcut="Ctrl+R"
                >
                  {t('actions.syncDatabase')}
                </MainMenuTyped.Item>
              )}

              {/* Capability Map Generator Menu Item - only for non-viewer users */}
              {!viewModeEnabled && (
                <MainMenuTyped.Item
                  onSelect={onCapabilityMapGenerator}
                  icon={
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3M19,19H5V5H19V19Z M13,17V15H18V13H13V11L10,14L13,17Z M11,10V8H6V10H11V12L14,9L11,6V8Z" />
                    </svg>
                  }
                  shortcut="Ctrl+M"
                >
                  {t('actions.generateCapabilityMap')}
                </MainMenuTyped.Item>
              )}

              {/* Find on Canvas Menu Item - available for all users */}
              <MainMenuTyped.Item
                onSelect={() => {
                  // Use the API to open the search sidebar
                  if (apiRef.current) {
                    // Open search sidebar using the action manager
                    apiRef.current.updateScene({
                      appState: {
                        ...apiRef.current.getAppState(),
                        openSidebar: {
                          name: 'default',
                          tab: 'search',
                        },
                        openDialog: null,
                      },
                    })
                  }
                }}
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z" />
                  </svg>
                }
                shortcut="Ctrl+F"
              >
                {t('actions.findOnCanvas')}
              </MainMenuTyped.Item>

              {/* Live Collaboration Menu Item - available for all users */}
              <MainMenuTyped.Item
                onSelect={() => setIsCollaborationDialogOpen(true)}
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16,4C18.21,4 20,5.79 20,8C20,10.21 18.21,12 16,12C13.79,12 12,10.21 12,8C12,5.79 13.79,4 16,4M16,14C18.67,14 24,15.33 24,18V20H8V18C8,15.33 13.33,14 16,14M8,12C10.21,12 12,10.21 12,8C12,5.79 10.21,4 8,4C5.79,4 4,5.79 4,8C4,10.21 5.79,12 8,12M8,14C5.33,14 0,15.33 0,18V20H8V18C8,16.9 8.63,15.72 9.69,14.81C9.08,14.61 8.42,14.5 8,14Z" />
                  </svg>
                }
                shortcut="Ctrl+L"
              >
                {isCollaborating ? 'Live Collaboration (Aktiv)' : 'Live Collaboration'}
              </MainMenuTyped.Item>

              {/* Separator */}
              <MainMenuTyped.Separator />

              {/* Custom Export JSON Menu Item - only for non-viewer users */}
              {!viewModeEnabled && (
                <MainMenuTyped.Item
                  onSelect={onExportJSON}
                  icon={
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z M8,12V14H16V12H8Z M10,10V16H14V10H10Z" />
                    </svg>
                  }
                  shortcut="Ctrl+E"
                >
                  {t('actions.exportJSON')}
                </MainMenuTyped.Item>
              )}

              {/* Custom Export draw.io XML Menu Item - only for non-viewer users */}
              {!viewModeEnabled && (
                <MainMenuTyped.Item
                  onSelect={onExportDrawIO}
                  icon={
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12,2A2,2 0 0,1 14,4C14,4.74 13.6,5.39 13,5.73V7.27C13.4,7.61 13.6,8.26 13.6,9A2.4,2.4 0 0,1 11.2,11.4A2.4,2.4 0 0,1 8.8,9A2.4,2.4 0 0,1 11.2,6.6C11.93,6.6 12.58,7 12.92,7.4V5.73C12.31,5.39 12,4.74 12,4A2,2 0 0,1 14,2M21,9V15C21,16.1 20.1,17 19,17H13L16,14H19V10H16L13,7H19C20.1,7 21,7.9 21,9M8,13A2,2 0 0,1 6,15A2,2 0 0,1 4,13A2,2 0 0,1 6,11A2,2 0 0,1 8,13Z" />
                    </svg>
                  }
                  shortcut="Ctrl+D"
                >
                  {t('actions.exportDrawIO')}
                </MainMenuTyped.Item>
              )}

              {/* Custom Export Archi XML Menu Item - only for non-viewer users */}
              {!viewModeEnabled && (
                <MainMenuTyped.Item
                  onSelect={onExportArchi}
                  icon={
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3,3H21V5H3V3M4,6H20V10H4V6M4,11H20V15H4V11M4,16H20V20H4V16M5,17H19V19H5V17M5,12H19V14H5V12M5,7H19V9H5V7Z" />
                    </svg>
                  }
                  shortcut="Ctrl+Shift+A"
                >
                  {t('actions.exportArchi')}
                </MainMenuTyped.Item>
              )}

              {/* Custom Import JSON Menu Item - only for non-viewer users */}
              {!viewModeEnabled && (
                <MainMenuTyped.Item
                  onSelect={onImportJSON}
                  icon={
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z M8,12V14H16V12H8Z M10,10V16H14V10H10Z" />
                    </svg>
                  }
                  shortcut="Ctrl+I"
                >
                  {t('actions.importJSON')}
                </MainMenuTyped.Item>
              )}

              {/* Custom Export PNG Menu Item - available for all users */}
              <MainMenuTyped.Item
                onSelect={_onExportPNG}
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z M12,17L16,12H13V8H11V12H8L12,17Z" />
                  </svg>
                }
                shortcut="Ctrl+Shift+E"
              >
                {t('actions.exportPNG')}
              </MainMenuTyped.Item>
            </MainMenuTyped>
          </ExcalidrawTyped>

          {/* 
            Our custom context menu implementation - replaces Excalidraw's built-in context menu
            The built-in context menu is disabled via CSS and we use this component instead
          */}
          <FullCustomContextMenu
            excalidrawAPI={apiRef.current}
            onOpenAddRelatedElementsDialog={onOpenAddRelatedElementsDialog}
            onViewElement={element => {
              setElementFormDialog({
                element,
                mode: 'view',
                isOpen: true,
              })
            }}
            onEditElement={element => {
              setElementFormDialog({
                element,
                mode: 'edit',
                isOpen: true,
              })
            }}
            viewModeEnabled={viewModeEnabled}
            isViewerRole={false} // TODO: Aus dem Auth-Kontext oder Props holen
            suppressOnChangeRef={suppressOnChangeRef}
          />

          {/* Collaboration Dialog */}
          <CollaborationDialog
            isOpen={isCollaborationDialogOpen}
            onClose={() => setIsCollaborationDialogOpen(false)}
            isCollaborating={isCollaborating}
            roomId={roomId}
            collaborators={collaborators}
            onStartCollaboration={startCollaborationSafe}
            onStopCollaboration={stopCollaboration}
          />

          {/* Link Related Element Dialog */}
          <LinkRelatedElementDialog
            isOpen={isAddRelatedElementsDialogOpen}
            onClose={onCloseAddRelatedElementsDialog}
            selectedElement={selectedElementForRelatedElements}
            excalidrawAPI={apiRef.current}
          />

          {/* Element Form Dialog */}
          <ElementFormDialog
            element={elementFormDialog.element}
            mode={elementFormDialog.mode}
            isOpen={elementFormDialog.isOpen}
            onClose={() => {
              console.log('🔵 [ExcalidrawWrapper] ElementFormDialog onClose called')
              console.log('🔵 [ExcalidrawWrapper] Current dialog state:', elementFormDialog)
              setElementFormDialog({
                element: null,
                mode: 'view',
                isOpen: false,
              })
              console.log('🟢 [ExcalidrawWrapper] Dialog state reset to closed')
            }}
            onElementUpdated={(updatedName: string) => {
              console.log('🔵 [ExcalidrawWrapper] onElementUpdated called with name:', updatedName)

              // Update the element's text in the diagram
              if (apiRef.current && elementFormDialog.element) {
                const elements = apiRef.current.getSceneElements()
                const elementToUpdate = elements.find(
                  (el: any) => el.id === elementFormDialog.element?.id
                )

                if (elementToUpdate) {
                  // Update the element's text
                  const updatedElement = {
                    ...elementToUpdate,
                    originalText: updatedName,
                  }

                  // Update the scene with the modified element
                  const updatedElements = elements.map((el: any) =>
                    el.id === elementFormDialog.element?.id ? updatedElement : el
                  )

                  apiRef.current.updateScene({
                    elements: updatedElements,
                  })

                  console.log('🟢 [ExcalidrawWrapper] Element text updated in diagram')
                }
              }

              // Re-sync from the database so sovereignty markers and other
              // derived data reflect the just-saved change, same as Ctrl+R.
              console.log('🔵 [ExcalidrawWrapper] Triggering auto-sync after element save...')
              void onManualSync?.()
            }}
          />
        </div>
      )
    }

    return ExcalidrawComponent
  },
  {
    ssr: false,
    loading: () => <ExcalidrawLoading />,
  }
)

export default ExcalidrawWrapper
