import StatusBadge from "./StatusBadge";
import {
  formatDate,
  getDaysRemaining,
  getServiceStatus,
} from "../utils/dateUtils";
import { normalizeUrl } from "../utils/formatUtils";
import { Button } from "@/components/ui/button"

export default function ServiceCard({ service, onRenew, onDownloadInvoice }) {
  const status = getServiceStatus(service.expires_at);
  const daysLeft = getDaysRemaining(service.expires_at);

  return (
    <div className="bg-card rounded-lg border border-border p-5">
      <div className="flex justify-between items-start mb-3">
        {(() => {
          const raw =
            service.url_dominio ||
            service.services?.url ||
            service.services?.name ||
            "";
          const href = normalizeUrl(raw) || "#";
          const label = String(raw).replace(/^https?:\/\//i, "");
          return (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-foreground text-2xl truncate"
            >
              {label}
            </a>
          );
        })()}
        <StatusBadge status={status} />
      </div>

      {service.services?.description && (
        <p className="text-muted-foreground text-sm mb-4">
          {service.services.description}
        </p>
      )}

      <div className="space-y-2 text-sm text-muted-foreground mb-4">
        <p>Inicio: {formatDate(service.created_at)}</p>
        <p>Vencimiento: {formatDate(service.expires_at)}</p>
        {daysLeft !== null && (
          <p
            className={
              daysLeft < 0
                ? "text-destructive"
                : daysLeft <= 5
                  ? "text-orange-500"
                  : "text-green-500"
            }
          >
            {daysLeft < 0
              ? `Vencido hace ${Math.abs(daysLeft)} dias`
              : `${daysLeft} dias restantes`}
          </p>
        )}
      </div>

      <div className="flex gap-2 mt-4">
        {onDownloadInvoice && (
          <Button
            onClick={() => onDownloadInvoice(service)}
            variant="outline"
            className="flex-1"
          >
            Descargar Factura
          </Button>
        )}
        {onRenew && (
          <Button
            onClick={() => onRenew(service)}
            className="flex-1"
          >
            Renovar
          </Button>
        )}
      </div>
    </div>
  );
}
