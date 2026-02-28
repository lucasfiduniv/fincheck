import { Category } from '../../entities/Category'
import { httpClient } from '../httpClient'

export interface CreateCategoryParams {
  name: string
  icon: string
  type: Category['type']
}

export async function create(params: CreateCategoryParams) {
  const { data } = await httpClient.post('/categories', params)

  return data
}
