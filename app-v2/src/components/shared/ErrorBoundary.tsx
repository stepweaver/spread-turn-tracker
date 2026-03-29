import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App error boundary:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-md p-6 text-center">
          <h1 className="text-lg font-semibold text-zinc-900">Something went wrong</h1>
          <p className="mt-2 text-sm text-zinc-600">{this.state.error.message}</p>
          <button
            type="button"
            className="mt-4 rounded-lg bg-sky-600 px-4 py-2 text-sm text-white"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
