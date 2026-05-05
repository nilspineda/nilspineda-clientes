import { useState, useCallback } from 'react'

export default function AccessEditor({ value, onChange }) {
  const [isEditing, setIsEditing] = useState(false)
  const [localValue, setLocalValue] = useState(value || '')

  const handleSave = useCallback(() => {
    onChange(localValue)
    setIsEditing(false)
  }, [localValue, onChange])

  const insertLink = useCallback((text, url) => {
    const link = `[${text}](${url})`
    setLocalValue(prev => prev + '\n' + link)
  }, [])

  const insertSection = useCallback((title) => {
    const section = `\n## ${title}\n`
    setLocalValue(prev => prev + section)
  }, [])

  if (!isEditing) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Accesos y Links</h3>
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-primary/20 hover:bg-primary text-primary hover:text-white rounded-xl font-medium text-sm transition-all"
          >
            Editar
          </button>
        </div>
        
        {value ? (
          <div className="prose prose-invert max-w-none">
            <RenderMarkdown content={value} />
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <p className="font-medium">No hay accesos registrados</p>
            <p className="text-sm mt-1">Agrega los accesos y links del cliente</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">Accesos y Links</h3>
        <div className="flex gap-2">
          <button
            onClick={() => insertSection('Panel')}
            type="button"
            className="px-3 py-1.5 text-xs bg-sidebar-bg border border-border-dark rounded-lg text-gray-400 hover:text-white hover:border-primary/50 transition-colors"
          >
            + Sección
          </button>
          <button
            onClick={() => insertLink('Link', 'https://')}
            type="button"
            className="px-3 py-1.5 text-xs bg-sidebar-bg border border-border-dark rounded-lg text-gray-400 hover:text-white hover:border-primary/50 transition-colors"
          >
            + Link
          </button>
        </div>
      </div>

      <textarea
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={`Agrega los accesos y links del cliente...\n\nEjemplo:\n## Panel de Control\n- [Admin](https://admin.dominio.com)\n- [CPanel](https://cpanel.dominio.com:2083)\n\n## Bases de Datos\n- [PHPMyAdmin](https://phpmyadmin.dominio.com)\n- Usuario: admin\n- Contraseña: ********`}
        className="w-full h-80 px-4 py-3 bg-sidebar-bg border border-border-dark rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-mono text-sm resize-none"
      />

      <div className="flex gap-3">
        <button
          onClick={handleSave}
          className="flex-1 bg-primary text-white px-6 py-3 rounded-xl hover:bg-primary-light transition-colors font-medium"
        >
          Guardar
        </button>
        <button
          onClick={() => { setLocalValue(value || ''); setIsEditing(false) }}
          className="flex-1 px-6 py-3 border border-border-dark rounded-xl text-gray-400 hover:bg-card-hover hover:text-white transition-colors font-medium"
        >
          Cancelar
        </button>
      </div>

      <div className="bg-card-bg rounded-xl p-4 border border-border-dark">
        <p className="text-xs text-gray-500 mb-2">Vista previa:</p>
        <div className="prose prose-invert max-w-none text-sm">
          <RenderMarkdown content={localValue} />
        </div>
      </div>
    </div>
  )
}

function RenderMarkdown({ content }) {
  if (!content) return null

  const lines = content.split('\n')
  const elements = []
  let inList = false
  let listItems = []

  const renderLine = (line, index) => {
    if (line.startsWith('## ')) {
      return <h4 key={index} className="text-lg font-bold text-primary mt-4 mb-2">{line.replace('## ', '')}</h4>
    }
    if (line.startsWith('- ')) {
      const linkMatch = line.match(/- \[([^\]]+)\]\(([^)]+)\)/)
      if (linkMatch) {
        return (
          <a 
            key={index} 
            href={linkMatch[2]} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-blue-400 hover:text-blue-300"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            {linkMatch[1]}
          </a>
        )
      }
      return <p key={index} className="text-gray-300">{line.replace('- ', '')}</p>
    }
    if (line.trim()) {
      return <p key={index} className="text-gray-300">{line}</p>
    }
    return null
  }

  return (
    <div>
      {lines.map((line, i) => renderLine(line, i))}
    </div>
  )
}