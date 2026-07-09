import { gql } from '@apollo/client/core'

export const CHECK_APPLICATION_EXISTS = gql`
  query CheckApplicationExists($id: ID!) {
    applications(where: { id: { eq: $id } }) {
      id
    }
  }
`

export const GET_APPLICATIONS_COUNT = gql`
  query GetApplicationsCount($where: ApplicationWhere) {
    applicationsConnection(where: $where) {
      aggregate {
        count {
          nodes
        }
      }
    }
  }
`

export const GET_APPLICATIONS = gql`
  query GetApplications($where: ApplicationWhere) {
    applications(where: $where) {
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
      status
      criticality
      timeCategory
      sevenRStrategy
      costs
      vendor
      version
      hostingEnvironment
      technologyStack
      planningDate
      introductionDate
      endOfUseDate
      endOfLifeDate
      owners {
        id
        firstName
        lastName
      }
      createdAt
      updatedAt
      supportsCapabilities {
        id
        name
      }
      supportsBusinessProcesses {
        id
        name
      }
      usesDataObjects {
        id
        name
      }
      sourceOfInterfaces {
        id
        name
      }
      targetOfInterfaces {
        id
        name
      }
      partOfArchitectures {
        id
        name
      }
      depictedInDiagrams {
        id
        title
      }
      parents {
        id
        name
      }
      components {
        id
        name
      }
      predecessors {
        id
        name
      }
      successors {
        id
        name
      }
      implementsPrinciples {
        id
        name
        description
        category
        priority
      }
      hostedOn {
        id
        name
      }
      softwareVersions {
        id
        name
        version
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
    }
  }
`

export const GET_APPLICATION = gql`
  query GetApplication($id: ID!) {
    applications(where: { id: { eq: $id } }) {
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
      status
      criticality
      timeCategory
      sevenRStrategy
      costs
      vendor
      version
      hostingEnvironment
      technologyStack
      planningDate
      introductionDate
      endOfUseDate
      endOfLifeDate
      owners {
        id
        firstName
        lastName
      }
      createdAt
      updatedAt
      supportsCapabilities {
        id
        name
      }
      supportsBusinessProcesses {
        id
        name
      }
      usesDataObjects {
        id
        name
      }
      sourceOfInterfaces {
        id
        name
      }
      targetOfInterfaces {
        id
        name
      }
      partOfArchitectures {
        id
        name
      }
      depictedInDiagrams {
        id
        title
      }
      parents {
        id
        name
      }
      components {
        id
        name
      }
      predecessors {
        id
        name
      }
      successors {
        id
        name
      }
      implementsPrinciples {
        id
        name
        description
        category
        priority
      }
      hostedOn {
        id
        name
      }
      softwareVersions {
        id
        name
        version
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
    }
  }
`

export const CREATE_APPLICATION = gql`
  mutation CreateApplication($input: [ApplicationCreateInput!]!) {
    createApplications(input: $input) {
      applications {
        id
        name
        description
        sovereigntyAchStrategicAutonomy
        sovereigntyAchResilience
        sovereigntyAchSecurity
        sovereigntyAchControl
        sovereigntyAchStrategicAutonomyEvidence
        lastSovereigntyAssessmentAt
        status
        criticality
        timeCategory
        sevenRStrategy
        vendor
        version
        planningDate
        introductionDate
        endOfUseDate
        endOfLifeDate
        createdAt
        parents {
          id
          name
        }
        components {
          id
          name
        }
        predecessors {
          id
          name
        }
        successors {
          id
          name
        }
        implementsPrinciples {
          id
          name
          category
          priority
        }
        hostedOn {
          id
          name
        }
        softwareVersions {
          id
          name
          version
        }
      }
    }
  }
`

export const UPDATE_APPLICATION = gql`
  mutation UpdateApplication($id: ID!, $input: ApplicationUpdateInput!) {
    updateApplications(where: { id: { eq: $id } }, update: $input) {
      applications {
        id
        name
        description
        sovereigntyAchStrategicAutonomy
        sovereigntyAchResilience
        sovereigntyAchSecurity
        sovereigntyAchControl
        sovereigntyAchStrategicAutonomyEvidence
        lastSovereigntyAssessmentAt
        status
        criticality
        timeCategory
        sevenRStrategy
        vendor
        version
        planningDate
        introductionDate
        endOfUseDate
        endOfLifeDate
        updatedAt
        parents {
          id
          name
        }
        components {
          id
          name
        }
        predecessors {
          id
          name
        }
        successors {
          id
          name
        }
        implementsPrinciples {
          id
          name
          category
          priority
        }
        hostedOn {
          id
          name
        }
        softwareVersions {
          id
          name
          version
        }
      }
    }
  }
`

export const DELETE_APPLICATION = gql`
  mutation DeleteApplication($id: ID!) {
    deleteApplications(where: { id: { eq: $id } }) {
      nodesDeleted
    }
  }
`
