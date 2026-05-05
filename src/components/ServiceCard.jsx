import StatusBadge from './StatusBadge'
import { formatDate, getDaysRemaining, getServiceStatus } from '../utils/dateUtils'

export default function ServiceCard({ service, onRenew, onDownloadInvoice }) {
  const status = getServiceStatus(service.expires_at)
  const daysLeft = getDaysRemaining(service.expires_at)

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-semibold text-gray-900 text-lg">{service.services?.name}</h3>
        <StatusBadge status={status} />
      </div>
      
      {service.services?.description && (
        <p className="text-gray-600 text-sm mb-4">{service.services.description}</p>
      )}
      
      <div className="space-y-2 text-sm text-gray-600 mb-4">
        <p>Inicio: {formatDate(service.created_at)}</p>
        <p>Vencimiento: {formatDate(service.expires_at)}</p>
        {daysLeft !== null && (
          <p className={daysLeft < 0 ? 'text-red-600' : daysLeft <= 5 ? 'text-orange-600' : 'text-green-600'}>
            {daysLeft < 0 ? `Vencido hace ${Math.abs(daysLeft)} dias` : `${daysLeft} dias restantes`}
          </p>
        )}
      </div>

      <div className="flex gap-2 mt-4">
        {onDownloadInvoice && (
          <button
            onClick={() => onDownloadInvoice(service)}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Descargar Factura
          </button>
        )}
        {onRenew && (
          <button
            onClick={() => onRenew(service)}
            className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
          >
            Renovar
          </button>
        )}
      </div>
    </div>
  )
}
