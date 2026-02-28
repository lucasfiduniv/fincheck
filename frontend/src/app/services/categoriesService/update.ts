import { Category } from '../../entities/Category'
import { httpClient } from '../httpClient'

export interface UpdateCategoryParams {
  id: string
  name: string
  icon: string
  type: Category['type']
}

export async function update({ id, ...params }: UpdateCategoryParams) {
  const { data } = await httpClient.put(`/categories/${id}`, params)

  return data
}
