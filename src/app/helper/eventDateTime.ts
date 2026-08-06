import httpStatus from 'http-status';
import { DateTime, IANAZone } from 'luxon';
import AppError from '../error/appError';

export const buildEventDateTimes = (
  date: string,
  startTime: string,
  endTime: string,
  timezone: string
) => {
  if (!timezone || !IANAZone.isValidZone(timezone)) {
    throw new AppError(httpStatus.BAD_REQUEST, `Invalid IANA timezone: "${timezone}"`);
  }

  // 1. Direct ISO / JS Date check (if frontend sends full ISO Date strings for startTime and endTime)
  if (startTime && endTime) {
    const rawStartISO = DateTime.fromISO(startTime, { zone: timezone });
    const rawEndISO = DateTime.fromISO(endTime, { zone: timezone });

    if (rawStartISO.isValid && rawEndISO.isValid && startTime.includes('T') && endTime.includes('T')) {
      if (rawEndISO <= rawStartISO) {
        throw new AppError(httpStatus.BAD_REQUEST, 'End time must be after start time');
      }
      if (rawEndISO.toMillis() <= Date.now()) {
        throw new AppError(httpStatus.BAD_REQUEST, 'Event end time must be in the future');
      }
      return {
        startAt: rawStartISO.toUTC().toJSDate(),
        endAt: rawEndISO.toUTC().toJSDate(),
        duration: Math.ceil(rawEndISO.diff(rawStartISO, 'minutes').minutes),
      };
    }
  }

  // Normalize unicode non-breaking spaces (\u202F, \u00A0, etc.) in time strings
  let cleanStart = (startTime || '').replace(/[\u202F\u00A0\s]+/g, ' ').trim();
  let cleanEnd = (endTime || '').replace(/[\u202F\u00A0\s]+/g, ' ').trim();

  // Normalize AM/PM spacing: "4:50PM" -> "4:50 PM", "4:50:00pm" -> "4:50:00 PM"
  cleanStart = cleanStart.replace(/([0-9]{1,2}:[0-9]{2}(?::[0-9]{2})?)\s*([aApP][mM])/i, '$1 $2');
  cleanEnd = cleanEnd.replace(/([0-9]{1,2}:[0-9]{2}(?::[0-9]{2})?)\s*([aApP][mM])/i, '$1 $2');

  if (cleanStart.includes('T')) {
    cleanStart = cleanStart.split('T')[1]?.substring(0, 8) || cleanStart;
  }
  if (cleanEnd.includes('T')) {
    cleanEnd = cleanEnd.split('T')[1]?.substring(0, 8) || cleanEnd;
  }

  // Normalize date input (e.g. "2026-8-4" -> "2026-08-04", "2026/8/4" -> "2026-08-04")
  let cleanDate = (date || '').replace(/[\u202F\u00A0\s]+/g, '').trim();
  if (cleanDate.includes('T')) {
    cleanDate = cleanDate.split('T')[0];
  }
  cleanDate = cleanDate.replace(/[/.]/g, '-');

  const dateParts = cleanDate.split('-');
  if (dateParts.length === 3) {
    if (dateParts[0].length === 4) {
      cleanDate = `${dateParts[0]}-${dateParts[1].padStart(2, '0')}-${dateParts[2].padStart(2, '0')}`;
    } else if (dateParts[2].length === 4) {
      cleanDate = `${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`;
    }
  }

  const parseDateTime = (dtStr: string, timeStr: string): DateTime | null => {
    if (!dtStr || !timeStr) return null;

    const formats = [
      'yyyy-MM-dd HH:mm',
      'yyyy-MM-dd HH:mm:ss',
      'yyyy-MM-dd H:mm',
      'yyyy-MM-dd hh:mm a',
      'yyyy-MM-dd h:mm a',
      'yyyy-MM-dd hh:mm:ss a',
      'yyyy-MM-dd h:mm:ss a',
      'yyyy-MM-dd hh:mmA',
      'yyyy-MM-dd h:mmA',
      'yyyy-M-d HH:mm',
      'yyyy-M-d HH:mm:ss',
      'yyyy-M-d H:mm',
      'yyyy-M-d hh:mm a',
      'yyyy-M-d h:mm a',
      'yyyy-M-d hh:mm:ss a',
      'yyyy-M-d h:mm:ss a',
      'yyyy-M-d hh:mmA',
      'yyyy-M-d h:mmA',
      'dd-MM-yyyy HH:mm',
      'MM-dd-yyyy HH:mm',
    ];

    const combined = `${dtStr} ${timeStr}`;

    for (const fmt of formats) {
      const dt = DateTime.fromFormat(combined, fmt, { zone: timezone });
      if (dt.isValid) {
        return dt;
      }
    }

    // Try ISO format fallback
    const isoCombined = DateTime.fromISO(`${dtStr}T${timeStr}`, { zone: timezone });
    if (isoCombined.isValid) {
      return isoCombined;
    }

    const isoDirect = DateTime.fromISO(timeStr, { zone: timezone });
    if (isoDirect.isValid) {
      return isoDirect;
    }

    // Try native JavaScript Date parser as fallback
    const nativeParsed = new Date(`${dtStr} ${timeStr}`);
    if (!isNaN(nativeParsed.getTime())) {
      const dtFromNative = DateTime.fromJSDate(nativeParsed, { zone: timezone });
      if (dtFromNative.isValid) {
        return dtFromNative;
      }
    }

    return null;
  };

  const start = parseDateTime(cleanDate, cleanStart);
  const end = parseDateTime(cleanDate, cleanEnd);

  if (!start || !start.isValid || !end || !end.isValid) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Invalid event date or time format. Received date: "${date}", startTime: "${startTime}", endTime: "${endTime}". Expected format: date (YYYY-MM-DD), startTime/endTime (HH:mm or hh:mm a)`
    );
  }

  if (end <= start) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'End time must be after start time'
    );
  }

  if (end.toMillis() <= Date.now()) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Event end time must be in the future'
    );
  }

  return {
    startAt: start.toUTC().toJSDate(),
    endAt: end.toUTC().toJSDate(),
    duration: Math.ceil(end.diff(start, 'minutes').minutes),
  };
};
