import { Dispatch, SetStateAction } from 'react'
import { Button } from '../../../components/Button'
import { Input } from '../../../components/Input'
import { InputCurrency } from '../../../components/InputCurrency'
import { Modal } from '../../../components/Modal'

interface SavingsBoxEntryModalProps {
  isOpen: boolean
  setIsOpen: Dispatch<SetStateAction<boolean>>
  entryType: 'DEPOSIT' | 'WITHDRAW'
  entryAmount: string
  setEntryAmount: Dispatch<SetStateAction<string>>
  entryDescription: string
  setEntryDescription: Dispatch<SetStateAction<string>>
  entryDate: string
  setEntryDate: Dispatch<SetStateAction<string>>
  isCreatingEntry: boolean
  handleCreateEntry: () => void
}

export function SavingsBoxEntryModal({
  isOpen,
  setIsOpen,
  entryType,
  entryAmount,
  setEntryAmount,
  entryDescription,
  setEntryDescription,
  entryDate,
  setEntryDate,
  isCreatingEntry,
  handleCreateEntry,
}: SavingsBoxEntryModalProps) {
  return (
    <Modal
      title={entryType === 'DEPOSIT' ? 'Novo Aporte' : 'Novo Resgate'}
      open={isOpen}
      onClose={() => setIsOpen(false)}
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          handleCreateEntry()
        }}
      >
        <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-700">
          Tipo: {entryType === 'DEPOSIT' ? 'Aporte' : 'Resgate'}
        </div>

        <div>
          <span className="text-gray-600 tracking-[-0.5px] text-xs">Valor</span>
          <div className="flex items-center gap-2">
            <span className="text-gray-600 tracking-[-0.5px] text-lg">R$</span>
            <InputCurrency
              value={entryAmount}
              onChange={(value) => setEntryAmount(value ?? '')}
              className="text-teal-900"
            />
          </div>
        </div>

        <Input
          name="entryDate"
          type="date"
          placeholder="Data"
          value={entryDate}
          onChange={(e) => setEntryDate(e.target.value)}
        />

        <div>
          <span className="text-gray-600 tracking-[-0.5px] text-xs">Descricao (opcional)</span>
          <Input
            name="entryDescription"
            placeholder="Detalhe da movimentacao"
            value={entryDescription}
            onChange={(e) => setEntryDescription(e.target.value)}
          />
        </div>

        <Button type="submit" className="w-full" isLoading={isCreatingEntry}>
          {entryType === 'DEPOSIT' ? 'Salvar aporte' : 'Salvar resgate'}
        </Button>
      </form>
    </Modal>
  )
}
