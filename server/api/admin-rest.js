import axios from "axios";
export const createCheckout=async(shop,token,data)=>{
    return axios({
        url: `https://${shop}/admin/api/2022-07/checkouts.json`,
        method: "POST",
        data: data,
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": token,
         },
      }).then(re=>re.data?.checkout)
      .catch(err=>err);

}
export const completeCheckout=async(shop,token,checkoutid)=>{
    return axios({
        url: `https://${shop}/admin/api/2022-07/checkouts/${checkoutid}.json`,
        method: "POST",
        data: {},
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": token,
         },
      }).then(re=>re.data?.checkout)
      .catch(err=>err);

}
export const createVaultSession=async(token,paymentUrl,data)=>{
    return axios({
        url: paymentUrl,
        method: "POST",
        headers: {
         "X-Shopify-Access-Token": token,
         "Content-Type": "application/json" 
        },
        data: data,
      })
      .then(re=>re.data)
      .catch(err=>err);

}
export const getCheckout=async(shop,token,checkoutid)=>{
    return axios({
        url: `https://${shop}/admin/api/2022-07/checkouts/${checkoutid}.json`,
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": token,
          // "Retry-After": "1"
        },
      })
      .then(re=>re.data)
      .catch(err=>err);

}

