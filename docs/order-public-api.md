# Order Public API

These endpoints are available from the app server and return JSON.

## 1. Get Orders

- Method: `GET`
- Route: `/api/orders`
- Purpose: Fetch all orders or filter by one or more statuses

### Query Parameters

- `status` optional
  - Omit it to get all orders
  - Pass one value like `pending`
  - Pass multiple values as comma-separated, for example `pending,processing`
  - You can also repeat the query param, for example `?status=pending&status=processing`
- `customerId` optional
- `createdBy` optional

### Example Requests

Get all orders:

```bash
curl --location 'http://localhost:3025/api/orders'
```

Get only pending orders:

```bash
curl --location 'http://localhost:3025/api/orders?status=pending'
```

Get pending and processing orders:

```bash
curl --location 'http://localhost:3025/api/orders?status=pending,processing'
```

### Example Success Response

```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "orderNumber": "ORD-2026-000001",
      "customerId": "1289",
      "customerName": "Devendar Infotech India",
      "items": [],
      "subtotal": 1000,
      "tax": 120,
      "total": 1120,
      "status": "pending",
      "createdAt": "2026-03-12T10:00:00.000Z",
      "updatedAt": "2026-03-12T10:00:00.000Z",
      "createdBy": "1289",
      "createdByRole": "customer"
    }
  ],
  "metadata": {
    "statuses": [
      "pending"
    ],
    "count": 1
  }
}
```

## 2. Update Order Status

- Method: `PUT`
- Route: `/api/orders/:id/status`
- Purpose: Update an existing order status from an external tool

### Path Parameters

- `id` required
  - SQLite order id, for example `1`

### Request Body

- `status` required
  - Allowed values: `pending`, `confirmed`, `processing`, `shipped`, `delivered`, `cancelled`

### Example Request

```bash
curl --location --request PUT 'http://localhost:3025/api/orders/1/status' \
--header 'Content-Type: application/json' \
--data '{
  "status": "confirmed"
}'
```

### Example Success Response

```json
{
  "success": true,
  "data": {
    "id": "1",
    "orderNumber": "ORD-2026-000001",
    "customerId": "1289",
    "customerName": "Devendar Infotech India",
    "items": [],
    "subtotal": 1000,
    "tax": 120,
    "total": 1120,
    "status": "confirmed",
    "createdAt": "2026-03-12T10:00:00.000Z",
    "updatedAt": "2026-03-12T10:05:00.000Z",
    "createdBy": "1289",
    "createdByRole": "customer"
  }
}
```

## Notes

- `PATCH /api/orders/:id/status` still works for backward compatibility.
- These endpoints are currently public at the app level. If you expose them outside a trusted network, add authentication before production use.
