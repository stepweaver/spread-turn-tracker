import { AppRouter } from './app/router'
import { AppProviders } from './app/providers'
import { ErrorBoundary } from './components/shared/ErrorBoundary'

export default function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <AppRouter />
      </AppProviders>
    </ErrorBoundary>
  )
}
