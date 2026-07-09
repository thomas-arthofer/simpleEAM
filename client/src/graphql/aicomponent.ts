// GraphQL Operations für AI Components

import { gql } from '@apollo/client/core'

// Query: Alle AI Components abrufen
export const GET_Aicomponents = gql`
  query GetAIComponents($where: AIComponentWhere) {
    aiComponents(where: $where) {
      id
      name
      description
      sovereigntyAchStrategicAutonomy
      sovereigntyAchResilience
      sovereigntyAchSecurity
      sovereigntyAchControl
      sovereigntyAchStrategicAutonomyEvidence
      sovereigntyAchResilienceEvidence
      sovereigntyAchSecurityEvidence
      sovereigntyAchControlEvidence
      lastSovereigntyAssessmentAt
      aiType
      model
      version
      status
      accuracy
      trainingDate
      lastUpdated
      provider
      license
      costs
      tags
      createdAt
      updatedAt
      owners {
        id
        firstName
        lastName
      }
      company {
        id
        name
      }
      supportsCapabilities {
        id
        name
      }
      usedByApplications {
        id
        name
      }
      trainedWithDataObjects {
        id
        name
      }
      hostedOn {
        id
        name
      }
      providedBy {
        id
        name
      }
      supportedBy {
        id
        name
      }
      maintainedBy {
        id
        name
      }
      partOfArchitectures {
        id
        name
      }
      implementsPrinciples {
        id
        name
      }
      depictedInDiagrams {
        id
        title
      }
    }
  }
`

// Query: Einzelne AI Component abrufen
export const GET_Aicomponent = gql`
  query GetAIComponent($id: ID!) {
    aiComponents(where: { id: { eq: $id } }) {
      id
      name
      description
      sovereigntyAchStrategicAutonomy
      sovereigntyAchResilience
      sovereigntyAchSecurity
      sovereigntyAchControl
      sovereigntyAchStrategicAutonomyEvidence
      sovereigntyAchResilienceEvidence
      sovereigntyAchSecurityEvidence
      sovereigntyAchControlEvidence
      lastSovereigntyAssessmentAt
      aiType
      model
      version
      status
      accuracy
      trainingDate
      lastUpdated
      provider
      license
      costs
      tags
      createdAt
      updatedAt
      owners {
        id
        firstName
        lastName
      }
      company {
        id
        name
      }
      supportsCapabilities {
        id
        name
      }
      usedByApplications {
        id
        name
      }
      trainedWithDataObjects {
        id
        name
      }
      hostedOn {
        id
        name
      }
      providedBy {
        id
        name
      }
      supportedBy {
        id
        name
      }
      maintainedBy {
        id
        name
      }
      partOfArchitectures {
        id
        name
      }
      implementsPrinciples {
        id
        name
      }
      depictedInDiagrams {
        id
        title
      }
    }
  }
`

// Mutation: Neue AI Component erstellen
export const CREATE_Aicomponent = gql`
  mutation CreateAIComponents($input: [AIComponentCreateInput!]!) {
    createAiComponents(input: $input) {
      aiComponents {
        id
        name
        description
        sovereigntyAchStrategicAutonomy
        sovereigntyAchResilience
        sovereigntyAchSecurity
        sovereigntyAchControl
        sovereigntyAchStrategicAutonomyEvidence
        lastSovereigntyAssessmentAt
        aiType
        model
        version
        status
        accuracy
        trainingDate
        lastUpdated
        provider
        license
        costs
        tags
        createdAt
        updatedAt
        owners {
          id
          firstName
          lastName
        }
        company {
          id
          name
        }
        supportsCapabilities {
          id
          name
        }
        usedByApplications {
          id
          name
        }
        trainedWithDataObjects {
          id
          name
        }
        hostedOn {
          id
          name
        }
        providedBy {
          id
          name
        }
        supportedBy {
          id
          name
        }
        maintainedBy {
          id
          name
        }
        partOfArchitectures {
          id
          name
        }
        implementsPrinciples {
          id
          name
        }
        depictedInDiagrams {
          id
          title
        }
      }
    }
  }
`

// Mutation: AI Component aktualisieren
export const UPDATE_Aicomponent = gql`
  mutation UpdateAIComponents($where: AIComponentWhere!, $update: AIComponentUpdateInput!) {
    updateAiComponents(where: $where, update: $update) {
      aiComponents {
        id
        name
        description
        sovereigntyAchStrategicAutonomy
        sovereigntyAchResilience
        sovereigntyAchSecurity
        sovereigntyAchControl
        sovereigntyAchStrategicAutonomyEvidence
        lastSovereigntyAssessmentAt
        aiType
        model
        version
        status
        accuracy
        trainingDate
        lastUpdated
        provider
        license
        costs
        tags
        createdAt
        updatedAt
        owners {
          id
          firstName
          lastName
        }
        company {
          id
          name
        }
        supportsCapabilities {
          id
          name
        }
        usedByApplications {
          id
          name
        }
        trainedWithDataObjects {
          id
          name
        }
        hostedOn {
          id
          name
        }
        providedBy {
          id
          name
        }
        supportedBy {
          id
          name
        }
        maintainedBy {
          id
          name
        }
        partOfArchitectures {
          id
          name
        }
        implementsPrinciples {
          id
          name
        }
        depictedInDiagrams {
          id
          title
        }
      }
    }
  }
`

// Mutation: AI Component löschen
export const DELETE_Aicomponent = gql`
  mutation DeleteAIComponent($id: ID!) {
    deleteAiComponents(where: { id: { eq: $id } }) {
      nodesDeleted
    }
  }
`

// Query: AI Component Existenz prüfen
export const CHECK_AICOMPONENT_EXISTS = gql`
  query CheckAIComponentExists($id: ID!) {
    aiComponents(where: { id: { eq: $id } }) {
      id
    }
  }
`

// Query: Anzahl der AI Components
export const GET_AICOMPONENTS_COUNT = gql`
  query GetAIComponentsCount($where: AIComponentWhere) {
    aiComponents(where: $where) {
      id
    }
  }
`
