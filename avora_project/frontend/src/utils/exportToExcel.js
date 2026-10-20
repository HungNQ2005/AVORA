import ExcelJS from 'exceljs';
import avoraLogoUrl from '../assets/avora_logo.png';
import { getRoomCapacityDetails } from './roomCapacityHelper';

let cachedLogoBase64 = null;

const getAvoraLogoBase64 = async () => {
  if (cachedLogoBase64) return cachedLogoBase64;
  try {
    const response = await fetch(avoraLogoUrl);
    if (!response.ok) return null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    cachedLogoBase64 = `data:image/png;base64,${btoa(binary)}`;
    return cachedLogoBase64;
  } catch {
    return null;
  }
};

/**
 * Generate a standard filename with current timestamp (YYYYMMDD).
 * e.g., AVORA_Danh_muc_tien_nghi_20260929.xlsx
 */
export const getExportExcelFilename = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `AVORA_Danh_muc_tien_nghi_${year}${month}${day}.xlsx`;
};

/**
 * Export facilities/amenities data to a luxury, executive-grade Excel (.xlsx) report.
 * Designed for AVORA Hotel Management with full branding and smooth vertical scrolling.
 *
 * @param {Array} amenities - List of amenity objects from database
 * @param {string} [customFilename] - Optional override filename
 * @returns {Promise<{ success: boolean, count?: number, filename?: string, message?: string }>}
 */
export const exportAmenitiesToExcel = async (amenities, customFilename) => {
  if (!amenities || amenities.length === 0) {
    return { success: false, message: 'Không có dữ liệu tiện nghi để xuất file.' };
  }

  const filename = customFilename || getExportExcelFilename();

  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'AVORA Hotel Management System';
    workbook.lastModifiedBy = 'AVORA Executive CMS';
    workbook.created = new Date();
    workbook.modified = new Date();

    const sheetName = 'Danh mục tiện nghi';
    const worksheet = workbook.addWorksheet(sheetName, {
      properties: {
        tabColor: { argb: 'FF003580' },
        defaultRowHeight: 22,
      },
      views: [{ state: 'normal' }],
    });

    // ─── 1. Columns Configuration ───────────────────────────────────────────
    worksheet.columns = [
      { key: 'stt', width: 8 },           // A: STT
      { key: 'name', width: 36 },          // B: Tên tiện nghi
      { key: 'type', width: 22 },          // C: Loại tiện ích
      { key: 'applied_count', width: 22 }, // D: Số lượng đang áp dụng
      { key: 'applied_unit', width: 16 },  // E: Đơn vị áp dụng
      { key: 'pricing', width: 18 },       // F: Biểu phí
      { key: 'highlight', width: 14 },     // G: Nổi bật
      { key: 'status', width: 20 },        // H: Trạng thái
    ];

    // Common border styles
    const thinBorder = {
      top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    };

    // ─── 2. Report Header / Branding ─────────────────────────────────────────
    // Row 1: Logo & Enterprise Badge
    worksheet.getRow(1).height = 40;
    const logoBase64 = await getAvoraLogoBase64();
    if (logoBase64) {
      const logoId = workbook.addImage({
        base64: logoBase64,
        extension: 'png',
      });
      worksheet.addImage(logoId, {
        tl: { col: 0.1, row: 0.1 },
        ext: { width: 135, height: 36 },
      });
    }

    worksheet.mergeCells('D1:H1');
    const brandCell = worksheet.getCell('D1');
    brandCell.value = 'HỆ THỐNG QUẢN TRỊ DOANH NGHIỆP • AVORA ENTERPRISE';
    brandCell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FFC9A227' } };
    brandCell.alignment = { horizontal: 'right', vertical: 'middle' };

    // Row 2: Report Title
    worksheet.mergeCells('A2:H2');
    const titleCell = worksheet.getCell('A2');
    titleCell.value = 'DANH MỤC TIỆN NGHI KHÁCH SẠN';
    titleCell.font = { name: 'Segoe UI', size: 15, bold: true, color: { argb: 'FF003580' } };
    titleCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    worksheet.getRow(2).height = 26;

    // Row 3: Subtitle & Export Date
    const now = new Date();
    const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    worksheet.mergeCells('A3:H3');
    const subCell = worksheet.getCell('A3');
    subCell.value = `Hotel Management System • Báo cáo quản trị lưu trú nội bộ  |  Thời gian xuất: ${formattedDate}`;
    subCell.font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF64748B' } };
    subCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    worksheet.getRow(3).height = 18;

    // Row 4: Small spacing row
    worksheet.getRow(4).height = 6;

    // ─── 3. Table Header (Row 5) ─────────────────────────────────────────────
    const headerRow = worksheet.getRow(5);
    headerRow.height = 28;

    const headers = [
      'STT',
      'Tên tiện nghi',
      'Loại tiện ích',
      'Số lượng đang áp dụng',
      'Đơn vị áp dụng',
      'Biểu phí',
      'Nổi bật',
      'Trạng thái',
    ];

    headers.forEach((hdr, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = hdr;
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF003580' }, // AVORA Deep Navy
      };
      cell.font = {
        name: 'Segoe UI',
        size: 10,
        bold: true,
        color: { argb: 'FFFFFFFF' },
      };
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true,
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF002866' } },
        left: { style: 'thin', color: { argb: 'FF0A4799' } },
        right: { style: 'thin', color: { argb: 'FF0A4799' } },
        bottom: { style: 'medium', color: { argb: 'FFC9A227' } }, // Elegant Gold Divider
      };
    });

    // ─── 4. Data Rows (Row 6+) ───────────────────────────────────────────────
    amenities.forEach((item, index) => {
      const rowIndex = 6 + index;
      const row = worksheet.getRow(rowIndex);
      row.height = 24;

      const isEven = index % 2 === 0;
      const baseBg = isEven ? 'FFFFFFFF' : 'FFF8FAFC'; // Alternating zebra stripe

      // Value extraction
      const stt = index + 1;
      const name = item.name_vi || item.facility_name || '';
      const type = item.type || '';
      const appliedCount = Number(item.applied_count) || 0;
      const appliedUnit = item.applied_unit || '';
      const isPaid = Boolean(item.is_paid);
      const pricing = item.pricing_label || (isPaid ? 'Có phụ phí' : 'Miễn phí');
      const isHighlight = Boolean(item.is_highlight);
      const highlight = isHighlight ? 'Có' : 'Không';
      const isActive = Boolean(item.is_active);
      const status = isActive ? 'Đang kích hoạt' : 'Tạm dừng';

      // Cell 1: STT
      const c1 = row.getCell(1);
      c1.value = stt;
      c1.alignment = { horizontal: 'center', vertical: 'middle' };
      c1.font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF64748B' } };
      c1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c1.border = thinBorder;

      // Cell 2: Tên tiện nghi
      const c2 = row.getCell(2);
      c2.value = name;
      c2.alignment = { horizontal: 'left', vertical: 'middle', indent: 1, wrapText: true };
      c2.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
      c2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c2.border = thinBorder;

      // Cell 3: Loại tiện ích
      const c3 = row.getCell(3);
      c3.value = type;
      c3.alignment = { horizontal: 'center', vertical: 'middle' };
      c3.font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF334155' } };
      c3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c3.border = thinBorder;

      // Cell 4: Số lượng đang áp dụng
      const c4 = row.getCell(4);
      c4.value = appliedCount;
      c4.numFmt = '#,##0';
      c4.alignment = { horizontal: 'center', vertical: 'middle' };
      c4.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
      c4.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c4.border = thinBorder;

      // Cell 5: Đơn vị áp dụng
      const c5 = row.getCell(5);
      c5.value = appliedUnit;
      c5.alignment = { horizontal: 'center', vertical: 'middle' };
      c5.font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF64748B' } };
      c5.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c5.border = thinBorder;

      // Cell 6: Biểu phí
      const c6 = row.getCell(6);
      c6.value = pricing;
      c6.alignment = { horizontal: 'center', vertical: 'middle' };
      c6.font = {
        name: 'Segoe UI',
        size: 9.5,
        bold: true,
        color: { argb: isPaid ? 'FFB45309' : 'FF047857' },
      };
      c6.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c6.border = thinBorder;

      // Cell 7: Nổi bật
      const c7 = row.getCell(7);
      c7.value = highlight;
      c7.alignment = { horizontal: 'center', vertical: 'middle' };
      c7.font = {
        name: 'Segoe UI',
        size: 9.5,
        bold: isHighlight,
        color: { argb: isHighlight ? 'FF854D0E' : 'FF64748B' },
      };
      c7.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isHighlight ? 'FFFEF9C3' : baseBg }, // Subtle Gold Accent
        };
      c7.border = thinBorder;

      // Cell 8: Trạng thái
      const c8 = row.getCell(8);
      c8.value = status;
      c8.alignment = { horizontal: 'center', vertical: 'middle' };
      c8.font = {
        name: 'Segoe UI',
        size: 9.5,
        bold: true,
        color: { argb: isActive ? 'FF065F46' : 'FF991B1B' },
      };
      c8.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isActive ? 'FFECFDF5' : 'FFFEF2F2' },
      };
      c8.border = thinBorder;
    });

    // ─── 5. Table Total Footer Row ───────────────────────────────────────────
    const lastDataRow = 5 + amenities.length;
    const footerRowIndex = lastDataRow + 1;
    const footerRow = worksheet.getRow(footerRowIndex);
    footerRow.height = 24;

    worksheet.mergeCells(`A${footerRowIndex}:C${footerRowIndex}`);
    const fTitle = worksheet.getCell(`A${footerRowIndex}`);
    fTitle.value = `TỔNG CỘNG (${amenities.length} TIỆN NGHI)`;
    fTitle.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF003580' } };
    fTitle.alignment = { horizontal: 'center', vertical: 'middle' };

    const fCount = worksheet.getCell(`D${footerRowIndex}`);
    fCount.value = { formula: `SUM(D6:D${lastDataRow})` };
    fCount.numFmt = '#,##0';
    fCount.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF003580' } };
    fCount.alignment = { horizontal: 'center', vertical: 'middle' };

    for (let col = 1; col <= 8; col++) {
      const cell = footerRow.getCell(col);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'double', color: { argb: 'FF003580' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    }

    // AutoFilter for data columns
    worksheet.autoFilter = `A5:H${lastDataRow}`;

    // ─── 6. Corporate Signature & Approval Block ────────────────────────────
    const nowSign = new Date();
    const signYear = nowSign.getFullYear();
    const signMonth = String(nowSign.getMonth() + 1).padStart(2, '0');
    const signDay = String(nowSign.getDate()).padStart(2, '0');

    const sigDateRowIndex = footerRowIndex + 2;

    worksheet.mergeCells(`E${sigDateRowIndex}:H${sigDateRowIndex}`);
    const sigDateCell = worksheet.getCell(`E${sigDateRowIndex}`);
    sigDateCell.value = `..., ngày ${signDay} tháng ${signMonth} năm ${signYear}`;
    sigDateCell.font = { name: 'Segoe UI', size: 9.5, italic: true, color: { argb: 'FF334155' } };
    sigDateCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(sigDateRowIndex).height = 20;

    const sigTitleRowIndex = sigDateRowIndex + 1;
    worksheet.mergeCells(`A${sigTitleRowIndex}:C${sigTitleRowIndex}`);
    worksheet.getCell(`A${sigTitleRowIndex}`).value = 'NGƯỜI LẬP BIỂU';
    worksheet.getCell(`A${sigTitleRowIndex}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF003580' } };
    worksheet.getCell(`A${sigTitleRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells(`D${sigTitleRowIndex}:E${sigTitleRowIndex}`);
    worksheet.getCell(`D${sigTitleRowIndex}`).value = 'NGƯỜI KIỂM SOÁT';
    worksheet.getCell(`D${sigTitleRowIndex}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF003580' } };
    worksheet.getCell(`D${sigTitleRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells(`F${sigTitleRowIndex}:H${sigTitleRowIndex}`);
    worksheet.getCell(`F${sigTitleRowIndex}`).value = 'GIÁM ĐỐC / ĐẠI DIỆN VẬN HÀNH';
    worksheet.getCell(`F${sigTitleRowIndex}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF003580' } };
    worksheet.getCell(`F${sigTitleRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(sigTitleRowIndex).height = 24;

    const sigNoteRowIndex = sigTitleRowIndex + 1;
    worksheet.mergeCells(`A${sigNoteRowIndex}:C${sigNoteRowIndex}`);
    worksheet.getCell(`A${sigNoteRowIndex}`).value = '(Ký, ghi rõ họ tên)';
    worksheet.getCell(`A${sigNoteRowIndex}`).font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF64748B' } };
    worksheet.getCell(`A${sigNoteRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells(`D${sigNoteRowIndex}:E${sigNoteRowIndex}`);
    worksheet.getCell(`D${sigNoteRowIndex}`).value = '(Ký, ghi rõ họ tên)';
    worksheet.getCell(`D${sigNoteRowIndex}`).font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF64748B' } };
    worksheet.getCell(`D${sigNoteRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells(`F${sigNoteRowIndex}:H${sigNoteRowIndex}`);
    worksheet.getCell(`F${sigNoteRowIndex}`).value = '(Ký, đóng dấu, ghi rõ họ tên)';
    worksheet.getCell(`F${sigNoteRowIndex}`).font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF64748B' } };
    worksheet.getCell(`F${sigNoteRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(sigNoteRowIndex).height = 18;

    worksheet.getRow(sigNoteRowIndex + 1).height = 18;
    worksheet.getRow(sigNoteRowIndex + 2).height = 18;
    worksheet.getRow(sigNoteRowIndex + 3).height = 18;

    const sigNameRowIndex = sigNoteRowIndex + 4;
    worksheet.mergeCells(`A${sigNameRowIndex}:C${sigNameRowIndex}`);
    worksheet.getCell(`A${sigNameRowIndex}`).value = 'Hệ thống AVORA ERP';
    worksheet.getCell(`A${sigNameRowIndex}`).font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
    worksheet.getCell(`A${sigNameRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells(`D${sigNameRowIndex}:E${sigNameRowIndex}`);
    worksheet.getCell(`D${sigNameRowIndex}`).value = 'Phòng Quản lý Dịch vụ Lưu trú';
    worksheet.getCell(`D${sigNameRowIndex}`).font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
    worksheet.getCell(`D${sigNameRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells(`F${sigNameRowIndex}:H${sigNameRowIndex}`);
    worksheet.getCell(`F${sigNameRowIndex}`).value = 'Ban Quản lý AVORA Hotels';
    worksheet.getCell(`F${sigNameRowIndex}`).font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
    worksheet.getCell(`F${sigNameRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(sigNameRowIndex).height = 22;

    worksheet.getRow(sigNameRowIndex + 1).height = 8;
    const authRowIndex = sigNameRowIndex + 2;
    worksheet.mergeCells(`A${authRowIndex}:H${authRowIndex}`);
    const authCell = worksheet.getCell(`A${authRowIndex}`);
    authCell.value = '✓ Báo cáo trích xuất tự động từ Hệ thống Quản trị Doanh nghiệp AVORA Enterprise • Bảo mật nội bộ';
    authCell.font = { name: 'Segoe UI', size: 8.5, italic: true, color: { argb: 'FF94A3B8' } };
    authCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(authRowIndex).height = 18;

    // ─── 7. Print Layout Setup ───────────────────────────────────────────────
    worksheet.pageSetup = {
      orientation: 'landscape',
      paperSize: 9, // A4
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.5,
        right: 0.5,
        top: 0.6,
        bottom: 0.6,
        header: 0.3,
        footer: 0.3,
      },
    };

    // Header & Footer for Print Output
    worksheet.headerFooter = {
      oddHeader: '&L&B&"Segoe UI"AVORA HOTELS & RESORTS&R&"Segoe UI"Báo cáo Quản trị Tiện nghi',
      oddFooter: '&L&"Segoe UI"Tài liệu nội bộ AVORA • Bảo mật&R&"Segoe UI"Trang &P / &N',
    };

    // ─── 8. Write and Trigger Browser Download ───────────────────────────────
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return {
      success: true,
      count: amenities.length,
      filename,
    };
  } catch (error) {
    console.error('Error generating luxury Excel report:', error);
    return {
      success: false,
      message: error.message || 'Lỗi khi tạo file Excel báo cáo.',
    };
  }
};

/**
 * Backward compatibility alias
 */
export const exportAmenitiesToCSV = exportAmenitiesToExcel;

/**
 * Export users list to Excel (.xlsx) file.
 */
export const exportUsersToExcel = async (users = [], customFilename) => {
  if (!users || users.length === 0) {
    return { success: false, message: 'Không có dữ liệu người dùng để xuất file.' };
  }

  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const filename = customFilename || `AVORA_Danh_sach_nguoi_dung_${dateStr}.xlsx`;

  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'AVORA System Management';
    workbook.lastModifiedBy = 'AVORA Executive CMS';
    workbook.created = new Date();
    workbook.modified = new Date();

    const sheetName = 'Danh sách người dùng';
    const worksheet = workbook.addWorksheet(sheetName, {
      properties: {
        tabColor: { argb: 'FF003580' },
        defaultRowHeight: 22,
      },
      views: [{ state: 'normal' }],
    });

    // ─── 1. Columns Configuration ───────────────────────────────────────────
    worksheet.columns = [
      { key: 'stt', width: 8 },          // A: STT
      { key: 'code', width: 16 },         // B: Mã NV
      { key: 'name', width: 28 },         // C: Họ và tên
      { key: 'email', width: 32 },        // D: Email
      { key: 'phone', width: 18 },        // E: Số điện thoại
      { key: 'role', width: 22 },         // F: Vai trò
      { key: 'hotel', width: 30 },        // G: Cơ sở trực thuộc
      { key: 'status', width: 20 },       // H: Trạng thái
      { key: 'created_at', width: 18 },   // I: Ngày tạo
    ];

    // Common border styles
    const thinBorder = {
      top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    };

    // ─── 2. Report Header / Branding ─────────────────────────────────────────
    // Row 1: Logo & Enterprise Badge
    worksheet.getRow(1).height = 40;
    const logoBase64 = await getAvoraLogoBase64();
    if (logoBase64) {
      const logoId = workbook.addImage({
        base64: logoBase64,
        extension: 'png',
      });
      worksheet.addImage(logoId, {
        tl: { col: 0.1, row: 0.1 },
        ext: { width: 135, height: 36 },
      });
    }

    worksheet.mergeCells('E1:I1');
    const brandCell = worksheet.getCell('E1');
    brandCell.value = 'HỆ THỐNG QUẢN TRỊ DOANH NGHIỆP • AVORA ENTERPRISE';
    brandCell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FFC9A227' } };
    brandCell.alignment = { horizontal: 'right', vertical: 'middle' };

    // Row 2: Report Title
    worksheet.mergeCells('A2:I2');
    const titleCell = worksheet.getCell('A2');
    titleCell.value = 'DANH SÁCH NGƯỜI DÙNG HỆ THỐNG';
    titleCell.font = { name: 'Segoe UI', size: 15, bold: true, color: { argb: 'FF003580' } };
    titleCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    worksheet.getRow(2).height = 26;

    // Row 3: Subtitle & Export Date
    const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    worksheet.mergeCells('A3:I3');
    const subCell = worksheet.getCell('A3');
    subCell.value = `Hotel Management System • Báo cáo quản trị tài khoản & phân quyền  |  Thời gian xuất: ${formattedDate}`;
    subCell.font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF64748B' } };
    subCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    worksheet.getRow(3).height = 18;

    // Row 4: Small spacing row
    worksheet.getRow(4).height = 6;

    // ─── 3. Table Header (Row 5) ─────────────────────────────────────────────
    const headerRow = worksheet.getRow(5);
    headerRow.height = 28;

    const headers = [
      'STT',
      'Mã NV',
      'Họ và tên',
      'Email',
      'Số điện thoại',
      'Vai trò',
      'Cơ sở trực thuộc',
      'Trạng thái',
      'Ngày tạo',
    ];

    headers.forEach((hdr, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = hdr;
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF003580' }, // AVORA Deep Navy
      };
      cell.font = {
        name: 'Segoe UI',
        size: 10,
        bold: true,
        color: { argb: 'FFFFFFFF' },
      };
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true,
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF002866' } },
        left: { style: 'thin', color: { argb: 'FF0A4799' } },
        right: { style: 'thin', color: { argb: 'FF0A4799' } },
        bottom: { style: 'medium', color: { argb: 'FFC9A227' } }, // Elegant Gold Divider
      };
    });

    // ─── 4. Data Rows (Row 6+) ───────────────────────────────────────────────
    users.forEach((u, idx) => {
      const rowIndex = 6 + idx;
      const row = worksheet.getRow(rowIndex);
      row.height = 24;

      const isEven = idx % 2 === 0;
      const baseBg = isEven ? 'FFFFFFFF' : 'FFF8FAFC'; // Alternating zebra stripe

      const stt = idx + 1;
      const code = u.employee_code || '-';
      const name = u.full_name || 'Chưa cập nhật';
      const email = u.email || '-';
      const phone = u.phone || '-';
      const role = u.role_label || u.role_code || '-';
      const hotel = u.hotel?.name || 'Toàn hệ thống';
      const status =
        u.account_status === 'ACTIVE'
          ? 'Đang hoạt động'
          : u.account_status === 'VERIFYING'
          ? 'Chờ kích hoạt'
          : 'Đang khóa';
      const createdAt = u.created_at ? new Date(u.created_at).toLocaleDateString('vi-VN') : '-';

      // Cell 1: STT
      const c1 = row.getCell(1);
      c1.value = stt;
      c1.alignment = { horizontal: 'center', vertical: 'middle' };
      c1.font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF64748B' } };
      c1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c1.border = thinBorder;

      // Cell 2: Mã NV
      const c2 = row.getCell(2);
      c2.value = code;
      c2.alignment = { horizontal: 'center', vertical: 'middle' };
      c2.font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF334155' } };
      c2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c2.border = thinBorder;

      // Cell 3: Họ và tên
      const c3 = row.getCell(3);
      c3.value = name;
      c3.alignment = { horizontal: 'left', vertical: 'middle', indent: 1, wrapText: true };
      c3.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
      c3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c3.border = thinBorder;

      // Cell 4: Email
      const c4 = row.getCell(4);
      c4.value = email;
      c4.alignment = { horizontal: 'left', vertical: 'middle', indent: 1, wrapText: true };
      c4.font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF334155' } };
      c4.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c4.border = thinBorder;

      // Cell 5: Số điện thoại
      const c5 = row.getCell(5);
      c5.value = phone;
      c5.alignment = { horizontal: 'center', vertical: 'middle' };
      c5.font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF334155' } };
      c5.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c5.border = thinBorder;

      // Cell 6: Vai trò
      const c6 = row.getCell(6);
      c6.value = role;
      c6.alignment = { horizontal: 'center', vertical: 'middle' };
      c6.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF003580' } };
      c6.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c6.border = thinBorder;

      // Cell 7: Cơ sở trực thuộc
      const c7 = row.getCell(7);
      c7.value = hotel;
      c7.alignment = { horizontal: 'left', vertical: 'middle', indent: 1, wrapText: true };
      c7.font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF334155' } };
      c7.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c7.border = thinBorder;

      // Cell 8: Trạng thái
      const c8 = row.getCell(8);
      c8.value = status;
      c8.alignment = { horizontal: 'center', vertical: 'middle' };
      const isAct = u.account_status === 'ACTIVE';
      const isVer = u.account_status === 'VERIFYING';
      c8.font = {
        name: 'Segoe UI',
        size: 9.5,
        bold: true,
        color: { argb: isAct ? 'FF065F46' : isVer ? 'FF9A3412' : 'FF991B1B' },
      };
      c8.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isAct ? 'FFECFDF5' : isVer ? 'FFFFEDD5' : 'FFFEF2F2' },
      };
      c8.border = thinBorder;

      // Cell 9: Ngày tạo
      const c9 = row.getCell(9);
      c9.value = createdAt;
      c9.alignment = { horizontal: 'center', vertical: 'middle' };
      c9.font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF64748B' } };
      c9.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c9.border = thinBorder;
    });

    const lastDataRow = 5 + users.length;
    worksheet.autoFilter = `A5:I${lastDataRow}`;

    // ─── 5. Corporate Signature & Approval Block ────────────────────────────
    const nowSign = new Date();
    const signYear = nowSign.getFullYear();
    const signMonth = String(nowSign.getMonth() + 1).padStart(2, '0');
    const signDay = String(nowSign.getDate()).padStart(2, '0');

    const sigDateRowIndex = lastDataRow + 2;

    worksheet.mergeCells(`G${sigDateRowIndex}:I${sigDateRowIndex}`);
    const sigDateCell = worksheet.getCell(`G${sigDateRowIndex}`);
    sigDateCell.value = `..., ngày ${signDay} tháng ${signMonth} năm ${signYear}`;
    sigDateCell.font = { name: 'Segoe UI', size: 9.5, italic: true, color: { argb: 'FF334155' } };
    sigDateCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(sigDateRowIndex).height = 20;

    const sigTitleRowIndex = sigDateRowIndex + 1;
    worksheet.mergeCells(`A${sigTitleRowIndex}:C${sigTitleRowIndex}`);
    worksheet.getCell(`A${sigTitleRowIndex}`).value = 'NGƯỜI LẬP BÁO CÁO';
    worksheet.getCell(`A${sigTitleRowIndex}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF003580' } };
    worksheet.getCell(`A${sigTitleRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells(`D${sigTitleRowIndex}:F${sigTitleRowIndex}`);
    worksheet.getCell(`D${sigTitleRowIndex}`).value = 'TRƯỞNG PHÒNG NHÂN SỰ & IT';
    worksheet.getCell(`D${sigTitleRowIndex}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF003580' } };
    worksheet.getCell(`D${sigTitleRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells(`G${sigTitleRowIndex}:I${sigTitleRowIndex}`);
    worksheet.getCell(`G${sigTitleRowIndex}`).value = 'BAN GIÁM ĐỐC HỆ THỐNG';
    worksheet.getCell(`G${sigTitleRowIndex}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF003580' } };
    worksheet.getCell(`G${sigTitleRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(sigTitleRowIndex).height = 24;

    const sigNoteRowIndex = sigTitleRowIndex + 1;
    worksheet.mergeCells(`A${sigNoteRowIndex}:C${sigNoteRowIndex}`);
    worksheet.getCell(`A${sigNoteRowIndex}`).value = '(Ký, ghi rõ họ tên)';
    worksheet.getCell(`A${sigNoteRowIndex}`).font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF64748B' } };
    worksheet.getCell(`A${sigNoteRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells(`D${sigNoteRowIndex}:F${sigNoteRowIndex}`);
    worksheet.getCell(`D${sigNoteRowIndex}`).value = '(Ký, ghi rõ họ tên)';
    worksheet.getCell(`D${sigNoteRowIndex}`).font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF64748B' } };
    worksheet.getCell(`D${sigNoteRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells(`G${sigNoteRowIndex}:I${sigNoteRowIndex}`);
    worksheet.getCell(`G${sigNoteRowIndex}`).value = '(Ký, đóng dấu, ghi rõ họ tên)';
    worksheet.getCell(`G${sigNoteRowIndex}`).font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF64748B' } };
    worksheet.getCell(`G${sigNoteRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(sigNoteRowIndex).height = 18;

    worksheet.getRow(sigNoteRowIndex + 1).height = 18;
    worksheet.getRow(sigNoteRowIndex + 2).height = 18;
    worksheet.getRow(sigNoteRowIndex + 3).height = 18;

    const sigNameRowIndex = sigNoteRowIndex + 4;
    worksheet.mergeCells(`A${sigNameRowIndex}:C${sigNameRowIndex}`);
    worksheet.getCell(`A${sigNameRowIndex}`).value = 'Quản trị viên Hệ thống (System Admin)';
    worksheet.getCell(`A${sigNameRowIndex}`).font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
    worksheet.getCell(`A${sigNameRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells(`D${sigNameRowIndex}:F${sigNameRowIndex}`);
    worksheet.getCell(`D${sigNameRowIndex}`).value = 'Phòng Quản trị & Vận hành Nhân sự';
    worksheet.getCell(`D${sigNameRowIndex}`).font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
    worksheet.getCell(`D${sigNameRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells(`G${sigNameRowIndex}:I${sigNameRowIndex}`);
    worksheet.getCell(`G${sigNameRowIndex}`).value = 'Ban Điều Hành AVORA Enterprise';
    worksheet.getCell(`G${sigNameRowIndex}`).font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
    worksheet.getCell(`G${sigNameRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(sigNameRowIndex).height = 22;

    worksheet.getRow(sigNameRowIndex + 1).height = 8;
    const authRowIndex = sigNameRowIndex + 2;
    worksheet.mergeCells(`A${authRowIndex}:I${authRowIndex}`);
    const authCell = worksheet.getCell(`A${authRowIndex}`);
    authCell.value = '✓ Báo cáo trích xuất tự động từ Hệ thống Quản trị Doanh nghiệp AVORA Enterprise • Bảo mật nội bộ';
    authCell.font = { name: 'Segoe UI', size: 8.5, italic: true, color: { argb: 'FF94A3B8' } };
    authCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(authRowIndex).height = 18;

    // ─── 6. Print Layout Setup ───────────────────────────────────────────────
    worksheet.pageSetup = {
      orientation: 'landscape',
      paperSize: 9, // A4
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.5,
        right: 0.5,
        top: 0.6,
        bottom: 0.6,
        header: 0.3,
        footer: 0.3,
      },
    };

    worksheet.headerFooter = {
      oddHeader: '&L&B&"Segoe UI"AVORA HOTELS & RESORTS&R&"Segoe UI"Báo cáo Quản trị Người dùng',
      oddFooter: '&L&"Segoe UI"Tài liệu nội bộ AVORA • Bảo mật&R&"Segoe UI"Trang &P / &N',
    };

    // ─── 7. Write and Trigger Browser Download ───────────────────────────────
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

    return { success: true, count: users.length, filename };
  } catch (error) {
    console.error('Error exporting users to Excel:', error);
    return { success: false, message: error.message || 'Lỗi khi xuất file Excel.' };
  }
};

/**
 * Generate standard room type export filename with current timestamp (YYYYMMDD).
 * e.g., AVORA_Danh_muc_hang_phong_20261020.xlsx
 */
export const getRoomTypeExportExcelFilename = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `AVORA_Danh_muc_hang_phong_${year}${month}${day}.xlsx`;
};

/**
 * Export room types list to a luxury, executive-grade Excel (.xlsx) report
 * matching AVORA Enterprise brand standards.
 *
 * @param {Array} roomTypes - List of room type objects from database
 * @param {string} [hotelName] - Current selected hotel context name
 * @param {string} [customFilename] - Optional override filename
 * @returns {Promise<{ success: boolean, count?: number, filename?: string, message?: string }>}
 */
export const exportRoomTypesToExcel = async (
  roomTypes = [],
  hotelName = 'Tất cả cơ sở lưu trú',
  customFilename
) => {
  if (!roomTypes || roomTypes.length === 0) {
    return { success: false, message: 'Không có dữ liệu hạng phòng để xuất file.' };
  }

  const filename = customFilename || getRoomTypeExportExcelFilename();

  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'AVORA Hotel Management System';
    workbook.lastModifiedBy = 'AVORA Executive CMS';
    workbook.created = new Date();
    workbook.modified = new Date();

    const sheetName = 'Danh mục hạng phòng';
    const worksheet = workbook.addWorksheet(sheetName, {
      properties: {
        tabColor: { argb: 'FF003580' },
        defaultRowHeight: 22,
      },
      views: [{ state: 'normal' }],
    });

    // ─── 1. Columns Configuration ───────────────────────────────────────────
    worksheet.columns = [
      { key: 'stt', width: 8 },           // A: STT
      { key: 'sku', width: 16 },          // B: Mã SKU
      { key: 'type_name', width: 32 },    // C: Tên hạng phòng
      { key: 'hotel', width: 28 },        // D: Khách sạn / Cơ sở
      { key: 'room_size', width: 15 },    // E: Diện tích
      { key: 'bed_type', width: 24 },     // F: Quy cách giường
      { key: 'capacity', width: 20 },     // G: Sức chứa chuẩn
      { key: 'extra_bed', width: 26 },    // H: Giường phụ (Extra Bed)
      { key: 'room_count', width: 16 },   // I: Tổng số buồng
      { key: 'available', width: 16 },    // J: Buồng khả dụng
      { key: 'price', width: 22 },        // K: Giá niêm yết (VNĐ/đêm)
      { key: 'amenities', width: 36 },    // L: Tiện nghi đặc quyền
      { key: 'status', width: 20 },       // M: Trạng thái kinh doanh
    ];

    const thinBorder = {
      top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    };

    // ─── 2. Report Header / Branding ─────────────────────────────────────────
    // Row 1: Logo & Enterprise Badge
    worksheet.getRow(1).height = 40;
    const logoBase64 = await getAvoraLogoBase64();
    if (logoBase64) {
      const logoId = workbook.addImage({
        base64: logoBase64,
        extension: 'png',
      });
      worksheet.addImage(logoId, {
        tl: { col: 0.1, row: 0.1 },
        ext: { width: 135, height: 36 },
      });
    }

    worksheet.mergeCells('G1:M1');
    const brandCell = worksheet.getCell('G1');
    brandCell.value = 'HỆ THỐNG QUẢN TRỊ DOANH NGHIỆP • AVORA ENTERPRISE';
    brandCell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FFC9A227' } };
    brandCell.alignment = { horizontal: 'right', vertical: 'middle' };

    // Row 2: Report Title
    worksheet.mergeCells('A2:M2');
    const titleCell = worksheet.getCell('A2');
    titleCell.value = 'DANH MỤC HẠNG PHÒNG & CƠ CẤU LƯU TRÚ';
    titleCell.font = { name: 'Segoe UI', size: 15, bold: true, color: { argb: 'FF003580' } };
    titleCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    worksheet.getRow(2).height = 26;

    // Row 3: Subtitle & Export Date
    const now = new Date();
    const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    worksheet.mergeCells('A3:M3');
    const subCell = worksheet.getCell('A3');
    subCell.value = `Hotel Management System • Báo cáo quản trị cơ cấu phòng  |  Cơ sở: ${hotelName}  |  Thời gian xuất: ${formattedDate}`;
    subCell.font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF64748B' } };
    subCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    worksheet.getRow(3).height = 18;

    // Row 4: Small spacing row
    worksheet.getRow(4).height = 6;

    // ─── 3. Table Header (Row 5) ─────────────────────────────────────────────
    const headerRow = worksheet.getRow(5);
    headerRow.height = 28;

    const headers = [
      'STT',
      'Mã SKU',
      'Tên hạng phòng',
      'Cơ sở khách sạn',
      'Diện tích',
      'Quy cách giường',
      'Sức chứa chuẩn',
      'Giường phụ (Extra Bed)',
      'Tổng số buồng',
      'Buồng khả dụng',
      'Giá niêm yết (VNĐ/đêm)',
      'Tiện nghi đặc quyền',
      'Trạng thái kinh doanh',
    ];

    headers.forEach((hdr, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = hdr;
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF003580' },
      };
      cell.font = {
        name: 'Segoe UI',
        size: 10,
        bold: true,
        color: { argb: 'FFFFFFFF' },
      };
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true,
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF002866' } },
        left: { style: 'thin', color: { argb: 'FF0A4799' } },
        right: { style: 'thin', color: { argb: 'FF0A4799' } },
        bottom: { style: 'medium', color: { argb: 'FFC9A227' } },
      };
    });

    // ─── 4. Data Rows (Row 6+) ───────────────────────────────────────────────
    roomTypes.forEach((item, index) => {
      const rowIndex = 6 + index;
      const row = worksheet.getRow(rowIndex);
      row.height = 24;

      const isEven = index % 2 === 0;
      const baseBg = isEven ? 'FFFFFFFF' : 'FFF8FAFC';

      const stt = index + 1;
      const sku = item.sku || '—';
      const typeName = item.type_name || '';
      const hotel = item.m_hotel?.name || item.hotel_name || hotelName || 'Avora Hotel';
      const sizeStr = item.room_size
        ? (String(item.room_size).includes('m') ? item.room_size : `${item.room_size} m²`)
        : 'Chưa cập nhật';
      const bedType = item.bed_type || 'Chưa cập nhật';

      let capacityStr = `${item.max_adults || 2} người lớn`;
      let extraBedStr = 'Không hỗ trợ';
      try {
        const cap = getRoomCapacityDetails(item);
        capacityStr = `${cap.standardBeds} giường (${cap.standardCapacity} người)`;
        extraBedStr = cap.hasExtraBed
          ? `+1 giường phụ (Tối đa ${cap.maxCapacity} người)`
          : 'Không hỗ trợ';
      } catch {
        capacityStr = `${item.max_adults || 2} NL, ${item.max_children || 0} TE`;
      }

      const roomCount = Number(item.room_count) || 0;
      const availableRooms = Number(item.available_rooms) || 0;
      const price = Number(item.default_price) || 0;

      const amenitiesList = Array.isArray(item.facilities) && item.facilities.length > 0
        ? item.facilities.map((f) => f.name_vi || f.facility_name || '').filter(Boolean).join(', ')
        : 'Tiêu chuẩn AVORA';

      const isInactive = Boolean(item.is_deleted);
      const statusLabel = isInactive ? 'Ngừng kinh doanh' : 'Đang mở bán';

      // C1: STT
      const c1 = row.getCell(1);
      c1.value = stt;
      c1.alignment = { horizontal: 'center', vertical: 'middle' };
      c1.font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF64748B' } };
      c1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c1.border = thinBorder;

      // C2: Mã SKU
      const c2 = row.getCell(2);
      c2.value = sku;
      c2.alignment = { horizontal: 'center', vertical: 'middle' };
      c2.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF003580' } };
      c2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c2.border = thinBorder;

      // C3: Tên hạng phòng
      const c3 = row.getCell(3);
      c3.value = typeName;
      c3.alignment = { horizontal: 'left', vertical: 'middle', indent: 1, wrapText: true };
      c3.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
      c3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c3.border = thinBorder;

      // C4: Khách sạn
      const c4 = row.getCell(4);
      c4.value = hotel;
      c4.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
      c4.font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF334155' } };
      c4.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c4.border = thinBorder;

      // C5: Diện tích
      const c5 = row.getCell(5);
      c5.value = sizeStr;
      c5.alignment = { horizontal: 'center', vertical: 'middle' };
      c5.font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF334155' } };
      c5.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c5.border = thinBorder;

      // C6: Quy cách giường
      const c6 = row.getCell(6);
      c6.value = bedType;
      c6.alignment = { horizontal: 'center', vertical: 'middle' };
      c6.font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF334155' } };
      c6.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c6.border = thinBorder;

      // C7: Sức chứa chuẩn
      const c7 = row.getCell(7);
      c7.value = capacityStr;
      c7.alignment = { horizontal: 'center', vertical: 'middle' };
      c7.font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF334155' } };
      c7.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c7.border = thinBorder;

      // C8: Giường phụ
      const c8 = row.getCell(8);
      c8.value = extraBedStr;
      c8.alignment = { horizontal: 'center', vertical: 'middle' };
      c8.font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: extraBedStr.includes('Hỗ trợ') ? 'FF047857' : 'FF64748B' } };
      c8.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c8.border = thinBorder;

      // C9: Tổng số buồng
      const c9 = row.getCell(9);
      c9.value = roomCount;
      c9.numFmt = '#,##0';
      c9.alignment = { horizontal: 'center', vertical: 'middle' };
      c9.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
      c9.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c9.border = thinBorder;

      // C10: Buồng khả dụng
      const c10 = row.getCell(10);
      c10.value = availableRooms;
      c10.numFmt = '#,##0';
      c10.alignment = { horizontal: 'center', vertical: 'middle' };
      c10.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: availableRooms > 0 ? 'FF047857' : 'FFDC2626' } };
      c10.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c10.border = thinBorder;

      // C11: Giá niêm yết
      const c11 = row.getCell(11);
      c11.value = price;
      c11.numFmt = '#,##0 "₫"';
      c11.alignment = { horizontal: 'right', vertical: 'middle' };
      c11.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF003580' } };
      c11.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c11.border = thinBorder;

      // C12: Tiện nghi đặc quyền
      const c12 = row.getCell(12);
      c12.value = amenitiesList;
      c12.alignment = { horizontal: 'left', vertical: 'middle', indent: 1, wrapText: true };
      c12.font = { name: 'Segoe UI', size: 9, color: { argb: 'FF334155' } };
      c12.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c12.border = thinBorder;

      // C13: Trạng thái
      const c13 = row.getCell(13);
      c13.value = statusLabel;
      c13.alignment = { horizontal: 'center', vertical: 'middle' };
      c13.font = {
        name: 'Segoe UI',
        size: 9.5,
        bold: true,
        color: { argb: isInactive ? 'FF991B1B' : 'FF065F46' },
      };
      c13.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isInactive ? 'FFFEF2F2' : 'FFECFDF5' },
      };
      c13.border = thinBorder;
    });

    // ─── 5. Table Total Footer Row ───────────────────────────────────────────
    const lastDataRow = 5 + roomTypes.length;
    const footerRowIndex = lastDataRow + 1;
    const footerRow = worksheet.getRow(footerRowIndex);
    footerRow.height = 24;

    worksheet.mergeCells(`A${footerRowIndex}:H${footerRowIndex}`);
    const fTitle = worksheet.getCell(`A${footerRowIndex}`);
    fTitle.value = `TỔNG CỘNG (${roomTypes.length} HẠNG PHÒNG)`;
    fTitle.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF003580' } };
    fTitle.alignment = { horizontal: 'center', vertical: 'middle' };

    const fRoomCount = worksheet.getCell(`I${footerRowIndex}`);
    fRoomCount.value = { formula: `SUM(I6:I${lastDataRow})` };
    fRoomCount.numFmt = '#,##0';
    fRoomCount.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF003580' } };
    fRoomCount.alignment = { horizontal: 'center', vertical: 'middle' };

    const fAvailCount = worksheet.getCell(`J${footerRowIndex}`);
    fAvailCount.value = { formula: `SUM(J6:J${lastDataRow})` };
    fAvailCount.numFmt = '#,##0';
    fAvailCount.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF047857' } };
    fAvailCount.alignment = { horizontal: 'center', vertical: 'middle' };

    const fAvgPrice = worksheet.getCell(`K${footerRowIndex}`);
    fAvgPrice.value = { formula: `AVERAGE(K6:K${lastDataRow})` };
    fAvgPrice.numFmt = '#,##0 "₫"';
    fAvgPrice.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF003580' } };
    fAvgPrice.alignment = { horizontal: 'right', vertical: 'middle' };

    for (let col = 1; col <= 13; col++) {
      const cell = footerRow.getCell(col);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'double', color: { argb: 'FF003580' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    }

    // AutoFilter
    worksheet.autoFilter = `A5:M${lastDataRow}`;

    // ─── 6. Corporate Signature & Approval Block ────────────────────────────
    const nowSign = new Date();
    const signYear = nowSign.getFullYear();
    const signMonth = String(nowSign.getMonth() + 1).padStart(2, '0');
    const signDay = String(nowSign.getDate()).padStart(2, '0');

    const sigDateRowIndex = footerRowIndex + 2;
    worksheet.mergeCells(`I${sigDateRowIndex}:M${sigDateRowIndex}`);
    const sigDateCell = worksheet.getCell(`I${sigDateRowIndex}`);
    sigDateCell.value = `..., ngày ${signDay} tháng ${signMonth} năm ${signYear}`;
    sigDateCell.font = { name: 'Segoe UI', size: 9.5, italic: true, color: { argb: 'FF334155' } };
    sigDateCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(sigDateRowIndex).height = 20;

    const sigTitleRowIndex = sigDateRowIndex + 1;
    worksheet.mergeCells(`A${sigTitleRowIndex}:D${sigTitleRowIndex}`);
    worksheet.getCell(`A${sigTitleRowIndex}`).value = 'NGƯỜI LẬP BIỂU';
    worksheet.getCell(`A${sigTitleRowIndex}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF003580' } };
    worksheet.getCell(`A${sigTitleRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells(`E${sigTitleRowIndex}:H${sigTitleRowIndex}`);
    worksheet.getCell(`E${sigTitleRowIndex}`).value = 'TRƯỞNG BỘ PHẬN LƯU TRÚ (FOM)';
    worksheet.getCell(`E${sigTitleRowIndex}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF003580' } };
    worksheet.getCell(`E${sigTitleRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells(`I${sigTitleRowIndex}:M${sigTitleRowIndex}`);
    worksheet.getCell(`I${sigTitleRowIndex}`).value = 'GIÁM ĐỐC KHÁCH SẠN / GM';
    worksheet.getCell(`I${sigTitleRowIndex}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF003580' } };
    worksheet.getCell(`I${sigTitleRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(sigTitleRowIndex).height = 24;

    const sigNoteRowIndex = sigTitleRowIndex + 1;
    worksheet.mergeCells(`A${sigNoteRowIndex}:D${sigNoteRowIndex}`);
    worksheet.getCell(`A${sigNoteRowIndex}`).value = '(Ký, ghi rõ họ tên)';
    worksheet.getCell(`A${sigNoteRowIndex}`).font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF64748B' } };
    worksheet.getCell(`A${sigNoteRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells(`E${sigNoteRowIndex}:H${sigNoteRowIndex}`);
    worksheet.getCell(`E${sigNoteRowIndex}`).value = '(Ký, ghi rõ họ tên)';
    worksheet.getCell(`E${sigNoteRowIndex}`).font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF64748B' } };
    worksheet.getCell(`E${sigNoteRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells(`I${sigNoteRowIndex}:M${sigNoteRowIndex}`);
    worksheet.getCell(`I${sigNoteRowIndex}`).value = '(Ký, đóng dấu, ghi rõ họ tên)';
    worksheet.getCell(`I${sigNoteRowIndex}`).font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF64748B' } };
    worksheet.getCell(`I${sigNoteRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(sigNoteRowIndex).height = 18;

    worksheet.getRow(sigNoteRowIndex + 1).height = 18;
    worksheet.getRow(sigNoteRowIndex + 2).height = 18;
    worksheet.getRow(sigNoteRowIndex + 3).height = 18;

    const sigNameRowIndex = sigNoteRowIndex + 4;
    worksheet.mergeCells(`A${sigNameRowIndex}:D${sigNameRowIndex}`);
    worksheet.getCell(`A${sigNameRowIndex}`).value = 'Hệ thống AVORA PMS';
    worksheet.getCell(`A${sigNameRowIndex}`).font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
    worksheet.getCell(`A${sigNameRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells(`E${sigNameRowIndex}:H${sigNameRowIndex}`);
    worksheet.getCell(`E${sigNameRowIndex}`).value = 'Khối Vận hành Buồng phòng';
    worksheet.getCell(`E${sigNameRowIndex}`).font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
    worksheet.getCell(`E${sigNameRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells(`I${sigNameRowIndex}:M${sigNameRowIndex}`);
    worksheet.getCell(`I${sigNameRowIndex}`).value = 'Ban Điều hành Khách sạn AVORA';
    worksheet.getCell(`I${sigNameRowIndex}`).font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
    worksheet.getCell(`I${sigNameRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(sigNameRowIndex).height = 22;

    worksheet.getRow(sigNameRowIndex + 1).height = 8;
    const authRowIndex = sigNameRowIndex + 2;
    worksheet.mergeCells(`A${authRowIndex}:M${authRowIndex}`);
    const authCell = worksheet.getCell(`A${authRowIndex}`);
    authCell.value = '✓ Báo cáo trích xuất tự động từ Hệ thống Quản trị Doanh nghiệp AVORA Enterprise • Bảo mật nội bộ';
    authCell.font = { name: 'Segoe UI', size: 8.5, italic: true, color: { argb: 'FF94A3B8' } };
    authCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(authRowIndex).height = 18;

    // ─── 7. Print Layout Setup ───────────────────────────────────────────────
    worksheet.pageSetup = {
      orientation: 'landscape',
      paperSize: 9, // A4
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.5,
        right: 0.5,
        top: 0.6,
        bottom: 0.6,
        header: 0.3,
        footer: 0.3,
      },
    };

    worksheet.headerFooter = {
      oddHeader: '&L&B&"Segoe UI"AVORA HOTELS & RESORTS&R&"Segoe UI"Báo cáo Quản trị Hạng phòng',
      oddFooter: '&L&"Segoe UI"Tài liệu nội bộ AVORA • Bảo mật&R&"Segoe UI"Trang &P / &N',
    };

    // ─── 8. Write and Trigger Browser Download ───────────────────────────────
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

    return { success: true, count: roomTypes.length, filename };
  } catch (error) {
    console.error('Error exporting room types to Excel:', error);
    return { success: false, message: error.message || 'Lỗi khi xuất file Excel.' };
  }
};

/**
 * Generate standard coupon export filename with current timestamp (YYYYMMDD).
 * e.g., AVORA_Danh_sach_ma_khuyen_mai_20261020.xlsx
 */
export const getCouponExportExcelFilename = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `AVORA_Danh_sach_ma_khuyen_mai_${year}${month}${day}.xlsx`;
};

/**
 * Export coupons list to a luxury, executive-grade Excel (.xlsx) report
 * matching AVORA Enterprise brand standards.
 *
 * @param {Array} coupons - List of coupon objects from database
 * @param {string} [customFilename] - Optional override filename
 * @returns {Promise<{ success: boolean, count?: number, filename?: string, message?: string }>}
 */
export const exportCouponsToExcel = async (coupons = [], customFilename) => {
  if (!coupons || coupons.length === 0) {
    return { success: false, message: 'Không có dữ liệu mã khuyến mãi để xuất file.' };
  }

  const filename = customFilename || getCouponExportExcelFilename();

  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'AVORA Marketing & Sales System';
    workbook.lastModifiedBy = 'AVORA Executive CMS';
    workbook.created = new Date();
    workbook.modified = new Date();

    const sheetName = 'Danh sách khuyến mãi';
    const worksheet = workbook.addWorksheet(sheetName, {
      properties: {
        tabColor: { argb: 'FF003580' },
        defaultRowHeight: 22,
      },
      views: [{ state: 'normal' }],
    });

    // ─── 1. Columns Configuration ───────────────────────────────────────────
    worksheet.columns = [
      { key: 'stt', width: 8 },             // A: STT
      { key: 'code', width: 20 },            // B: Mã khuyến mãi
      { key: 'discount_type', width: 18 },   // C: Loại giảm giá
      { key: 'discount_value', width: 18 },  // D: Mức giảm ưu đãi
      { key: 'max_discount', width: 22 },    // E: Mức giảm tối đa
      { key: 'min_order', width: 22 },       // F: Đơn hàng tối thiểu
      { key: 'valid_from', width: 18 },      // G: Ngày bắt đầu
      { key: 'valid_to', width: 18 },        // H: Hạn kết thúc
      { key: 'usage_count', width: 16 },     // I: Lượt đã dùng
      { key: 'usage_limit', width: 18 },     // J: Giới hạn lượt dùng
      { key: 'status', width: 20 },          // K: Trạng thái áp dụng
    ];

    const thinBorder = {
      top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    };

    // ─── 2. Report Header / Branding ─────────────────────────────────────────
    worksheet.getRow(1).height = 40;
    const logoBase64 = await getAvoraLogoBase64();
    if (logoBase64) {
      const logoId = workbook.addImage({
        base64: logoBase64,
        extension: 'png',
      });
      worksheet.addImage(logoId, {
        tl: { col: 0.1, row: 0.1 },
        ext: { width: 135, height: 36 },
      });
    }

    worksheet.mergeCells('F1:K1');
    const brandCell = worksheet.getCell('F1');
    brandCell.value = 'HỆ THỐNG QUẢN TRỊ DOANH NGHIỆP • AVORA ENTERPRISE';
    brandCell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FFC9A227' } };
    brandCell.alignment = { horizontal: 'right', vertical: 'middle' };

    // Row 2: Report Title
    worksheet.mergeCells('A2:K2');
    const titleCell = worksheet.getCell('A2');
    titleCell.value = 'DANH MỤC MÃ KHUYẾN MÃI & CHÍNH SÁCH ƯU ĐÃI';
    titleCell.font = { name: 'Segoe UI', size: 15, bold: true, color: { argb: 'FF003580' } };
    titleCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    worksheet.getRow(2).height = 26;

    // Row 3: Subtitle & Export Date
    const now = new Date();
    const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    worksheet.mergeCells('A3:K3');
    const subCell = worksheet.getCell('A3');
    subCell.value = `Marketing & Sales System • Báo cáo chiến dịch chiết khấu và ưu đãi  |  Thời gian xuất: ${formattedDate}`;
    subCell.font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF64748B' } };
    subCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    worksheet.getRow(3).height = 18;

    // Row 4: Small spacing row
    worksheet.getRow(4).height = 6;

    // ─── 3. Table Header (Row 5) ─────────────────────────────────────────────
    const headerRow = worksheet.getRow(5);
    headerRow.height = 28;

    const headers = [
      'STT',
      'Mã khuyến mãi',
      'Loại giảm giá',
      'Mức giảm ưu đãi',
      'Giảm tối đa (VNĐ)',
      'Đơn tối thiểu (VNĐ)',
      'Ngày bắt đầu',
      'Hạn kết thúc',
      'Lượt đã dùng',
      'Giới hạn lượt dùng',
      'Trạng thái áp dụng',
    ];

    headers.forEach((hdr, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = hdr;
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF003580' },
      };
      cell.font = {
        name: 'Segoe UI',
        size: 10,
        bold: true,
        color: { argb: 'FFFFFFFF' },
      };
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true,
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF002866' } },
        left: { style: 'thin', color: { argb: 'FF0A4799' } },
        right: { style: 'thin', color: { argb: 'FF0A4799' } },
        bottom: { style: 'medium', color: { argb: 'FFC9A227' } },
      };
    });

    // ─── 4. Data Rows (Row 6+) ───────────────────────────────────────────────
    coupons.forEach((item, index) => {
      const rowIndex = 6 + index;
      const row = worksheet.getRow(rowIndex);
      row.height = 24;

      const isEven = index % 2 === 0;
      const baseBg = isEven ? 'FFFFFFFF' : 'FFF8FAFC';

      const stt = index + 1;
      const code = item.code || '';
      const isPercent = item.discount_type === 'PERCENT';
      const typeLabel = isPercent ? '% Phần trăm' : 'Tiền cố định';
      const discountVal = Number(item.discount_value) || 0;
      const maxDiscount = item.max_discount_amount ? Number(item.max_discount_amount) : null;
      const minOrder = item.min_order_amount ? Number(item.min_order_amount) : null;

      const formatD = (d) => {
        if (!d) return '—';
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) return d;
        return `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;
      };

      const fromStr = formatD(item.valid_from);
      const toStr = formatD(item.valid_to);
      const usageCount = Number(item.usage_count) || 0;
      const usageLimit = item.usage_limit ? Number(item.usage_limit) : null;

      let statusText = item.status_label || 'Đang hoạt động';
      let statusFg = 'FF065F46';
      let statusBg = 'FFECFDF5';

      if (item.status === 'EXPIRED' || item.status_label?.toLowerCase().includes('hết hạn')) {
        statusText = 'Hết hạn';
        statusFg = 'FF64748B';
        statusBg = 'FFF1F5F9';
      } else if (item.status === 'UPCOMING' || item.status_label?.toLowerCase().includes('sắp')) {
        statusText = 'Sắp diễn ra';
        statusFg = 'FF1E40AF';
        statusBg = 'FFEFF6FF';
      } else if (item.status === 'DELETED' || item.status_label?.toLowerCase().includes('khóa')) {
        statusText = 'Đã khóa';
        statusFg = 'FF991B1B';
        statusBg = 'FFFEF2F2';
      }

      // C1: STT
      const c1 = row.getCell(1);
      c1.value = stt;
      c1.alignment = { horizontal: 'center', vertical: 'middle' };
      c1.font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF64748B' } };
      c1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c1.border = thinBorder;

      // C2: Code
      const c2 = row.getCell(2);
      c2.value = code;
      c2.alignment = { horizontal: 'center', vertical: 'middle' };
      c2.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF003580' } };
      c2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c2.border = thinBorder;

      // C3: Loại
      const c3 = row.getCell(3);
      c3.value = typeLabel;
      c3.alignment = { horizontal: 'center', vertical: 'middle' };
      c3.font = { name: 'Segoe UI', size: 9.5, color: { argb: isPercent ? 'FF7C3AED' : 'FF0284C7' } };
      c3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c3.border = thinBorder;

      // C4: Mức giảm
      const c4 = row.getCell(4);
      if (isPercent) {
        c4.value = `${discountVal}%`;
        c4.alignment = { horizontal: 'center', vertical: 'middle' };
      } else {
        c4.value = discountVal;
        c4.numFmt = '#,##0 "₫"';
        c4.alignment = { horizontal: 'right', vertical: 'middle' };
      }
      c4.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
      c4.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c4.border = thinBorder;

      // C5: Giảm tối đa
      const c5 = row.getCell(5);
      if (maxDiscount) {
        c5.value = maxDiscount;
        c5.numFmt = '#,##0 "₫"';
        c5.alignment = { horizontal: 'right', vertical: 'middle' };
        c5.font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF334155' } };
      } else {
        c5.value = 'Không giới hạn';
        c5.alignment = { horizontal: 'center', vertical: 'middle' };
        c5.font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF64748B' } };
      }
      c5.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c5.border = thinBorder;

      // C6: Đơn tối thiểu
      const c6 = row.getCell(6);
      if (minOrder) {
        c6.value = minOrder;
        c6.numFmt = '#,##0 "₫"';
        c6.alignment = { horizontal: 'right', vertical: 'middle' };
        c6.font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF334155' } };
      } else {
        c6.value = 'Không yêu cầu';
        c6.alignment = { horizontal: 'center', vertical: 'middle' };
        c6.font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF64748B' } };
      }
      c6.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c6.border = thinBorder;

      // C7: Ngày bắt đầu
      const c7 = row.getCell(7);
      c7.value = fromStr;
      c7.alignment = { horizontal: 'center', vertical: 'middle' };
      c7.font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF334155' } };
      c7.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c7.border = thinBorder;

      // C8: Hạn kết thúc
      const c8 = row.getCell(8);
      c8.value = toStr;
      c8.alignment = { horizontal: 'center', vertical: 'middle' };
      c8.font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF334155' } };
      c8.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c8.border = thinBorder;

      // C9: Lượt đã dùng
      const c9 = row.getCell(9);
      c9.value = usageCount;
      c9.numFmt = '#,##0';
      c9.alignment = { horizontal: 'center', vertical: 'middle' };
      c9.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
      c9.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c9.border = thinBorder;

      // C10: Giới hạn lượt dùng
      const c10 = row.getCell(10);
      if (usageLimit) {
        c10.value = usageLimit;
        c10.numFmt = '#,##0';
        c10.font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF334155' } };
      } else {
        c10.value = 'Không giới hạn';
        c10.font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF64748B' } };
      }
      c10.alignment = { horizontal: 'center', vertical: 'middle' };
      c10.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      c10.border = thinBorder;

      // C11: Trạng thái
      const c11 = row.getCell(11);
      c11.value = statusText;
      c11.alignment = { horizontal: 'center', vertical: 'middle' };
      c11.font = {
        name: 'Segoe UI',
        size: 9.5,
        bold: true,
        color: { argb: statusFg },
      };
      c11.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: statusBg },
      };
      c11.border = thinBorder;
    });

    // ─── 5. Table Total Footer Row ───────────────────────────────────────────
    const lastDataRow = 5 + coupons.length;
    const footerRowIndex = lastDataRow + 1;
    const footerRow = worksheet.getRow(footerRowIndex);
    footerRow.height = 24;

    worksheet.mergeCells(`A${footerRowIndex}:H${footerRowIndex}`);
    const fTitle = worksheet.getCell(`A${footerRowIndex}`);
    fTitle.value = `TỔNG CỘNG (${coupons.length} MÃ KHUYẾN MÃI)`;
    fTitle.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF003580' } };
    fTitle.alignment = { horizontal: 'center', vertical: 'middle' };

    const fUsage = worksheet.getCell(`I${footerRowIndex}`);
    fUsage.value = { formula: `SUM(I6:I${lastDataRow})` };
    fUsage.numFmt = '#,##0';
    fUsage.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF003580' } };
    fUsage.alignment = { horizontal: 'center', vertical: 'middle' };

    for (let col = 1; col <= 11; col++) {
      const cell = footerRow.getCell(col);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'double', color: { argb: 'FF003580' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    }

    // AutoFilter
    worksheet.autoFilter = `A5:K${lastDataRow}`;

    // ─── 6. Corporate Signature & Approval Block ────────────────────────────
    const nowSign = new Date();
    const signYear = nowSign.getFullYear();
    const signMonth = String(nowSign.getMonth() + 1).padStart(2, '0');
    const signDay = String(nowSign.getDate()).padStart(2, '0');

    const sigDateRowIndex = footerRowIndex + 2;
    worksheet.mergeCells(`G${sigDateRowIndex}:K${sigDateRowIndex}`);
    const sigDateCell = worksheet.getCell(`G${sigDateRowIndex}`);
    sigDateCell.value = `..., ngày ${signDay} tháng ${signMonth} năm ${signYear}`;
    sigDateCell.font = { name: 'Segoe UI', size: 9.5, italic: true, color: { argb: 'FF334155' } };
    sigDateCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(sigDateRowIndex).height = 20;

    const sigTitleRowIndex = sigDateRowIndex + 1;
    worksheet.mergeCells(`A${sigTitleRowIndex}:C${sigTitleRowIndex}`);
    worksheet.getCell(`A${sigTitleRowIndex}`).value = 'NGƯỜI LẬP BIỂU';
    worksheet.getCell(`A${sigTitleRowIndex}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF003580' } };
    worksheet.getCell(`A${sigTitleRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells(`D${sigTitleRowIndex}:G${sigTitleRowIndex}`);
    worksheet.getCell(`D${sigTitleRowIndex}`).value = 'TRƯỞNG PHÒNG MARKETING';
    worksheet.getCell(`D${sigTitleRowIndex}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF003580' } };
    worksheet.getCell(`D${sigTitleRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells(`H${sigTitleRowIndex}:K${sigTitleRowIndex}`);
    worksheet.getCell(`H${sigTitleRowIndex}`).value = 'GIÁM ĐỐC KINH DOANH (CCO)';
    worksheet.getCell(`H${sigTitleRowIndex}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF003580' } };
    worksheet.getCell(`H${sigTitleRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(sigTitleRowIndex).height = 24;

    const sigNoteRowIndex = sigTitleRowIndex + 1;
    worksheet.mergeCells(`A${sigNoteRowIndex}:C${sigNoteRowIndex}`);
    worksheet.getCell(`A${sigNoteRowIndex}`).value = '(Ký, ghi rõ họ tên)';
    worksheet.getCell(`A${sigNoteRowIndex}`).font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF64748B' } };
    worksheet.getCell(`A${sigNoteRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells(`D${sigNoteRowIndex}:G${sigNoteRowIndex}`);
    worksheet.getCell(`D${sigNoteRowIndex}`).value = '(Ký, ghi rõ họ tên)';
    worksheet.getCell(`D${sigNoteRowIndex}`).font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF64748B' } };
    worksheet.getCell(`D${sigNoteRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells(`H${sigNoteRowIndex}:K${sigNoteRowIndex}`);
    worksheet.getCell(`H${sigNoteRowIndex}`).value = '(Ký, đóng dấu, ghi rõ họ tên)';
    worksheet.getCell(`H${sigNoteRowIndex}`).font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF64748B' } };
    worksheet.getCell(`H${sigNoteRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(sigNoteRowIndex).height = 18;

    worksheet.getRow(sigNoteRowIndex + 1).height = 18;
    worksheet.getRow(sigNoteRowIndex + 2).height = 18;
    worksheet.getRow(sigNoteRowIndex + 3).height = 18;

    const sigNameRowIndex = sigNoteRowIndex + 4;
    worksheet.mergeCells(`A${sigNameRowIndex}:C${sigNameRowIndex}`);
    worksheet.getCell(`A${sigNameRowIndex}`).value = 'Hệ thống AVORA Marketing';
    worksheet.getCell(`A${sigNameRowIndex}`).font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
    worksheet.getCell(`A${sigNameRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells(`D${sigNameRowIndex}:G${sigNameRowIndex}`);
    worksheet.getCell(`D${sigNameRowIndex}`).value = 'Phòng Tăng trưởng & Doanh thu';
    worksheet.getCell(`D${sigNameRowIndex}`).font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
    worksheet.getCell(`D${sigNameRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells(`H${sigNameRowIndex}:K${sigNameRowIndex}`);
    worksheet.getCell(`H${sigNameRowIndex}`).value = 'Ban Quản trị AVORA Enterprise';
    worksheet.getCell(`H${sigNameRowIndex}`).font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
    worksheet.getCell(`H${sigNameRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(sigNameRowIndex).height = 22;

    worksheet.getRow(sigNameRowIndex + 1).height = 8;
    const authRowIndex = sigNameRowIndex + 2;
    worksheet.mergeCells(`A${authRowIndex}:K${authRowIndex}`);
    const authCell = worksheet.getCell(`A${authRowIndex}`);
    authCell.value = '✓ Báo cáo trích xuất tự động từ Hệ thống Quản trị Doanh nghiệp AVORA Enterprise • Bảo mật nội bộ';
    authCell.font = { name: 'Segoe UI', size: 8.5, italic: true, color: { argb: 'FF94A3B8' } };
    authCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(authRowIndex).height = 18;

    // ─── 7. Print Layout Setup ───────────────────────────────────────────────
    worksheet.pageSetup = {
      orientation: 'landscape',
      paperSize: 9, // A4
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.5,
        right: 0.5,
        top: 0.6,
        bottom: 0.6,
        header: 0.3,
        footer: 0.3,
      },
    };

    worksheet.headerFooter = {
      oddHeader: '&L&B&"Segoe UI"AVORA HOTELS & RESORTS&R&"Segoe UI"Báo cáo Quản trị Khuyến mãi',
      oddFooter: '&L&"Segoe UI"Tài liệu nội bộ AVORA • Bảo mật&R&"Segoe UI"Trang &P / &N',
    };

    // ─── 8. Write and Trigger Browser Download ───────────────────────────────
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

    return { success: true, count: coupons.length, filename };
  } catch (error) {
    console.error('Error exporting coupons to Excel:', error);
    return { success: false, message: error.message || 'Lỗi khi xuất file Excel.' };
  }
};
