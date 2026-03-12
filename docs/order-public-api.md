# Order API

These endpoints are intended for external integrations.

They are protected by a deployment-specific token from `.env`:

```env
PUBLIC_API_AUTH_TOKEN=replace-with-a-long-random-string
```

Use that token in the `Authorization` header:

```http
Authorization: Bearer YOUR_PUBLIC_API_AUTH_TOKEN
```

Every public request must also include `company_id`, so each deployment only exposes one company’s order data at a time.

## 1. Get Orders

- Method: `GET`
- Route: `/api/order`
- Purpose: Fetch orders for one company, optionally filtered by status

### Required Query Parameters

- `company_id`
  - Example: `14`

### Optional Query Parameters

- `status`
  - Omit it to get all orders for the company
  - Pass one value like `pending`
  - Pass multiple values as comma-separated, for example `pending,processing`
  - You can also repeat the query param, for example `?status=pending&status=processing`
- `customerId`
- `createdBy`

### Example Requests

Get all orders for company `14`:

```bash
curl --location 'http://localhost:3025/api/order?company_id=14' \
--header 'Authorization: Bearer YOUR_PUBLIC_API_AUTH_TOKEN'
```

Get only pending orders for company `14`:

```bash
curl --location 'http://localhost:3025/api/order?company_id=14&status=pending' \
--header 'Authorization: Bearer YOUR_PUBLIC_API_AUTH_TOKEN'
```

Get pending and processing orders for company `14`:

```bash
curl --location 'http://localhost:3025/api/order?company_id=14&status=pending,processing' \
--header 'Authorization: Bearer YOUR_PUBLIC_API_AUTH_TOKEN'
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
      "saleTypeId": "1230",
      "saleTypeName": "Central-12%",
      "materialCenterId": "201",
      "materialCenterName": "Main Store",
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
    "companyId": 14,
    "statuses": [
      "pending"
    ],
    "count": 1
  }
}
```

## 2. Update Order Status

- Method: `PUT`
- Route: `/api/order/:id/status`
- Purpose: Update an existing order status for one company

### Path Parameters

- `id` required
  - SQLite order id, for example `1`

### Required Request Body

- `company_id`
  - Example: `14`
- `status`
  - Allowed values: `pending`, `confirmed`, `processing`, `shipped`, `delivered`, `cancelled`

### Example Request

```bash
curl --location --request PUT 'http://localhost:3025/api/order/1/status' \
--header 'Authorization: Bearer YOUR_PUBLIC_API_AUTH_TOKEN' \
--header 'Content-Type: application/json' \
--data '{
  "company_id": 14,
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
    "saleTypeId": "1230",
    "saleTypeName": "Central-12%",
    "materialCenterId": "201",
    "materialCenterName": "Main Store",
    "items": [],
    "subtotal": 1000,
    "tax": 120,
    "total": 1120,
    "status": "confirmed",
    "createdAt": "2026-03-12T10:00:00.000Z",
    "updatedAt": "2026-03-12T10:05:00.000Z",
    "createdBy": "1289",
    "createdByRole": "customer"
  },
  "metadata": {
    "companyId": 14
  }
}
```

## Notes

- `PATCH /api/order/:id/status` also works for backward compatibility.
- The internal app routes now live under `/api/internal/...`, for example `/api/internal/orders` and `/api/internal/orders/:id/status`.
- Public routes reject requests when `PUBLIC_API_AUTH_TOKEN` is missing or invalid.
