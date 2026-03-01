import { httpClient } from '../httpClient'

export interface CancelCreditCardPurchaseParams {
  creditCardId: string
  purchaseId: string
}

export async function cancelPurchase({
  creditCardId,
  purchaseId,
}: CancelCreditCardPurchaseParams) {
  const { data } = await httpClient.post(
    `/credit-cards/${creditCardId}/purchases/${purchaseId}/cancel`,
  )

  return data
}