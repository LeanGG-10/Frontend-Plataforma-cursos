/**
 * Formats a price value to a string with two decimal places and a currency symbol.
 * Ensures that values like 10.5 are shown as $10.50 to avoid confusion.
 */
export const formatPrice = (price: number | string | undefined | null): string => {
  if (price === undefined || price === null) return '$0.00';
  
  let numericPrice: number;
  
  if (typeof price === 'string') {
    // Remove currency symbol if present and parse
    const cleanPrice = price.replace(/[^\d.-]/g, '');
    numericPrice = parseFloat(cleanPrice);
  } else {
    numericPrice = price;
  }
  
  if (isNaN(numericPrice)) return typeof price === 'string' ? price : '$0.00';
  
  return `$${numericPrice.toFixed(2)}`;
};
