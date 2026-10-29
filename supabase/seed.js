import { categories, menu } from '../src/data/menu.js';
import { imageManifest } from '../src/data/imageManifest.js';

const baseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const publicUrl = process.env.AERODINE_PUBLIC_URL;
const imagesByDishId = new Map(imageManifest.map((image) => [image.dishId, image]));

if (!baseUrl || !serviceKey || !publicUrl) {
  throw new Error('Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and AERODINE_PUBLIC_URL in the trusted seed-script environment.');
}

async function upsert(table, rows) {
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/rest/v1/${table}?on_conflict=id`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  });
  if (!response.ok) {
    throw new Error(`Seeding ${table} failed (${response.status}): ${await response.text()}`);
  }
}

await upsert('categories', categories.map((category) => ({
  ...category,
  description: `AeroDine ${category.name.toLowerCase()} selection.`,
  is_active: true,
})));

await upsert('dishes', menu.map((dish) => ({
  id: dish.id,
  category_id: dish.categoryId,
  name: dish.name,
  slug: dish.slug,
  description: dish.description,
  price_in_paise: dish.priceInPaise,
  image_url: imagesByDishId.get(dish.id)?.imageUrl
    ? new URL(imagesByDishId.get(dish.id).imageUrl, `${publicUrl.replace(/\/$/, '')}/`).toString()
    : null,
  image_source: imagesByDishId.get(dish.id)?.source ?? 'Not assigned',
  image_license: imagesByDishId.get(dish.id)?.license ?? 'Not verified',
  image_status: imagesByDishId.get(dish.id)?.verified ? 'verified' : 'review',
  vegetarian_status: dish.vegetarian ? 'vegetarian' : 'non_vegetarian',
  dietary_tags: [],
  allergens: [],
  is_available: dish.isAvailable,
  is_featured: dish.isFeatured,
})));

console.log(`Seeded ${categories.length} categories and ${menu.length} dishes.`);
