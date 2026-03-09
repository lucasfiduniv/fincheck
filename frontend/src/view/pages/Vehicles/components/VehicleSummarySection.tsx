import { ChangeEvent, RefObject } from 'react'
import { VehicleDetails } from '../../../../app/entities/Vehicle'
import { formatCurrency } from '../../../../app/utils/formatCurrency'
import { InlineFeedbackState } from '../types'

interface VehicleSummarySectionProps {
  mobileOpenSection: 'SUMMARY' | 'ODOMETER' | 'METRICS' | 'TIMELINE'
  setMobileOpenSection: (updater: (state: 'SUMMARY' | 'ODOMETER' | 'METRICS' | 'TIMELINE') => 'SUMMARY' | 'ODOMETER' | 'METRICS' | 'TIMELINE') => void
  selectedVehicle: VehicleDetails
  photoInputRef: RefObject<HTMLInputElement>
  handleSelectVehiclePhoto: (event: ChangeEvent<HTMLInputElement>) => void
  inlineFeedback: InlineFeedbackState | null
  isLoadingVehicle: boolean
  latestFuelRecord: VehicleDetails['fuelRecords'][number] | null | undefined
  latestMaintenance: VehicleDetails['maintenances'][number] | null | undefined
  nextReplacementStatus: string
}

export function VehicleSummarySection({
  mobileOpenSection,
  setMobileOpenSection,
  selectedVehicle,
  photoInputRef,
  handleSelectVehiclePhoto,
  inlineFeedback,
  isLoadingVehicle,
  latestFuelRecord,
  latestMaintenance,
  nextReplacementStatus,
}: VehicleSummarySectionProps) {
  function formatDate(value: string) {
    return new Date(value).toLocaleDateString('pt-BR')
  }

  return (
    <>
      <button
        type="button"
        className="lg:hidden w-full flex items-center justify-between text-left"
        onClick={() => setMobileOpenSection((state) => (state === 'SUMMARY' ? 'ODOMETER' : 'SUMMARY'))}
      >
        <strong className="text-gray-900">Resumo</strong>
        <span className="text-xs text-gray-500">
          {mobileOpenSection === 'SUMMARY' ? 'Ocultar' : 'Mostrar'}
        </span>
      </button>

      <div className={`${mobileOpenSection === 'SUMMARY' ? 'block' : 'hidden'} lg:block space-y-4`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="group relative w-14 h-14 rounded-xl overflow-hidden border border-gray-200 bg-gray-100 shrink-0"
              title="Editar foto"
            >
              {selectedVehicle.photoUrl ? (
                <img src={selectedVehicle.photoUrl} alt={selectedVehicle.name} className="w-full h-full object-cover" />
              ) : (
                <span className="w-full h-full flex items-center justify-center text-lg">🚗</span>
              )}

              <span className="absolute inset-0 bg-black/45 text-white text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                Editar
              </span>
            </button>

            <div>
              <strong className="text-xl text-gray-900 block">{selectedVehicle.name}</strong>
              <p className="text-sm text-gray-600">
                {selectedVehicle.model || 'Modelo não informado'} {selectedVehicle.plate ? `• ${selectedVehicle.plate}` : ''}
              </p>
            </div>
          </div>

          <div className="w-full sm:w-auto" />
        </div>

        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleSelectVehiclePhoto}
        />

        {inlineFeedback && (
          <div className={`rounded-xl px-3 py-2 text-xs border ${
            inlineFeedback.status === 'saving'
              ? 'border-blue-200 bg-blue-50 text-blue-800'
              : inlineFeedback.status === 'synced'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : inlineFeedback.status === 'stale'
                  ? 'border-amber-200 bg-amber-50 text-amber-800'
                  : 'border-rose-200 bg-rose-50 text-rose-800'
          }`}>
            {inlineFeedback.status === 'saving' && 'Salvando • '}
            {inlineFeedback.status === 'synced' && 'Sincronizado • '}
            {inlineFeedback.status === 'stale' && 'Desatualizado • '}
            {inlineFeedback.status === 'error' && 'Erro • '}
            {inlineFeedback.message}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {isLoadingVehicle ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div key={`overview-skeleton-${index}`} className="rounded-xl bg-gray-50 p-3 animate-pulse space-y-2">
                <div className="h-3 w-24 rounded bg-gray-200" />
                <div className="h-4 w-28 rounded bg-gray-200" />
                <div className="h-3 w-36 rounded bg-gray-200" />
              </div>
            ))
          ) : (
            <>
              <div className="rounded-xl bg-gray-50 p-3">
                <span className="text-xs text-gray-600 block">Último abastecimento</span>
                <strong className="text-gray-900 block mt-1">
                  {latestFuelRecord ? formatDate(latestFuelRecord.transaction.date) : 'Sem registro'}
                </strong>
                {latestFuelRecord && (
                  <span className="text-xs text-gray-600 block mt-1">
                    {latestFuelRecord.liters.toFixed(2)} L • {formatCurrency(latestFuelRecord.totalCost)}
                  </span>
                )}
              </div>

              <div className="rounded-xl bg-gray-50 p-3">
                <span className="text-xs text-gray-600 block">Última manutenção</span>
                <strong className="text-gray-900 block mt-1">
                  {latestMaintenance ? formatDate(latestMaintenance.date) : 'Sem registro'}
                </strong>
                {latestMaintenance && (
                  <span className="text-xs text-gray-600 block mt-1 truncate">{latestMaintenance.title}</span>
                )}
              </div>

              <div className="rounded-xl bg-gray-50 p-3">
                <span className="text-xs text-gray-600 block">Status próxima troca</span>
                <strong className="text-gray-900 block mt-1">{nextReplacementStatus}</strong>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
