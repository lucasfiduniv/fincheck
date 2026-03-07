import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common'
import { ActiveUserId } from 'src/shared/decorators/ActiveUserId'
import { CreditCardsService } from './services/credit-cards.service'
import { CreateCreditCardDto } from './dto/create-credit-card.dto'
import { UpdateCreditCardDto } from './dto/update-credit-card.dto'
import { CreateCreditCardPurchaseDto } from './dto/create-credit-card-purchase.dto'
import { PayCreditCardStatementDto } from './dto/pay-credit-card-statement.dto'
import { UpdateCreditCardPurchaseDto } from './dto/update-credit-card-purchase.dto'
import { ImportCreditCardStatementDto } from './dto/import-credit-card-statement.dto'
import { RecalibrateCreditCardStatementDto } from './dto/recalibrate-credit-card-statement.dto'

@Controller('credit-cards')
export class CreditCardsController {
  constructor(private readonly creditCardsService: CreditCardsService) {}

  @Post()
  create(
    @ActiveUserId() userId: string,
    @Body() createCreditCardDto: CreateCreditCardDto,
  ) {
    return this.creditCardsService.create(userId, createCreditCardDto)
  }

  @Get()
  findAll(@ActiveUserId() userId: string) {
    return this.creditCardsService.findAllByUserId(userId)
  }

  @Put(':creditCardId')
  update(
    @ActiveUserId() userId: string,
    @Param('creditCardId', ParseUUIDPipe) creditCardId: string,
    @Body() updateCreditCardDto: UpdateCreditCardDto,
  ) {
    return this.creditCardsService.update(userId, creditCardId, updateCreditCardDto)
  }

  @Delete(':creditCardId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @ActiveUserId() userId: string,
    @Param('creditCardId', ParseUUIDPipe) creditCardId: string,
  ) {
    return this.creditCardsService.remove(userId, creditCardId)
  }

  @Post(':creditCardId/purchases')
  createPurchase(
    @ActiveUserId() userId: string,
    @Param('creditCardId', ParseUUIDPipe) creditCardId: string,
    @Body() createCreditCardPurchaseDto: CreateCreditCardPurchaseDto,
  ) {
    return this.creditCardsService.createPurchase(
      userId,
      creditCardId,
      createCreditCardPurchaseDto,
    )
  }

  @Put(':creditCardId/purchases/:purchaseId')
  updatePurchase(
    @ActiveUserId() userId: string,
    @Param('creditCardId', ParseUUIDPipe) creditCardId: string,
    @Param('purchaseId', ParseUUIDPipe) purchaseId: string,
    @Body() updateCreditCardPurchaseDto: UpdateCreditCardPurchaseDto,
  ) {
    return this.creditCardsService.updatePurchase(
      userId,
      creditCardId,
      purchaseId,
      updateCreditCardPurchaseDto,
    )
  }

  @Get(':creditCardId/statements')
  findStatementByMonth(
    @ActiveUserId() userId: string,
    @Param('creditCardId', ParseUUIDPipe) creditCardId: string,
    @Query('month', ParseIntPipe) month: number,
    @Query('year', ParseIntPipe) year: number,
  ) {
    return this.creditCardsService.findStatementByMonth(userId, creditCardId, {
      month,
      year,
    })
  }

  @Post(':creditCardId/statements/import')
  importStatement(
    @ActiveUserId() userId: string,
    @Param('creditCardId', ParseUUIDPipe) creditCardId: string,
    @Body() importCreditCardStatementDto: ImportCreditCardStatementDto,
  ) {
    return this.creditCardsService.importStatement(
      userId,
      creditCardId,
      importCreditCardStatementDto,
    )
  }

  @Get(':creditCardId/statements/export')
  exportStatement(
    @ActiveUserId() userId: string,
    @Param('creditCardId', ParseUUIDPipe) creditCardId: string,
    @Query('month', ParseIntPipe) month: number,
    @Query('year', ParseIntPipe) year: number,
  ) {
    return this.creditCardsService.exportStatement(userId, creditCardId, {
      month,
      year,
    })
  }

  @Post(':creditCardId/statements/payments')
  payStatement(
    @ActiveUserId() userId: string,
    @Param('creditCardId', ParseUUIDPipe) creditCardId: string,
    @Body() payCreditCardStatementDto: PayCreditCardStatementDto,
  ) {
    return this.creditCardsService.payStatement(
      userId,
      creditCardId,
      payCreditCardStatementDto,
    )
  }

  @Post(':creditCardId/statements/recalibrate')
  recalibrateStatementSchedule(
    @ActiveUserId() userId: string,
    @Param('creditCardId', ParseUUIDPipe) creditCardId: string,
    @Body() recalibrateDto: RecalibrateCreditCardStatementDto,
  ) {
    return this.creditCardsService.recalibrateStatementSchedule(
      userId,
      creditCardId,
      recalibrateDto,
    )
  }

  @Post(':creditCardId/purchases/:purchaseId/cancel')
  cancelPurchase(
    @ActiveUserId() userId: string,
    @Param('creditCardId', ParseUUIDPipe) creditCardId: string,
    @Param('purchaseId', ParseUUIDPipe) purchaseId: string,
  ) {
    return this.creditCardsService.cancelPurchase(userId, creditCardId, purchaseId)
  }
}
