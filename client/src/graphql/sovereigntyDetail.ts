import { gql } from '@apollo/client/core'

// Lightweight list queries — only what's needed to enumerate the roots the
// canonical GET_SOVEREIGNTY_ANALYSIS query is then run against per-element.
export const GET_SOVEREIGNTY_CAPABILITIES_LIST = gql`
  query GetSovereigntyCapabilitiesList($where: BusinessCapabilityWhere) {
    businessCapabilities(where: $where) {
      id
      name
    }
  }
`

export const GET_SOVEREIGNTY_DATA_OBJECTS_LIST = gql`
  query GetSovereigntyDataObjectsList($where: DataObjectWhere) {
    dataObjects(where: $where) {
      id
      name
    }
  }
`

// Canonical sovereignty findings query (02-01/02-02). Replaces the two
// raw-entity-tree queries this file previously exposed — both detail views
// now consume this single, evaluator-backed field instead of computing an
// inherited/aggregated score client-side (D-07).
export const GET_SOVEREIGNTY_ANALYSIS = gql`
  query GetSovereigntyAnalysis($companyId: ID!, $rootType: String!, $rootId: ID!) {
    sovereigntyAnalysis(companyId: $companyId, rootType: $rootType, rootId: $rootId) {
      rootId
      rootType
      selfStatus
      downstreamStatus
      findings {
        violatingElementId
        violatingElementType
        violatingElementName
        dimension
        status
        requiredLevel
        actualLevel
        chainPath
      }
    }
  }
`
