import axios from "axios";
const storeFrontHeader=(token)=>{
    return {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': token
      }
}
const storefrontUrl=(shop)=>{
    return `https://${shop}/api/2021-07/graphql.json`
}
export const getProducts = async(shop,token)=>{
    return await axios({
        method: 'POST',
        url: storefrontUrl(shop),
        headers: storeFrontHeader(token),
        data: {
          query: `{
            products(first:5) {
              edges {
                node {
                  id
                }
              }
            }
          }`
        }
      }).then(re=>re.data);
}
export const getCheckout = async(shop,token,variables)=>{
    return await axios({
        method: 'POST',
        url: storefrontUrl(shop),
        headers: storeFrontHeader(token),
        data: {
          query: `query checkshippingrate($checkoutId: ID!) {
            node(id: $checkoutId) {
              ... on Checkout {
                id
                webUrl
                availableShippingRates {
                  ready
                  shippingRates {
                    handle
                    priceV2 {
                      amount
                    }
                    title
                  }
                }
              }
            }
          }`,
          variables: variables,
        }
      }).then(re=>re.data);
}
export const createCheckout = async(shop,token,variables)=>{
    return await axios({
        method: 'POST',
        url: storefrontUrl(shop),
        headers: storeFrontHeader(token),
        data: {
          query: `mutation test($CheckoutCreateInput: CheckoutCreateInput!) {
            checkoutCreate(input: $CheckoutCreateInput) {
              checkout {
                 id
                 webUrl
                 totalPriceV2{
                    amount
                    currencyCode
                 }
                 lineItems(first: 5) {
                   edges {
                     node {
                       title
                       quantity
                     }
                   }
                 }
              }
            }
          }`,
          variables: variables,
        }
      }).then(re=>re.data);
}
export const completeCheckoutWithCreditCard = async(shop,token,variables)=>{
    return await axios({
        method: 'POST',
        url: storefrontUrl(shop),
        headers: storeFrontHeader(token),
        data: {
          query: `mutation checkoutCompleteWithCreditCardV2($checkoutId: ID!, $payment: CreditCardPaymentInputV2!) {
            checkoutCompleteWithCreditCardV2(checkoutId: $checkoutId, payment: $payment) {
              checkout {
                id
              }
              checkoutUserErrors {
                code
                field
                message
              }
              payment {
                id
              }
            }
          }
        `,
        variables: variables
        }
      }).then(re=>re.data);
}