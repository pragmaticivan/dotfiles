# Shopify Admin API Scopes

Scopes needed for product and content management via the Admin API.

## Required Scopes

### Product Management

| Scope | Enables |
|-------|---------|
| `read_products` | Query products, variants, images, collections |
| `write_products` | Create/update/delete products and variants |
| `read_product_listings` | Query products published to sales channels |
| `read_inventory` | Query inventory levels and locations |
| `write_inventory` | Adjust inventory quantities |

### Content Management

| Scope | Enables |
|-------|---------|
| `read_content` | Query pages, blogs, articles, metaobjects |
| `write_content` | Create/update/delete pages, blog posts, metaobjects |

### File Management

| Scope | Enables |
|-------|---------|
| `read_files` | Query uploaded files (images, documents) |
| `write_files` | Upload files via staged uploads |

## Optional Scopes

Add these if needed for extended workflows:

| Scope | Use Case |
|-------|----------|
| `read_themes` | Query theme files for template editing |
| `write_themes` | Modify theme templates |
| `read_translations` | Query store translations |
| `write_translations` | Update translations |
| `read_metaobject_definitions` | Query custom content types |
| `write_metaobject_definitions` | Create custom content types |
| `read_online_store_navigation` | Query navigation menus |
| `write_online_store_navigation` | Update navigation menus |

## Scope Selection by Task

| Task | Minimum Scopes |
|------|---------------|
| Add products | `read_products`, `write_products` |
| Bulk product import | `read_products`, `write_products`, `write_files` |
| Manage inventory | `read_inventory`, `write_inventory` |
| Create pages | `read_content`, `write_content` |
| Blog posts | `read_content`, `write_content` |
| Upload images | `read_files`, `write_files` |
| Update navigation | `read_online_store_navigation`, `write_online_store_navigation` |
| Create URL redirects | `read_online_store_navigation`, `write_online_store_navigation` |
