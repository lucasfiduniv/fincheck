import { Module } from '@nestjs/common'
import { GeminiClientService } from './services/gemini-client.service'
import { TransactionImportAiEnrichmentService } from './services/transaction-import-ai-enrichment.service'

@Module({
  providers: [GeminiClientService, TransactionImportAiEnrichmentService],
  exports: [GeminiClientService, TransactionImportAiEnrichmentService],
})
export class AiModule {}
