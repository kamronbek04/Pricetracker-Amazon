import { PriceHistoryItem, Product } from '@/types';

const Notification = {
  WELCOME: 'WELCOME',
  CHANGE_OF_STOCK: 'CHANGE_OF_STOCK',
  LOWEST_PRICE: 'LOWEST_PRICE',
  THRESHOLD_MET: 'THRESHOLD_MET',
};

const THRESHOLD_PERCENTAGE = 40;

// Extracts and returns the price from a list of possible elements.
export function extractPrice(...elements: any) {
  for (const element of elements) {
    const priceText = element.text().trim();

    if (priceText) {
      const cleanPrice = priceText.replace(/[^\d.]/g, '');

      let firstPrice;

      if (cleanPrice) {
        firstPrice = cleanPrice.match(/\d+\.\d{2}/)?.[0];
      }

      return firstPrice || cleanPrice;
    }
  }

  return '';
}

// Extracts and returns the currency symbol from an element.
export function extractCurrency(element: any) {
  const currencyText = element.text().trim().slice(0, 1);
  return currencyText ? currencyText : '';
}

// Extracts description from two possible elements from amazon
export function extractDescription(
  $: any,
  options?: { maxLength?: number; maxBullets?: number }
) {
  // reasonable defaults
  const maxLength = options?.maxLength ?? 450;
  const maxBullets = options?.maxBullets ?? 6;

  // prioritized selectors that commonly contain concise product info
  const selectors = [
    '#feature-bullets .a-list-item',
    '#feature-bullets li',
    '#productDescription',
    '#productDescription p',
    '#detailBullets_feature_div li',
    '#productOverview_feature_div',
    '.a-unordered-list .a-list-item',
    '.a-expander-content p',
  ];

  const cleanText = (t: string) =>
    t
      .replace(/\s+/g, ' ') // collapse whitespace
      .replace(/\u00A0/g, ' ') // non-breaking spaces
      .replace(/\s+\|\s+/g, ' - ') // pipe separators
      .trim();

  // helper: truncate without cutting words
  const truncate = (text: string, n: number) => {
    if (text.length <= n) return text;
    const truncated = text.slice(0, n);
    const lastSpace = truncated.lastIndexOf(' ');
    return (
      (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated).trim() + '...'
    );
  };

  // try each selector in order and return first useful concise result
  for (const selector of selectors) {
    const elems = $(selector);
    if (!elems || elems.length === 0) continue;

    // If it's a list of items (bullets), pick a few bullets only
    if (
      selector.includes('list') ||
      selector.includes('li') ||
      selector.includes('a-list-item')
    ) {
      const bullets: string[] = [];
      elems.each((_: any, el: any) => {
        if (bullets.length >= maxBullets) return;
        const txt = cleanText($(el).text() || $(el).text());
        if (txt && txt.length > 10) bullets.push(txt);
      });

      if (bullets.length > 0) {
        const joined = bullets.join(' | ');
        return truncate(joined, maxLength);
      }
      continue;
    }

    // otherwise, gather paragraph-like content but keep it short
    const parts = elems
      .map((_: any, el: any) => cleanText($(el).text()))
      .get()
      .filter((p: string) => p && p.length > 20);

    if (parts.length > 0) {
      const candidate = parts.slice(0, 3).join(' ');
      return truncate(candidate, maxLength);
    }
  }

  // fallback: meta description
  const meta = $('meta[name="description"]').attr('content');
  if (meta) return truncate(cleanText(meta), maxLength);

  return '';
}

export function getHighestPrice(priceList: PriceHistoryItem[]) {
  let highestPrice = priceList[0];

  for (let i = 0; i < priceList.length; i++) {
    if (priceList[i].price > highestPrice.price) {
      highestPrice = priceList[i];
    }
  }

  return highestPrice.price;
}

export function getLowestPrice(priceList: PriceHistoryItem[]) {
  let lowestPrice = priceList[0];

  for (let i = 0; i < priceList.length; i++) {
    if (priceList[i].price < lowestPrice.price) {
      lowestPrice = priceList[i];
    }
  }

  return lowestPrice.price;
}

export function getAveragePrice(priceList: PriceHistoryItem[]) {
  const sumOfPrices = priceList.reduce((acc, curr) => acc + curr.price, 0);
  const averagePrice = sumOfPrices / priceList.length || 0;

  return averagePrice;
}

export const getEmailNotifType = (
  scrapedProduct: Product,
  currentProduct: Product
) => {
  const lowestPrice = getLowestPrice(currentProduct.priceHistory);

  if (scrapedProduct.currentPrice < lowestPrice) {
    return Notification.LOWEST_PRICE as keyof typeof Notification;
  }
  if (!scrapedProduct.isOutOfStock && currentProduct.isOutOfStock) {
    return Notification.CHANGE_OF_STOCK as keyof typeof Notification;
  }
  if (scrapedProduct.discountRate >= THRESHOLD_PERCENTAGE) {
    return Notification.THRESHOLD_MET as keyof typeof Notification;
  }

  return null;
};

export const formatNumber = (num: number = 0) => {
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};
