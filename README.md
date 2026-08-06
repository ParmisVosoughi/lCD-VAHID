# LCD-Vahid

A product lookup / invoicing app. Backend in **Python (Django + Django REST
Framework, SQLite)**, frontend served by **Node.js (Express)**. The original
HTML pages (exported from the design tool) are used as-is — no redesign, no
layout/CSS changes.

```
lcd-vahid/
├── backend/                     Python API (Django + DRF + SQLite)
│   ├── manage.py
│   ├── requirements.txt
│   ├── config/                  Django project (settings, urls, wsgi)
│   └── products/                Django app: models, serializers, views, urls
│       └── management/commands/seed_products.py
└── frontend/                    Node.js static server + the original HTML pages
    ├── server.js
    ├── package.json
    └── public/
        ├── main page.html
        ├── page'گوشی'.html
        ├── page'متفرقه'.html
        ├── page print.html
        ├── page Invoice print confirmation.html
        ├── pop up admin panell.html
        ├── admin panel pop up main.html
        ├── admin panel product.html
        ├── admin panel aploaded files.html
        ├── analytics page.html
        ├── history print page.html
        └── backup page.html
```

## Run it locally

Two servers, two terminals.

### 1. Backend (Django API) — http://localhost:5000

```bash
cd backend
python3 -m venv venv               # optional but recommended
source venv/bin/activate           # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_products     # populates the same 20 sample products as before
python manage.py runserver 0.0.0.0:5000
```

This creates `backend/db.sqlite3` and seeds it with the same 20 sample
products/variants used previously, so the Main Page looks identical to
before. `seed_products` is a no-op if products already exist, so it's safe
to run again later.

### 2. Frontend (Node.js static server) — http://localhost:3000

```bash
cd frontend
npm install
npm start
```

Open **http://localhost:3000** — this loads `main page.html`.

Both servers need to be running for the Main Page's product list, product
edit, and variant delete features to work (the frontend calls the backend
directly from the browser at `http://localhost:5000`).

## Why Django now (migration note)

This project previously used a small Flask backend for the same
functionality. It has been fully replaced with Django + Django REST
Framework, keeping the exact same API shape and URLs so the frontend
JavaScript didn't need to change at all:

- `products/models.py` — `Product` and `Variant` models, equivalent to the
  previous hand-written SQLite tables.
- `products/serializers.py` — `ProductSerializer` (with nested variants)
  and `VariantSerializer`; the `ProductSerializer.update()` method
  reproduces the old upsert/delete-missing-variants logic used by the Edit
  Product popup.
- `products/views.py` — DRF generic views (`ListAPIView`,
  `RetrieveUpdateAPIView`) plus a small `APIView` for variant deletion.
- `products/urls.py` / `config/urls.py` — same routes as before, mounted
  under `/api/`.
- `django-cors-headers` is configured (`CORS_ALLOW_ALL_ORIGINS = True`) so
  the Node-served frontend (a different origin) can call the API directly
  from the browser, same as with the Flask version.
- SQLite remains the database, now managed through Django's ORM/migrations
  instead of raw `sqlite3` calls.

Tested after migration: Main Page loads all 20 products, the pencil icon
opens the Edit Product popup and saves correctly (title + variants,
including adding/removing variants), the trash icon deletes a single
variant, and all 12 pages are still reachable via the existing navigation.

## Backend API reference (Main Page only)

| Method | Endpoint                | Description                                   |
|--------|--------------------------|------------------------------------------------|
| GET    | `/api/products`          | List all products with their variants          |
| GET    | `/api/products/<id>`     | Get one product with its variants               |
| PUT    | `/api/products/<id>`     | Update a product's title and variants           |
| DELETE | `/api/variants/<id>`     | Delete a single variant                         |

Django admin is also available at `/admin/` (create a superuser with
`python manage.py createsuperuser` if you want to browse/edit products and
variants there).

## Notes / assumptions

- The "match %" badge next to each product (e.g. "94% match") was part of
  a fuzzy search results view in the original extraction. It's still
  stored and displayed per product for visual fidelity, but real
  search-matching logic is not implemented in this phase — the search box
  is present but inert for now.
- If you need the frontend/backend on different hosts or ports, set
  `window.LCD_VAHID_API_BASE = "http://your-host:port"` before the page's
  scripts run (e.g. in a small inline `<script>` placed earlier in
  `main page.html`), or edit the `BACKEND_URL` fallback in that page's
  script block.
- Everything beyond the Main Page (Products/Uploaded files/Analytics/
  History/Backup admin tabs, Print Invoice, etc.) is navigable but its
  backend is intentionally **not** implemented yet. Next up: Admin Panel →
  Uploaded Files / Upload Excel.
