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
import { CategoryBudgetsService } from './services/category-budgets.service'
import { ActiveUserId } from 'src/shared/decorators/ActiveUserId'
import { CreateCategoryBudgetDto } from './dto/create-category-budget.dto'
import { UpdateCategoryBudgetDto } from './dto/update-category-budget.dto'

@Controller('category-budgets')
export class CategoryBudgetsController {
  constructor(private readonly categoryBudgetsService: CategoryBudgetsService) {}

  @Post()
  create(
    @ActiveUserId() userId: string,
    @Body() createCategoryBudgetDto: CreateCategoryBudgetDto,
  ) {
    return this.categoryBudgetsService.create(userId, createCategoryBudgetDto)
  }

  @Get('summary')
  findSummary(
    @ActiveUserId() userId: string,
    @Query('month', ParseIntPipe) month: number,
    @Query('year', ParseIntPipe) year: number,
  ) {
    return this.categoryBudgetsService.findSummaryByMonth(userId, { month, year })
  }

  @Put(':categoryBudgetId')
  update(
    @ActiveUserId() userId: string,
    @Param('categoryBudgetId', ParseUUIDPipe) categoryBudgetId: string,
    @Body() updateCategoryBudgetDto: UpdateCategoryBudgetDto,
  ) {
    return this.categoryBudgetsService.update(
      userId,
      categoryBudgetId,
      updateCategoryBudgetDto,
    )
  }

  @Delete(':categoryBudgetId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @ActiveUserId() userId: string,
    @Param('categoryBudgetId', ParseUUIDPipe) categoryBudgetId: string,
  ) {
    return this.categoryBudgetsService.remove(userId, categoryBudgetId)
  }
}
