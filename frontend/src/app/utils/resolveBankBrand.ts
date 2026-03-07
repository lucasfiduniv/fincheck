interface BankBrand {
  displayName: string
  logoSrc: string
  aliases: string[]
}

const BANK_BRANDS: BankBrand[] = [
  {
    displayName: 'Nubank',
    logoSrc: '/bancos/nubank.svg',
    aliases: ['nubank', 'nu bank', 'nu'],
  },
  {
    displayName: 'Sicoob',
    logoSrc: '/bancos/sicoob.svg',
    aliases: ['sicoob'],
  },
]

export function resolveBankBrand(
  accountName: string,
  accountType?: 'CHECKING' | 'INVESTMENT' | 'CASH',
) {
  if (accountType === 'CASH') {
    return {
      displayName: 'Dinheiro',
      logoSrc: '/bancos/dinheiro_papel.png',
    }
  }

  const normalizedName = accountName.toLowerCase().trim()

  const matchedBrand = BANK_BRANDS.find((brand) =>
    brand.aliases.some((alias) => normalizedName.includes(alias))
  )

  if (matchedBrand) {
    return matchedBrand
  }

  return {
    displayName: accountName,
    logoSrc: '/bancos/default-bank.svg',
  }
}