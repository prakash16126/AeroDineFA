import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { categories, menu } from './menu.js';
import { imageManifest, imageValidationReport, validateImageManifest } from './imageManifest.js';

test('the seed has exactly the 84 requested unique dishes', () => {
  assert.equal(menu.length, 84);
  assert.equal(new Set(menu.map((dish) => dish.id)).size, 84, 'dish IDs must be unique');
  assert.equal(new Set(menu.map((dish) => dish.slug)).size, 84, 'dish slugs must be unique');
});

test('all twelve categories contain seven dishes and every price is exact paise', () => {
  assert.equal(categories.length, 12);
  for (const category of categories) {
    const dishes = menu.filter((dish) => dish.categoryId === category.id);
    assert.equal(dishes.length, 7, `${category.name} must contain seven dishes`);
    assert.ok(dishes.every((dish) => Number.isSafeInteger(dish.priceInPaise) && dish.priceInPaise > 0));
  }
});

test('each seeded dish has an explicit image-manifest entry and review status', () => {
  assert.equal(imageManifest.length, 84);
  assert.deepEqual(imageManifest.map((image) => image.dishId), menu.map((dish) => dish.id));
  assert.ok(imageManifest.every((image) => image.source && image.license && image.status));
  assert.deepEqual(imageManifest.filter((image) => image.verified).map((image) => image.dishId), [
    'dish-001', 'dish-002', 'dish-003', 'dish-004', 'dish-005', 'dish-006', 'dish-007', 'dish-008', 'dish-009',
    'dish-010', 'dish-013', 'dish-014', 'dish-015', 'dish-016', 'dish-017', 'dish-018', 'dish-020', 'dish-022', 'dish-024', 'dish-025',
    'dish-026', 'dish-027', 'dish-028', 'dish-029', 'dish-030', 'dish-031', 'dish-032', 'dish-037', 'dish-038',
    'dish-039', 'dish-043', 'dish-046', 'dish-047', 'dish-050', 'dish-052', 'dish-056', 'dish-057', 'dish-059',
    'dish-063', 'dish-064', 'dish-066', 'dish-069', 'dish-070', 'dish-072', 'dish-074', 'dish-075', 'dish-076',
    'dish-077', 'dish-078', 'dish-079', 'dish-081', 'dish-083',
  ]);
  assert.ok(imageManifest.slice(0, 3).every((image) => image.imageUrl && image.credit && image.sourcePage && image.licenseUrl));
  const mappedImages = imageManifest.filter((image) => image.imageUrl);
  assert.equal(new Set(mappedImages.map((image) => image.imageUrl)).size, mappedImages.length);
  for (const image of mappedImages) {
    assert.ok(existsSync(resolve('public', image.imageUrl.slice(1))), `${image.imageUrl} must exist locally`);
  }
  for (const image of mappedImages.filter((entry) => entry.source.startsWith('Wikimedia Commons:'))) {
    assert.ok(image.sourcePage && image.credit && image.license, `${image.dishId} must include attribution and license metadata`);
  }
});

test('image validation report detects missing, duplicate, broken and unverified mappings', () => {
  assert.deepEqual(imageValidationReport.missingMappings, []);
  assert.deepEqual(imageValidationReport.orphanMappings, []);
  assert.deepEqual(imageValidationReport.duplicateMappings, []);
  assert.equal(imageValidationReport.missingImageUrls.length, 32);
  assert.deepEqual(imageValidationReport.duplicateUrls, []);
  assert.deepEqual(imageValidationReport.brokenImages, []);
  assert.equal(imageValidationReport.unverifiedImages.length, 32);
  assert.equal(imageValidationReport.verifiedContent.length, 52);
  assert.equal(imageValidationReport.mappedImageCount, 52);
  assert.equal(imageValidationReport.imagesAwaitingReview.length, 32);
  assert.ok(imageValidationReport.imagesAwaitingReview.every(({ id }) => !imageManifest.find((image) => image.dishId === id)?.verified));
  const fixture = validateImageManifest(
    [{ id: 'one' }, { id: 'two' }],
    [{ dishId: 'one', imageUrl: '/same.jpg', verified: true }, { dishId: 'two', imageUrl: '/same.jpg', verified: false }],
    ['two'],
  );
  assert.deepEqual(fixture.duplicateUrls, ['/same.jpg']);
  assert.deepEqual(fixture.brokenImages, ['two']);
  assert.deepEqual(fixture.unverifiedImages, ['two']);
  const invalidUrl = validateImageManifest([{ id: 'one' }], [{ dishId: 'one', imageUrl: 'javascript:alert(1)', verified: false }]);
  assert.deepEqual(invalidUrl.brokenImages, ['one']);
});

test('illustrative prices preserve the requested menu values', () => {
  const expectedPrices = [
    189,149,129,139,129,179,139,189,199,199,189,199,209,179,25,189,209,219,249,199,169,
    199,189,179,149,119,159,129,229,219,189,239,209,129,219,149,169,149,199,229,229,79,
    129,169,149,179,129,169,139,20,25,39,49,59,39,89,79,89,89,99,109,109,119,159,189,
    209,229,179,159,219,59,99,139,69,79,89,119,29,39,89,99,59,79,99,
  ];
  assert.deepEqual(menu.map((dish) => dish.priceInPaise / 100), expectedPrices);
});
