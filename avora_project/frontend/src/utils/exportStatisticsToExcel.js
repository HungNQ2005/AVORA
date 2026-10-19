import ExcelJS from 'exceljs';
import { buildTimeSeries, formatDisplayDate, getStatusLabel } from '../features/statistics/statisticsHelpers';

const NAVY = 'FF003580';
const GOLD = 'FFC9A227';
const BORDER = { style: 'thin', color: { argb: 'FFE2E8F0' } };
const CELL_BORDER = { top: BORDER, left: BORDER, bottom: BORDER, right: BORDER };

const slugify = (text) =>
  String(text || 'khach_san')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40) || 'khach_san';

export const getStatisticsExcelFilename = (overview) =>
  `AVORA_Thong_ke_${slugify(overview.hotel?.name)}_${overview.range.from.replace(/-/g, '')}_${overview.range.to.replace(/-/g, '')}.xlsx`;

/**
 * Export hotel statistics (summary + 3 breakdown tables) to an .xlsx file.
 * @param {object} overview - payload of GET /api/statistics/overview
 * @returns {Promise<{ success: boolean, filename?: string, message?: string }>}
 */
export const exportStatisticsToExcel = async (overview) => {
  if (!overview || !overview.summary) {
    return { success: false, message: 'Không có dữ liệu thống kê để xuất file.' };
  }

  const filename = getStatisticsExcelFilename(overview);

  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'AVORA Hotel Management System';
    workbook.created = new Date();

    const ws = workbook.addWorksheet('Thống kê khách sạn', {
      properties: { tabColor: { argb: NAVY }, defaultRowHeight: 22 },
    });
    ws.columns = [
      { width: 34 },
      { width: 22 },
      { width: 22 },
      { width: 22 },
    ];

    const title = (row, text, size, color, bold = true) => {
      ws.mergeCells(`A${row}:D${row}`);
      const cell = ws.getCell(`A${row}`);
      cell.value = text;
      cell.font = { name: 'Segoe UI', size, bold, color: { argb: color } };
      cell.alignment = { horizontal: 'left', vertical: 'middle' };
    };

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    title(1, 'AVORA HOTELS & RESORTS', 10, GOLD);
    title(2, 'BÁO CÁO THỐNG KÊ KHÁCH SẠN', 16, NAVY);
    title(3, `Khách sạn: ${overview.hotel.name}`, 11, 'FF0F172A');
    title(4, `Thời gian thống kê: ${formatDisplayDate(overview.range.from)} - ${formatDisplayDate(overview.range.to)}`, 10, 'FF475569', false);
    title(5, `Thời gian xuất báo cáo: ${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`, 9.5, 'FF475569', false);

    let row = 7;

    const sectionHeader = (text, headers) => {
      ws.mergeCells(`A${row}:D${row}`);
      const t = ws.getCell(`A${row}`);
      t.value = text;
      t.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: NAVY } };
      row += 1;
      headers.forEach((h, i) => {
        const c = ws.getCell(row, i + 1);
        c.value = h;
        c.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
        c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        c.border = { ...CELL_BORDER, bottom: { style: 'medium', color: { argb: GOLD } } };
      });
      row += 1;
    };

    const dataRow = (values, numFmts = []) => {
      values.forEach((v, i) => {
        const c = ws.getCell(row, i + 1);
        c.value = v;
        c.font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF0F172A' } };
        c.alignment = { horizontal: i === 0 ? 'left' : 'right', vertical: 'middle' };
        c.border = CELL_BORDER;
        if (numFmts[i]) c.numFmt = numFmts[i];
      });
      row += 1;
    };

    const emptyRow = () => {
      ws.mergeCells(`A${row}:D${row}`);
      const c = ws.getCell(`A${row}`);
      c.value = 'Không có dữ liệu trong khoảng thời gian này.';
      c.font = { name: 'Segoe UI', size: 9.5, italic: true, color: { argb: 'FF64748B' } };
      row += 1;
    };

    // Summary
    const s = overview.summary;
    const cmp = overview.comparison;
    if (cmp) {
      sectionHeader('1. TỔNG QUAN & SO SÁNH KỲ TRƯỚC', ['Chỉ số', 'Kỳ này', 'Kỳ trước', 'Tăng/Giảm (%)']);
      const fmtPct = (val) => (val > 0 ? `+${val}%` : `${val}%`);
      dataRow(['Tổng số đơn đặt phòng', s.total_bookings, cmp.total_bookings?.previous ?? 0, fmtPct(cmp.total_bookings?.change_pct ?? 0)], [null, '#,##0', '#,##0', null]);
      dataRow(['Số đơn hợp lệ (không hủy)', s.valid_bookings, cmp.valid_bookings?.previous ?? 0, fmtPct(cmp.valid_bookings?.change_pct ?? 0)], [null, '#,##0', '#,##0', null]);
      dataRow(['Số đơn đã hủy', s.cancelled_bookings, cmp.cancelled_bookings?.previous ?? 0, fmtPct(cmp.cancelled_bookings?.change_pct ?? 0)], [null, '#,##0', '#,##0', null]);
      dataRow(['Số phòng đã đặt (đơn không hủy)', s.rooms_booked, cmp.rooms_booked?.previous ?? 0, fmtPct(cmp.rooms_booked?.change_pct ?? 0)], [null, '#,##0', '#,##0', null]);
      dataRow(['Doanh thu (VND, đơn không hủy)', s.revenue, cmp.revenue?.previous ?? 0, fmtPct(cmp.revenue?.change_pct ?? 0)], [null, '#,##0', '#,##0', null]);
    } else {
      sectionHeader('1. TỔNG QUAN', ['Chỉ số', 'Giá trị']);
      dataRow(['Điểm đánh giá trung bình', overview.rating?.average ?? 'Chưa có đánh giá'], [null, '0.0']);
      dataRow(['Số lượt đánh giá', overview.rating?.count ?? 0], [null, '#,##0']);
      dataRow(['Tổng số đơn đặt phòng', s.total_bookings], [null, '#,##0']);
      dataRow(['Số đơn hợp lệ (không hủy)', s.valid_bookings], [null, '#,##0']);
      dataRow(['Số đơn đã hủy', s.cancelled_bookings], [null, '#,##0']);
      dataRow(['Số phòng đã đặt (đơn không hủy)', s.rooms_booked], [null, '#,##0']);
      dataRow(['Doanh thu (VND, đơn không hủy)', s.revenue], [null, '#,##0']);
    }
    row += 1;

    // By status
    sectionHeader('2. ĐƠN ĐẶT PHÒNG THEO TRẠNG THÁI', ['Trạng thái', 'Số đơn', 'Tổng giá trị (VND)']);
    if (overview.by_status.length === 0) emptyRow();
    overview.by_status.forEach((r) => dataRow([getStatusLabel(r.code), r.count, r.amount], [null, '#,##0', '#,##0']));
    row += 1;

    // By room type
    sectionHeader('3. SỐ PHÒNG ĐẶT THEO LOẠI PHÒNG', ['Loại phòng', 'Số phòng đặt']);
    if (overview.by_room_type.length === 0) emptyRow();
    overview.by_room_type.forEach((r) => dataRow([r.name, r.quantity], [null, '#,##0']));
    row += 1;

    // Time series
    const series = buildTimeSeries(overview.by_day, overview.range.days);
    const byMonth = overview.range.days > 62;
    sectionHeader(`4. ĐƠN & DOANH THU THEO ${byMonth ? 'THÁNG' : 'NGÀY'}`, [byMonth ? 'Tháng' : 'Ngày', 'Số đơn', 'Doanh thu (VND)']);
    if (series.length === 0) emptyRow();
    series.forEach((r) => dataRow([r.label, r.bookings, r.revenue], [null, '#,##0', '#,##0']));

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return { success: true, filename };
  } catch (error) {
    console.error('Error exporting statistics to Excel:', error);
    return { success: false, message: 'Không thể xuất file Excel. Vui lòng thử lại.' };
  }
};
