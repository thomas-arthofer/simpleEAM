import { useCallback, useRef } from 'react'
import { useCompanyContext } from '@/contexts/CompanyContext'
import { useApolloClient } from '@apollo/client'
import { useFeatureFlags } from '@/lib/feature-flags'
import { NotificationState } from '../types/DiagramTypes'
import {
  syncDiagramOnOpen,
  syncDiagramOnSave,
  clearMissingElementMarkers,
} from '../utils/databaseSyncUtils'
import { optimizeDiagramOnOpen } from '../utils/diagramOptimizationUtils'
import { analyzeArrows } from '../utils/arrowAnalysis'
import {
  saveSceneToStorage,
  saveDiagramToStorage,
  saveLastSavedSceneToStorage,
  clearDiagramStorage,
  saveViewportStateToStorage,
  loadViewportStateFromStorage,
} from '../utils/DiagramStorageUtils'
import { convertExcalidrawToDrawIO, downloadDrawIOFile } from '../../../utils/drawioConverter'
import { convertExcalidrawToArchi, downloadArchiFile } from '../../../utils/archiConverter'

// Handlers für alle Diagram-Operationen
export const useDiagramHandlers = (
  excalidrawAPI: any,
  currentDiagram: any,
  setCurrentDiagram: (diagram: any) => void,
  setCurrentScene: (scene: any) => void,
  setHasUnsavedChanges: (hasChanges: boolean) => void,
  setLastSavedScene: (scene: any) => void,
  setNotification: (notification: NotificationState) => void,
  setSaveDialogOpen: (open: boolean) => void,
  setSaveAsDialogOpen: (open: boolean) => void,
  _lastSavedScene: any,
  defaultFontFamily: number,
  broadcastSceneUpdateRef?: React.MutableRefObject<
    ((elements: any[], appState: any) => void) | null
  >,
  suppressOnChangeRef?: React.MutableRefObject<boolean>
) => {
  const apolloClient = useApolloClient()
  const { selectedCompanyId } = useCompanyContext()
  const { featureFlags } = useFeatureFlags()

  // Ref to track if we're currently saving to prevent onChange from setting hasUnsavedChanges
  const isSavingRef = useRef(false)

  // Ref to track if we're currently loading a diagram to prevent onChange from setting hasUnsavedChanges
  const isLoadingRef = useRef(false)

  // Ref to track the timestamp when we last completed a load operation
  const lastLoadCompletedRef = useRef<number>(0)

  const applyDefaultFontToScene = useCallback(
    (sceneData: any) => {
      if (!sceneData) {
        return sceneData
      }

      const patchedAppState = {
        ...(sceneData.appState || {}),
        currentItemFontFamily: defaultFontFamily,
      }

      if (!Array.isArray(sceneData.elements)) {
        return {
          ...sceneData,
          appState: patchedAppState,
        }
      }

      let requiresUpdate = false
      const elementsWithFont = sceneData.elements.map((element: any) => {
        if (element?.type === 'text' && element.fontFamily !== defaultFontFamily) {
          requiresUpdate = true
          return {
            ...element,
            fontFamily: defaultFontFamily,
          }
        }
        return element
      })

      return {
        ...sceneData,
        elements: requiresUpdate ? elementsWithFont : sceneData.elements,
        appState: patchedAppState,
      }
    },
    [defaultFontFamily]
  )

  // New Diagram Handler
  const handleNewDiagram = useCallback(() => {
    if (!excalidrawAPI) return

    const emptyScene = {
      elements: [],
      appState: {
        viewBackgroundColor: '#ffffff',
        collaborators: new Map(),
        selectedElementIds: {},
        hoveredElementIds: {},
        selectedGroupIds: {},
        selectedLinearElement: null,
        editingLinearElement: null,
        activeTool: { type: 'selection' },
        isLoading: false,
        errorMessage: null,
        currentItemFontFamily: defaultFontFamily,
      },
    }
    const restoredScene = applyDefaultFontToScene(restoreSceneData(emptyScene))

    // Set loading flag to prevent onChange from setting hasUnsavedChanges during scene update
    isLoadingRef.current = true

    // Set suppressOnChangeRef to prevent onChange from running
    if (suppressOnChangeRef) {
      suppressOnChangeRef.current = true
    }

    // Sofort die Excalidraw-Szene aktualisieren
    excalidrawAPI.updateScene(restoredScene)

    // State-Updates können asynchron erfolgen
    setTimeout(() => {
      setCurrentDiagram(null)
      setCurrentScene(restoredScene)
      setHasUnsavedChanges(false)
      setLastSavedScene(restoredScene)

      // Clear localStorage
      clearDiagramStorage()

      // Explicitly ensure hasUnsavedChanges is false after all operations
      setTimeout(() => {
        setHasUnsavedChanges(false)
        isLoadingRef.current = false
        // Set timestamp to start cooldown period
        lastLoadCompletedRef.current = Date.now()
      }, 50)
    }, 0)

    setNotification({
      open: true,
      message: 'messages.newDiagramCreated',
      severity: 'info',
    })
  }, [
    applyDefaultFontToScene,
    defaultFontFamily,
    excalidrawAPI,
    setCurrentDiagram,
    setCurrentScene,
    setHasUnsavedChanges,
    setLastSavedScene,
    setNotification,
  ])

  // Delete Diagram Handler
  const handleDeleteDiagram = useCallback(() => {
    // Reset the current diagram and clear canvas
    setCurrentDiagram(null)
    const emptyScene = {
      elements: [],
      appState: {
        viewBackgroundColor: '#ffffff',
        collaborators: new Map(),
        selectedElementIds: {},
        hoveredElementIds: {},
        selectedGroupIds: {},
        activeTool: { type: 'selection' },
        currentItemFontFamily: defaultFontFamily,
      },
    }
    const restoredScene = applyDefaultFontToScene(restoreSceneData(emptyScene))
    if (excalidrawAPI) {
      excalidrawAPI.updateScene(restoredScene)
    }
    setCurrentScene(restoredScene)

    // Clear localStorage
    clearDiagramStorage()

    setNotification({
      open: true,
      message: 'messages.diagramDeleted',
      severity: 'success',
    })
  }, [
    applyDefaultFontToScene,
    defaultFontFamily,
    excalidrawAPI,
    setCurrentDiagram,
    setCurrentScene,
    setNotification,
  ])

  // Open Diagram Handler
  const handleOpenDiagram = useCallback(
    async (diagram: any) => {
      // Set loading flag IMMEDIATELY to prevent ANY onChange calls during the entire opening process
      isLoadingRef.current = true

      // Auf globale API-Referenz zurückgreifen, wenn nötig
      const api = excalidrawAPI || (window as any).__excalidrawAPI

      if (!api || !diagram.diagramJson) {
        console.warn('Cannot open diagram: missing API or diagram data', {
          excalidrawAPIExists: !!api,
          diagramJsonExists: !!diagram.diagramJson,
        })
        // Reset loading flag on early exit
        isLoadingRef.current = false
        setNotification({
          open: true,
          message: 'errors.cannotOpenDiagram',
          severity: 'error',
        })
        return
      }

      try {
        // Block opening diagrams from other companies only when an explicit company is set and mismatched
        if (selectedCompanyId && Array.isArray(diagram?.company) && diagram.company.length > 0) {
          const belongsToSelected = diagram.company.some((c: any) => c?.id === selectedCompanyId)
          if (!belongsToSelected) {
            isLoadingRef.current = false
            setNotification({
              open: true,
              message: 'Dieses Diagramm gehört nicht zur ausgewählten Company.',
              severity: 'error',
            })
            return
          }
        }

        // Parse the diagram JSON data
        const diagramData = JSON.parse(diagram.diagramJson)

        // Optimize diagram data by replacing originalElement with elementName
        const optimizedDiagramData = optimizeDiagramOnOpen(diagramData)

        // Try to sync from database with Docker-safe error handling
        let syncedDiagramData
        try {
          syncedDiagramData = await syncDiagramOnOpen(apolloClient, optimizedDiagramData, {
            enabled: featureFlags.Sovereignty,
            companyId: selectedCompanyId,
          })
        } catch (syncError) {
          console.warn('Database sync failed, using local data:', syncError)
          syncedDiagramData = optimizedDiagramData
        }

        // Apply runtime correction for mainElementId references
        let correctionMessage = ''
        try {
          const arrowAnalysis = await analyzeArrows(syncedDiagramData.elements || [])

          if (arrowAnalysis.correctedElements && arrowAnalysis.correctedElements.length > 0) {
            // Replace corrected arrows in the elements array
            const correctedElementMap = new Map(
              arrowAnalysis.correctedElements.map((el: any) => [el.id, el])
            )

            const correctedElements = (syncedDiagramData.elements || []).map((element: any) => {
              if (correctedElementMap.has(element.id)) {
                return correctedElementMap.get(element.id)
              }
              return element
            })

            // Update the diagram data with corrected elements
            syncedDiagramData = {
              ...syncedDiagramData,
              elements: correctedElements,
            }

            // Enhanced notification with details about the corrections
            correctionMessage =
              arrowAnalysis.correctedElements.length === 1
                ? ' (1 Pfeil-Verbindung automatisch korrigiert)'
                : ` (${arrowAnalysis.correctedElements.length} Pfeil-Verbindungen automatisch korrigiert)`
          }
        } catch (correctionError) {
          console.warn('Runtime Correction failed, continuing with original data:', correctionError)
        }

        const sceneData = {
          elements: syncedDiagramData.elements || [],
          appState: {
            ...syncedDiagramData.appState,
            viewBackgroundColor: syncedDiagramData.appState?.viewBackgroundColor || '#ffffff',
            // Docker-safe state restoration - reset problematic properties
            collaborators: new Map(),
            selectedElementIds: {},
            hoveredElementIds: {},
            selectedGroupIds: {},
            selectedLinearElement: null,
            editingLinearElement: null,
            activeTool: { type: 'selection' },
            isLoading: false,
            errorMessage: null,
          },
        }

        // Restore viewport state (position and zoom) if available
        let savedViewportState = null
        savedViewportState = loadViewportStateFromStorage()
        if (savedViewportState) {
          sceneData.appState.scrollX = savedViewportState.scrollX
          sceneData.appState.scrollY = savedViewportState.scrollY
          sceneData.appState.zoom = { value: savedViewportState.zoom }
        }

        const restoredScene = applyDefaultFontToScene(restoreSceneData(sceneData))

        // Sicherstellen, dass die Excalidraw-API-Methoden verfügbar sind
        if (typeof api.updateScene !== 'function') {
          console.error('Excalidraw API fehlt updateScene-Methode!')
          // Reset loading flag on error
          isLoadingRef.current = false
          setNotification({
            open: true,
            message: 'errors.excalidrawNotReady',
            severity: 'error',
          })
          return
        }

        // Sofort die Excalidraw-Szene aktualisieren (mit integrierter Viewport-Position)
        try {
          // Set suppressOnChangeRef to prevent onChange from running after this updateScene
          if (suppressOnChangeRef) {
            suppressOnChangeRef.current = true
          }
          api.updateScene(restoredScene)
        } catch (updateError) {
          console.error('Fehler beim Aktualisieren der Excalidraw-Szene:', updateError)
          // Reset loading flag on error
          isLoadingRef.current = false
          setNotification({
            open: true,
            message: 'errors.updateViewError',
            severity: 'error',
          })
          return
        }

        // Delay state updates to prevent premature onChange calls
        const updateStateAndViewport = () => {
          // State-Updates nach allen Scene-Updates ausführen
          setCurrentDiagram(diagram)
          setCurrentScene(restoredScene)
          setHasUnsavedChanges(false)
          setLastSavedScene(restoredScene)

          // Persist to localStorage
          saveSceneToStorage(restoredScene)
          saveDiagramToStorage(diagram)

          // Enhanced notification that includes correction information
          const loadMessage = correctionMessage
            ? `messages.diagramLoaded:${diagram.title}${correctionMessage}`
            : `messages.diagramLoaded:${diagram.title}`

          setNotification({
            open: true,
            message: loadMessage,
            severity: 'success',
          })
        }

        // Apply viewport state with delay to ensure it takes effect after Excalidraw initialization
        if (savedViewportState) {
          setTimeout(() => {
            try {
              // Loading flag should still be set from the main updateScene call

              if (suppressOnChangeRef) {
                suppressOnChangeRef.current = true
              }
              api.updateScene({
                appState: {
                  scrollX: savedViewportState.scrollX,
                  scrollY: savedViewportState.scrollY,
                  zoom: { value: savedViewportState.zoom },
                },
              })

              // Update state after viewport is applied
              setTimeout(() => {
                updateStateAndViewport()
                // Explicitly ensure hasUnsavedChanges is false after loading is complete
                setTimeout(() => {
                  setHasUnsavedChanges(false)
                  isLoadingRef.current = false
                  // Set timestamp to start cooldown period
                  lastLoadCompletedRef.current = Date.now()
                }, 100)
              }, 50)
            } catch (viewportError) {
              console.warn('Fehler beim Anwenden der Viewport-Einstellungen:', viewportError)
              // Update state even on viewport error
              updateStateAndViewport()
              // Explicitly ensure hasUnsavedChanges is false even on error
              setTimeout(() => {
                setHasUnsavedChanges(false)
                isLoadingRef.current = false
                // Set timestamp to start cooldown period even on error
                lastLoadCompletedRef.current = Date.now()
              }, 50)
            }
          }, 300) // Increased delay to ensure Excalidraw has finished its initial setup
        } else {
          // No viewport update needed, update state immediately
          setTimeout(() => {
            updateStateAndViewport()
            // Explicitly ensure hasUnsavedChanges is false after loading is complete
            setTimeout(() => {
              setHasUnsavedChanges(false)
              isLoadingRef.current = false
              // Set timestamp to start cooldown period
              lastLoadCompletedRef.current = Date.now()
            }, 100)
          }, 100)
        }
      } catch (err) {
        console.error('Error opening diagram:', err)
        // Reset loading flag on error
        isLoadingRef.current = false
        setNotification({
          open: true,
          message: 'errors.loadDiagramError',
          severity: 'error',
        })
      }
    },
    [
      apolloClient,
      applyDefaultFontToScene,
      excalidrawAPI,
      setCurrentDiagram,
      setCurrentScene,
      setHasUnsavedChanges,
      setLastSavedScene,
      setNotification,
      selectedCompanyId,
      featureFlags.Sovereignty,
    ]
  )

  // Save Diagram Handler
  const handleSaveDiagram = useCallback(
    async (savedDiagram: any): Promise<boolean> => {
      if (!excalidrawAPI) return false

      try {
        // Set saving flag to prevent onChange from setting hasUnsavedChanges to true
        isSavingRef.current = true

        const elements = excalidrawAPI.getSceneElements()
        const appState = excalidrawAPI.getAppState()

        const sceneData = {
          elements,
          appState: {
            viewBackgroundColor: appState.viewBackgroundColor,
            currentItemFontFamily: appState.currentItemFontFamily,
          },
        }

        // Try to sync to database with error handling
        try {
          await syncDiagramOnSave(apolloClient, sceneData)
        } catch (syncError) {
          console.warn('Database sync failed during save:', syncError)
          // Continue with local saving even if sync fails
        }

        // Close dialog before updating state (like diagrams-new)
        setSaveDialogOpen(false)

        // Update state
        setCurrentDiagram(savedDiagram)
        setHasUnsavedChanges(false)
        setLastSavedScene(sceneData)

        // Broadcast updated diagram metadata to collaborators
        if (broadcastSceneUpdateRef?.current) {
          broadcastSceneUpdateRef.current(elements, appState)
        }

        // Persist to localStorage
        saveSceneToStorage(sceneData)
        saveDiagramToStorage(savedDiagram)
        saveLastSavedSceneToStorage(sceneData)

        setNotification({
          open: true,
          message: `messages.diagramSaved:${savedDiagram.title}`,
          severity: 'success',
        })

        // Reset saving flag after a short delay to ensure all onChange events have been processed
        setTimeout(() => {
          isSavingRef.current = false
        }, 100)

        return true
      } catch (err) {
        console.error('Error saving diagram:', err)
        // Reset saving flag on error
        isSavingRef.current = false
        setNotification({
          open: true,
          message: 'errors.saveDiagramError',
          severity: 'error',
        })
        return false
      }
    },
    [
      apolloClient,
      excalidrawAPI,
      setCurrentDiagram,
      setHasUnsavedChanges,
      setLastSavedScene,
      setNotification,
      setSaveDialogOpen,
    ]
  )

  // Save As Diagram Handler
  const handleSaveAsDiagram = useCallback(
    async (savedDiagram: any): Promise<boolean> => {
      // Set saving flag briefly for consistency
      isSavingRef.current = true

      // Close dialog before updating state (like diagrams-new)
      setSaveAsDialogOpen(false)

      setCurrentDiagram(savedDiagram)
      setHasUnsavedChanges(false) // Also reset unsaved changes for Save As

      // Persist current diagram to localStorage
      saveDiagramToStorage(savedDiagram)

      setNotification({
        open: true,
        message: `messages.diagramSavedAs:${savedDiagram.title}`,
        severity: 'success',
      })

      // Reset saving flag
      setTimeout(() => {
        isSavingRef.current = false
      }, 100)

      return true
    },
    [setCurrentDiagram, setHasUnsavedChanges, setNotification, setSaveAsDialogOpen]
  )

  // Change Handler - uses Excalidraw's native onChange to detect ANY change
  const handleChange = useCallback(
    (elements: any[], appState: any) => {
      // Calculate timing for cooldown logic
      const timeSinceLastLoad = Date.now() - lastLoadCompletedRef.current

      // Save viewport state (scrollX, scrollY, zoom) to localStorage whenever it changes
      // Use a debounced approach to avoid excessive localStorage writes
      if (
        appState &&
        typeof appState.scrollX === 'number' &&
        typeof appState.scrollY === 'number' &&
        appState.zoom?.value
      ) {
        const viewportState = {
          scrollX: appState.scrollX,
          scrollY: appState.scrollY,
          zoom: appState.zoom.value, // Extract the actual zoom value
        }

        // Only save if viewport has actually changed to avoid excessive writes
        const existingState = loadViewportStateFromStorage()
        const viewportChanged =
          !existingState ||
          Math.abs(existingState.scrollX - viewportState.scrollX) > 1 ||
          Math.abs(existingState.scrollY - viewportState.scrollY) > 1 ||
          Math.abs(existingState.zoom - viewportState.zoom) > 0.01

        if (viewportChanged) {
          saveViewportStateToStorage(viewportState)
        }
      }

      // Check if we're in a cooldown period after loading (ignore onChange for 2 seconds after load completion)
      const isInLoadCooldown = timeSinceLastLoad < 2000 // 2 seconds cooldown

      if (isInLoadCooldown) {
        return
      }

      // Track changes if we have a current diagram loaded and we're not currently saving or loading
      // When Excalidraw calls onChange, it means something has changed - mark as unsaved
      if (currentDiagram && !isSavingRef.current && !isLoadingRef.current) {
        setHasUnsavedChanges(true)

        // Create scene data for persistence without triggering state update
        const currentScene = {
          elements,
          appState: {
            viewBackgroundColor: appState.viewBackgroundColor,
            currentItemFontFamily: appState.currentItemFontFamily,
          },
        }

        // Persist current state to localStorage for crash recovery only
        // Do NOT call setCurrentScene here to prevent infinite loops
        saveSceneToStorage(currentScene)
      }
    },
    [currentDiagram, setHasUnsavedChanges]
  )

  // JSON Export Handler
  const handleExportJSON = useCallback(() => {
    if (excalidrawAPI) {
      try {
        const elements = excalidrawAPI.getSceneElements()
        const appState = excalidrawAPI.getAppState()

        const exportData = {
          type: 'excalidraw',
          version: 2,
          source: 'nextgen-eam',
          elements: elements,
          appState: {
            viewBackgroundColor: appState.viewBackgroundColor || '#ffffff',
            currentItemFontFamily: appState.currentItemFontFamily,
            currentItemFontSize: appState.currentItemFontSize,
            currentItemTextAlign: appState.currentItemTextAlign,
            currentItemStrokeColor: appState.currentItemStrokeColor,
            currentItemBackgroundColor: appState.currentItemBackgroundColor,
            currentItemFillStyle: appState.currentItemFillStyle,
            currentItemStrokeWidth: appState.currentItemStrokeWidth,
            currentItemStrokeStyle: appState.currentItemStrokeStyle,
            currentItemRoughness: appState.currentItemRoughness,
            currentItemOpacity: appState.currentItemOpacity,
            gridSize: appState.gridSize,
            showGrid: appState.showGrid,
            zenModeEnabled: appState.zenModeEnabled,
            theme: appState.theme,
          },
        }

        const dataStr = JSON.stringify(exportData, null, 2)
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)

        const exportFileDefaultName = currentDiagram
          ? `${currentDiagram.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.excalidraw`
          : 'diagram.excalidraw'

        const linkElement = document.createElement('a')
        linkElement.setAttribute('href', dataUri)
        linkElement.setAttribute('download', exportFileDefaultName)
        linkElement.click()

        setNotification({
          open: true,
          message: 'messages.jsonExported',
          severity: 'success',
        })
      } catch (err) {
        console.error('Error exporting JSON:', err)
        setNotification({
          open: true,
          message: 'errors.exportJSONError',
          severity: 'error',
        })
      }
    }
  }, [excalidrawAPI, currentDiagram, setNotification])

  // Draw.io XML Export Handler
  const handleExportDrawIO = useCallback(() => {
    if (excalidrawAPI) {
      try {
        const elements = excalidrawAPI.getSceneElements()
        const appState = excalidrawAPI.getAppState()

        const exportData = {
          type: 'excalidraw',
          version: 2,
          source: 'nextgen-eam',
          elements: elements,
          appState: {
            viewBackgroundColor: appState.viewBackgroundColor || '#ffffff',
            currentItemFontFamily: appState.currentItemFontFamily,
            currentItemFontSize: appState.currentItemFontSize,
            currentItemTextAlign: appState.currentItemTextAlign,
            currentItemStrokeColor: appState.currentItemStrokeColor,
            currentItemBackgroundColor: appState.currentItemBackgroundColor,
            currentItemFillStyle: appState.currentItemFillStyle,
            currentItemStrokeWidth: appState.currentItemStrokeWidth,
            currentItemStrokeStyle: appState.currentItemStrokeStyle,
            currentItemRoughness: appState.currentItemRoughness,
            currentItemOpacity: appState.currentItemOpacity,
            gridSize: appState.gridSize,
            showGrid: appState.showGrid,
            zenModeEnabled: appState.zenModeEnabled,
            theme: appState.theme,
          },
        }

        const xmlContent = convertExcalidrawToDrawIO(exportData)

        const exportFileDefaultName = currentDiagram
          ? `${currentDiagram.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`
          : 'diagram'

        downloadDrawIOFile(xmlContent, exportFileDefaultName)

        setNotification({
          open: true,
          message: 'messages.drawioExported',
          severity: 'success',
        })
      } catch (err) {
        console.error('Error exporting draw.io XML:', err)
        setNotification({
          open: true,
          message: 'errors.exportDrawIOError',
          severity: 'error',
        })
      }
    }
  }, [excalidrawAPI, currentDiagram, setNotification])

  // Archi XML Export Handler
  const handleExportArchi = useCallback(() => {
    if (excalidrawAPI) {
      try {
        const elements = excalidrawAPI.getSceneElements()
        const appState = excalidrawAPI.getAppState()

        const exportData = {
          type: 'excalidraw',
          version: 2,
          source: 'nextgen-eam',
          elements: elements,
          appState: {
            viewBackgroundColor: appState.viewBackgroundColor || '#ffffff',
            currentItemFontFamily: appState.currentItemFontFamily,
            currentItemFontSize: appState.currentItemFontSize,
            currentItemTextAlign: appState.currentItemTextAlign,
            currentItemStrokeColor: appState.currentItemStrokeColor,
            currentItemBackgroundColor: appState.currentItemBackgroundColor,
            currentItemFillStyle: appState.currentItemFillStyle,
            currentItemStrokeWidth: appState.currentItemStrokeWidth,
            currentItemStrokeStyle: appState.currentItemStrokeStyle,
            currentItemRoughness: appState.currentItemRoughness,
            currentItemOpacity: appState.currentItemOpacity,
            gridSize: appState.gridSize,
            showGrid: appState.showGrid,
            zenModeEnabled: appState.zenModeEnabled,
            theme: appState.theme,
          },
        }

        const diagramName = currentDiagram?.title || 'diagram'
        const xmlContent = convertExcalidrawToArchi(exportData, diagramName)

        const exportFileDefaultName = currentDiagram
          ? `${currentDiagram.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`
          : 'diagram'

        downloadArchiFile(xmlContent, exportFileDefaultName)

        setNotification({
          open: true,
          message: 'messages.archiExported',
          severity: 'success',
        })
      } catch (err) {
        console.error('Error exporting Archi XML:', err)
        setNotification({
          open: true,
          message: 'errors.exportArchiError',
          severity: 'error',
        })
      }
    }
  }, [excalidrawAPI, currentDiagram, setNotification])

  // JSON Import Handler
  const handleImportJSON = useCallback(async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.excalidraw,.json'
    input.onchange = (e: any) => {
      const file = e.target.files[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = async (e: any) => {
          try {
            const importedData = JSON.parse(e.target.result)

            if (!importedData.elements || !excalidrawAPI) {
              throw new Error('Invalid file format')
            }

            setNotification({
              open: true,
              message: 'messages.jsonImporting',
              severity: 'info',
            })

            // Importiere ID-Mapping-Funktionalität
            const { processImportedDiagramData, updateDiagramDatabaseIds } = await import(
              '../utils/importIdMappingUtils'
            )

            // Verarbeite importierte Daten und mappe IDs bei Bedarf
            const { processedData, mappings, summary } = await processImportedDiagramData(
              apolloClient,
              {
                elements: importedData.elements,
                appState: importedData.appState || { viewBackgroundColor: '#ffffff' },
              }
            )
            // Zusätzliche ID-Aktualisierung falls Mappings vorhanden sind
            let finalData = processedData
            if (mappings.length > 0) {
              const idMappingMap = mappings.reduce(
                (acc, mapping) => {
                  acc[mapping.oldId] = mapping.newId
                  return acc
                },
                {} as { [oldId: string]: string }
              )

              finalData = updateDiagramDatabaseIds(processedData, idMappingMap)
            }

            const restoredScene = applyDefaultFontToScene(restoreSceneData(finalData))
            excalidrawAPI.updateScene(restoredScene)
            setCurrentScene(restoredScene)

            // Clear current diagram since this is an import
            setCurrentDiagram(null)
            clearDiagramStorage()

            // Zeige detaillierte Erfolgs-Nachricht mit ID-Mapping-Info
            const successMessage =
              mappings.length > 0
                ? `JSON erfolgreich importiert!\n\n${summary}`
                : 'messages.jsonImported'

            setNotification({
              open: true,
              message: successMessage,
              severity: 'success',
            })

            // Zusätzliche Warnung bei ID-Mappings
            if (mappings.length > 0) {
              setTimeout(() => {
                setNotification({
                  open: true,
                  message: `Hinweis: ${mappings.length} Element-IDs wurden automatisch an die lokale Datenbank angepasst. Bitte prüfen Sie die Elemente.`,
                  severity: 'warning',
                })
              }, 3000)
            }
          } catch (err) {
            console.error('Error importing JSON:', err)
            setNotification({
              open: true,
              message: `Fehler beim JSON Import: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`,
              severity: 'error',
            })
          }
        }
        reader.readAsText(file)
      }
    }
    input.click()
  }, [
    apolloClient,
    applyDefaultFontToScene,
    excalidrawAPI,
    setCurrentScene,
    setCurrentDiagram,
    setNotification,
  ])

  // PNG Export Handler
  const handleExportPNG = useCallback(async () => {
    if (!excalidrawAPI) {
      setNotification({
        open: true,
        message: 'errors.excalidrawNotAvailable',
        severity: 'error',
      })
      return
    }

    try {
      // Import export function dynamically
      const { exportToBlob } = await import('@excalidraw/excalidraw')

      const elements = excalidrawAPI.getSceneElements()
      const appState = excalidrawAPI.getAppState()
      const files = excalidrawAPI.getFiles()

      if (!elements || elements.length === 0) {
        setNotification({
          open: true,
          message: 'errors.noElementsToExport',
          severity: 'warning',
        })
        return
      }

      setNotification({
        open: true,
        message: 'messages.pngExporting',
        severity: 'info',
      })

      // Export to PNG blob
      const blob = await exportToBlob({
        elements,
        appState: {
          ...appState,
          exportBackground: true,
          viewBackgroundColor: appState.viewBackgroundColor || '#ffffff',
          exportWithDarkMode: false,
          exportEmbedScene: false, // Don't embed scene data to keep file size smaller
        },
        files,
        mimeType: 'image/png',
        quality: 0.95,
        exportPadding: 20, // Add some padding around the drawing
      })

      if (!blob) {
        throw new Error('Export failed - no blob generated')
      }

      // Create download link
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url

      // Generate filename
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')
      const filename = currentDiagram
        ? `${currentDiagram.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${timestamp}.png`
        : `diagram_${timestamp}.png`

      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Clean up the URL object
      URL.revokeObjectURL(url)

      setNotification({
        open: true,
        message: `PNG erfolgreich exportiert: ${filename}`,
        severity: 'success',
      })
    } catch (err) {
      console.error('Error exporting PNG:', err)
      setNotification({
        open: true,
        message: `Fehler beim PNG Export: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`,
        severity: 'error',
      })
    }
  }, [excalidrawAPI, currentDiagram, setNotification])

  // Manual Sync Handler
  const handleManualSync = useCallback(async () => {
    if (!excalidrawAPI) {
      setNotification({
        open: true,
        message: 'errors.excalidrawNotAvailable',
        severity: 'error',
      })
      return
    }

    try {
      const elements = excalidrawAPI.getSceneElements()
      const appState = excalidrawAPI.getAppState()

      const sceneData = {
        elements,
        appState: {
          viewBackgroundColor: appState.viewBackgroundColor,
          currentItemFontFamily: appState.currentItemFontFamily,
        },
      }

      // Use syncDiagramOnOpen for manual synchronization (loads fresh data from database)
      const syncedDiagramData = await syncDiagramOnOpen(apolloClient, sceneData, {
        enabled: featureFlags.Sovereignty,
        companyId: selectedCompanyId,
      })

      // Clear any missing element markers if no missing elements found
      const cleanedElements = clearMissingElementMarkers(syncedDiagramData.elements)

      // Update the scene with synced and cleaned elements
      if (excalidrawAPI) {
        excalidrawAPI.updateScene({
          elements: cleanedElements,
          appState: {
            ...syncedDiagramData.appState,
            viewBackgroundColor: appState.viewBackgroundColor,
            currentItemFontFamily: appState.currentItemFontFamily,
          },
        })
      }

      setNotification({
        open: true,
        message: 'messages.syncCompleted',
        severity: 'success',
      })
    } catch (err) {
      console.error('Manual sync failed:', err)
      setNotification({
        open: true,
        message: `Fehler bei der Datenbank-Synchronisation: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`,
        severity: 'error',
      })
    }
  }, [apolloClient, excalidrawAPI, setNotification, featureFlags.Sovereignty, selectedCompanyId])

  return {
    handleNewDiagram,
    handleDeleteDiagram,
    handleOpenDiagram,
    handleSaveDiagram,
    handleSaveAsDiagram,
    handleChange,
    handleExportJSON,
    handleExportDrawIO,
    handleExportArchi,
    handleImportJSON,
    handleExportPNG,
    handleManualSync,
    isLoadingRef,
  }
}

// Helper function that was in the original component
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
