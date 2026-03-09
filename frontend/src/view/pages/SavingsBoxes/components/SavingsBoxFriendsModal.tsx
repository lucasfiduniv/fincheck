import { Dispatch, FormEvent, SetStateAction } from 'react'
import { Button } from '../../../components/Button'
import { Input } from '../../../components/Input'
import { Modal } from '../../../components/Modal'
import { Select } from '../../../components/Select'

interface FriendItem {
  friendshipId: string
  userId: string
  name: string
  email: string
}

interface ReceivedRequestItem {
  id: string
  requester: {
    name: string
    email: string
  }
}

interface SavingsBoxOwnerInfo {
  isOwner?: boolean
}

interface SavingsBoxFriendsModalProps {
  open: boolean
  onClose: () => void
  friendEmail: string
  setFriendEmail: Dispatch<SetStateAction<string>>
  isSendingFriendRequest: boolean
  onSendFriendRequest: () => void
  receivedRequests: ReceivedRequestItem[]
  isAcceptingFriendRequest: boolean
  onAcceptRequest: (requestId: string) => void
  friends: FriendItem[]
  selectedBox: SavingsBoxOwnerInfo | null
  selectedFriendUserId: string
  setSelectedFriendUserId: Dispatch<SetStateAction<string>>
  isSharingWithFriend: boolean
  onShareWithFriend: () => void
}

export function SavingsBoxFriendsModal({
  open,
  onClose,
  friendEmail,
  setFriendEmail,
  isSendingFriendRequest,
  onSendFriendRequest,
  receivedRequests,
  isAcceptingFriendRequest,
  onAcceptRequest,
  friends,
  selectedBox,
  selectedFriendUserId,
  setSelectedFriendUserId,
  isSharingWithFriend,
  onShareWithFriend,
}: SavingsBoxFriendsModalProps) {
  const handleShareSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onShareWithFriend()
  }

  return (
    <Modal title="Compartilhar e Amigos" open={open} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <span className="text-gray-600 tracking-[-0.5px] text-xs">Convidar amigo por e-mail</span>
          <div className="mt-1 flex flex-col sm:flex-row gap-2">
            <Input
              name="friendEmail"
              type="email"
              placeholder="E-mail do amigo"
              value={friendEmail}
              onChange={(e) => setFriendEmail(e.target.value)}
            />
            <Button
              type="button"
              className="h-[52px] px-4 rounded-lg w-full sm:w-auto"
              isLoading={isSendingFriendRequest}
              onClick={onSendFriendRequest}
            >
              Enviar
            </Button>
          </div>
        </div>

        {receivedRequests.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs text-gray-600 uppercase tracking-[0.08em]">Pedidos recebidos</span>

            {receivedRequests.map((request) => (
              <div key={request.id} className="rounded-xl border border-gray-200 p-3 flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm text-gray-800 font-medium">{request.requester.name}</p>
                  <p className="text-xs text-gray-500">{request.requester.email}</p>
                </div>
                <Button
                  type="button"
                  className="h-9 px-3 rounded-lg text-xs"
                  isLoading={isAcceptingFriendRequest}
                  onClick={() => onAcceptRequest(request.id)}
                >
                  Aceitar
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2">
          <span className="text-xs text-gray-600 uppercase tracking-[0.08em]">Meus amigos</span>

          {friends.length === 0 && (
            <p className="text-sm text-gray-500">Você ainda não tem amigos adicionados.</p>
          )}

          {friends.map((friend) => (
            <div key={friend.friendshipId} className="rounded-xl bg-gray-50 border border-gray-200 p-3">
              <p className="text-sm text-gray-800 font-medium">{friend.name}</p>
              <p className="text-xs text-gray-500">{friend.email}</p>
            </div>
          ))}
        </div>

        {selectedBox?.isOwner && (
          <form className="pt-2 border-t border-gray-100 space-y-3" onSubmit={handleShareSubmit}>
            <span className="text-gray-600 tracking-[-0.5px] text-xs block">Compartilhar caixinha atual</span>
            <Select
              placeholder="Escolha um amigo"
              value={selectedFriendUserId}
              onChange={setSelectedFriendUserId}
              options={friends.map((friend) => ({
                value: friend.userId,
                label: `${friend.name} (${friend.email})`,
              }))}
            />

            <Button type="submit" className="w-full" isLoading={isSharingWithFriend}>
              Compartilhar caixinha
            </Button>
          </form>
        )}
      </div>
    </Modal>
  )
}
