import { gql } from '@apollo/client/core'

export const CHECK_INFRASTRUCTURE_EXISTS = gql`
  query CheckInfrastructureExists($id: ID!) {
    infrastructures(where: { id: { eq: $id } }) {
      id
    }
  }
`

export const GET_INFRASTRUCTURES_COUNT = gql`
  query GetInfrastructuresCount($where: InfrastructureWhere) {
    infrastructuresConnection(where: $where) {
      aggregate {
        count {
          nodes
        }
      }
    }
  }
`

export const GET_INFRASTRUCTURES = gql`
  query GetInfrastructures($where: InfrastructureWhere) {
    infrastructures(where: $where) {
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
      infrastructureType
      status
      vendor
      version
      capacity
      location
      ipAddress
      operatingSystem
      specifications
      maintenanceWindow
      costs
      planningDate
      introductionDate
      endOfUseDate
      endOfLifeDate
      owners {
        id
        firstName
        lastName
      }
      parentInfrastructure {
        id
        name
        sovereigntyAchStrategicAutonomy
        sovereigntyAchResilience
        sovereigntyAchSecurity
        sovereigntyAchControl
        sovereigntyAchStrategicAutonomyEvidence
        lastSovereigntyAssessmentAt
      }
      childInfrastructures {
        id
        name
      }
      hostsApplications {
        id
        name
      }
      softwareVersions {
        id
        name
        version
      }
      hardwareVersions {
        id
        name
        version
      }
      providedBy {
        id
        name
      }
      hostedBy {
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
      depictedInDiagrams {
        id
        title
      }
      createdAt
      updatedAt
    }
  }
`

export const GET_INFRASTRUCTURE = gql`
  query GetInfrastructure($id: ID!) {
    infrastructures(where: { id: { eq: $id } }) {
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
      infrastructureType
      status
      vendor
      version
      capacity
      location
      ipAddress
      operatingSystem
      specifications
      maintenanceWindow
      costs
      planningDate
      introductionDate
      endOfUseDate
      endOfLifeDate
      owners {
        id
        firstName
        lastName
      }
      parentInfrastructure {
        id
        name
      }
      childInfrastructures {
        id
        name
      }
      hostsApplications {
        id
        name
      }
      softwareVersions {
        id
        name
        version
      }
      hardwareVersions {
        id
        name
        version
      }
      providedBy {
        id
        name
      }
      hostedBy {
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
      depictedInDiagrams {
        id
        title
      }
      createdAt
      updatedAt
    }
  }
`

export const CREATE_INFRASTRUCTURE = gql`
  mutation CreateInfrastructure($input: [InfrastructureCreateInput!]!) {
    createInfrastructures(input: $input) {
      infrastructures {
        id
        name
        description
        sovereigntyAchStrategicAutonomy
        sovereigntyAchResilience
        sovereigntyAchSecurity
        sovereigntyAchControl
        sovereigntyAchStrategicAutonomyEvidence
        lastSovereigntyAssessmentAt
        infrastructureType
        status
        vendor
        version
        capacity
        location
        ipAddress
        operatingSystem
        specifications
        maintenanceWindow
        costs
        planningDate
        introductionDate
        endOfUseDate
        endOfLifeDate
        owners {
          id
          firstName
          lastName
        }
        parentInfrastructure {
          id
          name
        }
        childInfrastructures {
          id
          name
        }
        hostsApplications {
          id
          name
        }
        softwareVersions {
          id
          name
          version
        }
        hardwareVersions {
          id
          name
          version
        }
        partOfArchitectures {
          id
          name
        }
        depictedInDiagrams {
          id
          title
        }
        createdAt
        updatedAt
      }
    }
  }
`

export const UPDATE_INFRASTRUCTURE = gql`
  mutation UpdateInfrastructure($id: ID!, $input: InfrastructureUpdateInput!) {
    updateInfrastructures(where: { id: { eq: $id } }, update: $input) {
      infrastructures {
        id
        name
        description
        sovereigntyAchStrategicAutonomy
        sovereigntyAchResilience
        sovereigntyAchSecurity
        sovereigntyAchControl
        sovereigntyAchStrategicAutonomyEvidence
        lastSovereigntyAssessmentAt
        infrastructureType
        status
        vendor
        version
        capacity
        location
        ipAddress
        operatingSystem
        specifications
        maintenanceWindow
        costs
        planningDate
        introductionDate
        endOfUseDate
        endOfLifeDate
        owners {
          id
          firstName
          lastName
        }
        parentInfrastructure {
          id
          name
        }
        childInfrastructures {
          id
          name
        }
        hostsApplications {
          id
          name
        }
        softwareVersions {
          id
          name
          version
        }
        hardwareVersions {
          id
          name
          version
        }
        partOfArchitectures {
          id
          name
        }
        depictedInDiagrams {
          id
          title
        }
        createdAt
        updatedAt
      }
    }
  }
`

export const DELETE_INFRASTRUCTURE = gql`
  mutation DeleteInfrastructure($where: InfrastructureWhere!) {
    deleteInfrastructures(where: $where) {
      nodesDeleted
    }
  }
`
