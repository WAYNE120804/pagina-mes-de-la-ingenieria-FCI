import FormModal from './FormModal';
import {
  downloadRegistrationsExcel,
  type RegistrationExportRow,
  uniqueRegistrationEmails,
} from '../../utils/registrationExports';

export type RegistrationModalRow = RegistrationExportRow & {
  id: string;
  actionLabel?: string;
  actionDisabled?: boolean;
};

type RegistrationsModalProps = {
  open: boolean;
  title: string;
  description?: string;
  rows: RegistrationModalRow[];
  emptyMessage?: string;
  onClose: () => void;
  onRowAction?: (row: RegistrationModalRow) => void | Promise<void>;
  onNotice?: (message: string) => void;
};

const RegistrationsModal = ({
  open,
  title,
  description,
  rows,
  emptyMessage = 'No hay inscritos registrados.',
  onClose,
  onRowAction,
  onNotice,
}: RegistrationsModalProps) => {
  async function copyEmails() {
    const emails = uniqueRegistrationEmails(rows);

    if (emails.length === 0) {
      onNotice?.('No hay correos para copiar.');
      return;
    }

    await navigator.clipboard.writeText(emails.join('; '));
    onNotice?.(`${emails.length} correos copiados.`);
  }

  return (
    <FormModal open={open} title={title} description={description} onClose={onClose} size="2xl">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-700">{rows.length} inscritos</p>
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              disabled={rows.length === 0}
              onClick={() => void copyEmails()}
            >
              Copiar correos
            </button>
            <button
              className="rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              disabled={rows.length === 0}
              onClick={() => downloadRegistrationsExcel(title, rows)}
            >
              Descargar Excel
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="theme-table-head">
              <tr>
                <th className="px-4 py-3 text-left">Grupo/Equipo</th>
                <th className="px-4 py-3 text-left">Nombre</th>
                <th className="px-4 py-3 text-left">Correo</th>
                <th className="px-4 py-3 text-left">Telefono</th>
                <th className="px-4 py-3 text-left">Codigo/Cedula</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-left">Detalle</th>
                {onRowAction ? <th className="px-4 py-3 text-left">Acciones</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={onRowAction ? 8 : 7}>
                    {emptyMessage}
                  </td>
                </tr>
              ) : null}
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 text-slate-600">{row.group || 'N/A'}</td>
                  <td className="px-4 py-3 font-semibold text-slate-950">{row.name || 'N/A'}</td>
                  <td className="px-4 py-3 text-slate-600">
                    <span className="block break-all">{row.email || 'N/A'}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{row.phone || 'N/A'}</td>
                  <td className="px-4 py-3 text-slate-600">{row.identifier || 'N/A'}</td>
                  <td className="px-4 py-3 text-slate-600">{row.status || 'N/A'}</td>
                  <td className="px-4 py-3 text-slate-600">{row.detail || 'N/A'}</td>
                  {onRowAction ? (
                    <td className="px-4 py-3">
                      <button
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                        type="button"
                        disabled={row.actionDisabled}
                        onClick={() => void onRowAction(row)}
                      >
                        {row.actionLabel || 'Actualizar'}
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </FormModal>
  );
};

export default RegistrationsModal;
