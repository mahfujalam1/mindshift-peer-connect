import httpStatus from 'http-status';
import { DateTime, IANAZone } from 'luxon';
import AppError from '../error/appError';

export const buildEventDateTimes = (
  date: string,
  startTime: string,
  endTime: string,
  timezone: string
) => {
  if (!IANAZone.isValidZone(timezone)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid IANA timezone');
  }

  const start = DateTime.fromFormat(
    `${date} ${startTime}`,
    'yyyy-MM-dd HH:mm',
    { zone: timezone }
  );
  const end = DateTime.fromFormat(
    `${date} ${endTime}`,
    'yyyy-MM-dd HH:mm',
    { zone: timezone }
  );

  if (!start.isValid || !end.isValid) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Invalid event date or time format. Use YYYY-MM-DD and HH:mm'
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
