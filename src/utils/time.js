/**
 * Formats a 24-hour time string ("HH:MM") into a 12-hour AM/PM string ("hh:mm AM/PM")
 * @param {string} timeStr - Time string in "HH:MM" format (e.g., "19:30")
 * @returns {string} Formatted string (e.g., "07:30 PM")
 */
export const formatTimeToAMPM = (timeStr) => {
  if (!timeStr) return "";
  const [hourStr, minuteStr] = timeStr.split(":");
  let hour = parseInt(hourStr, 10);
  if (isNaN(hour)) return timeStr;
  
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12;
  hour = hour ? hour : 12; // the hour '0' should be '12'
  const padHour = hour < 10 ? `0${hour}` : hour;
  return `${padHour}:${minuteStr} ${ampm}`;
};
