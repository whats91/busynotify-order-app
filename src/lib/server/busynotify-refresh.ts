/*
 * File Context:
 * Purpose: Implements server-side integration for BusyNotify Refresh.
 * Primary Functionality: Triggers the BusyNotify main-server refresh endpoint after order creation so external systems can sync sale orders.
 * Interlinked With: src/app/api/orders/route.ts
 * Role: server integration.
 */
import 'server-only';

interface TriggerSaleOrderSyncParams {
  orderId: string;
  orderNumber: string;
}

const DEFAULT_REFRESH_URL =
  'https://app-api.busynotify.in/v2/api/public/pusher-data-refresh';

export async function triggerSaleOrderSync({
  orderId,
  orderNumber,
}: TriggerSaleOrderSyncParams) {
  const refreshUrl =
    process.env.BUSYNOTIFY_REFRESH_API_URL?.trim() || DEFAULT_REFRESH_URL;
  const bearerToken = process.env.BUSYNOTIFY_REFRESH_BEARER_TOKEN?.trim();
  const authToken = process.env.BUSYNOTIFY_REFRESH_AUTH_TOKEN?.trim();

  if (!authToken) {
    console.warn(
      'BusyNotify refresh skipped: BUSYNOTIFY_REFRESH_AUTH_TOKEN is not configured.',
      { orderId, orderNumber }
    );
    return;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (bearerToken) {
    headers.Authorization = `Bearer ${bearerToken}`;
  }

  const response = await fetch(refreshUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      authToken,
      trigger: 'custom-query',
      action: 'sync_sale_order_to_web',
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(
      `BusyNotify refresh failed with status ${response.status}: ${responseText || 'No response body'}`
    );
  }
}
