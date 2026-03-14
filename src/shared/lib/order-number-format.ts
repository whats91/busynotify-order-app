/*
 * File Context:
 * Purpose: Provides shared order-number formatting helpers used by admin configuration and order creation.
 * Primary Functionality: Builds preview and persisted order numbers from a single configuration model.
 * Interlinked With: src/shared/types/index.ts, src/lib/server/order-number-config-db.ts
 * Role: shared domain utility.
 */
import type { OrderNumberConfig, OrderNumberSerialPosition } from '../types';

interface OrderNumberFormatInput {
  prefix: string;
  suffix: string;
  separator: string;
  includeYear: boolean;
  includeMonth: boolean;
  includeDay: boolean;
  serialPosition: OrderNumberSerialPosition;
  serialPadding: number;
}

function normalizeSeparator(value: string) {
  return value;
}

function padSerial(serial: number, padding: number) {
  return String(Math.max(0, serial)).padStart(Math.max(1, padding), '0');
}

function buildDateSegment(config: OrderNumberFormatInput, date: Date) {
  const parts: string[] = [];

  if (config.includeYear) {
    parts.push(String(date.getFullYear()));
  }

  if (config.includeMonth) {
    parts.push(String(date.getMonth() + 1).padStart(2, '0'));
  }

  if (config.includeDay) {
    parts.push(String(date.getDate()).padStart(2, '0'));
  }

  return parts.join('');
}

function joinSegments(segments: Array<string | undefined>, separator: string) {
  return segments
    .map((segment) => segment?.trim() ?? '')
    .filter((segment) => segment.length > 0)
    .join(normalizeSeparator(separator));
}

export function buildOrderNumberFromConfig(
  config: OrderNumberFormatInput,
  serial: number,
  date: Date = new Date()
) {
  const serialSegment = padSerial(serial, config.serialPadding);
  const dateSegment = buildDateSegment(config, date);

  switch (config.serialPosition) {
    case 'start':
      return joinSegments(
        [serialSegment, config.prefix, dateSegment, config.suffix],
        config.separator
      );
    case 'afterPrefix':
      return joinSegments(
        [config.prefix, serialSegment, dateSegment, config.suffix],
        config.separator
      );
    case 'end':
      return joinSegments(
        [config.prefix, dateSegment, config.suffix, serialSegment],
        config.separator
      );
    case 'beforeSuffix':
    default:
      return joinSegments(
        [config.prefix, dateSegment, serialSegment, config.suffix],
        config.separator
      );
  }
}

export function buildOrderNumberPreview(config: OrderNumberConfig, serial?: number) {
  return buildOrderNumberFromConfig(config, serial ?? config.lastSerial + 1);
}
