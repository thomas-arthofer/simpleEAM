import { gql } from '@apollo/client/core'

// Batched D-05 self/downstream marker projection (02-02) — one query per
// diagram root, reused verbatim by the diagram marker overlay (02-05) instead
// of re-deriving self/downstream status client-side (RESEARCH.md Anti-Pattern 3:
// one classifier, reused everywhere).
export const GET_SOVEREIGNTY_MARKERS = gql`
  query GetSovereigntyMarkers(
    $companyId: ID!
    $rootType: String!
    $rootId: ID!
    $nodes: [SovereigntyMarkerNodeInput!]!
  ) {
    sovereigntyMarkers(
      companyId: $companyId
      rootType: $rootType
      rootId: $rootId
      nodes: $nodes
    ) {
      nodeId
      selfStatus
      downstreamStatus
    }
  }
`
