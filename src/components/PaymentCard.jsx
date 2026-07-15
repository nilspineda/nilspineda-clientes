import pb from "@/lib/pocketbaseClient"
import { Image } from "lucide-react"
import StatusBadge from './StatusBadge'
import { formatDate } from '../utils/dateUtils'

export default function PaymentCard({ payment, onDownloadPDF }) {
  const accName = typeof payment.payment_account === 'object' ? payment.payment_account?.name : payment.expand?.payment_account?.name || ""
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h4 className="font-semibold text-gray-900">{payment.services?.name || 'Servicio'}</h4>
          <p className="text-sm text-gray-500">{formatDate(payment.payment_date)}</p>
        </div>
        <StatusBadge status={payment.status} />
      </div>
      
      <div className="mt-3 flex justify-between items-center">
        <span className="text-lg font-bold text-gray-900"></span>
        
        {payment.invoice_url && onDownloadPDF && (
          <button
            onClick={() => onDownloadPDF(payment)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Descargar PDF
          </button>
        )}
      </div>
      
      <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
        {accName && <span>Cuenta: {accName}</span>}
        {payment.comprobante && (
          <a href={pb.files.getUrl(payment, 'comprobante')} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
            <Image className="w-3 h-3" />
            Ver comprobante
          </a>
        )}
      </div>
    </div>
  )
}
