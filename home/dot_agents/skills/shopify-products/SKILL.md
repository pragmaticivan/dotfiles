---
name: shopify-products
description: "Create and manage Shopify products via the Admin GraphQL API or CSV import. Workflow: gather data, choose method, execute, verify. Use whenever the user wants to add products to Shopify, bulk-import a catalog from CSV/spreadsheet/URL, update variants or prices, manage inventory quantities, upload product images, or assign products to collections."
compatibility: claude-code-only
---

# Shopify Products

Create, update, and bulk-import Shopify products. Produces live products in the store via the GraphQL Admin API or CSV import.

## Prerequisites

- Admin API access token (use the **shopify-setup** skill if not configured)
- Store URL and API version from `shopify.config.json` or `.dev.vars`

## Workflow

### Step 1: Gather Product Data

Determine what the user wants to create or update:

- **Product basics**: title, description (HTML), product type, vendor, tags
- **Variants**: options (size, colour, material), prices, SKUs, inventory quantities
- **Images**: URLs to upload, or local files
- **SEO**: page title, meta description, URL handle
- **Organisation**: collections, product type, tags

Accept data from:
- Direct conversation (user describes products)
- Spreadsheet/CSV file (user provides a file)
- Website scraping (user provides a URL to extract from)

### Step 2: Choose Method

| Scenario | Method |
|----------|--------|
| 1-5 products | `productSet` (or `productCreate`) mutations |
| 6-20 products | `productSet`, one call per product |
| 20+ products | CSV import via admin, or async `bulkOperationRunMutation` |
| Updates to existing | `productSet` / `productUpdate` / `productVariantsBulkUpdate` |
| Inventory adjustments | `inventorySetQuantities` mutation |

---

### Step 3a: Create via GraphQL (Recommended)

**Important — the product model split.** As of the current API, `productCreate` only creates a product plus its *single* initial variant. It cannot accept an inline array of variants, and the old `options: ["Size"]` and inline `variants` shapes are gone. Two correct paths remain:

1. **`productSet` (preferred for anything with variants)** — one declarative call that sets the product, its `productOptions`, all `variants`, and media together. It is exempt from per-call variant limits and mirrors an external source of truth cleanly.
2. **`productCreate` then `productVariantsBulkCreate`** — create the product with its options, then add the remaining variants. Use when you want the two steps separated (e.g. options known up front, variants streamed in later).

#### productSet — product + options + variants in one call

```graphql
mutation productSet($input: ProductSetInput!) {
  productSet(input: $input, synchronous: true) {
    product {
      id
      title
      handle
      status
      options { name optionValues { name } }
      variants(first: 100) {
        edges { node { id title price sku } }
      }
    }
    userErrors { field message }
  }
}
```

Variables:

```json
{
  "input": {
    "title": "Example T-Shirt",
    "descriptionHtml": "<p>Premium cotton tee</p>",
    "vendor": "My Brand",
    "productType": "T-Shirts",
    "tags": ["summer", "cotton"],
    "status": "DRAFT",
    "productOptions": [
      { "name": "Size", "position": 1, "values": [{ "name": "S" }, { "name": "M" }, { "name": "L" }] },
      { "name": "Colour", "position": 2, "values": [{ "name": "Black" }] }
    ],
    "variants": [
      {
        "optionValues": [{ "optionName": "Size", "name": "S" }, { "optionName": "Colour", "name": "Black" }],
        "price": "29.95", "sku": "TSHIRT-S-BLK", "inventoryPolicy": "DENY"
      },
      {
        "optionValues": [{ "optionName": "Size", "name": "M" }, { "optionName": "Colour", "name": "Black" }],
        "price": "29.95", "sku": "TSHIRT-M-BLK"
      },
      {
        "optionValues": [{ "optionName": "Size", "name": "L" }, { "optionName": "Colour", "name": "Black" }],
        "price": "29.95", "sku": "TSHIRT-L-BLK"
      }
    ],
    "files": [
      { "originalSource": "https://example.com/tshirt.jpg", "alt": "Example T-Shirt front view", "contentType": "IMAGE" }
    ],
    "seo": {
      "title": "Example T-Shirt | My Brand",
      "description": "Premium cotton tee in multiple sizes"
    }
  }
}
```

`productSet` **replaces** list fields — variants and options not present in the input are deleted. That is intended for sync-from-source-of-truth. For very large products, pass `synchronous: false` and poll the returned `ProductSetOperation` with the `productOperation` query to avoid timeouts.

Curl example:

```bash
curl -s https://{store}/admin/api/2026-07/graphql.json \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Access-Token: {token}" \
  -d '{"query": "mutation productSet($input: ProductSetInput!) { productSet(input: $input, synchronous: true) { product { id title } userErrors { field message } } }", "variables": { ... }}'
```

#### productCreate (single-variant, or product shell before bulk variants)

```graphql
mutation productCreate($product: ProductCreateInput!) {
  productCreate(product: $product) {
    product { id title handle status options { name } }
    userErrors { field message }
  }
}
```

`ProductCreateInput` takes `title`, `descriptionHtml`, `vendor`, `productType`, `tags`, `status`, `handle`, `seo`, `metafields`, and `productOptions` (same shape as above). Add variants afterward with `productVariantsBulkCreate`.

**Batching multiple products**: issue one `productSet` per product sequentially with a short delay to respect rate limits (1,000 cost points/second, leaky bucket).

#### productUpdate

`productUpdate` updates product-level fields only — it **cannot** touch variants (use `productVariantsBulkUpdate` for those). The old `input: ProductInput` argument is deprecated; use `product: ProductUpdateInput`:

```graphql
mutation productUpdate($product: ProductUpdateInput!) {
  productUpdate(product: $product) {
    product { id title }
    userErrors { field message }
  }
}
```

Variables include `id` (required) plus any product-level fields to update.

#### productDelete

```graphql
mutation productDelete($input: ProductDeleteInput!) {
  productDelete(input: $input) {
    deletedProductId
    userErrors { field message }
  }
}
```

#### productVariantsBulkCreate

Add variants to an existing product:

```graphql
mutation productVariantsBulkCreate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
  productVariantsBulkCreate(productId: $productId, variants: $variants) {
    productVariants { id title price }
    userErrors { field message }
  }
}
```

#### productVariantsBulkUpdate

```graphql
mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
  productVariantsBulkUpdate(productId: $productId, variants: $variants) {
    productVariants { id title price }
    userErrors { field message }
  }
}
```

---

### Step 3b: Bulk Import via CSV

For 20+ products, generate a CSV and import through Shopify admin.

#### CSV Column Reference

**Required columns:**

| Column | Description | Example |
|--------|-------------|---------|
| `Handle` | URL slug (unique per product) | `classic-tshirt` |
| `Title` | Product name (first row per product) | `Classic T-Shirt` |
| `Body (HTML)` | Description in HTML | `<p>Premium cotton</p>` |
| `Vendor` | Brand or manufacturer | `My Brand` |
| `Product Category` | Shopify standard taxonomy | `Apparel & Accessories > Clothing > Shirts & Tops` |
| `Type` | Custom product type | `T-Shirts` |
| `Tags` | Comma-separated tags | `summer, cotton, casual` |
| `Published` | Whether product is visible | `TRUE` or `FALSE` |

**Variant columns:**

| Column | Description | Example |
|--------|-------------|---------|
| `Option1 Name` | First option name | `Size` |
| `Option1 Value` | First option value | `Medium` |
| `Option2 Name` | Second option name | `Colour` |
| `Option2 Value` | Second option value | `Black` |
| `Option3 Name` | Third option name | `Material` |
| `Option3 Value` | Third option value | `Cotton` |
| `Variant SKU` | Stock keeping unit | `TSHIRT-M-BLK` |
| `Variant Grams` | Weight in grams | `200` |
| `Variant Inventory Qty` | Stock quantity | `50` |
| `Variant Price` | Variant price | `29.95` |
| `Variant Compare At Price` | Original price (for sales) | `39.95` |
| `Variant Requires Shipping` | Physical product | `TRUE` |
| `Variant Taxable` | Subject to tax | `TRUE` |

**Image columns:**

| Column | Description | Example |
|--------|-------------|---------|
| `Image Src` | Image URL | `https://example.com/img.jpg` |
| `Image Position` | Display order (1-based) | `1` |
| `Image Alt Text` | Alt text for accessibility | `Classic T-Shirt front view` |

**SEO columns:**

| Column | Description | Example |
|--------|-------------|---------|
| `SEO Title` | Page title tag | `Classic T-Shirt | My Brand` |
| `SEO Description` | Meta description | `Premium cotton tee in 5 colours` |

#### Multi-Variant Row Format

The first row has the product title and details. Subsequent rows for the same product have only the `Handle` and variant-specific columns:

```csv
Handle,Title,Body (HTML),Vendor,Type,Tags,Published,Option1 Name,Option1 Value,Variant SKU,Variant Price,Variant Inventory Qty,Image Src
classic-tshirt,Classic T-Shirt,<p>Premium cotton</p>,My Brand,T-Shirts,"summer,cotton",TRUE,Size,Small,TSH-S,29.95,50,https://example.com/tshirt.jpg
classic-tshirt,,,,,,,,Medium,TSH-M,29.95,75,
classic-tshirt,,,,,,,,Large,TSH-L,29.95,60,
```

#### CSV Rules

- UTF-8 encoding required
- Maximum 50MB file size
- Handle must be unique per product -- duplicate handles update existing products
- Leave variant columns blank on variant rows for fields that don't change
- Images can be on any row -- they're associated by Handle
- `Published` = `TRUE` makes the product immediately visible

#### Import Steps

1. Generate CSV using the column format above
2. Use the template from `assets/product-csv-template.csv` if available
3. Navigate to `https://{store}.myshopify.com/admin/products/import`
4. Upload the CSV file
5. Review the preview and confirm import

Use browser automation to assist with the upload if needed.

---

### Step 4: Upload Product Images

**Public URLs — the easy path.** If images are already hosted at a public URL, don't stage anything. Let Shopify fetch them: pass `files` on `productSet` (shown in Step 3a) or `media` on `productCreate`/`productUpdate`, using `originalSource`:

```json
{ "media": [{ "originalSource": "https://example.com/image.jpg", "alt": "Product front view", "mediaContentType": "IMAGE" }] }
```

The legacy `images: [{ src }]` field is deprecated — use `media`/`files` with `originalSource` instead.

**Local files — staged upload.** Only local files need the two-step staged upload: get a target, PUT/POST the bytes to it, then reference the returned `resourceUrl` as `originalSource`.

#### stagedUploadsCreate

```graphql
mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
  stagedUploadsCreate(input: $input) {
    stagedTargets {
      url
      resourceUrl
      parameters { name value }
    }
    userErrors { field message }
  }
}
```

Input per file:

```json
{
  "filename": "product-image.jpg",
  "mimeType": "image/jpeg",
  "httpMethod": "POST",
  "resource": "IMAGE"
}
```

Then upload to the staged URL, and attach with `productCreateMedia`:

#### productCreateMedia

```graphql
mutation productCreateMedia($productId: ID!, $media: [CreateMediaInput!]!) {
  productCreateMedia(productId: $productId, media: $media) {
    media { alt status }
    mediaUserErrors { field message }
  }
}
```

`productCreateMedia` remains valid for attaching media to an existing product after creation. For new products, prefer the inline `files`/`media` approach above.

---

### Step 5: Assign to Collections

#### collectionAddProducts

```graphql
mutation collectionAddProducts($id: ID!, $productIds: [ID!]!) {
  collectionAddProducts(id: $id, productIds: $productIds) {
    collection { title productsCount }
    userErrors { field message }
  }
}
```

To find collection IDs:

```graphql
{
  collections(first: 50) {
    edges {
      node { id title handle productsCount }
    }
  }
}
```

---

### Step 6: Set Inventory

#### inventorySetQuantities

```graphql
mutation inventorySetQuantities($input: InventorySetQuantitiesInput!) {
  inventorySetQuantities(input: $input) {
    inventoryAdjustmentGroup { reason }
    userErrors { field message }
  }
}
```

Input:

```json
{
  "reason": "correction",
  "name": "available",
  "quantities": [{
    "inventoryItemId": "gid://shopify/InventoryItem/123",
    "locationId": "gid://shopify/Location/456",
    "quantity": 50,
    "compareQuantity": 45
  }]
}
```

`compareQuantity` is the quantity you last read; the write only lands if the stored value still matches, which prevents two concurrent writers from clobbering each other. Query the current `available` quantity first and pass it. If you genuinely want an unconditional overwrite, set `ignoreCompareQuantity: true` instead — but that can produce wrong totals under concurrency, so avoid it unless you know the item is single-writer.

To find location IDs:

```graphql
{
  locations(first: 10) {
    edges {
      node { id name isActive }
    }
  }
}
```

---

### Step 7: Verify

Query back the created products to confirm:

```graphql
{
  products(first: 50) {
    edges {
      node {
        id title handle status productType vendor
        variants(first: 10) {
          edges { node { id title price sku inventoryQuantity } }
        }
        images(first: 3) { edges { node { url altText } } }
      }
    }
    pageInfo { hasNextPage endCursor }
  }
}
```

Provide the admin URL for the user to review: `https://{store}.myshopify.com/admin/products`

---

## Critical Patterns

### Product Status

New products default to `DRAFT`. To make them visible:

```json
{ "status": "ACTIVE" }
```

Always confirm with the user before setting status to `ACTIVE`.

### Variant Limits

With the new product model a product supports up to **2,048 variants** (up from the old 100) and **3 options** (e.g. Size, Colour, Material). `productVariantsBulkCreate` accepts up to 2,048 variants per call and `productSet` is exempt from the per-call cap. If a store hasn't been migrated to the higher limit, or you hit the 3-option ceiling, split into separate products.

### Price Formatting

Prices are strings, not numbers. Always quote them: `"price": "29.95"` not `"price": 29.95`.

### HTML Descriptions

Product descriptions accept HTML. Keep it simple -- Shopify's editor handles basic tags:
- `<p>`, `<strong>`, `<em>`, `<ul>`, `<ol>`, `<li>`, `<h2>`-`<h6>`
- `<a href="...">` for links
- `<img>` is stripped -- use product images instead

### Bulk Operations for Large Imports

For 50+ products via API, use Shopify's bulk operation with `productSet` (the current product-model mutation):

```graphql
mutation {
  bulkOperationRunMutation(
    mutation: "mutation ($input: ProductSetInput!) { productSet(input: $input, synchronous: true) { product { id } userErrors { message } } }"
    stagedUploadPath: "tmp/bulk-products.jsonl"
  ) {
    bulkOperation { id status }
    userErrors { message }
  }
}
```

Upload the JSONL (one `{"input": {...}}` per line) via `stagedUploadsCreate` first, then pass its path as `stagedUploadPath`. Poll the returned bulk operation until `status` is `COMPLETED`.

---

## Asset Files

- `assets/product-csv-template.csv` -- Blank CSV template with Shopify import headers
