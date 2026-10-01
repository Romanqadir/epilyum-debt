/** One DataGrid look, shared by every table in the app. */
export const gridSx = {
  border: 0,
  fontSize: '0.9rem',
  '--DataGrid-rowBorderColor': 'var(--color-line)',
  '& .MuiDataGrid-columnHeaders': { borderBottom: '1px solid var(--color-line)' },
  '& .MuiDataGrid-columnHeader': { background: '#f7f9fd' },
  '& .MuiDataGrid-columnHeaderTitle': {
    fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-muted)',
  },
  '& .MuiDataGrid-cell': { borderColor: 'var(--color-line)', paddingInline: '14px' },
  '& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-cell:focus': { outline: 'none' },
  '& .MuiDataGrid-row:hover': { background: '#f7f9fd' },
  '& .MuiDataGrid-footerContainer': { borderTop: '1px solid var(--color-line)' },
  '& .MuiTablePagination-root': { color: 'var(--color-muted)', fontSize: '0.82rem' },
  '& .MuiDataGrid-overlay': { color: 'var(--color-faint)' },
}

export const gridSxClickable = {
  ...gridSx,
  '& .MuiDataGrid-row': { cursor: 'pointer' },
}

export const gridText = (noRows) => ({
  noRowsLabel: noRows,
  MuiTablePagination: {
    labelRowsPerPage: 'ژمارە لە هەر لاپەڕەیەک',
    labelDisplayedRows: ({ from, to, count }) => `${from}–${to} لە ${count}`,
  },
})
