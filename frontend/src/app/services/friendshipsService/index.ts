import { Friend, ReceivedFriendRequest } from '../../entities/Friendship'
import { httpClient } from '../httpClient'

export const friendshipsService = {
  async getFriends() {
    const { data } = await httpClient.get<Friend[]>('/friendships')

    return data
  },

  async getReceivedRequests() {
    const { data } = await httpClient.get<ReceivedFriendRequest[]>('/friendships/requests/received')

    return data
  },

  async sendRequest(email: string) {
    const { data } = await httpClient.post('/friendships/requests', { email })

    return data
  },

  async acceptRequest(friendshipId: string) {
    const { data } = await httpClient.patch(`/friendships/requests/${friendshipId}/accept`)

    return data
  },
}
