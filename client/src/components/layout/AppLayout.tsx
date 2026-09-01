'use client'

import React, { useState, useEffect } from 'react'
import { CacheProvider } from '@emotion/react'
import CssBaseline from '@mui/material/CssBaseline'
import { useServerInsertedHTML } from 'next/navigation'
import createCache from '@emotion/cache'
import { ApolloProvider } from '@apollo/client'
import { SnackbarProvider } from 'notistack'
import { AuthContext, getClientAuthError, initKeycloak, keycloak } from '@/lib/auth'
import { setupSessionMonitoring } from '@/utils/sessionUtils'
import { createApolloClient } from '@/lib/apollo-client'
import { useAutoUserRegistration } from '@/hooks/useAutoUserRegistration'
import { useGraphQLConfig } from '@/lib/runtime-config'
import ThemeProvider from '@/contexts/ThemeContext'
import { DebugProvider } from '@/contexts/DebugContext'
import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material'
import { LocalizationProvider } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import RootLayout from '@/components/layout/RootLayout'
import { CompanyProvider } from '@/contexts/CompanyContext'
import { useLocale } from 'next-intl'
import dayjs from 'dayjs'
import 'dayjs/locale/de'
import '@/styles/snackbar-overrides.css'
import 'dayjs/locale/en'

// Import der globalen Styles
import '@/styles/global.css'
import '@/styles/excalidraw-fonts.css'

// Emotion cache for server-side rendering with better hydration compatibility
let clientSideCache: ReturnType<typeof createCache> | null = null

function useClientStyleRegistry() {
  const [cache] = useState(() => {
    // Cache nur einmal erstellen und wiederverwenden
    if (typeof window !== 'undefined' && clientSideCache) {
      return clientSideCache
    }

    const newCache = createCache({
      key: 'mui',
      prepend: true,
      // Stable configuration for server and client
      speedy: process.env.NODE_ENV === 'production',
    })

    if (typeof window !== 'undefined') {
      clientSideCache = newCache
    }

    return newCache
  })

  useServerInsertedHTML(() => {
    // Nur auf dem Server styles einfügen
    if (typeof window !== 'undefined') return null

    const names = cache.inserted
    if (!names || Object.keys(names).length === 0) return null

    let styles = ''
    let dataEmotionAttribute = cache.key

    Object.keys(names).forEach(name => {
      const serialized = names[name]
      if (serialized !== true) {
        styles += serialized
        dataEmotionAttribute += ` ${name}`
      }
    })

    return (
      <style
        key={cache.key}
        data-emotion={dataEmotionAttribute}
        dangerouslySetInnerHTML={{ __html: styles }}
      />
    )
  })

  return { cache }
}

import { ApolloClient, NormalizedCacheObject } from '@apollo/client'

// Internal component for automatic user registration
function AutoUserRegistration() {
  useAutoUserRegistration()
  return null
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const locale = useLocale()
  const { cache } = useClientStyleRegistry()

  // Dayjs Lokalisierung basierend auf der aktuellen Sprache
  useEffect(() => {
    dayjs.locale(locale === 'en' ? 'en' : 'de')
  }, [locale])

  // Simplified state management for better hydration
  const [mounted, setMounted] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [client, setClient] = useState<ApolloClient<NormalizedCacheObject> | null>(null)
  const [configLoaded, setConfigLoaded] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  // Get GraphQL URL from runtime config
  const graphqlConfig = useGraphQLConfig()

  // Client-side mounting
  useEffect(() => {
    setMounted(true)
  }, [])

  // Wait for config to load
  useEffect(() => {
    // Check if config has been loaded (not using default localhost URL)
    if (graphqlConfig.url !== 'http://localhost:4000/graphql') {
      setConfigLoaded(true)
    }
  }, [graphqlConfig.url])

  // Authentication und Apollo Client Initialisierung
  useEffect(() => {
    if (!mounted || !configLoaded) return

    const initializeApp = async () => {
      try {
        setAuthError(null)

        const clientAuthError = getClientAuthError()
        if (clientAuthError) {
          setAuthError(clientAuthError)
          return
        }

        // Keycloak Initialisierung zuerst
        const isAuthenticated = await initKeycloak()
        setAuthenticated(isAuthenticated)

        if (!isAuthenticated) {
          setClient(createApolloClient(undefined, graphqlConfig.url))
          return
        }

        // Session Monitoring
        setupSessionMonitoring()

        // Create Apollo client with dynamic token and GraphQL URL from runtime config
        const apolloClient = createApolloClient(keycloak?.token, graphqlConfig.url)
        setClient(apolloClient)

        // Token refresh listener - update only the token, not the entire client
        const handleTokenRefresh = (_event: CustomEvent) => {
          // The Apollo client is configured to use the current token
          // from Keycloak instance, so no further action needed
        }

        // Auth error listener - force a real re-authentication via Keycloak.
        // Never swap in a tokenless Apollo client — that turns a single 401
        // into an infinite retry loop (see quick task 260901-alf): every
        // remounted useQuery re-fires without a token, the server returns
        // Unauthenticated again, and this handler fires forever.
        const handleAuthError = () => {
          if (!keycloak) return
          keycloak
            .updateToken(-1)
            .then(refreshed => {
              if (refreshed && keycloak) {
                window.dispatchEvent(
                  new CustomEvent('tokenRefreshed', {
                    detail: { token: keycloak.token },
                  })
                )
              } else {
                void keycloak?.login()
              }
            })
            .catch(() => {
              void keycloak?.login()
            })
        }

        window.addEventListener('tokenRefreshed', handleTokenRefresh as EventListener)
        window.addEventListener('authError', handleAuthError as EventListener)

        return () => {
          window.removeEventListener('tokenRefreshed', handleTokenRefresh as EventListener)
          window.removeEventListener('authError', handleAuthError as EventListener)
        }
      } catch (error) {
        console.warn('Authentication initialization failed:', error)
        setAuthError(
          error instanceof Error ? error.message : 'Authentication initialization failed.'
        )
      } finally {
        setInitialized(true)
        // After Keycloak's script-triggered redirect (window.location.href),
        // Chrome may leave focus on an extension overlay (e.g. Bitwarden autofill
        // notification) that captures pointer events over the page. Explicitly
        // returning focus to the window releases any such capture.
        window.focus()
      }
    }

    const cleanup = initializeApp()
    return () => {
      if (cleanup instanceof Promise) {
        cleanup.then(cleanupFn => cleanupFn?.())
      }
    }
  }, [mounted, configLoaded, graphqlConfig.url])

  // Verhindere Hydration-Fehler durch einheitliche Server/Client Struktur
  if (!mounted) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          width: '100vw',
        }}
      >
        <div>Loading...</div>
      </div>
    )
  }

  // Wait for runtime config to load
  if (!configLoaded) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          width: '100vw',
        }}
      >
        <div>Loading configuration...</div>
      </div>
    )
  }

  if (authError) {
    return (
      <CacheProvider value={cache}>
        <CssBaseline />
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            px: 3,
            bgcolor: 'background.default',
          }}
        >
          <Stack spacing={2} sx={{ maxWidth: 720, width: '100%' }}>
            <Typography variant="h4">Authentication unavailable</Typography>
            <Alert severity="error">{authError}</Alert>
            <Typography color="text.secondary">
              This client now uses Keycloak JS 26. The browser will block authentication on insecure
              origins like `http://dev-server.mf2.eu:3000`.
            </Typography>
            <Typography color="text.secondary">
              Open the client on `localhost` or serve it over HTTPS, then retry.
            </Typography>
            <Box>
              <Button variant="outlined" onClick={() => window.location.reload()}>
                Retry
              </Button>
            </Box>
          </Stack>
        </Box>
      </CacheProvider>
    )
  }

  // Wait for Apollo Client initialization before rendering components
  if (!client) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          width: '100vw',
        }}
      >
        <div>Initializing...</div>
      </div>
    )
  }

  const apolloClient = client

  return (
    <CacheProvider value={cache}>
      <AuthContext.Provider value={{ keycloak, initialized, authenticated }}>
        <ApolloProvider client={apolloClient}>
          <CompanyProvider>
            <ThemeProvider>
              <DebugProvider>
                <CssBaseline />
                <LocalizationProvider
                  dateAdapter={AdapterDayjs}
                  adapterLocale={locale === 'en' ? 'en' : 'de'}
                >
                  <SnackbarProvider
                    maxSnack={3}
                    anchorOrigin={{
                      vertical: 'top',
                      horizontal: 'right',
                    }}
                    dense
                    preventDuplicate
                    autoHideDuration={5000}
                    className="custom-snackbar-provider"
                  >
                    {authenticated && <AutoUserRegistration />}
                    <Box
                      sx={{
                        width: '100%',
                        height: '100vh',
                        position: 'relative',
                      }}
                    >
                      {!initialized && (
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            position: 'absolute',
                            // Start below the AppBar so the header stays interactive
                            // (AppBar height: 56px mobile / 64px desktop)
                            top: { xs: 56, sm: 64 },
                            left: 0,
                            width: '100%',
                            height: { xs: 'calc(100% - 56px)', sm: 'calc(100% - 64px)' },
                            // Keep z-index below AppBar so it never blocks the header
                            zIndex: theme => theme.zIndex.appBar - 1,
                            bgcolor: 'background.default',
                          }}
                        >
                          <CircularProgress size={40} />
                        </Box>
                      )}

                      <RootLayout>{children}</RootLayout>
                    </Box>
                  </SnackbarProvider>
                </LocalizationProvider>
              </DebugProvider>
            </ThemeProvider>
          </CompanyProvider>
        </ApolloProvider>
      </AuthContext.Provider>
    </CacheProvider>
  )
}
