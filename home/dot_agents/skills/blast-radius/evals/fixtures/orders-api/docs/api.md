# Orders API

Partners and the mobile apps use this API.

| Path | Status | Since |
| --- | --- | --- |
| `GET /v1/orders` | Deprecated. Returns `total` in dollars and `state`. | 2023-02 |
| `GET /v2/orders` | Current. Returns `{ data: [...] }` with `total_cents` and `status`. | 2025-11 |

The iOS and Android apps call `/v2/orders` from version 5.0.0.

Partner integrations register their own pollers and webhooks against this API. The partner list is in the partner portal, not in this repository.
