import { gql } from '@apollo/client/core'

export const GET_CAPABILITIES_COUNT = gql`
  query GetBusinessCapabilitiesCount($where: BusinessCapabilityWhere) {
    businessCapabilitiesConnection(where: $where) {
      aggregate {
        count {
          nodes
        }
      }
    }
  }
`

export const GET_CAPABILITIES = gql`
  query GetCapabilities($where: BusinessCapabilityWhere) {
    businessCapabilities(where: $where) {
      id
      name
      description
      maturityLevel
      sovereigntyReqStrategicAutonomy
      sovereigntyReqResilience
      sovereigntyReqSecurity
      sovereigntyReqControl
      sovereigntyReqWeight
      sovereigntyReqStrategicAutonomyRationale
      sovereigntyReqResilienceRationale
      sovereigntyReqSecurityRationale
      sovereigntyReqControlRationale
      status
      type
      businessValue
      sequenceNumber
      introductionDate
      endDate
      owners {
        id
        firstName
        lastName
      }
      tags
      createdAt
      updatedAt
      children {
        id
        name
      }
      parents {
        id
        name
      }
      supportedByApplications {
        id
        name
      }
      supportedByAIComponents {
        id
        name
      }
      partOfArchitectures {
        id
        name
      }
      relatedDataObjects {
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

export const GET_CAPABILITY = gql`
  query GetCapability($id: ID!) {
    businessCapabilities(where: { id: { eq: $id } }) {
      id
      name
      description
      maturityLevel
      sovereigntyReqStrategicAutonomy
      sovereigntyReqResilience
      sovereigntyReqSecurity
      sovereigntyReqControl
      sovereigntyReqWeight
      sovereigntyReqStrategicAutonomyRationale
      sovereigntyReqResilienceRationale
      sovereigntyReqSecurityRationale
      sovereigntyReqControlRationale
      status
      type
      businessValue
      sequenceNumber
      introductionDate
      endDate
      owners {
        id
        firstName
        lastName
      }
      tags
      createdAt
      updatedAt
      children {
        id
        name
      }
      parents {
        id
        name
      }
      supportedByApplications {
        id
        name
      }
      supportedByAIComponents {
        id
        name
      }
      partOfArchitectures {
        id
        name
      }
      relatedDataObjects {
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

export const CREATE_CAPABILITY = gql`
  mutation CreateCapability($input: [BusinessCapabilityCreateInput!]!) {
    createBusinessCapabilities(input: $input) {
      businessCapabilities {
        id
        name
        description
        maturityLevel
        sovereigntyReqStrategicAutonomy
        sovereigntyReqResilience
        sovereigntyReqSecurity
        sovereigntyReqControl
        sovereigntyReqWeight
        sovereigntyReqStrategicAutonomyRationale
        status
        type
        businessValue
        sequenceNumber
        introductionDate
        endDate
        createdAt
      }
    }
  }
`

export const UPDATE_CAPABILITY = gql`
  mutation UpdateCapability($id: ID!, $input: BusinessCapabilityUpdateInput!) {
    updateBusinessCapabilities(where: { id: { eq: $id } }, update: $input) {
      businessCapabilities {
        id
        name
        description
        maturityLevel
        sovereigntyReqStrategicAutonomy
        sovereigntyReqResilience
        sovereigntyReqSecurity
        sovereigntyReqControl
        sovereigntyReqWeight
        sovereigntyReqStrategicAutonomyRationale
        status
        type
        businessValue
        sequenceNumber
        introductionDate
        endDate
        updatedAt
      }
    }
  }
`

export const DELETE_CAPABILITY = gql`
  mutation DeleteCapability($id: ID!) {
    deleteBusinessCapabilities(where: { id: { eq: $id } }) {
      nodesDeleted
    }
  }
`

export const CHECK_CAPABILITY_EXISTS = gql`
  query CheckCapabilityExists($id: ID!) {
    businessCapabilities(where: { id: { eq: $id } }) {
      id
    }
  }
`

export const GET_CAPABILITY_MAP_DATA = gql`
  query GetCapabilityMapData($where: BusinessCapabilityWhere, $appWhere: ApplicationWhere) {
    businessCapabilities(where: $where) {
      id
      name
      description
      status
      type
      businessValue
      maturityLevel
      sequenceNumber
      introductionDate
      endDate
      children {
        id
        name
        description
        status
        type
        businessValue
        maturityLevel
        sequenceNumber
        introductionDate
        endDate
        children {
          id
          name
          description
          status
          type
          businessValue
          maturityLevel
          sequenceNumber
          introductionDate
          endDate
          children {
            id
            name
            description
            status
            type
            businessValue
            maturityLevel
            sequenceNumber
            introductionDate
            endDate
          }
          supportedByApplications(where: $appWhere) {
            id
            name
            status
            criticality
          }
          supportedByAIComponents {
            id
            name
          }
        }
        supportedByApplications(where: $appWhere) {
          id
          name
          status
          criticality
        }
        supportedByAIComponents {
          id
          name
        }
      }
      parents {
        id
        name
      }
      supportedByApplications(where: $appWhere) {
        id
        name
        status
        criticality
      }
      supportedByAIComponents {
        id
        name
      }
    }
  }
`
