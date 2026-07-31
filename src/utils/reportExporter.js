/**
 * Generates and downloads a CSV report for Mass attendance.
 */
export function exportAttendanceCSV(massTitle, dateStr, massTime, attendanceList) {
  if (!attendanceList || attendanceList.length === 0) {
    alert("No hay servidores registrados para exportar.");
    return;
  }

  const headers = ["ID Registro", "Nombre Servidor", "Rol Asignado", "Estado", "Hora Check-in"];
  const rows = attendanceList.map(item => [
    item.id,
    `"${item.userName}"`,
    `"${item.userRole || 'Monaguillo'}"`,
    `"${item.status === 'checked-in' ? 'En sitio (Check-in)' : item.status === 'attended' ? 'Asistió' : item.status === 'absent' ? 'Faltó' : 'Pendiente'}"`,
    `"${item.checkInTime || 'N/A'}"`
  ]);

  const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `asistencia_${massTitle.replace(/\s+/g, "_")}_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Triggers a clean printable Sacristy Sheet view for sacristan/priest.
 */
export function printSacristySheet(massTitle, dateStr, massTime, attendanceList) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const rowsHtml = attendanceList.map((item, idx) => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${idx + 1}</td>
      <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold;">${item.userName}</td>
      <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.userRole || 'Monaguillo'}</td>
      <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">
        ${item.status === 'checked-in' || item.status === 'attended' ? '✅ Asistió' : '_____'}
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">____________________</td>
    </tr>
  `).join("");

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Hoja de Sacristía - ${massTitle}</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; color: #111; }
          h1 { font-size: 22px; margin-bottom: 4px; color: #b82014; }
          .meta { font-size: 14px; color: #555; margin-bottom: 24px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th { background: #f4f4f5; padding: 10px; text-align: left; font-size: 12px; border-bottom: 2px solid #ccc; }
          .footer { margin-top: 40px; text-align: right; font-size: 12px; color: #777; }
        </style>
      </head>
      <body>
        <h1>Parroquia El Padre Eterno - Hoja de Sacristía</h1>
        <div class="meta">
          <strong>Misa:</strong> ${massTitle} | <strong>Fecha:</strong> ${dateStr} | <strong>Hora:</strong> ${massTime}
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">#</th>
              <th>Monaguillo</th>
              <th>Rol Asignado</th>
              <th style="text-align: center;">Asistencia</th>
              <th style="text-align: center;">Firma / Observaciones</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="5" style="padding: 20px; text-align: center; color: #999;">No hay servidores anotados aún.</td></tr>'}
          </tbody>
        </table>
        <div class="footer">
          Generado automáticamente por Joselito Altar Server Management - ${new Date().toLocaleDateString('es-ES')}
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
