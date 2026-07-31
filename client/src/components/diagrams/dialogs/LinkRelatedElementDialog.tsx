'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material'
import { useTranslations } from 'next-intl'
import { useApolloClient } from '@apollo/client'
import { loadRelatedElementsFromDatabase } from '../services/databaseRelatedElementsService'
import {
  loadArchimateLibrary,
  createCanvasElementsFromTemplate,
  findArchimateTemplate,
  ElementType,
} from '../utils/architectureElements'
import { getArchimateTemplateName } from '../services/elementTemplateMapping'
import { createArrowBetweenElements } from '../services/arrowCreationService'
import GroupedElementSections, {
  type GroupedElementListSection,
} from '../components/GroupedElementSections'
import { ELEMENT_TYPE_CONFIG, type ElementType as LibraryElementType } from '@/graphql/library'

interface LinkRelatedElementDialogProps {
  isOpen: boolean
  onClose: () => void
  selectedElement: any | null
  excalidrawAPI: any
}

interface RelatedElementItem {
  id: string
  name: string
  elementType:
    | 'businessCapability'
    | 'businessProcess'
    | 'application'
    | 'dataObject'
    | 'interface'
    | 'infrastructure'
    | 'aiComponent'
  reverseArrow?: boolean
}

const elementTypeOrder: RelatedElementItem['elementType'][] = [
  'businessCapability',
  'businessProcess',
  'application',
  'dataObject',
  'interface',
  'infrastructure',
  'aiComponent',
]

const toTemplateElementType = (elementType: RelatedElementItem['elementType']): ElementType => {
  switch (elementType) {
    case 'businessCapability':
      return 'businessCapability'
    case 'businessProcess':
      return 'businessProcess'
    case 'application':
      return 'application'
    case 'dataObject':
      return 'dataObject'
    case 'interface':
      return 'applicationInterface'
    case 'infrastructure':
      return 'infrastructure'
    case 'aiComponent':
      return 'aiComponent'
    default:
      return 'application'
  }
}

const normalizeMainElementType = (elementType: string | undefined): string | null => {
  if (!elementType) return null
  const mapping: Record<string, string> = {
    capability: 'businessCapability',
    businessCapability: 'businessCapability',
    businessProcess: 'businessProcess',
    'business-process': 'businessProcess',
    business_process: 'businessProcess',
    process: 'businessProcess',
    application: 'application',
    dataObject: 'dataObject',
    interface: 'applicationInterface',
    applicationInterface: 'applicationInterface',
    'application-interface': 'applicationInterface',
    application_interface: 'applicationInterface',
    infrastructure: 'infrastructure',
  }
  return mapping[elementType] || null
}

export default function LinkRelatedElementDialog({
  isOpen,
  onClose,
  selectedElement,
  excalidrawAPI,
}: LinkRelatedElementDialogProps) {
  const t = useTranslations('diagrams.linkRelatedElement')
  const tCommon = useTranslations('common')
  const apolloClient = useApolloClient()

  const [isLoading, setIsLoading] = useState(false)
  const [isLinking, setIsLinking] = useState(false)
  const [error, setError] = useState<string>('')
  const [relatedElements, setRelatedElements] = useState<RelatedElementItem[]>([])
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  const toLibraryElementType = (
    elementType: RelatedElementItem['elementType']
  ): LibraryElementType | null => {
    switch (elementType) {
      case 'interface':
        return 'applicationInterface'
      case 'businessCapability':
      case 'businessProcess':
      case 'application':
      case 'dataObject':
      case 'infrastructure':
      case 'aiComponent':
        return elementType
      default:
        return null
    }
  }

  const getArrowPosition = (
    sourceElement: any,
    targetElement: any
  ): 'left' | 'right' | 'top' | 'bottom' => {
    const sourceCenterX = sourceElement.x + sourceElement.width / 2
    const sourceCenterY = sourceElement.y + sourceElement.height / 2
    const targetCenterX = targetElement.x + targetElement.width / 2
    const targetCenterY = targetElement.y + targetElement.height / 2

    const deltaX = targetCenterX - sourceCenterX
    const deltaY = targetCenterY - sourceCenterY

    if (Math.abs(deltaX) >= Math.abs(deltaY)) {
      return deltaX >= 0 ? 'right' : 'left'
    }

    return deltaY >= 0 ? 'bottom' : 'top'
  }

  const groupedElements = useMemo(() => {
    const groups = new Map<RelatedElementItem['elementType'], RelatedElementItem[]>()
    elementTypeOrder.forEach(type => groups.set(type, []))

    relatedElements.forEach(element => {
      const list = groups.get(element.elementType)
      if (list) {
        list.push(element)
      }
    })

    elementTypeOrder.forEach(type => {
      const list = groups.get(type)
      if (list) {
        list.sort((a, b) => a.name.localeCompare(b.name))
      }
    })

    return groups
  }, [relatedElements])

  const selectedElementName =
    selectedElement?.customData?.elementName || selectedElement?.name || selectedElement?.text || ''

  const loadRelatedElements = useCallback(async () => {
    if (!selectedElement?.customData?.databaseId) {
      setRelatedElements([])
      return
    }

    const normalizedType = normalizeMainElementType(selectedElement?.customData?.elementType)
    if (!normalizedType) {
      setError(t('unsupportedType'))
      setRelatedElements([])
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await loadRelatedElementsFromDatabase({
        client: apolloClient as any,
        mainElementId: selectedElement.customData.databaseId,
        mainElementType: normalizedType,
      })

      const uniqueById = new Map<string, RelatedElementItem>()
      ;(response.elements || []).forEach((element: RelatedElementItem) => {
        if (!element?.id || !element?.name || !element?.elementType) {
          return
        }
        if (!uniqueById.has(element.id)) {
          uniqueById.set(element.id, element)
        }
      })

      setRelatedElements(Array.from(uniqueById.values()))
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : tCommon('unknownError')
      setError(t('loadError', { error: message }))
      setRelatedElements([])
    } finally {
      setIsLoading(false)
    }
  }, [apolloClient, selectedElement, t, tCommon])

  useEffect(() => {
    if (!isOpen) {
      return
    }
    void loadRelatedElements()
  }, [isOpen, loadRelatedElements])

  const handleLinkElement = useCallback(
    async (relatedElement: RelatedElementItem) => {
      if (!selectedElement || !excalidrawAPI) {
        return
      }

      setIsLinking(true)
      setError('')

      try {
        const library = await loadArchimateLibrary()
        if (!library) {
          throw new Error(t('libraryError'))
        }

        const templateName = getArchimateTemplateName(relatedElement.elementType)
        const template = findArchimateTemplate(library, templateName)
        if (!template) {
          throw new Error(t('templateMissing', { type: relatedElement.elementType }))
        }

        const sourceFromScene =
          excalidrawAPI
            .getSceneElements()
            .find((element: any) => element.id === selectedElement.id) || selectedElement

        const distance = Math.max(80, Math.round(sourceFromScene.width * 0.7))
        const targetX = sourceFromScene.x + sourceFromScene.width + distance
        const targetY = sourceFromScene.y

        const createdElements = createCanvasElementsFromTemplate({
          template,
          element: { id: relatedElement.id, name: relatedElement.name },
          elementType: toTemplateElementType(relatedElement.elementType),
          targetX,
          targetY,
        })

        if (!createdElements.length) {
          throw new Error(t('createElementError'))
        }

        const createdMainElement =
          createdElements.find((element: any) => element?.customData?.isMainElement) ||
          createdElements[0]
        const sourceElement = relatedElement.reverseArrow ? createdMainElement : sourceFromScene
        const targetElement = relatedElement.reverseArrow ? sourceFromScene : createdMainElement
        const arrowPosition = getArrowPosition(sourceElement, targetElement)

        const arrowElement = createArrowBetweenElements({
          sourceElement,
          targetElement,
          arrowType: 'sharp',
          position: arrowPosition,
          reverseArrow: false,
          totalArrows: 1,
          arrowIndex: 0,
          arrowGap: 'medium',
        })

        const attachArrowBinding = (element: any, arrowId: string) => {
          const boundElements = Array.isArray(element.boundElements)
            ? [...element.boundElements]
            : []
          if (!boundElements.some((bound: any) => bound?.id === arrowId)) {
            boundElements.push({ id: arrowId, type: 'arrow' })
          }
          return { ...element, boundElements }
        }

        const boundSource = attachArrowBinding(sourceElement, arrowElement.id)
        const boundTarget = attachArrowBinding(targetElement, arrowElement.id)

        const updatedCreatedElements = createdElements.map((element: any) => {
          if (element.id === boundSource.id) return boundSource
          if (element.id === boundTarget.id) return boundTarget
          return element
        })

        const currentElements = excalidrawAPI.getSceneElements()
        const updatedSceneElements = currentElements.map((element: any) => {
          if (element.id === boundSource.id) return boundSource
          if (element.id === boundTarget.id) return boundTarget
          return element
        })

        const selectedGroupIds = updatedCreatedElements.reduce(
          (groupSelection: Record<string, boolean>, element: any) => {
            if (Array.isArray(element.groupIds)) {
              element.groupIds.forEach((groupId: string) => {
                if (groupId) {
                  groupSelection[groupId] = true
                }
              })
            }
            return groupSelection
          },
          {}
        )

        const hasGroupSelection = Object.keys(selectedGroupIds).length > 0

        excalidrawAPI.updateScene({
          elements: [...updatedSceneElements, ...updatedCreatedElements, arrowElement],
          appState: {
            ...excalidrawAPI.getAppState(),
            selectedElementIds: hasGroupSelection
              ? {}
              : {
                  [createdMainElement.id]: true,
                },
            selectedGroupIds,
          },
        })

        onClose()
      } catch (linkError) {
        const message = linkError instanceof Error ? linkError.message : tCommon('unknownError')
        setError(t('linkError', { error: message }))
      } finally {
        setIsLinking(false)
      }
    },
    [excalidrawAPI, onClose, selectedElement, t, tCommon]
  )

  const relatedSections = useMemo<GroupedElementListSection[]>(() => {
    return elementTypeOrder.reduce<GroupedElementListSection[]>((acc, type) => {
      const elements = groupedElements.get(type) || []
      if (!elements.length) {
        return acc
      }

      acc.push({
        key: `related-${type}`,
        title: t(`elementTypes.${type}`),
        emptyLabel: t('noRelations'),
        items: elements.map(element => ({
          id: element.id,
          title: element.name,
          elementType: element.elementType,
          disabled: isLinking,
          onClick: () => void handleLinkElement(element),
        })),
      })

      return acc
    }, [])
  }, [groupedElements, handleLinkElement, isLinking, t])

  useEffect(() => {
    const nextExpanded = new Set<string>()
    relatedSections.forEach(section => nextExpanded.add(section.key))
    setExpandedSections(nextExpanded)
  }, [relatedSections])

  if (!selectedElement) {
    return null
  }

  return (
    <Dialog open={isOpen} onClose={isLinking ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('title')}</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('description', { element: selectedElementName })}
        </Typography>

        {isLoading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <CircularProgress size={20} />
            <Typography variant="body2">{t('loading')}</Typography>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!isLoading && !error && relatedElements.length === 0 && (
          <Alert severity="info">{t('noRelations')}</Alert>
        )}

        {!isLoading && relatedElements.length > 0 && (
          <Box sx={{ maxHeight: 420, overflowY: 'auto' }}>
            <GroupedElementSections
              sections={relatedSections}
              expandedSections={expandedSections}
              onExpandedSectionsChange={setExpandedSections}
              getItemColor={item => {
                const mappedType = toLibraryElementType(
                  item.elementType as RelatedElementItem['elementType']
                )
                if (!mappedType) {
                  return 'transparent'
                }
                return ELEMENT_TYPE_CONFIG[mappedType]?.color ?? 'transparent'
              }}
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isLinking}>
          {tCommon('close')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
