import { Clothes } from './expense/Clothes'
import { Beauty } from './expense/Beauty'
import { Bills } from './expense/Bills'
import { Education } from './expense/Education'
import { Electronics } from './expense/Electronics'
import { Expense } from './expense/Expense'
import { Food } from './expense/Food'
import { Fun } from './expense/Fun'
import { Grocery } from './expense/Grocery'
import { Health } from './expense/Health'
import { Home } from './expense/Home'
import { Pet } from './expense/Pet'
import { Sports } from './expense/Sports'
import { Transport } from './expense/Transport'
import { Travel } from './expense/Travel'
import { Bonus } from './income/Bonus'
import { Cashback } from './income/Cashback'
import { Income } from './income/Income'
import { Investments } from './income/Investments'
import { RentIncome } from './income/RentIncome'
import { Sales } from './income/Sales'

export const iconsMap = {
  INCOME: {
    default: Income,
    salary: Income,
    freelance: Sales,
    bonus: Bonus,
    commission: Bonus,
    cashback: Cashback,
    investments: Investments,
    dividends: Investments,
    rent: RentIncome,
    sales: Sales,
    refund: Cashback,
    gift: Bonus,
    royalties: Investments,
    other: Income,
  },
  EXPENSE: {
    default: Expense,
    food: Food,
    restaurant: Food,
    coffee: Food,
    fun: Fun,
    streaming: Fun,
    games: Fun,
    grocery: Grocery,
    supermarket: Grocery,
    home: Home,
    rent: Home,
    utilities: Bills,
    education: Education,
    clothes: Clothes,
    beauty: Beauty,
    health: Health,
    pharmacy: Health,
    dentist: Health,
    pet: Pet,
    vet: Pet,
    electronics: Electronics,
    phone: Electronics,
    internet: Electronics,
    bills: Bills,
    taxes: Bills,
    insurance: Bills,
    transport: Transport,
    fuel: Transport,
    parking: Transport,
    travel: Travel,
    hotel: Travel,
    sports: Sports,
    gym: Sports,
    investments: Investments,
    gift: Fun,
    kids: Education,
    maintenance: Bills,
    other: Expense,
  },
}
