import Product from '@/lib/models/product.model';
import { connectToDB } from '@/lib/mongoose';
import { scrapeAmazonProduct } from '@/lib/scraper';
import {
  getHighestPrice,
  getLowestPrice,
  getAveragePrice,
  getEmailNotifType,
} from '@/lib/utils';
import { generateEmailBody, sendEmail } from '@/lib/nodemailer';

export async function GET() {
  try {
    await connectToDB();
    const products = await Product.find({}).populate('users');

    const updateProducts = products.map(async (product) => {
      const scrapedProduct = await scrapeAmazonProduct(product.url);
      if (scrapedProduct) {
        const updatedPriceHistory: any = [
          ...product.priceHistory,
          { price: scrapedProduct.currentPrice },
        ];
        const lowestPrice = getLowestPrice(updatedPriceHistory);
        const highestPrice = getHighestPrice(updatedPriceHistory);
        const averagePrice = getAveragePrice(updatedPriceHistory);
        await Product.updateOne(
          { _id: product._id },
          {
            currentPrice: scrapedProduct.currentPrice,
            priceHistory: updatedPriceHistory,
            lowestPrice,
            highestPrice,
            averagePrice,
          }
        );

        // Check each product's status and send notifications if needed
        const emailNotifType = getEmailNotifType(scrapedProduct, product);

        if (emailNotifType && product.users.length > 0) {
          const productInfo = {
            title: scrapedProduct.title,
            url: scrapedProduct.url,
          };
          const emailContent = await generateEmailBody(
            productInfo,
            emailNotifType
          );
          for (const user of product.users) {
            await sendEmail(user.email, emailContent);
          }
        }
      }
      return product;
    });
    await Promise.all(updateProducts);
    return new Response('Products updated and notifications sent', {
      status: 200,
    });
  } catch (error) {
    return new Response('Failed to retrieve products', { status: 500 });
  }
}
