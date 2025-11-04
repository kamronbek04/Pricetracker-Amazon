'use server';
import { revalidatePath } from 'next/cache';
import { scrapeAmazonProduct } from '../scraper';
import { connectToDB } from '../mongoose';
import Product from '../models/product.model';
import { User } from '@/types';
import { getHighestPrice, getLowestPrice, getAveragePrice } from '../utils';
import { generateEmailBody, sendEmail } from '../nodemailer';

export async function scrapeAndStoreProduct(productUrl: string) {
  if (!productUrl) {
    return;
  }

  try {
    connectToDB();
    const scrapedProduct = await scrapeAmazonProduct(productUrl);

    if (!scrapedProduct) {
      throw new Error('Scraping returned no product data');
    }

    let product = scrapedProduct;

    const existingProduct = await Product.findOne({ url: productUrl });
    if (existingProduct) {
      const updatedPriceHistory: any = [
        ...existingProduct.priceHistory,
        { price: scrapedProduct.currentPrice },
      ];
      console.log('Updated Price History:', updatedPriceHistory);
      product = {
        ...scrapedProduct,
        priceHistory: updatedPriceHistory,
        lowestPrice: getLowestPrice(updatedPriceHistory),
        highestPrice: getHighestPrice(updatedPriceHistory),
        averagePrice: getAveragePrice(updatedPriceHistory),
      };
    }
    const newProduct = await Product.findOneAndUpdate(
      { url: productUrl },
      product,
      { new: true, upsert: true }
    );
    revalidatePath(`/products/${newProduct?._id}`);
  } catch {
    throw new Error('Failed to scrape and store product');
  }
}

export async function getProductById(productId: string) {
  try {
    connectToDB();
    const product = await Product.findOne({ _id: productId });
    return product;
  } catch {
    throw new Error('Failed to retrieve product by ID');
  }
}

export async function getAllProducts() {
  try {
    connectToDB();
    const products = await Product.find();
    return products;
  } catch {
    throw new Error('Failed to retrieve all products');
  }
}

export async function getSimilarProducts(productId: string) {
  try {
    connectToDB();
    const product = await Product.findById(productId);
    if (!product) {
      throw new Error('Product not found');
    }
    const similarProducts = await Product.find({
      _id: { $ne: productId },
    }).limit(4);
    return similarProducts;
  } catch {
    throw new Error('Failed to retrieve similar products');
  }
}

export async function addUserEmailToProduct(productId: string, email: string) {
  try {
    const product = await Product.findById(productId);
    if (!product) {
      throw new Error('Product not found');
    }
    console.log('Current users:', product.users);
    const userExists = product.users.some((user: User) => user.email === email);
    if (!userExists) {
      product.users.push({ email });

      await product.save();

      const emailContent = await generateEmailBody(product, 'WELCOME');

      await sendEmail([email], emailContent);
    }
  } catch {
    throw new Error('Failed to add user email to product');
  }
}
