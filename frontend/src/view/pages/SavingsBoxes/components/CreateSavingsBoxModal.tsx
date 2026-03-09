import { Dispatch, SetStateAction } from 'react'
import { Button } from '../../../components/Button'
import { Input } from '../../../components/Input'
import { InputCurrency } from '../../../components/InputCurrency'
import { Modal } from '../../../components/Modal'

interface CreateSavingsBoxModalProps {
  isOpen: boolean
  setIsOpen: Dispatch<SetStateAction<boolean>>
  createStep: 1 | 2
  setCreateStep: Dispatch<SetStateAction<1 | 2>>
  createName: string
  setCreateName: Dispatch<SetStateAction<string>>
  createDescription: string
  setCreateDescription: Dispatch<SetStateAction<string>>
  createInitialBalance: string
  setCreateInitialBalance: Dispatch<SetStateAction<string>>
  createTargetAmount: string
  setCreateTargetAmount: Dispatch<SetStateAction<string>>
  createTargetDate: string
  setCreateTargetDate: Dispatch<SetStateAction<string>>
  isCreating: boolean
  handleCreateSavingsBox: () => void
}

export function CreateSavingsBoxModal({
  isOpen,
  setIsOpen,
  createStep,
  setCreateStep,
  createName,
  setCreateName,
  createDescription,
  setCreateDescription,
  createInitialBalance,
  setCreateInitialBalance,
  createTargetAmount,
  setCreateTargetAmount,
  createTargetDate,
  setCreateTargetDate,
  isCreating,
  handleCreateSavingsBox,
}: CreateSavingsBoxModalProps) {
  return (
    <Modal
      title="Nova Caixinha"
      open={isOpen}
      onClose={() => {
        setCreateStep(1)
        setIsOpen(false)
      }}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault()
          if (createStep === 1) {
            setCreateStep(2)
            return
          }

          handleCreateSavingsBox()
        }}
      >
        {createStep === 1 && (
          <div className="space-y-4">
            <Input
              name="createName"
              placeholder="Nome da caixinha"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
            />

            <div>
              <span className="text-gray-600 tracking-[-0.5px] text-xs">Saldo inicial</span>
              <div className="flex items-center gap-2">
                <span className="text-gray-600 tracking-[-0.5px] text-lg">R$</span>
                <InputCurrency
                  value={createInitialBalance}
                  onChange={(value) => setCreateInitialBalance(value ?? '')}
                  className="text-teal-900"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100 flex gap-2">
              <Button
                type="button"
                variant="ghost"
                className="flex-1"
                onClick={() => {
                  setCreateStep(1)
                  setIsOpen(false)
                }}
              >
                Cancelar
              </Button>

              <Button type="submit" className="flex-1">
                Continuar
              </Button>
            </div>
          </div>
        )}

        {createStep === 2 && (
          <div className="space-y-4">
            <div>
              <span className="text-gray-600 tracking-[-0.5px] text-xs">Descricao (opcional)</span>
              <Input
                name="createDescription"
                placeholder="Ex.: Viagem, reserva, reforma"
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
              />
            </div>

            <div>
              <span className="text-gray-600 tracking-[-0.5px] text-xs">Meta (opcional)</span>
              <div className="flex items-center gap-2">
                <span className="text-gray-600 tracking-[-0.5px] text-lg">R$</span>
                <InputCurrency
                  value={createTargetAmount}
                  onChange={(value) => setCreateTargetAmount(value ?? '')}
                  className="text-teal-900"
                />
              </div>
            </div>

            <div>
              <span className="text-gray-600 tracking-[-0.5px] text-xs">Data alvo (opcional)</span>
              <Input
                name="createTargetDate"
                type="date"
                value={createTargetDate}
                onChange={(e) => setCreateTargetDate(e.target.value)}
              />
            </div>

            <div className="pt-2 border-t border-gray-100 flex gap-2">
              <Button
                type="button"
                variant="ghost"
                className="flex-1"
                onClick={() => setCreateStep(1)}
              >
                Voltar
              </Button>

              <Button type="submit" className="flex-1" isLoading={isCreating}>
                Salvar caixinha
              </Button>
            </div>
          </div>
        )}
      </form>
    </Modal>
  )
}
