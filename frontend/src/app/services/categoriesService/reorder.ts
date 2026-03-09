import { Category } from '../../entities/Category'
import { httpClient } from '../httpClient'

export interface ReorderCategoriesParams {
  type: Category['type']
  orderedCategoryIds: string[]
}

export async function reorder(params: ReorderCategoriesParams) {
  const { data } = await httpClient.put('/categories/reorder', params)

  return data
}