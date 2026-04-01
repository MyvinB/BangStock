'use client'

import { Component, type ReactNode } from 'react'

type Props = { children: ReactNode; fallback?: ReactNode }
type State = { hasError: boolean; message: string }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="p-6 text-center">
          <p className="text-red-600 font-medium">Something went wrong</p>
          <p className="text-sm text-gray-500 mt-1">{this.state.message}</p>
          <button onClick={() => this.setState({ hasError: false })}
            className="mt-3 text-indigo-600 text-sm underline">Try again</button>
        </div>
      )
    }
    return this.props.children
  }
}
