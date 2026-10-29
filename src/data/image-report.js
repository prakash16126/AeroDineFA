import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { imageManifest, validateImageManifest } from './imageManifest.js';
import { menu } from './menu.js';

const brokenLocalImageIds = imageManifest
  .filter((image) => image.imageUrl?.startsWith('/images/'))
  .filter((image) => !existsSync(resolve('public', image.imageUrl.slice(1))))
  .map((image) => image.dishId);

console.log(JSON.stringify(validateImageManifest(menu, imageManifest, brokenLocalImageIds), null, 2));
