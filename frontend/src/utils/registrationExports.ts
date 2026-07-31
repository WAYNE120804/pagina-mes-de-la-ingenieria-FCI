export type RegistrationExportRow = {
  group?: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  identifier?: string | null;
  status?: string | null;
  detail?: string | null;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function fileSafeName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

export function uniqueRegistrationEmails(rows: RegistrationExportRow[]) {
  return Array.from(
    new Set(
      rows
        .map((row) => (row.email || '').trim())
        .filter(Boolean)
    )
  );
}

export function downloadRegistrationsExcel(title: string, rows: RegistrationExportRow[]) {
  const tableRows = rows
    .map((row) => {
      const cells = [
        row.group || '',
        row.name,
        row.email || '',
        row.phone || '',
        row.identifier || '',
        row.status || '',
        row.detail || '',
      ];

      return `<tr>${cells.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`;
    })
    .join('');

  const workbook = `
    <html>
      <head><meta charset="UTF-8" /></head>
      <body>
        <table>
          <tr><th colspan="7">${escapeHtml(title)}</th></tr>
          <tr>
            <th>Grupo/Equipo</th>
            <th>Nombre</th>
            <th>Correo</th>
            <th>Telefono</th>
            <th>Codigo/Cedula</th>
            <th>Estado</th>
            <th>Detalle</th>
          </tr>
          ${tableRows}
        </table>
      </body>
    </html>
  `;

  const blob = new Blob([workbook], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `inscritos-${fileSafeName(title) || 'actividad'}.xls`;
  link.click();
  URL.revokeObjectURL(url);
}
