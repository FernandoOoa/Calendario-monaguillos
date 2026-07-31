/**
 * Generates an .ics file download or Google Calendar link for a specific mass.
 */

export function generateGoogleCalendarUrl(mass, dateStr) {
  if (!mass || !dateStr) return "";

  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = mass.time.split(":").map(Number);

  const startDate = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour duration

  const formatUtc = (d) => d.toISOString().replace(/-|:|\.\d+/g, "");

  const title = encodeURIComponent(`${mass.title} - Servicio de Monaguillos`);
  const details = encodeURIComponent(
    `Celebración Litúrgica (${mass.type}). ${mass.notes || "Parroquia El Padre Eterno."}`
  );
  const location = encodeURIComponent("Parroquia El Padre Eterno - Templo Parroquial");

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${formatUtc(
    startDate
  )}/${formatUtc(endDate)}&details=${details}&location=${location}`;
}

export function downloadIcsFile(mass, dateStr) {
  if (!mass || !dateStr) return;

  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = mass.time.split(":").map(Number);

  const startDate = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

  const formatUtc = (d) => d.toISOString().replace(/-|:|\.\d+/g, "");

  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Joselito//Altar Server Calendar//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:mass-${mass.id}-${dateStr}@joselito.parroquia`,
    `DTSTAMP:${formatUtc(new Date())}`,
    `DTSTART:${formatUtc(startDate)}`,
    `DTEND:${formatUtc(endDate)}`,
    `SUMMARY:${mass.title} - Servicio de Monaguillos`,
    `DESCRIPTION:Celebración Litúrgica (${mass.type}). ${mass.notes || ""}`,
    "LOCATION:Parroquia El Padre Eterno",
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");

  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const link = document.createElement("a");
  link.href = window.URL.createObjectURL(blob);
  link.setAttribute("download", `misa-${dateStr}-${mass.time.replace(":", "")}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
