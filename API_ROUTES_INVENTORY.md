# API Routes Inventory Report

Generated: 2026/1/21 上午8:36:55

## Summary

- **Active Routes**: 82
- **Backup Routes**: 79
- **Old Routes**: 17
- **Duplicate Groups**: 0

## Active Routes by Category

### Authentication (8 routes)

- `auth/create-super-admin` (POST) - 2KB
- `auth/init-admin` (POST) - 2KB
- `auth/login` (POST) - 6KB
- `auth/logout` (POST) - 1KB
- `auth/me` (GET) - 1KB
- `auth/register` () - 4KB
- `auth/self-register` (POST) - 4KB
- `diag/login` (GET, POST) - 4KB

### Customer Management (4 routes)

- `customer-groups` (GET, POST) - 2KB
- `customers` (GET, POST) - 5KB
- `customers/[id]` (GET, PUT, DELETE) - 3KB
- `integration/chuanji/customers` (GET) - 3KB

### Order Management (2 routes)

- `orders` (GET, POST) - 9KB
- `orders/[id]` (GET, PUT, DELETE) - 7KB

### Inventory (2 routes)

- `inventory` (GET, POST) - 5KB
- `inventory/transactions` (GET) - 2KB

### LINE Bot (12 routes)

- `linebot/groups` (GET, POST, PUT, DELETE) - 5KB
- `linebot` (GET, POST) - 13KB
- `linebot/send` (GET, POST) - 4KB
- `notifications/line` (POST) - 6KB
- `sync/company/webhook` (POST) - 8KB
- `voice/webhook` (GET, POST) - 6KB
- `webhook/line/debug` (GET, POST) - 2KB
- `webhook/line/get-groups` (GET, POST) - 3KB
- `webhook/line` (GET, POST) - 26KB
- `webhook/receive/[systemId]` (POST) - 3KB
- `webhook` (GET, POST) - 2KB
- `webhook-logs` (GET) - 2KB

### AI/Chat (4 routes)

- `ai/chat` (POST) - 16KB
- `chat` (GET, POST) - 5KB
- `sheets/daily-notify` (GET) - 5KB
- `voice/chat` (GET, POST) - 10KB

### Voice (8 routes)

- `test-tts` (GET) - 2KB
- `voice/chat` (GET, POST) - 10KB
- `voice/diag` (GET) - 3KB
- `voice/realtime` (GET, POST) - 6KB
- `voice/stream` (GET, POST) - 10KB
- `voice/stt` (GET, POST) - 6KB
- `voice/tts` (GET, POST) - 10KB
- `voice/webhook` (GET, POST) - 6KB

### Database (4 routes)

- `database/[table]` (GET, POST) - 3KB
- `database/[table]/[id]` (PUT, DELETE) - 2KB
- `diag/db` (GET) - 3KB
- `test/db` (GET) - 1KB

### Export (2 routes)

- `export/excel` (POST) - 12KB
- `sync/excel` (GET, POST) - 3KB

### Sync (11 routes)

- `integration/chuanji/sync` (GET, POST) - 2KB
- `sync/accounting` (GET, POST) - 3KB
- `sync/accounting-data` (GET, POST) - 8KB
- `sync/company` (GET, POST) - 2KB
- `sync/company/webhook` (POST) - 8KB
- `sync/download` (POST) - 1KB
- `sync/excel` (GET, POST) - 3KB
- `sync/full` (POST) - 1KB
- `sync/resolve` (POST) - 1KB
- `sync/status` (GET) - 1KB
- `sync/upload` (POST) - 1KB

### Admin (2 routes)

- `auth/create-super-admin` (POST) - 2KB
- `auth/init-admin` (POST) - 2KB

### Health (4 routes)

- `checks` (GET, POST) - 6KB
- `checks/[id]` (PUT, DELETE) - 1KB
- `health/check` (GET) - 3KB
- `health` (GET) - 1KB

## All Active Routes

1. `ai/chat` (POST)
2. `alerts` (GET)
3. `auth/create-super-admin` (POST)
4. `auth/init-admin` (POST)
5. `auth/login` (POST)
6. `auth/logout` (POST)
7. `auth/me` (GET)
8. `auth/register` ()
9. `auth/self-register` (POST)
10. `call-records` (GET, POST)
11. `charts/business` (GET)
12. `chat` (GET, POST)
13. `checks` (GET, POST)
14. `checks/[id]` (PUT, DELETE)
15. `cost-analysis` (GET)
16. `costs` (GET, POST)
17. `customer-groups` (GET, POST)
18. `customers` (GET, POST)
19. `customers/[id]` (GET, PUT, DELETE)
20. `database/[table]` (GET, POST)
21. `database/[table]/[id]` (PUT, DELETE)
22. `diag/db` (GET)
23. `diag/login` (GET, POST)
24. `export/excel` (POST)
25. `external-systems` (GET, POST)
26. `external-systems/[id]` (PUT, DELETE)
27. `external-systems/[id]/test` (POST)
28. `fleet/dispatch` (GET, POST)
29. `fleet/drivers/location` (GET, POST)
30. `health/check` (GET)
31. `health` (GET)
32. `init` (GET, POST)
33. `integration/chuanji/customers` (GET)
34. `integration/chuanji/sync` (GET, POST)
35. `inventory` (GET, POST)
36. `inventory/transactions` (GET)
37. `knowledge` (GET, POST, PUT, DELETE)
38. `linebot/groups` (GET, POST, PUT, DELETE)
39. `linebot` (GET, POST)
40. `linebot/send` (GET, POST)
41. `logs` (GET, POST, DELETE)
42. `logs/stats` (GET)
43. `meter-readings` (GET, POST)
44. `monthly-statements` (GET, POST)
45. `notifications/line` (POST)
46. `orders` (GET, POST)
47. `orders/[id]` (GET, PUT, DELETE)
48. `products` (GET, POST)
49. `promotions` (GET, POST)
50. `sheets/daily-notify` (GET)
51. `sheets` (GET, POST)
52. `sheets/today` (GET)
53. `sheets/[id]/review` (POST)
54. `sheets/[id]` (GET)
55. `staff` (GET, POST)
56. `staff/[id]` (DELETE)
57. `sync/accounting` (GET, POST)
58. `sync/accounting-data` (GET, POST)
59. `sync/company` (GET, POST)
60. `sync/company/webhook` (POST)
61. `sync/download` (POST)
62. `sync/excel` (GET, POST)
63. `sync/full` (POST)
64. `sync/resolve` (POST)
65. `sync/status` (GET)
66. `sync/upload` (POST)
67. `test/db` (GET)
68. `test-tts` (GET)
69. `vehicle-express` (GET, POST)
70. `voice/chat` (GET, POST)
71. `voice/diag` (GET)
72. `voice/realtime` (GET, POST)
73. `voice/stream` (GET, POST)
74. `voice/stt` (GET, POST)
75. `voice/tts` (GET, POST)
76. `voice/webhook` (GET, POST)
77. `webhook/line/debug` (GET, POST)
78. `webhook/line/get-groups` (GET, POST)
79. `webhook/line` (GET, POST)
80. `webhook/receive/[systemId]` (POST)
81. `webhook` (GET, POST)
82. `webhook-logs` (GET)
