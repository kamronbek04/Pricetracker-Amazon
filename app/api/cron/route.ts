import { NextResponse } from 'next/server';

import {
  getLowestPrice,
  getHighestPrice,
  getAveragePrice,
  getEmailNotifType,
} from '@/lib/utils';
import { connectToDB } from '@/lib/mongoose';
import Product from '@/lib/models/product.model';
import { scrapeAmazonProduct } from '@/lib/scraper';
import { generateEmailBody, sendEmail } from '@/lib/nodemailer';

export const maxDuration = 300; // This function can run for a maximum of 300 seconds
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    await connectToDB();
    const products = await Product.find({}).populate('users');

    if (!products || products.length === 0)
      throw new Error('No product fetched');

    const updatedProducts = await Promise.all(
      products.map(async (currentProduct) => {
        try {
          const scrapedProduct = await scrapeAmazonProduct(currentProduct.url);

          if (!scrapedProduct) return null;

          // ensure priceHistory is an array
          const prevHistory = Array.isArray(currentProduct.priceHistory)
            ? currentProduct.priceHistory
            : [];

          const updatedPriceHistory = [
            ...prevHistory,
            { price: Number(scrapedProduct.currentPrice) || 0, at: new Date() },
          ];

          const productPayload = {
            ...scrapedProduct,
            priceHistory: updatedPriceHistory,
            lowestPrice: getLowestPrice(updatedPriceHistory),
            highestPrice: getHighestPrice(updatedPriceHistory),
            averagePrice: getAveragePrice(updatedPriceHistory),
          };

          const updatedProduct =
            (await Product.findOneAndUpdate(
              { url: productPayload.url },
              productPayload,
              {
                new: true,
              }
            )) || null;

          const productForNotif = {
            ...(currentProduct.toObject
              ? currentProduct.toObject()
              : currentProduct),
            priceHistory: updatedPriceHistory,
          };

          const emailNotifType = getEmailNotifType(
            scrapedProduct,
            productForNotif
          );

          // only send emails if we have a recipient list
          const users = Array.isArray(updatedProduct?.users)
            ? updatedProduct!.users
            : [];

          if (emailNotifType && users.length > 0) {
            const productInfo = {
              title: updatedProduct!.title,
              url: updatedProduct!.url,
            };

            const emailContent = await generateEmailBody(
              productInfo,
              emailNotifType as any
            );

            // send in parallel; catch individual failures so one bad email doesn't fail all
            await Promise.allSettled(
              users.map((user: any) =>
                sendEmail(user.email, emailContent).catch((err) => {
                  console.error('sendEmail failed for', user.email, err);
                })
              )
            );
          }

          return updatedProduct;
        } catch (err) {
          console.error('Failed to process product', currentProduct.url, err);
          return null;
        }
      })
    );

    return NextResponse.json({
      message: 'Ok',
      data: updatedProducts,
    });
  } catch (error: any) {
    throw new Error(`Failed to get all products: ${error.message}`);
  }
}
