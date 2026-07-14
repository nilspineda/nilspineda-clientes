import { Component } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo)
  }

  handleReload = () => {
    window.location.reload()
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      const isImportError = this.state.error?.message?.includes("Failed to fetch dynamically imported module")
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Algo salio mal</h2>
            <p className="text-sm text-muted-foreground mb-6">
              {isImportError
                ? "La aplicacion se actualizo. Recarga la pagina para continuar."
                : "Hubo un error al cargar esta pagina."}
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={this.handleRetry}>
                Reintentar
              </Button>
              <Button onClick={this.handleReload}>
                Recargar pagina
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
