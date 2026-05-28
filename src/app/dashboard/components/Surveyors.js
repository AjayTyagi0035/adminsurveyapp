import styles from '../dashboard.module.css'

export default function Surveyors({
  surveyors,
  loading,
  openAdd,
  openEdit,
  openBlock,
  setModal,
}) {
  return (
    <>
      <header className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>Surveyor Management</h1>
          <p className={styles.pageSubtitle}>Manage accounts, roles and access</p>
        </div>
        <button className={styles.addBtn} onClick={openAdd}>+ Add Surveyor</button>
      </header>

      {/* Stats */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={styles.statNum}>{surveyors.length}</span>
          <span className={styles.statLabel}>Total</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNum}>{surveyors.filter(s => !s.is_blocked).length}</span>
          <span className={styles.statLabel}>Active</span>
        </div>
        <div className={`${styles.statCard} ${styles.statRed}`}>
          <span className={styles.statNum}>{surveyors.filter(s => s.is_blocked).length}</span>
          <span className={styles.statLabel}>Blocked</span>
        </div>
      </div>

      {/* Table */}
      <div className={styles.tableWrap}>
        {loading ? (
          <div className={styles.empty}>Loading…</div>
        ) : surveyors.length === 0 ? (
          <div className={styles.empty}>No surveyors yet. Add one to get started.</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Mobile</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {surveyors.map((s, i) => (
                <tr key={s.id} className={s.is_blocked ? styles.rowBlocked : ''}>
                  <td className={styles.tdMuted}>{i + 1}</td>
                  <td className={styles.tdName}>{s.name}</td>
                  <td>{s.mobile}</td>
                  <td><span className={styles.roleBadge}>{s.role}</span></td>
                  <td>
                    {s.is_blocked
                      ? <span className={styles.badgeBlocked}>Blocked</span>
                      : <span className={styles.badgeActive}>Active</span>}
                  </td>
                  <td className={styles.actions}>
                    <button className={styles.btnEdit} onClick={() => openEdit(s)}>✏️ </button>
                    {s.is_blocked
                      ? <button className={styles.btnUnblock} onClick={() => openBlock(s)}>🔓 Unblock</button>
                      : <button className={styles.btnBlock}  onClick={() => openBlock(s)}>🚫</button>}
                    <button className={styles.btnDelete} onClick={() => setModal({ type: 'delete-surveyor', data: s })}>🗑️ Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
