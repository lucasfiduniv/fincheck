import { Button } from '../../../components/Button'
import { Input } from '../../../components/Input'
import { VehicleDetails } from '../../../../app/entities/Vehicle'

interface VehicleOdometerSectionProps {
  mobileOpenSection: 'SUMMARY' | 'ODOMETER' | 'METRICS' | 'TIMELINE'
  setMobileOpenSection: (updater: (state: 'SUMMARY' | 'ODOMETER' | 'METRICS' | 'TIMELINE') => 'SUMMARY' | 'ODOMETER' | 'METRICS' | 'TIMELINE') => void
  selectedVehicle: VehicleDetails
  selectedConfidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW'
  odometerStep: 'CURRENT' | 'AUTO'
  setOdometerStep: (step: 'CURRENT' | 'AUTO') => void
  currentOdometerInput: string
  setCurrentOdometerInput: (value: string) => void
  setShowOutlierConfirm: (value: boolean) => void
  confirmOdometerOutlier: boolean
  setConfirmOdometerOutlier: (value: boolean) => void
  showOutlierConfirm: boolean
  isUpdatingVehicle: boolean
  handleUpdateCurrentOdometer: () => void
  handleRecalibrateNow: () => void
  isRecalibratingNow: boolean
  autoOdometerEnabledInput: boolean
  setAutoOdometerEnabledInput: (value: boolean) => void
  averageDailyKmInput: string
  setAverageDailyKmInput: (value: string) => void
  handleUpdateAutoOdometerSettings: () => void
  deltaLabel: { text: string; className: string } | null
}

export function VehicleOdometerSection({
  mobileOpenSection,
  setMobileOpenSection,
  selectedVehicle,
  selectedConfidenceLevel,
  odometerStep,
  setOdometerStep,
  currentOdometerInput,
  setCurrentOdometerInput,
  setShowOutlierConfirm,
  confirmOdometerOutlier,
  setConfirmOdometerOutlier,
  showOutlierConfirm,
  isUpdatingVehicle,
  handleUpdateCurrentOdometer,
  handleRecalibrateNow,
  isRecalibratingNow,
  autoOdometerEnabledInput,
  setAutoOdometerEnabledInput,
  averageDailyKmInput,
  setAverageDailyKmInput,
  handleUpdateAutoOdometerSettings,
  deltaLabel,
}: VehicleOdometerSectionProps) {
  function formatDate(value: string) {
    return new Date(value).toLocaleDateString('pt-BR')
  }

  return (
    <>
      <button
        type="button"
        className="lg:hidden w-full flex items-center justify-between text-left"
        onClick={() => setMobileOpenSection((state) => (state === 'ODOMETER' ? 'METRICS' : 'ODOMETER'))}
      >
        <strong className="text-gray-900">Odômetro</strong>
        <span className="text-xs text-gray-500">
          {mobileOpenSection === 'ODOMETER' ? 'Ocultar' : 'Mostrar'}
        </span>
      </button>

      <div className={`${mobileOpenSection === 'ODOMETER' ? 'block' : 'hidden'} lg:block space-y-4`}>
        <div className="rounded-xl border border-teal-200 bg-teal-50 p-4">
          <span className="text-xs text-teal-700 block">Odômetro consolidado</span>
          <strong className="text-3xl text-teal-900 tracking-[-1px] block mt-1">
            {selectedVehicle.effectiveCurrentOdometer !== null && selectedVehicle.effectiveCurrentOdometer !== undefined
              ? `${selectedVehicle.effectiveCurrentOdometer.toFixed(1)} km`
              : 'Sem referencia'}
          </strong>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className={`text-[11px] px-2 py-1 rounded-full ${
              selectedConfidenceLevel === 'HIGH'
                ? 'bg-emerald-100 text-emerald-800'
                : selectedConfidenceLevel === 'MEDIUM'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-rose-100 text-rose-800'
            }`}>
              Nível de confiança: {selectedConfidenceLevel === 'HIGH' ? 'alto' : selectedConfidenceLevel === 'MEDIUM' ? 'médio' : 'baixo'}
            </span>

            {selectedVehicle.odometerConfidence?.daysSinceCalibration !== null
              && selectedVehicle.odometerConfidence?.daysSinceCalibration !== undefined && (
                <span className="text-[11px] text-teal-800">
                  Última calibração há {selectedVehicle.odometerConfidence.daysSinceCalibration} dias
                </span>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-2 sm:p-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setOdometerStep('CURRENT')}
              className={`rounded-lg px-3 py-2 text-xs font-medium border transition-colors ${
                odometerStep === 'CURRENT'
                  ? 'border-teal-700 bg-teal-50 text-teal-800'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              1) Quilometragem atual
            </button>
            <button
              type="button"
              onClick={() => setOdometerStep('AUTO')}
              className={`rounded-lg px-3 py-2 text-xs font-medium border transition-colors ${
                odometerStep === 'AUTO'
                  ? 'border-teal-700 bg-teal-50 text-teal-800'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              2) Automação diária
            </button>
          </div>
        </div>

        {odometerStep === 'CURRENT' && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
            <strong className="text-sm text-gray-900 block">Quilometragem atual</strong>

            <div className="space-y-2">
              <label className="text-xs text-gray-600 block">Valor atual do painel</label>
              <Input
                type="number"
                step="0.1"
                name="currentOdometerInput"
                placeholder="Ex.: 52340.5"
                value={currentOdometerInput}
                onChange={(e) => {
                  setCurrentOdometerInput(e.target.value)
                  setShowOutlierConfirm(false)
                  setConfirmOdometerOutlier(false)
                }}
              />
            </div>

            {selectedVehicle.effectiveCurrentOdometer !== null && selectedVehicle.effectiveCurrentOdometer !== undefined && (
              <div className="space-y-1">
                <span className="text-xs text-teal-700 block">
                  Estimativa atual: {selectedVehicle.effectiveCurrentOdometer.toFixed(1)} km
                </span>
                {deltaLabel && (
                  <span className={`text-xs block font-medium ${deltaLabel.className}`}>
                    {deltaLabel.text}
                  </span>
                )}
              </div>
            )}

            <p className="text-[11px] text-gray-500">
              Use o valor real do painel para recalibrar.
            </p>

            {showOutlierConfirm && (
              <label className="flex items-center gap-2 text-[11px] text-amber-700 rounded-lg border border-amber-200 bg-amber-50 px-2 py-2">
                <input
                  type="checkbox"
                  checked={confirmOdometerOutlier}
                  onChange={(event) => setConfirmOdometerOutlier(event.target.checked)}
                />
                Confirmar outlier (salto atípico) para salvar
              </label>
            )}

            <div className="space-y-2">
              <Button
                type="button"
                className="h-9 px-3 rounded-lg w-full sm:w-auto text-sm"
                isLoading={isUpdatingVehicle}
                onClick={handleUpdateCurrentOdometer}
              >
                Salvar quilometragem
              </Button>

              <button
                type="button"
                className="text-xs text-teal-700 hover:text-teal-800 underline"
                onClick={handleRecalibrateNow}
                disabled={isRecalibratingNow}
              >
                {isRecalibratingNow ? 'Atualizando...' : 'Atualizar agora (ação rápida)'}
              </button>
            </div>
          </div>
        )}

        {odometerStep === 'AUTO' && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
            <div className="flex items-center gap-2">
              <input
                id="auto-odometer"
                type="checkbox"
                checked={autoOdometerEnabledInput}
                onChange={(event) => setAutoOdometerEnabledInput(event.target.checked)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <label htmlFor="auto-odometer" className="text-sm text-gray-800 font-medium">
                Estimativa automática de km/dia
              </label>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-gray-600 block">Média de km por dia</label>
              <Input
                type="number"
                step="0.1"
                name="averageDailyKmInput"
                placeholder="Ex.: 38.5"
                value={averageDailyKmInput}
                onChange={(e) => setAverageDailyKmInput(e.target.value)}
              />
            </div>

            <p className="text-[11px] text-gray-500">
              Use a média diária para prever km e próximas necessidades.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-2">
                <span className="text-[10px] text-gray-500 block">Aprendizado</span>
                <strong className="text-xs text-gray-800">{selectedVehicle.odometerLearning?.learnedAverageDailyKm?.toFixed(1) ?? '—'} km/dia</strong>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-2">
                <span className="text-[10px] text-gray-500 block">Dia útil</span>
                <strong className="text-xs text-gray-800">{selectedVehicle.odometerLearning?.learnedWeekdayKm?.toFixed(1) ?? '—'} km/dia</strong>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-2">
                <span className="text-[10px] text-gray-500 block">Fim de semana</span>
                <strong className="text-xs text-gray-800">{selectedVehicle.odometerLearning?.learnedWeekendKm?.toFixed(1) ?? '—'} km/dia</strong>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-2">
                <span className="text-[10px] text-gray-500 block">Projeção semanal</span>
                <strong className="text-xs text-gray-800">{selectedVehicle.odometerLearning?.weeklyProjectionKm?.toFixed(1) ?? '—'} km</strong>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-2">
                <span className="text-[10px] text-gray-500 block">Outliers</span>
                <strong className="text-xs text-gray-800">{selectedVehicle.odometerLearning?.outlierCount ?? 0}</strong>
              </div>
            </div>

            {selectedVehicle.recalibrationSuggested && (
              <span className="text-[11px] text-amber-700 block">
                Atenção: divergência de {selectedVehicle.divergencePercent?.toFixed(1)}%. Recalibre para melhorar a precisão.
              </span>
            )}

            {selectedVehicle.odometerBaseDate && (
              <span className="text-[11px] text-gray-500 block">
                Base: {formatDate(selectedVehicle.odometerBaseDate)}
              </span>
            )}

            <Button
              type="button"
              className="h-9 px-3 rounded-lg w-full sm:w-auto text-sm"
              isLoading={isUpdatingVehicle}
              onClick={handleUpdateAutoOdometerSettings}
            >
              Salvar automação
            </Button>
          </div>
        )}
      </div>
    </>
  )
}
