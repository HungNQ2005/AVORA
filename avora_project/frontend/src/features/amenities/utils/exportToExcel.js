/**
 * Export facilities data to a CSV/Excel formatted file.
 * Handles Vietnamese UTF-8 BOM encoding for perfect Excel display.
 */
export const exportAmenitiesToCSV = (amenities, filename = 'Danh_muc_tien_nghi_AVORA.csv') => {
  if (!amenities || amenities.length === 0) {
    alert('Không có dữ liệu để xuất file.');
    return;
  }

  const headers = [
    'Tên tiện nghi',
    'Loại tiện ích (Type)',
    'Số lượng đang áp dụng',
    'Đơn vị áp dụng',
    'Biểu phí',
    'Nổi bật (Highlight)',
    'Trạng thái'
  ];

  const rows = amenities.map((item) => [
    `"${(item.name_vi || '').replace(/"/g, '""')}"`,
    `"${(item.type || '').replace(/"/g, '""')}"`,
    `"${item.applied_count || 0}"`,
    `"${item.applied_unit || ''}"`,
    `"${item.pricing_label || (item.is_paid ? 'Có phụ phí' : 'Miễn phí')}"`,
    `"${item.is_highlight ? 'Có' : 'Không'}"`,
    `"${item.is_active ? 'Đang kích hoạt' : 'Tạm dừng'}"`
  ]);

  const csvContent = '\uFEFF' + [
    headers.join(','),
    ...rows.map((row) => row.join(','))
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
