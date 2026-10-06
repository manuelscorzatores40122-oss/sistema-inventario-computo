import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: 'h0bmf2zw',
  api_key: '722752548531131',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'Amlc-4Y4j7hL6PbXpFRr0JSqKJA'
});

export default cloudinary;
