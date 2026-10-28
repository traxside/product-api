const NAME_MAX_LENGTH = 255;
const IMAGE_MAX_LENGTH = 500;
const DESCRIPTION_MAX_BYTES = 65535;
const COLOR_OR_SIZE_MAX_LENGTH = 100;
const PRICE_MAX = 9999999999999.99;
const QUANTITY_MAX = 2147483647;

const VARIANTS_ERROR =
  "Field 'variants' must be an array of objects with 'colorOrSize' (string) and 'quantity' (integer)";

export const UPDATABLE_FIELDS = new Set([
  'name',
  'price',
  'image',
  'description',
  'variants'
]);

export function parseProductId(rawId) {
  if (!/^[1-9]\d*$/.test(rawId)) return null;

  const id = Number(rawId);
  return Number.isSafeInteger(id) ? id : null;
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function getPriceValidationError(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return "Field 'price' must be a non-negative number";
  }

  if (value > PRICE_MAX) {
    return `Field 'price' must not exceed ${PRICE_MAX}`;
  }

  return null;
}

function getDescriptionValidationError(value) {
  if (!isNonEmptyString(value)) {
    return "Field 'description' must be a non-empty string";
  }

  if (Buffer.byteLength(value, 'utf8') > DESCRIPTION_MAX_BYTES) {
    return `Field 'description' must be at most ${DESCRIPTION_MAX_BYTES} bytes`;
  }

  return null;
}

export function getVariantsValidationError(variants) {
  if (!Array.isArray(variants)) return VARIANTS_ERROR;

  for (let index = 0; index < variants.length; index += 1) {
    const variant = variants[index];

    if (
      variant === null ||
      typeof variant !== 'object' ||
      Array.isArray(variant) ||
      !isNonEmptyString(variant.colorOrSize) ||
      typeof variant.quantity !== 'number' ||
      !Number.isInteger(variant.quantity) ||
      variant.quantity < 0
    ) {
      return VARIANTS_ERROR;
    }

    if (variant.colorOrSize.length > COLOR_OR_SIZE_MAX_LENGTH) {
      return `Field 'variants[${index}].colorOrSize' must be at most ${COLOR_OR_SIZE_MAX_LENGTH} characters`;
    }

    if (variant.quantity > QUANTITY_MAX) {
      return `Field 'variants[${index}].quantity' must not exceed ${QUANTITY_MAX}`;
    }
  }

  return null;
}

export function getFieldValidationError(field, value) {
  switch (field) {
    case 'name':
      if (!isNonEmptyString(value)) {
        return "Field 'name' must be a non-empty string";
      }
      if (value.length > NAME_MAX_LENGTH) {
        return `Field 'name' must be at most ${NAME_MAX_LENGTH} characters`;
      }
      return null;

    case 'price':
      return getPriceValidationError(value);

    case 'image':
      if (typeof value !== 'string' || value.trim() === '') {
        return "Field 'image' must be a valid URL";
      }
      if (value.length > IMAGE_MAX_LENGTH) {
        return `Field 'image' must be at most ${IMAGE_MAX_LENGTH} characters`;
      }
      try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:'
          ? null
          : "Field 'image' must be a valid URL";
      } catch {
        return "Field 'image' must be a valid URL";
      }

    case 'description':
      return getDescriptionValidationError(value);

    case 'variants':
      return getVariantsValidationError(value);

    default:
      return null;
  }
}

export function getProductValidationError({ name, price, image, variants, description }) {
  return (
    getFieldValidationError('name', name) ??
    getFieldValidationError('price', price) ??
    getFieldValidationError('image', image) ??
    getFieldValidationError('variants', variants) ??
    getFieldValidationError('description', description)
  );
}
