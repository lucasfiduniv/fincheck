import { PlusIcon } from '@radix-ui/react-icons'

interface EmptyAccountsStateProps {
  onCreateAccount(): void
}

export function EmptyAccountsState({ onCreateAccount }: EmptyAccountsStateProps) {
  return (
    <>
      <div className="mb-4" slot="container-start">
        <strong className="text-white tracking-[-1px] text-lg font-bold">
          Minhas contas
        </strong>
      </div>

      <button
        className="mt-4 h-52 rounded-2xl border-2 border-dashed border-teal-600 flex flex-col justify-center items-center gap-4 text-white hover:bg-teal-950/5 transition-colors"
        onClick={onCreateAccount}
      >
        <div className="w-11 h-11 rounded-full border-2 border-dashed border-white flex items-center justify-center">
          <PlusIcon className="w-6 h-6" />
        </div>
        <span className="tracking-[-0.5px] font-medium w-32 text-center">
          Cadastre uma nova conta
        </span>
      </button>
    </>
  )
}