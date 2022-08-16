import mongodb from "mongodb";
import dotenv from "dotenv";
dotenv.config();

// Connection URL
const mongoClient = new mongodb.MongoClient(
  process.env.MONGO_URL || "mongodb://localhost:27017"
);

// Database Name
const dbName = process.env.MONGO_DB || "test";

export async function getShopifySessions() {
  // Use connect method to connect to the server
  await mongoClient.connect();
  console.log("Connected successfully to MongoDB server");
  const db = mongoClient.db(dbName);
  const collection = db.collection("shopify_sessions");

  //   const result = await collection.find({shop: process.env.SHOP}).toArray();

  return collection;
}

// connectMongoDB()
//   .then(console.log)
//   .catch(console.error)
//   .finally(() => mongoClient.close());
