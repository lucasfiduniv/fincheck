import { ChangeEvent } from 'react'
import { Button } from '../../../components/Button'
import { Select } from '../../../components/Select'
import { ImportStatementResponse, SupportedStatementBank } from '../../../../app/services/transactionsService/importStatement'
import { ImportCreditCardStatementResponse } from '../../../../app/services/creditCardsService/importStatement'
import { SettingsSection } from './SettingsSection'

interface ImportsSettingsPanelProps {
  statementBank: SupportedStatementBank
  setStatementBank: (value: SupportedStatementBank) => void
  statementBankAccountId: string
  setStatementBankAccountId: (value: string) => void
  accounts: Array<{ id: string; name: string }>
  handleStatementFileChange: (event: ChangeEvent<HTMLInputElement>) => Promise<void>
  statementFileName: string
  handleImportStatement: () => Promise<void>
  isImportingStatement: boolean
  statementCsvContent: string
  statementImportStatus: string
  statementImportProgress: number
  statementImportTimingLabel: string
  importResult: ImportStatementResponse | null
  creditCardStatementCardId: string
  setCreditCardStatementCardId: (value: string) => void
  creditCards: Array<{ id: string; name: string }>
  handleCreditCardStatementFileChange: (event: ChangeEvent<HTMLInputElement>) => Promise<void>
  creditCardStatementFileName: string
  handleImportCreditCardStatement: () => Promise<void>
  isImportingCreditCardStatement: boolean
  creditCardStatementContent: string
  creditCardImportStatus: string
  creditCardImportProgress: number
  creditCardImportTimingLabel: string
  creditCardImportResult: ImportCreditCardStatementResponse | null
}

export function ImportsSettingsPanel({
  statementBank,
  setStatementBank,
  statementBankAccountId,
  setStatementBankAccountId,
  accounts,
  handleStatementFileChange,
  statementFileName,
  handleImportStatement,
  isImportingStatement,
  statementCsvContent,
  statementImportStatus,
  statementImportProgress,
  statementImportTimingLabel,
  importResult,
  creditCardStatementCardId,
  setCreditCardStatementCardId,
  creditCards,
  handleCreditCardStatementFileChange,
  creditCardStatementFileName,
  handleImportCreditCardStatement,
  isImportingCreditCardStatement,
  creditCardStatementContent,
  creditCardImportStatus,
  creditCardImportProgress,
  creditCardImportTimingLabel,
  creditCardImportResult,
}: ImportsSettingsPanelProps) {
  return (
    <div className="space-y-4">
      <SettingsSection
        title="Importar extrato do banco"
        description="Importe CSV/OFX do Nubank, OFX do Banco do Brasil ou PDF do Sicoob e crie lancamentos automaticamente com classificacao inteligente."
      >
        <div className="rounded-xl border border-teal-100 bg-teal-50 p-4 space-y-2">
          <strong className="text-sm text-teal-900 block">O que acontece ao importar</strong>
          <ul className="text-sm text-teal-900 space-y-1 list-disc pl-5">
            <li>le o arquivo CSV/OFX/PDF e transforma em lancamentos validos</li>
            <li>remove duplicados ja importados para evitar repeticao</li>
            <li>identifica transferencias (incluindo Pix entre suas contas)</li>
            <li>detecta pagamentos de fatura de cartao</li>
            <li>usa IA + suas categorias para melhorar descricao e categoria</li>
          </ul>
          <p className="text-xs text-teal-800">
            Se a IA nao tiver confianca suficiente, o sistema usa fallback seguro e mantem o lancamento com categoria padrao.
          </p>
        </div>

        <div className="space-y-3">
          <Select
            placeholder="Banco"
            value={statementBank}
            onChange={(value) => setStatementBank(value as SupportedStatementBank)}
            options={[
              { value: 'NUBANK', label: 'Nubank (CSV/OFX)' },
              { value: 'BANCO_DO_BRASIL', label: 'Banco do Brasil (OFX)' },
              { value: 'SICOOB', label: 'Sicoob (PDF)' },
            ]}
          />

          <Select
            placeholder="Conta de destino"
            value={statementBankAccountId}
            onChange={setStatementBankAccountId}
            options={accounts.map((account) => ({
              value: account.id,
              label: account.name,
            }))}
          />

          <label className="flex flex-col gap-2">
            <span className="text-sm text-gray-700">Arquivo (.csv, .ofx ou .pdf)</span>
            <input
              type="file"
              accept=".csv,.ofx,.pdf,text/csv,application/x-ofx,application/pdf"
              onChange={(event) => {
                void handleStatementFileChange(event)
              }}
              className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-gray-800 hover:file:bg-gray-200"
            />
          </label>

          {statementFileName && (
            <p className="text-xs text-gray-600">Arquivo selecionado: {statementFileName}</p>
          )}

          <Button
            type="button"
            onClick={() => {
              void handleImportStatement()
            }}
            isLoading={isImportingStatement}
            disabled={!statementBankAccountId || !statementCsvContent}
            className="w-full lg:w-auto"
          >
            Importar extrato
          </Button>

          {(isImportingStatement || statementImportStatus) && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-700">
                <span>{statementImportStatus || 'Importando extrato...'}</span>
                <strong>{statementImportProgress}%</strong>
              </div>
              {!!statementImportTimingLabel && (
                <div className="text-[11px] text-gray-500">{statementImportTimingLabel}</div>
              )}
              <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-teal-800 transition-all"
                  style={{ width: `${statementImportProgress}%` }}
                />
              </div>
            </div>
          )}

          {importResult && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
              <p>Total de linhas: <strong>{importResult.totalRows}</strong></p>
              <p>Linhas unicas: <strong>{importResult.uniqueRows}</strong></p>
              <p>Importadas: <strong>{importResult.importedCount}</strong></p>
              <p>Ignoradas (duplicadas): <strong>{importResult.skippedCount}</strong></p>
              <p>Falharam: <strong>{importResult.failedCount}</strong></p>
              {typeof importResult.aiEnhancedCount === 'number' && (
                <p>Enriquecidas por IA: <strong>{importResult.aiEnhancedCount}</strong></p>
              )}
              {typeof importResult.transferDetectedCount === 'number' && (
                <p>Transferencias detectadas: <strong>{importResult.transferDetectedCount}</strong></p>
              )}
              {typeof importResult.cardBillPaymentDetectedCount === 'number' && (
                <p>Pagamentos de fatura detectados: <strong>{importResult.cardBillPaymentDetectedCount}</strong></p>
              )}
            </div>
          )}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Importar fatura de cartao"
        description="Importe CSV ou OFX do Nubank para criar compras no cartao selecionado."
      >
        <div className="space-y-3">
          <Select
            placeholder="Cartao"
            value={creditCardStatementCardId}
            onChange={setCreditCardStatementCardId}
            options={creditCards.map((card) => ({
              value: card.id,
              label: card.name,
            }))}
          />

          <label className="flex flex-col gap-2">
            <span className="text-sm text-gray-700">Arquivo da fatura (.csv ou .ofx)</span>
            <input
              type="file"
              accept=".csv,.ofx,text/csv,application/x-ofx"
              onChange={(event) => {
                void handleCreditCardStatementFileChange(event)
              }}
              className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-gray-800 hover:file:bg-gray-200"
            />
          </label>

          {creditCardStatementFileName && (
            <p className="text-xs text-gray-600">Arquivo selecionado: {creditCardStatementFileName}</p>
          )}

          <Button
            type="button"
            onClick={() => {
              void handleImportCreditCardStatement()
            }}
            isLoading={isImportingCreditCardStatement}
            disabled={!creditCardStatementCardId || !creditCardStatementContent}
            className="w-full lg:w-auto"
          >
            Importar fatura do cartao
          </Button>

          {(isImportingCreditCardStatement || creditCardImportStatus) && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-700">
                <span>{creditCardImportStatus || 'Importando fatura...'}</span>
                <strong>{creditCardImportProgress}%</strong>
              </div>
              {!!creditCardImportTimingLabel && (
                <div className="text-[11px] text-gray-500">{creditCardImportTimingLabel}</div>
              )}
              <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-teal-800 transition-all"
                  style={{ width: `${creditCardImportProgress}%` }}
                />
              </div>
            </div>
          )}

          {creditCardImportResult && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
              <p>Total de linhas: <strong>{creditCardImportResult.totalRows}</strong></p>
              <p>Linhas unicas: <strong>{creditCardImportResult.uniqueRows}</strong></p>
              <p>Importadas: <strong>{creditCardImportResult.importedCount}</strong></p>
              {typeof creditCardImportResult.importedPaymentsCount === 'number' && (
                <p>Pagamentos aplicados: <strong>{creditCardImportResult.importedPaymentsCount}</strong></p>
              )}
              <p>Ignoradas (duplicadas): <strong>{creditCardImportResult.skippedCount}</strong></p>
              <p>Falharam: <strong>{creditCardImportResult.failedCount}</strong></p>
            </div>
          )}
        </div>
      </SettingsSection>
    </div>
  )
}
