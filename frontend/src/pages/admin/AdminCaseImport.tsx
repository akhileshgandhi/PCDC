import { BookMarked, FileUp } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router-dom"

import UploadCaseDialog from "../../components/bank/UploadCaseDialog"
import { bankTheme, cardClass, secondaryBtn } from "../../components/bank/shared"
import AdminLayout from "../../layouts/AdminLayout"

/** Admin case import — uses the same global upload dialog as everywhere else;
 * uploads land in the shared Case Study Bank. */
export default function AdminCaseImport() {
  const [showUpload, setShowUpload] = useState(false)
  const [notice, setNotice] = useState("")

  return (
    <AdminLayout>
      <div className="space-y-5">
        <section className={cardClass}>
          <h1 className="text-3xl font-semibold tracking-normal text-[#17202a]">Case Import</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#667085]">
            Upload external case studies into the shared Case Study Bank, mapped to subject,
            semester and difficulty. Every faculty and admin can then view them and publish
            them into their own Case Library.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" className={bankTheme.admin.primaryBtn} onClick={() => setShowUpload(true)}>
              <FileUp size={16} aria-hidden="true" /> Upload case study
            </button>
            <Link to="/admin/case-bank" className={secondaryBtn}>
              <BookMarked size={16} aria-hidden="true" /> Open Case Bank
            </Link>
          </div>
        </section>

        {notice ? (
          <div className="rounded-lg border border-[#bdebdc] bg-[#f0fcf8] px-4 py-3 text-sm font-medium text-[#176b5a]">{notice}</div>
        ) : null}
      </div>

      {showUpload ? (
        <UploadCaseDialog
          variant="admin"
          onClose={() => setShowUpload(false)}
          onDone={() => {
            setShowUpload(false)
            setNotice("Case study uploaded to the shared Case Bank.")
          }}
        />
      ) : null}
    </AdminLayout>
  )
}
