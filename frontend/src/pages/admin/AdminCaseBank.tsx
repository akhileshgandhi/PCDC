import CaseBankView from "../../components/bank/CaseBankView"
import AdminLayout from "../../layouts/AdminLayout"

export default function AdminCaseBank() {
  return (
    <AdminLayout>
      <CaseBankView variant="admin" />
    </AdminLayout>
  )
}
