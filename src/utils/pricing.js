export function calculateSubtotal(lines) {
  return lines.reduce((subtotal, line) => {
    if (!Number.isSafeInteger(line.priceInPaise) || line.priceInPaise < 0 ||
        !Number.isSafeInteger(line.quantity) || line.quantity < 1) {
      throw new RangeError('Cart lines require a non-negative integer price and a positive integer quantity.');
    }
    return subtotal + line.priceInPaise * line.quantity;
  }, 0);
}

export function calculatePercentageDiscount(subtotalInPaise, percentage) {
  if (!Number.isSafeInteger(subtotalInPaise) || subtotalInPaise < 0 ||
      !Number.isInteger(percentage) || percentage < 0 || percentage > 100) {
    throw new RangeError('Discount requires a non-negative integer subtotal and a whole percentage from 0 to 100.');
  }
  return Math.floor((subtotalInPaise * percentage) / 100);
}
