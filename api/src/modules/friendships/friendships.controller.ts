import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common'
import { ActiveUserId } from 'src/shared/decorators/ActiveUserId'
import { FriendshipsService } from './friendships.service'
import { CreateFriendRequestDto } from './dto/create-friend-request.dto'

@Controller('friendships')
export class FriendshipsController {
  constructor(private readonly friendshipsService: FriendshipsService) {}

  @Post('requests')
  createRequest(
    @ActiveUserId() userId: string,
    @Body() createFriendRequestDto: CreateFriendRequestDto,
  ) {
    return this.friendshipsService.sendRequest(userId, createFriendRequestDto.email)
  }

  @Patch('requests/:friendshipId/accept')
  acceptRequest(
    @ActiveUserId() userId: string,
    @Param('friendshipId', ParseUUIDPipe) friendshipId: string,
  ) {
    return this.friendshipsService.acceptRequest(userId, friendshipId)
  }

  @Get()
  listFriends(@ActiveUserId() userId: string) {
    return this.friendshipsService.getFriends(userId)
  }

  @Get('requests/received')
  listReceivedRequests(@ActiveUserId() userId: string) {
    return this.friendshipsService.getReceivedRequests(userId)
  }
}
