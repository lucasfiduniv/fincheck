export interface Friend {
  friendshipId: string
  userId: string
  name: string
  email: string
  since: string
}

export interface ReceivedFriendRequest {
  id: string
  requesterId: string
  createdAt: string
  requester: {
    id: string
    name: string
    email: string
  }
}
