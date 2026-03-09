import { VehicleDetails } from '../../../../app/entities/Vehicle'
import { formatCurrency } from '../../../../app/utils/formatCurrency'

interface VehicleMetricsSectionProps {
  mobileOpenSection: 'SUMMARY' | 'ODOMETER' | 'METRICS' | 'TIMELINE'
  setMobileOpenSection: (updater: (state: 'SUMMARY' | 'ODOMETER' | 'METRICS' | 'TIMELINE') => 'SUMMARY' | 'ODOMETER' | 'METRICS' | 'TIMELINE') => void
  isLoadingVehicle: boolean
  selectedVehicle: VehicleDetails
  selectedVehicleMonthlySpent: number
}

export function VehicleMetricsSection({
  mobileOpenSection,
  setMobileOpenSection,
  isLoadingVehicle,
  selectedVehicle,
  selectedVehicleMonthlySpent,
}: VehicleMetricsSectionProps) {
  return (
    <>
      <button
        type="button"
        className="lg:hidden w-full flex items-center justify-between text-left"
        onClick={() => setMobileOpenSection((state) => (state === 'METRICS' ? 'TIMELINE' : 'METRICS'))}
      >
        <strong className="text-gray-900">Métricas</strong>
        <span className="text-xs text-gray-500">
          {mobileOpenSection === 'METRICS' ? 'Ocultar' : 'Mostrar'}
        </span>
      </button>

      <div className={`${mobileOpenSection === 'METRICS' ? 'block' : 'hidden'} lg:block space-y-2`}>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {isLoadingVehicle ? (
            Array.from({ length: 5 }).map((_, index) => (
              <div key={`metrics-skeleton-${index}`} className="rounded-xl bg-gray-50 p-3 animate-pulse space-y-2">
                <div className="h-3 w-16 rounded bg-gray-200" />
                <div className="h-4 w-20 rounded bg-gray-200" />
              </div>
            ))
          ) : (
            <>
              <div className="rounded-xl bg-gray-50 p-3" title="Média de quilômetros por litro dos abastecimentos registrados.">
                <span className="text-[11px] text-gray-500 block">Consumo médio</span>
                <strong className="text-gray-900 text-lg leading-none mt-1 block">
                  {selectedVehicle.fuelStats?.averageConsumptionKmPerLiter
                    ? `${selectedVehicle.fuelStats.averageConsumptionKmPerLiter.toFixed(2)} km/L`
                    : '-'}
                </strong>
              </div>
              <div className="rounded-xl bg-gray-50 p-3" title="Valor médio gasto por quilômetro rodado.">
                <span className="text-[11px] text-gray-500 block">Custo por km</span>
                <strong className="text-rose-700 text-lg leading-none mt-1 block font-semibold">
                  {selectedVehicle.fuelStats?.costPerKm ? formatCurrency(selectedVehicle.fuelStats.costPerKm) : '-'}
                </strong>
              </div>
              <div className="rounded-xl bg-gray-50 p-3" title="Projeção de gasto para cada 1.000 km.">
                <span className="text-[11px] text-gray-500 block">Custo / 1.000 km</span>
                <strong className="text-rose-700 text-lg leading-none mt-1 block font-semibold">
                  {selectedVehicle.fuelStats?.costPer1000Km ? formatCurrency(selectedVehicle.fuelStats.costPer1000Km) : '-'}
                </strong>
              </div>
              <div className="rounded-xl bg-gray-50 p-3" title="Somatório de combustível e manutenção no mês atual.">
                <span className="text-[11px] text-gray-500 block">Gasto no mês</span>
                <strong className="text-rose-700 text-lg leading-none mt-1 block font-semibold">{formatCurrency(selectedVehicleMonthlySpent)}</strong>
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <span className="text-[11px] text-gray-500 block">Peças cadastradas</span>
                <strong className="text-gray-900 text-lg leading-none mt-1 block">{selectedVehicle.parts.length}</strong>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
