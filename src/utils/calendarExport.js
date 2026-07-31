/**
 * Generates an .ics file download or Google Calendar link for a specific mass using exact local time.
 */

const pad = (n) => String(n).padStart(2, "0");

const formatLocalISO = (d) => {
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}${month}${day}T${hours}${minutes}00`;
};

export function generateGoogleCalendarUrl(mass, dateStr) {
  if (!mass || !dateStr) return "";

  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = mass.time.split(":").map(Number);

  // Exact local start and end time (1 hour mass duration)
  const startDate = new Date(year, month - 1, day, hour, minute);
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

  const startFormatted = formatLocalISO(startDate);
  const endFormatted = formatLocalISO(endDate);

  const title = encodeURIComponent(`${mass.title} - Servicio de Monaguillos`);
  const details = encodeURIComponent(
    `Celebración Litúrgica (${mass.type}). ${mass.notes || "Parroquia El Padre Eterno."}`
  );
  const location = encodeURIComponent("Parroquia El Padre Eterno - Templo Parroquial");

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startFormatted}/${endFormatted}&details=${details}&location=${location}`;
}

export function downloadIcsFile(mass, dateStr) {
  if (!mass || !dateStr) return;

  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = mass.time.split(":").map(Number);

  const startDate = new Date(year, month - 1, day, hour, minute);
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

  const startFormatted = formatLocalISO(startDate);
  const endFormatted = formatLocalISO(endDate);

  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Joselito//Altar Server Calendar//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:mass-${mass.id}-${dateStr}@joselito.parroquia`,
    `DTSTAMP:${formatLocalISO(new Date())}`,
    `DTSTART:${startFormatted}`,
    `DTEND:${endFormatted}`,
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
