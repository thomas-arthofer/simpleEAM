import { gql } from '@apollo/client/core'

export const CHECK_DATA_OBJECT_EXISTS = gql`
  query CheckDataObjectExists($id: ID!) {
    dataObjects(where: { id: { eq: $id } }) {
      id
    }
  }
`

export const GET_DATA_OBJECTS_COUNT = gql`
  query GetDataObjectsCount($where: DataObjectWhere) {
    dataObjectsConnection(where: $where) {
      aggregate {
        count {
          nodes
        }
      }
    }
  }
`

export const GET_DATA_OBJECTS = gql`
  query GetDataObjects($where: DataObjectWhere) {
    dataObjects(where: $where) {
      id
      name
      description
      sovereigntyReqStrategicAutonomy
      sovereigntyReqResilience
      sovereigntyReqSecurity
      sovereigntyReqControl
      sovereigntyReqWeight
      sovereigntyReqStrategicAutonomyRationale
      sovereigntyReqResilienceRationale
      sovereigntyReqSecurityRationale
      sovereigntyReqControlRationale
      owners {
        id
        firstName
        lastName
      }
      classification
      format
      planningDate
      introductionDate
      endOfUseDate
      endOfLifeDate
      dataSources {
        id
        name
      }
      usedByApplications {
        id
        name
      }
      relatedToCapabilities {
        id
        name
      }
      transferredInInterfaces {
        id
        name
      }
      relatedDataObjects {
        id
        name
      }
      relatedDataObjectsConnection {
        edges {
          node {
            id
            name
          }
          properties {
            name
          }
        }
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

export const GET_DATA_OBJECT = gql`
  query GetDataObject($where: DataObjectWhere) {
    dataObjects(where: $where) {
      id
      name
      description
      sovereigntyReqStrategicAutonomy
      sovereigntyReqResilience
      sovereigntyReqSecurity
      sovereigntyReqControl
      sovereigntyReqWeight
      sovereigntyReqStrategicAutonomyRationale
      sovereigntyReqResilienceRationale
      sovereigntyReqSecurityRationale
      sovereigntyReqControlRationale
      owners {
        id
        firstName
        lastName
      }
      classification
      format
      planningDate
      introductionDate
      endOfUseDate
      endOfLifeDate
      dataSources {
        id
        name
      }
      createdAt
      updatedAt
      usedByApplications {
        id
        name
      }
      relatedToCapabilities {
        id
        name
      }
      transferredInInterfaces {
        id
        name
      }
      relatedDataObjects {
        id
        name
      }
      relatedDataObjectsConnection {
        edges {
          node {
            id
            name
          }
          properties {
            name
          }
        }
      }
      depictedInDiagrams {
        id
        title
      }
    }
  }
`

export const CREATE_DATA_OBJECT = gql`
  mutation CreateDataObject($input: [DataObjectCreateInput!]!) {
    createDataObjects(input: $input) {
      dataObjects {
        id
        name
        description
        sovereigntyReqStrategicAutonomy
        sovereigntyReqResilience
        sovereigntyReqSecurity
        sovereigntyReqControl
        sovereigntyReqWeight
        sovereigntyReqStrategicAutonomyRationale
        owners {
          id
          firstName
          lastName
        }
        classification
        format
        planningDate
        introductionDate
        endOfUseDate
        endOfLifeDate
        dataSources {
          id
          name
        }
        usedByApplications {
          id
          name
        }
        relatedToCapabilities {
          id
          name
        }
        transferredInInterfaces {
          id
          name
        }
        relatedDataObjects {
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
  }
`

export const UPDATE_DATA_OBJECT = gql`
  mutation UpdateDataObject($id: ID!, $input: DataObjectUpdateInput!) {
    updateDataObjects(where: { id: { eq: $id } }, update: $input) {
      dataObjects {
        id
        name
        description
        sovereigntyReqStrategicAutonomy
        sovereigntyReqResilience
        sovereigntyReqSecurity
        sovereigntyReqControl
        sovereigntyReqWeight
        sovereigntyReqStrategicAutonomyRationale
        owners {
          id
          firstName
          lastName
        }
        classification
        format
        planningDate
        introductionDate
        endOfUseDate
        endOfLifeDate
        dataSources {
          id
          name
        }
        usedByApplications {
          id
          name
        }
        relatedToCapabilities {
          id
          name
        }
        transferredInInterfaces {
          id
          name
        }
        relatedDataObjects {
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
  }
`

export const DELETE_DATA_OBJECT = gql`
  mutation DeleteDataObject($id: ID!) {
    deleteDataObjects(where: { id: { eq: $id } }) {
      nodesDeleted
    }
  }
`
