import axios from "axios";
export const createCheckout=async(shop,token,data)=>{
    return axios({
        url: `https://${shop}/admin/api/2022-07/checkouts.json`,
        method: "POST",
        data: data,
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": token,
          // "Retry-After": "1" 
         },
      }).then(re=>re.data)
      .catch(err=>err);

}