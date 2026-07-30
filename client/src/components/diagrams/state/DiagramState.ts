import { useState, useEffect, useRef } from 'react'
import { useCompanyContext } from '@/contexts/CompanyContext'
import { useSearchParams } from 'next/navigation'
import { useApolloClient } from '@apollo/client'
import { useFeatureFlags } from '@/lib/feature-flags'
import { DialogStates, NotificationState } from '../types/DiagramTypes'
import { isViewer } from '@/lib/auth'
import {
  loadPersistedScene,
  loadPersistedDiagram,
  loadViewportStateFromStorage,
} from '../utils/DiagramStorageUtils'
import { syncDiagramOnOpen } from '../utils/databaseSyncUtils'

// Custom Hook für den Diagram State
export const useDiagramState = () => {
  const searchParams = useSearchParams()
  const openDiagramId = searchParams.get('openDiagram')

  const [isClient, setIsClient] = useState(false)
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null)
  const [currentDiagram, setCurrentDiagram] = useState<any>(null)
  const [currentScene, setCurrentScene] = useState<any>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [lastSavedScene, setLastSavedScene] = useState<any>(null)
  const [selectedElementForRelatedElements, setSelectedElementForRelatedElements] =
    useState<any>(null)

  // Aktuell ausgewählte Company zur Validierung des gespeicherten Diagramms
  const { selectedCompanyId } = useCompanyContext()

  // Apollo client + feature flags needed to run the same sync pipeline handleOpenDiagram uses
  const apolloClient = useApolloClient()
  const { featureFlags } = useFeatureFlags()

  // Track if scene has been restored to prevent multiple restorations
  const sceneRestoredRef = useRef(false)

  // Reset restoration flag when currentScene changes significantly
  useEffect(() => {
    sceneRestoredRef.current = false
  }, [currentScene?.elements?.length, currentDiagram?.id])

  // Dialog States
  const [dialogStates, setDialogStates] = useState<DialogStates>({
    saveDialogOpen: false,
    saveAsDialogOpen: false,
    openDialogOpen: false,
    deleteDialogOpen: false,
    capabilityMapGeneratorOpen: false,
    addRelatedElementsDialogOpen: false,
  })

  // Notification State
  const [notification, setNotification] = useState<NotificationState>({
    open: false,
    message: '',
    severity: 'info',
  })

  // Client-side initialization effect
  useEffect(() => {
    // Ensure proper client-side initialization for Docker containers
    if (typeof window !== 'undefined') {
      // Use setTimeout to ensure DOM is ready and prevent hydration mismatches
      const initializeClient = () => {
        setIsClient(true)

        // Überspringe Local Storage-Wiederherstellung, wenn ein Diagramm über URL-Parameter geladen werden soll
        if (openDiagramId) {
          return
        }

        // Load persisted scene from localStorage with Docker-safe error handling
        try {
          const persistedScene = loadPersistedScene()
          if (persistedScene) {
            setCurrentScene(persistedScene)
          }
        } catch (error) {
          console.warn('Failed to load persisted scene:', error)
          localStorage.removeItem('excalidraw-scene')
        }

        try {
          const persistedDiagram = loadPersistedDiagram()
          if (persistedDiagram) {
            setCurrentDiagram(persistedDiagram)
          }
        } catch (error) {
          console.warn('Failed to load persisted diagram:', error)
          localStorage.removeItem('excalidraw-current-diagram')
        }
      }

      // Use small delay to ensure proper hydration in Docker environments
      const timeoutId = setTimeout(initializeClient, 50)
      return () => clearTimeout(timeoutId)
    }
  }, [openDiagramId]) // Scene restoration effect - only restore once when API becomes available

  // Guard: Falls ein gespeichertes Diagramm nicht zur ausgewählten Company gehört, sofort zurücksetzen
  useEffect(() => {
    if (!isClient) return
    if (!selectedCompanyId) return
    if (!currentDiagram) return

    // Prüfe Zugehörigkeit: Diagramm muss eine Company-Relation mit der ausgewählten Company haben
    if (!Array.isArray(currentDiagram.company) || currentDiagram.company.length === 0) {
      // Kein company-Feld vorhanden -> nicht eingreifen (z. B. frisch gespeicherte Diagramme)
      return
    }

    const belongsToSelected = currentDiagram.company.some((c: any) => c?.id === selectedCompanyId)

    if (!belongsToSelected) {
      try {
        // Szene und Diagramm verwerfen, lokales Storage bereinigen
        setCurrentDiagram(null)
        setCurrentScene(null)
        // Lokalen Speicher bereinigen (nur betroffene Keys, hier direkt remove)
        localStorage.removeItem('excalidraw-current-diagram')
        localStorage.removeItem('excalidraw-scene')
        localStorage.removeItem('excalidraw-last-saved-scene')
      } catch {
        // noop
      }
    }
  }, [isClient, selectedCompanyId, currentDiagram])
  useEffect(() => {
    if (excalidrawAPI && isClient && currentScene && !sceneRestoredRef.current) {
      // Überspringe Local Storage-Wiederherstellung, wenn ein Diagramm über URL-Parameter geladen werden soll
      if (openDiagramId) {
        return
      }

      // Use setTimeout to ensure proper timing in Docker containers
      const restoreTimeout = setTimeout(async () => {
        try {
          // Always try to restore scene if we have data, regardless of element count
          if (currentScene && (currentScene.elements || currentScene.appState)) {
            const currentElements = excalidrawAPI.getSceneElements()

            // Update scene if we have saved data and it's different from current
            const hasElements = currentScene.elements && currentScene.elements.length > 0
            const shouldRestore = hasElements || !currentElements || currentElements.length === 0

            if (shouldRestore) {
              // Run the same sync pipeline handleOpenDiagram uses, so F5/full-page reload
              // never bypasses sovereignty marker sync (D-01). Fail soft: a sync error must
              // never block local scene restoration.
              let syncedScene = currentScene
              try {
                syncedScene = await syncDiagramOnOpen(apolloClient, currentScene, {
                  enabled: featureFlags.Sovereignty,
                  companyId: selectedCompanyId,
                })
              } catch (syncError) {
                console.warn(
                  'Database sync failed during scene restore, using local data:',
                  syncError
                )
              }

              const restoredScene = restoreSceneData(syncedScene)

              // Load and apply viewport state if available
              const savedViewportState = loadViewportStateFromStorage()
              if (savedViewportState) {
                restoredScene.appState = {
                  ...restoredScene.appState,
                  scrollX: savedViewportState.scrollX,
                  scrollY: savedViewportState.scrollY,
                  zoom: { value: savedViewportState.zoom },
                }
              }

              excalidrawAPI.updateScene(restoredScene)

              // Additional viewport restoration with delay for better reliability
              if (savedViewportState) {
                setTimeout(() => {
                  excalidrawAPI.updateScene({
                    appState: {
                      scrollX: savedViewportState.scrollX,
                      scrollY: savedViewportState.scrollY,
                      zoom: { value: savedViewportState.zoom },
                    },
                  })
                }, 200) // Increased delay for better reliability
              }

              sceneRestoredRef.current = true // Mark as restored
            }
          }
        } catch (error) {
          console.warn('Failed to restore scene:', error)
        }
      }, 150) // Increased delay for Docker timing

      return () => clearTimeout(restoreTimeout)
    }
  }, [excalidrawAPI, isClient, currentScene, openDiagramId])

  const updateDialogState = (dialogName: keyof DialogStates, open: boolean) => {
    setDialogStates(prev => ({
      ...prev,
      [dialogName]: open,
    }))
  }

  return {
    // State values
    isClient,
    excalidrawAPI,
    currentDiagram,
    currentScene,
    hasUnsavedChanges,
    lastSavedScene,
    dialogStates,
    notification,
    selectedElementForRelatedElements,

    // State setters
    setExcalidrawAPI,
    setCurrentDiagram,
    setCurrentScene,
    setHasUnsavedChanges,
    setLastSavedScene,
    setNotification,
    updateDialogState,
    setSelectedElementForRelatedElements,
  }
}

// Helper function for scene data restoration
const restoreSceneData = (sceneData: any) => {
  if (!sceneData || !sceneData.appState) {
    return sceneData
  }

  // Remove problematic properties that can cause issues in Docker environments
  if (
    sceneData.appState.collaborators &&
    typeof sceneData.appState.collaborators.clear === 'function'
  ) {
    sceneData.appState.collaborators.clear()
  } else {
    sceneData.appState.collaborators = new Map()
  }

  // Initialize editing states ONLY if they are undefined/null to prevent controlled/uncontrolled issues
  // DO NOT reset existing valid values as this causes React warnings
  if (
    sceneData.appState.selectedElementIds === undefined ||
    sceneData.appState.selectedElementIds === null
  ) {
    sceneData.appState.selectedElementIds = {}
  }
  if (
    sceneData.appState.hoveredElementIds === undefined ||
    sceneData.appState.hoveredElementIds === null
  ) {
    sceneData.appState.hoveredElementIds = {}
  }
  if (
    sceneData.appState.selectedGroupIds === undefined ||
    sceneData.appState.selectedGroupIds === null
  ) {
    sceneData.appState.selectedGroupIds = {}
  }
  if (sceneData.appState.selectedLinearElement === undefined) {
    sceneData.appState.selectedLinearElement = null
  }
  if (sceneData.appState.editingLinearElement === undefined) {
    sceneData.appState.editingLinearElement = null
  }
  // Ensure proper timing-independent state
  if (sceneData.appState.isLoading === undefined || sceneData.appState.isLoading === null) {
    sceneData.appState.isLoading = false
  }
  if (sceneData.appState.errorMessage === undefined) {
    sceneData.appState.errorMessage = null
  }

  return sceneData
}

// UI Options Hook
export const useUIOptions = () => {
  const uiOptions = {
    canvasActions: {
      export: isViewer() ? (false as const) : { saveFileToDisk: true }, // Export nur für Viewer deaktivieren
      saveAsImage: true,
      loadScene: false, // Deaktiviere Standard-Load
      saveToActiveFile: false, // Deaktiviere Standard-Save
      toggleTheme: null, // Deaktiviere Theme-Toggle komplett
      clearCanvas: !isViewer(), // Nur non-Viewer können Canvas löschen
      changeViewBackgroundColor: true,
    },
    tools: {
      image: true,
    },
    // Disable default library since we have custom DiagramLibrarySidebar
    dockedSidebarBreakpoint: 0, // Never dock library
  }

  return uiOptions
}
