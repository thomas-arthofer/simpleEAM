import { Neo4jGraphQL } from '@neo4j/graphql'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import neo4jDriver from '../db/neo4j-client'
import dotenv from 'dotenv'
import { sovereigntyResolvers } from '../sovereignty/graphql/resolvers'

// Load environment variables
dotenv.config()

// Read GraphQL type definitions from schema file
const typeDefs = readFileSync(resolve(__dirname, 'schema.graphql')).toString('utf-8')

// Construct JWKS URL
const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'http://localhost:8080'
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || 'nextgen-eam'
const jwksUrl = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/certs`

// Create Neo4j GraphQL instance with JWT configuration
export const neoSchema = new Neo4jGraphQL({
  typeDefs,
  driver: neo4jDriver,
  resolvers: sovereigntyResolvers,
  features: {
    authorization: {
      key: {
        url: jwksUrl,
      },
    },
  },
})

// Generate schema
export const getSchema = async () => {
  return await neoSchema.getSchema()
}

export default neoSchema
