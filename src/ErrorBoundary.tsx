import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  message: string
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message || '未知错误' }
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error('[插件运行异常]', error, info)
  }

  private handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="plugin-container center error">
          <p>插件运行出现异常：</p>
          <p className="muted">{this.state.message}</p>
          <button className="btn-primary" onClick={this.handleReload}>
            重新加载
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
