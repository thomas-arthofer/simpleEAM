import { ApolloClient, InMemoryCache, HttpLink, from } from '@apollo/client'
import { setContext } from '@apollo/client/link/context'
import { onError } from '@apollo/client/link/error'
import { keycloak } from './auth'

/**
 * Erstellt einen Apollo-Client für GraphQL-Anfragen mit dynamischer Token-Authentifizierung
 * Uses runtime configuration from API
 */
export function createApolloClient(initialToken?: string, graphqlUrl?: string) {
  // HTTP link for GraphQL endpoint
  const httpLink = new HttpLink({
    uri: graphqlUrl || 'http://localhost:4000/graphql',
  })

  // Authentifizierungs-Link für dynamisches Token-Handling
  const authLink = setContext((_, { headers }) => {
    // Get current token from Keycloak instance (if available)
    // or use passed initialToken as fallback
    const currentToken = keycloak?.token || initialToken

    if (!currentToken) {
      console.warn('No authentication token available for GraphQL request')
    }

    return {
      headers: {
        ...headers,
        authorization: currentToken ? `Bearer ${currentToken}` : '',
      },
    }
  })

  // Error-Handling-Link
  const errorLink = onError(({ graphQLErrors, networkError, operation }) => {
    if (graphQLErrors) {
      console.error(`[Apollo GraphQL Error] Operation: ${operation.operationName}`, graphQLErrors)
      graphQLErrors.forEach(({ message, locations, path }) => {
        console.error(
          `[GraphQL Error]: Message: ${message}, Location: ${JSON.stringify(
            locations
          )}, Path: ${path}`
        )

        // Bei Authentifizierungsfehlern versuche Token-Refresh
        if (message.includes('unauthenticated') || message.includes('Unauthorized')) {
          // Trigger token refresh via custom event
          window.dispatchEvent(new CustomEvent('authError'))
        }
      })
    }
    if (networkError) {
      console.error(`[Apollo Network Error]: ${networkError.message}`, networkError)
      if ('statusCode' in networkError) {
        const statusCode = (networkError as any).statusCode
        console.error(`Status Code: ${statusCode}`)

        // Bei 401/403 Fehlern Token-Refresh versuchen
        if (statusCode === 401 || statusCode === 403) {
          window.dispatchEvent(new CustomEvent('authError'))
        }
      }
      // Intentionally NO forward(operation) here: an unconditional retry on any
      // network error creates a tight infinite loop when the failure is
      // persistent (see quick task 260901-alf). Real retry semantics belong in
      // a dedicated @apollo/client/link/retry link, not the error link.
    }
  })

  // Apollo-Client erstellen
  return new ApolloClient({
    link: from([errorLink, authLink.concat(httpLink)]),
    cache: new InMemoryCache(),
    defaultOptions: {
      watchQuery: {
        fetchPolicy: 'cache-and-network',
        errorPolicy: 'all',
      },
      query: {
        fetchPolicy: 'network-only',
        errorPolicy: 'all',
      },
      mutate: {
        errorPolicy: 'all',
      },
    },
    devtools: {
      enabled: process.env.NODE_ENV === 'development',
    },
  })
}
