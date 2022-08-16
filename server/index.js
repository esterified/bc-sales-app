// @ts-check
import { resolve } from "path";
import express from "express";
import cookieParser from "cookie-parser";
import { Shopify, LATEST_API_VERSION } from "@shopify/shopify-api";
import "dotenv/config";
// import {Checkout} from '@shopify/shopify-api/dist/rest-resources/2022-07/index.js';
import axios from 'axios';
import { getShopifySessions } from "./helpers/get-shopify-access-token-manual.js";
import * as StorefrontApi from "./api/storefront.js";


import applyAuthMiddleware from "./middleware/auth.js";
import verifyRequest from "./middleware/verify-request.js";

const USE_ONLINE_TOKENS = false;
const TOP_LEVEL_OAUTH_COOKIE = "shopify_top_level_oauth";
const SHOPIFY_SHOP = process.env.SHOP;

const PORT = parseInt(process.env.PORT || "8081", 10);
const isTest = process.env.NODE_ENV === "test" || !!process.env.VITE_TEST_BUILD;

Shopify.Context.initialize({
  API_KEY: process.env.SHOPIFY_API_KEY,
  API_SECRET_KEY: process.env.SHOPIFY_API_SECRET,
  SCOPES: process.env.SCOPES.split(","),
  HOST_NAME: process.env.HOST.replace(/https:\/\//, ""),
  API_VERSION: LATEST_API_VERSION,
  IS_EMBEDDED_APP: true,
  // This should be replaced with your preferred storage strategy

  // SESSION_STORAGE: new Shopify.Session.MemorySessionStorage(),
  SESSION_STORAGE: new Shopify.Session.MongoDBSessionStorage(process.env.MONGO_URL,process.env.MONGO_DB),
});

// Storing the currently active shops in memory will force them to re-login when your server restarts. You should
// persist this object in your app.
const ACTIVE_SHOPIFY_SHOPS = {};
Shopify.Webhooks.Registry.addHandler("APP_UNINSTALLED", {
  path: "/webhooks",
  webhookHandler: async (topic, shop, body) => {
    delete ACTIVE_SHOPIFY_SHOPS[shop];
  },
});

// export for test use only
export async function createServer(
  root = process.cwd(),
  isProd = process.env.NODE_ENV === "production"
) {
  const app = express();
  console.log("ACTIVE_SHOPIFY_SHOPS",ACTIVE_SHOPIFY_SHOPS)
  app.set("top-level-oauth-cookie", TOP_LEVEL_OAUTH_COOKIE);
  app.set("active-shopify-shops", ACTIVE_SHOPIFY_SHOPS);
  app.set("use-online-tokens", USE_ONLINE_TOKENS);
  app.set("shopify-shop", process.env.SHOP);
  app.set("storefront-api-token", process.env.SHOPIFY_STOREFRONT_TOKEN);

  app.use(cookieParser(Shopify.Context.API_SECRET_KEY));

  applyAuthMiddleware(app);

  app.post("/webhooks", async (req, res) => {
    try {
      await Shopify.Webhooks.Registry.process(req, res);
      console.log(`Webhook processed, returned status code 200`);
    } catch (error) {
      console.log(`Failed to process webhook: ${error}`);
      if (!res.headersSent) {
        res.status(500).send(error.message);
      }
    }
  });


  app.get("/products-count", verifyRequest(app), async (req, res) => {
    const session = await Shopify.Utils.loadCurrentSession(
      req,
      res,
      app.get("use-online-tokens")
    );
    const { Product } = await import(
      `@shopify/shopify-api/dist/rest-resources/${Shopify.Context.API_VERSION}/index.js`
    );
    console.log("access token==>>", session.accessToken );
    const countData = await Product.count({ session });
    res.status(200).send(countData);
  });

  app.post("/graphql", verifyRequest(app), async (req, res) => {
    try {
      const response = await Shopify.Utils.graphqlProxy(req, res);
      res.status(200).send(response.body);
    } catch (error) {
      res.status(500).send(error.message);
    }
  });

  //my routes
  app.get("/test", async (req, res, next) => {

    //graphql axios request
    console.log('SHOP',app.get('shopify-shop'))
    const session = await Shopify.Utils.loadOfflineSession(app.get('shopify-shop'),true); 
    const accessToken=session?.accessToken;
    const shop=session?.shop;
    if(!shop) return res.status(403).json('Shop not found');
    if(!accessToken) return res.status(403).json('Access token not found');
    let fetchedData;
    try{
      // "gid://shopify/Checkout/3f827cfc493a136d3a88bc251a50e9a3?key=cfc58e6cece1885a04ec92d6adaefbf3"
      fetchedData = await StorefrontApi.getCheckout(shop,app.get('storefront-api-token'),{
         checkoutId: "d3a88bc251a50e9a3?key=cfc58e6cece1885a04ec92d6adaefbf3"
      })
    }catch(err){
      console.log("Error",err);
    }
    return res.json({fetchedData});
    res.status(200).send(countData);


  });
  app.get("/payment", async (req, res, next) => {
    // const sessionsManualToken = await getShopifySessions()
    //   .then( (a) => {
    //     return  a.find({shop: process.env.SHOP}).toArray();
    //   })
    //   .catch((err) => console.error(err, "DB connecttion error"));
    // console.log("sessionsManualToken==>>", sessionsManualToken[0].accessToken);
    const session = await Shopify.Utils.loadOfflineSession(app.get('shopify-shop')); 
    const accessToken=session?.accessToken;
    const shop=session?.shop;
    const { checkoutId } = req.query;
    if(!checkoutId) return res.status(403).json('Checkout ID not found');
    // console.log("accessToken",session);
    if(!shop) return res.status(403).json('Shop not found');
    if(!accessToken) return res.status(403).json('Access token not found');
    
    
     let checkoutData;
     try {
      //checkout 6c7d4c9bc474331f7bf2bd4f0954f03f
      // https://deposit.us.shopifycs.com/sessions
      let response = await axios({
        url: `https://${shop}/admin/api/2022-07/checkouts/${checkoutId}.json`,
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
          // "Retry-After": "1" 
         },
      })
      checkoutData = response?.data;
     } catch (error) {
        console.log(error,"Fetch error");
        return res.json(error);
     }
     const paynmentUrl=checkoutData?.checkout?.payment_url;
     console.log("checkout paynmentUrl-->>",paynmentUrl);
     
     let vaultResponse;
     try {
      let response = await axios({
        url: paynmentUrl,
        method: "POST",
        headers: {
         "X-Shopify-Access-Token": accessToken,
         "Content-Type": "application/json" 
        },
        data: {
         "credit_card": {
           "number": "1",
           "first_name": "John",
           "last_name": "Smith",
           "month": "5",
           "year": "15",
           "verification_value": "123"
         }
       },
      });
      vaultResponse = response?.data;
     } catch (error) {
      console.log("payment vault error",error);

     }
     console.log("vaultID-->>",vaultResponse);
    return res.json({vaultResponse,checkoutData});
  });


  app.use(express.json());

  app.use((req, res, next) => {
    const shop = req.query.shop;
    if (Shopify.Context.IS_EMBEDDED_APP && shop) {
      res.setHeader(
        "Content-Security-Policy",
        `frame-ancestors https://${shop} https://admin.shopify.com;`
      );
    } else {
      res.setHeader("Content-Security-Policy", `frame-ancestors 'none';`);
    }
    next();
  });



  app.use("/*", (req, res, next) => {
    const { shop } = req.query;
    
    // Detect whether we need to reinstall the app, any request from Shopify will
    // include a shop in the query parameters.
    const redirectURL=`/auth?${new URLSearchParams(req.query).toString()}`;
    if (app.get("active-shopify-shops")[shop] === undefined && shop) {
      if(shop!==app.get('shopify-shop')){
        return res.status(403).json('Shop not found');
      }
      console.log('------active-shopify-shops-------->>'+redirectURL);
      return res.redirect(redirectURL);
    } else {
      console.log('---------',redirectURL);
      return next();
    }
  });

  /**
   * @type {import('vite').ViteDevServer}
   */
  let vite;
  if (!isProd) {
    vite = await import("vite").then(({ createServer }) =>
      createServer({
        root,
        logLevel: isTest ? "error" : "info",
        server: {
          port: PORT,
          hmr: {
            protocol: "ws",
            host: "localhost",
            port: 64999,
            clientPort: 64999,
          },
          middlewareMode: "html",
        },
      })
    );
    app.use(vite.middlewares);
  } else {
    const compression = await import("compression").then(
      ({ default: fn }) => fn
    );
    const serveStatic = await import("serve-static").then(
      ({ default: fn }) => fn
    );
    const fs = await import("fs");
    app.use(compression());
    app.use(serveStatic(resolve("dist/client")));
    app.use("/*", (req, res, next) => {
      // Client-side routing will pick up on the correct route to render, so we always render the index here
      res
        .status(200)
        .set("Content-Type", "text/html")
        .send(fs.readFileSync(`${process.cwd()}/dist/client/index.html`));
    });
  }

  return { app, vite };
}

if (!isTest) {
  createServer().then(({ app }) => {
    app.listen(PORT);
    console.log(`App listening on port ${process.env.PORT}! http://localhost:${PORT}/auth?shop=${process.env.SHOP}`);

  });
}
