export default function StatusBadge({ status }) {
  const styles = {
    active: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    expired: 'bg-red-100 text-red-800',
    warning: 'bg-orange-100 text-orange-800',
    paid: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
  }

  const labels = {
    active: 'Activo',
    pending: 'Pendiente',
    expired: 'Vencido',
    warning: 'Por vencer',
    paid: 'Pagado',
    failed: 'Fallido',
  }

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
      {labels[status] || status}
    </span>
  )
}
