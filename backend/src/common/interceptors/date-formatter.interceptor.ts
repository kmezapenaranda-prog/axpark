import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

function formatDate(date: Date): string {
  const parts = new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  return `${g('day')}/${g('month')}/${g('year')} ${g('hour')}:${g('minute')}:${g('second')}`;
}

function transformDates(value: any): any {
  if (value instanceof Date) return formatDate(value);
  if (Array.isArray(value)) return value.map(transformDates);
  if (value !== null && typeof value === 'object')
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, transformDates(v)]));
  return value;
}

@Injectable()
export class DateFormatterInterceptor implements NestInterceptor {
  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(map(transformDates));
  }
}
